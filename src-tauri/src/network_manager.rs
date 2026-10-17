use crate::monitor_manager::TargetConfig;
use crate::telnet_client::TelnetClient;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct NetInterface {
    pub name: String,
    pub mtu: u32,
    pub rx_bytes: u64,
    pub rx_packets: u64,
    pub rx_errors: u64,
    pub rx_drops: u64,
    pub rx_overruns: u64,
    pub tx_bytes: u64,
    pub tx_packets: u64,
    pub tx_errors: u64,
    pub tx_drops: u64,
    pub tx_overruns: u64,
    pub flags: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct NetSocket {
    pub protocol: String, // TCP, UDP, UNIX, PACKET
    pub local_addr: String,
    pub remote_addr: String,
    pub status: String,
    pub retrans: u32,
    pub rcv_wnd: u64,
    pub snd_wnd: u64,
    pub raw_info: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct RouteEntry {
    pub destination: String,
    pub gateway: String,
    pub flags: String,
    pub refcnt: u32,
    pub use_cnt: u32,
    pub metric: u32,
    pub iface: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
pub struct NetStatistics {
    pub ip: HashMap<String, u64>,
    pub icmp: HashMap<String, u64>,
    pub tcp: HashMap<String, u64>,
    pub udp: HashMap<String, u64>,
    pub raw_lines: Vec<String>,
}

fn get_whitespace_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\s+").unwrap())
}

/// 解析 netstat -i 输出
/// 示例：
/// FACE MTU     RX-BYTES     RX-OK  RX-ERR RX-DRP RX-OVR TX-BYTES  TX-OK  TX-ERR TX-DRP TX-OVR FLAG
/// en3 : 1500   0            0      0      0      0      0         0      0      0      0      UBEthG
/// en2 : 1500   935552351    15388  980    0      0      233707    4525   0      0      0      UBLEthG
/// lo0 : 0      168          3      0      0      0      168       3      0      0      0      UPL
pub fn parse_netstat_interfaces(output: &str) -> Vec<NetInterface> {
    let mut interfaces = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("FACE")
            || trimmed.starts_with("RECEIVE")
            || trimmed.starts_with("TRANSMIT")
            || trimmed.starts_with("show net status")
            || trimmed.contains("RX-BYTES")
        {
            continue;
        }

        // 处理 "en3 : 1500" 或 "en3: 1500" 或 "en3 1500"
        let normalized = trimmed.replace(" : ", " ").replace(":", " ");
        let ws = get_whitespace_regex();
        let cols: Vec<&str> = ws.split(&normalized).filter(|s| !s.is_empty()).collect();

        // 格式通常有 13 列：[name, mtu, rx_b, rx_ok, rx_err, rx_drp, rx_ovr, tx_b, tx_ok, tx_err, tx_drp, tx_ovr, flag]
        if cols.len() >= 12 {
            let name = cols[0].to_string();
            let mtu = cols[1].parse::<u32>().unwrap_or(0);
            let rx_bytes = cols[2].parse::<u64>().unwrap_or(0);
            let rx_packets = cols[3].parse::<u64>().unwrap_or(0);
            let rx_errors = cols[4].parse::<u64>().unwrap_or(0);
            let rx_drops = cols[5].parse::<u64>().unwrap_or(0);
            let rx_overruns = cols[6].parse::<u64>().unwrap_or(0);
            let tx_bytes = cols[7].parse::<u64>().unwrap_or(0);
            let tx_packets = cols[8].parse::<u64>().unwrap_or(0);
            let tx_errors = cols[9].parse::<u64>().unwrap_or(0);
            let tx_drops = cols[10].parse::<u64>().unwrap_or(0);
            let tx_overruns = if cols.len() >= 13 {
                cols[11].parse::<u64>().unwrap_or(0)
            } else {
                0
            };
            let flags = if cols.len() >= 13 {
                cols[12].to_string()
            } else {
                cols.get(11).unwrap_or(&"").to_string()
            };

            interfaces.push(NetInterface {
                name,
                mtu,
                rx_bytes,
                rx_packets,
                rx_errors,
                rx_drops,
                rx_overruns,
                tx_bytes,
                tx_packets,
                tx_errors,
                tx_drops,
                tx_overruns,
                flags,
            });
        }
    }

    interfaces
}

/// 解析 netstat -a / -t / -u / -x / -p 输出
/// SylixOS 输出按区块划分：
/// --UNIX--:
/// TYPE FLAG STATUS LCONN SHUTD NREAD MAX BUFFER PATH
///
/// --PACKET--:
/// TYPE FLAG PROTOCOL INDEX MMAP MMAP SIZE TOTAL DROP
///
/// --TCP LISTEN--:
/// LOCAL REMOTE STATUS RETRANS RCV_WND SND_WND
///
/// --TCP--:
/// LOCAL REMOTE STATUS KA RETRANS RCV_WND SND_WND
///
/// --UDP--:
/// LOCAL6 REMOTE6 UDPLITE
pub fn parse_netstat_sockets(output: &str) -> Vec<NetSocket> {
    let mut sockets = Vec::new();
    let mut current_section = String::new();
    let ws = get_whitespace_regex();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("show net status") {
            continue;
        }

        // 区块头识别，如 "--UNIX--:"、"--TCP LISTEN--:"、"--TCP--:"、"--UDP--:"、"--PACKET--:"
        let cleaned_header = trimmed.replace("-", "").replace(":", "").trim().to_uppercase();
        if cleaned_header == "TCP LISTEN"
            || cleaned_header == "TCP"
            || cleaned_header == "UDP"
            || cleaned_header == "UNIX"
            || cleaned_header == "PACKET"
        {
            current_section = cleaned_header;
            continue;
        }

        let cols: Vec<&str> = ws.split(trimmed).filter(|s| !s.is_empty()).collect();
        if cols.is_empty() {
            continue;
        }

        // 过滤表头行
        let first_upper = cols[0].to_uppercase();
        if first_upper == "TYPE"
            || first_upper == "LOCAL"
            || first_upper == "LOCAL6"
            || first_upper == "STATUS"
            || first_upper == "PATH"
        {
            continue;
        }

        match current_section.as_str() {
            "TCP LISTEN" => {
                // LOCAL REMOTE STATUS RETRANS RCV_WND SND_WND
                // 示例: *:23 *:* LISTEN 0 65535 65535
                let local = cols[0].to_string();
                let remote = cols.get(1).unwrap_or(&"*:*").to_string();
                let status = cols.get(2).unwrap_or(&"LISTEN").to_string();
                let retrans = cols.get(3).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
                let rcv_wnd = cols.get(4).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                let snd_wnd = cols.get(5).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);

                sockets.push(NetSocket {
                    protocol: "TCP".to_string(),
                    local_addr: local,
                    remote_addr: remote,
                    status,
                    retrans,
                    rcv_wnd,
                    snd_wnd,
                    raw_info: None,
                });
            }
            "TCP" => {
                // LOCAL REMOTE STATUS (KA) RETRANS RCV_WND SND_WND
                // 示例: 192.168.2.37:23 192.168.2.105:63083 estab * 0 65535 1048576
                let local = cols[0].to_string();
                let remote = cols.get(1).unwrap_or(&"*:*").to_string();
                let status = cols.get(2).unwrap_or(&"ESTABLISHED").to_string();

                // 检查是否有 KA 字段（* 或 -）
                let (retrans, rcv_wnd, snd_wnd) = if cols.len() >= 7 {
                    let retrans = cols.get(4).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
                    let rcv_wnd = cols.get(5).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                    let snd_wnd = cols.get(6).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                    (retrans, rcv_wnd, snd_wnd)
                } else {
                    let retrans = cols.get(3).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
                    let rcv_wnd = cols.get(4).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                    let snd_wnd = cols.get(5).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                    (retrans, rcv_wnd, snd_wnd)
                };

                sockets.push(NetSocket {
                    protocol: "TCP".to_string(),
                    local_addr: local,
                    remote_addr: remote,
                    status,
                    retrans,
                    rcv_wnd,
                    snd_wnd,
                    raw_info: None,
                });
            }
            "UDP" => {
                // LOCAL6 REMOTE6 UDPLITE
                // 示例: *:161 *:* no
                let local = cols[0].to_string();
                let remote = cols.get(1).unwrap_or(&"*:*").to_string();
                let udplite = cols.get(2).unwrap_or(&"no");

                sockets.push(NetSocket {
                    protocol: "UDP".to_string(),
                    local_addr: local,
                    remote_addr: remote,
                    status: "-".to_string(),
                    retrans: 0,
                    rcv_wnd: 0,
                    snd_wnd: 0,
                    raw_info: Some(format!("UDPLite: {}", udplite)),
                });
            }
            "UNIX" => {
                // TYPE FLAG STATUS LCONN SHUTD NREAD MAX BUFFER PATH
                // 示例: stream NONBLOCK estab 0 rw 0 4096 /var/run/test.sock
                // PATH 列可为空（未命名 socket），此时末列是 MAX_BUFFER，不能当作路径
                let sock_type = cols[0];
                let flag = cols.get(1).unwrap_or(&"-");
                let status = cols.get(2).unwrap_or(&"-").to_string();
                let path = if cols.len() >= 8 {
                    cols[7..].join(" ")
                } else {
                    String::new()
                };
                let display_path = if path.is_empty() { "-" } else { path.as_str() };

                sockets.push(NetSocket {
                    protocol: "UNIX".to_string(),
                    local_addr: if path.is_empty() { "-".to_string() } else { path.clone() },
                    remote_addr: "-".to_string(),
                    status,
                    retrans: 0,
                    rcv_wnd: 0,
                    snd_wnd: 0,
                    raw_info: Some(format!(
                        "Type: {}, Flag: {}, Path: {}",
                        sock_type, flag, display_path
                    )),
                });
            }
            "PACKET" => {
                // TYPE FLAG PROTOCOL INDEX MMAP MMAP SIZE TOTAL DROP
                // 示例: raw NONBLOCK IPPROTO_IP 2 no 0 100 0
                let sock_type = cols[0];
                let proto = cols.get(2).unwrap_or(&"-");
                let if_idx = cols.get(3).unwrap_or(&"-");
                let total = cols.get(6).unwrap_or(&"0");
                let drop = cols.get(7).unwrap_or(&"0");

                sockets.push(NetSocket {
                    protocol: "PACKET".to_string(),
                    local_addr: format!("Index: {}", if_idx),
                    remote_addr: "-".to_string(),
                    status: "-".to_string(),
                    retrans: 0,
                    rcv_wnd: 0,
                    snd_wnd: 0,
                    raw_info: Some(format!(
                        "Type: {}, Protocol: {}, Total: {}, Drop: {}",
                        sock_type, proto, total, drop
                    )),
                });
            }
            _ => {
                // 未处于已知 section，尝试自动嗅探（如兼容直接带 IP/端口的行）
                if cols[0].contains(':') {
                    let local = cols[0].to_string();
                    let remote = cols.get(1).unwrap_or(&"*:*").to_string();
                    let status = cols.get(2).unwrap_or(&"-").to_string();
                    sockets.push(NetSocket {
                        protocol: "TCP".to_string(),
                        local_addr: local,
                        remote_addr: remote,
                        status,
                        retrans: 0,
                        rcv_wnd: 0,
                        snd_wnd: 0,
                        raw_info: None,
                    });
                }
            }
        }
    }

    sockets
}

/// 解析 netstat -r 路由表输出
/// 示例：
/// IPv4 Route Table:
/// Destination Gateway Flags RefCnt Use Metric Iface
/// 0.0.0.0 192.168.1.1 UG 0 0 1 en1
/// 192.168.1.0 0.0.0.0 U 0 0 1 en1
/// 127.0.0.1 127.0.0.1 UH 0 0 1 lo0
pub fn parse_netstat_routes(output: &str) -> Vec<RouteEntry> {
    let mut routes = Vec::new();
    let ws = get_whitespace_regex();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("IPv")
            || trimmed.starts_with("AODV")
            || trimmed.starts_with("Route")
            || trimmed.starts_with("show net status")
        {
            continue;
        }

        let cols: Vec<&str> = ws.split(trimmed).filter(|s| !s.is_empty()).collect();
        if cols.is_empty() {
            continue;
        }

        let first_upper = cols[0].to_uppercase();
        if first_upper == "DESTINATION" || first_upper == "DESTINATION(S)" {
            continue;
        }

        // 匹配字段：Destination Gateway Flags RefCnt Use Metric Iface
        if cols.len() >= 5 {
            let destination = cols[0].to_string();
            let gateway = cols[1].to_string();
            let flags = cols[2].to_string();

            let (refcnt, use_cnt, metric, iface) = if cols.len() >= 7 {
                (
                    cols[3].parse::<u32>().unwrap_or(0),
                    cols[4].parse::<u32>().unwrap_or(0),
                    cols[5].parse::<u32>().unwrap_or(0),
                    cols[6].to_string(),
                )
            } else if cols.len() == 6 {
                (
                    0,
                    0,
                    cols[3].parse::<u32>().unwrap_or(0),
                    cols[5].to_string(),
                )
            } else {
                (0, 0, 0, cols.last().copied().unwrap_or("").to_string())
            };

            routes.push(RouteEntry {
                destination,
                gateway,
                flags,
                refcnt,
                use_cnt,
                metric,
                iface,
            });
        }
    }

    routes
}

pub fn parse_netstat_stats(output: &str) -> NetStatistics {
    let mut stats = NetStatistics::default();
    let mut current_proto = String::new();
    let mut current_headers: Vec<String> = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("show net status") {
            continue;
        }
        stats.raw_lines.push(trimmed.to_string());

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        if (parts[0] == "proto" || parts[0] == "name")
            && parts.contains(&"xmit")
            && parts.contains(&"recv")
        {
            current_headers = parts.iter().map(|s| s.to_lowercase()).collect();
            current_proto.clear();
            continue;
        }

        if !current_headers.is_empty() && parts.len() >= 2 {
            let row_name = parts[0].to_uppercase();
            let target_map = match row_name.as_str() {
                "IP" => Some(&mut stats.ip),
                "TCP" => Some(&mut stats.tcp),
                "UDP" => Some(&mut stats.udp),
                "ICMP" => Some(&mut stats.icmp),
                _ => None,
            };

            if let Some(map) = target_map {
                for (i, part) in parts.iter().enumerate().skip(1) {
                    if i < current_headers.len() {
                        if let Ok(val) = part.parse::<u64>() {
                            let key = map_stat_column_name(&current_headers[i]);
                            map.insert(key, val);
                        }
                    }
                }
                continue;
            }
        }

        let lower = trimmed.to_lowercase();
        if lower.starts_with("ip statistics") || lower == "ip:" {
            current_proto = "ip".to_string();
            current_headers.clear();
            continue;
        } else if lower.starts_with("icmp statistics") || lower == "icmp:" {
            current_proto = "icmp".to_string();
            current_headers.clear();
            continue;
        } else if lower.starts_with("tcp statistics") || lower == "tcp:" {
            current_proto = "tcp".to_string();
            current_headers.clear();
            continue;
        } else if lower.starts_with("udp statistics") || lower == "udp:" {
            current_proto = "udp".to_string();
            current_headers.clear();
            continue;
        }

        if !current_proto.is_empty() {
            if let Some((k, v)) = parse_stat_key_value(trimmed) {
                match current_proto.as_str() {
                    "ip" => {
                        stats.ip.insert(k, v);
                    }
                    "icmp" => {
                        stats.icmp.insert(k, v);
                    }
                    "tcp" => {
                        stats.tcp.insert(k, v);
                    }
                    "udp" => {
                        stats.udp.insert(k, v);
                    }
                    _ => {}
                }
            }
        }
    }

    stats
}

fn map_stat_column_name(col: &str) -> String {
    match col {
        "xmit" => "发送报文 (xmit)".to_string(),
        "recv" => "接收报文 (recv)".to_string(),
        "fw" => "转发报文 (fw)".to_string(),
        "drop" => "丢弃报文 (drop)".to_string(),
        "chkerr" => "校验和错误 (chkerr)".to_string(),
        "lenerr" => "长度错误 (lenerr)".to_string(),
        "memerr" => "内存分配错误 (memerr)".to_string(),
        "rterr" => "路由错误 (rterr)".to_string(),
        "proterr" => "协议错误 (proterr)".to_string(),
        "opterr" => "选项错误 (opterr)".to_string(),
        "err" => "错误总数 (err)".to_string(),
        "cachehit" => "路由缓存命中 (cachehit)".to_string(),
        other => other.to_string(),
    }
}

fn parse_stat_key_value(line: &str) -> Option<(String, u64)> {
    if let Some((k, v)) = line.split_once(':') {
        let key = k.trim().to_string();
        if let Ok(num) = v.trim().split_whitespace().next().unwrap_or("").parse::<u64>() {
            return Some((key, num));
        }
    }
    None
}

async fn execute_netstat_command(cfg: &TargetConfig, cmd: &str) -> Result<String, String> {
    let addr = format!("{}:{}", cfg.ip, cfg.port);
    let mut client = TelnetClient::connect(
        &addr,
        &cfg.username,
        &cfg.password,
        Duration::from_secs(5),
    )
    .await
    .map_err(|e| format!("建立 Command Session 连接失败: {}", e))?;

    let output = client
        .execute_command(cmd, Duration::from_secs(8))
        .await
        .map_err(|e| format!("执行命令 {} 失败: {}", cmd, e))?;

    Ok(output)
}

pub async fn fetch_network_interfaces(cfg: &TargetConfig) -> Result<Vec<NetInterface>, String> {
    let output = execute_netstat_command(cfg, "netstat -i").await?;
    Ok(parse_netstat_interfaces(&output))
}

pub async fn fetch_network_sockets(
    cfg: &TargetConfig,
    protocol: Option<String>,
) -> Result<Vec<NetSocket>, String> {
    let cmd = match protocol.as_deref() {
        Some("TCP") => "netstat -t",
        Some("UDP") => "netstat -u",
        Some("UNIX") => "netstat -x",
        Some("PACKET") => "netstat -p",
        _ => "netstat -a",
    };
    let output = execute_netstat_command(cfg, cmd).await?;
    let mut sockets = parse_netstat_sockets(&output);

    // 如果指定了特定协议过滤，再次确保前端只接收目标协议
    if let Some(proto) = protocol {
        if proto != "ALL" {
            sockets.retain(|s| s.protocol.eq_ignore_ascii_case(&proto));
        }
    }

    Ok(sockets)
}

pub async fn fetch_network_routes(cfg: &TargetConfig) -> Result<Vec<RouteEntry>, String> {
    let output = execute_netstat_command(cfg, "netstat -r").await?;
    Ok(parse_netstat_routes(&output))
}

pub async fn fetch_network_stats(cfg: &TargetConfig) -> Result<NetStatistics, String> {
    let output = execute_netstat_command(cfg, "netstat -s").await?;
    Ok(parse_netstat_stats(&output))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_netstat_interfaces() {
        let raw = r#"
              RECEIVE                                TRANSMIT                                
FACE MTU     RX-BYTES     RX-OK  RX-ERR RX-DRP RX-OVR TX-BYTES  TX-OK  TX-ERR TX-DRP TX-OVR FLAG
en3 : 1500   0            0      0      0      0      0         0      0      0      0      UBEthG
en2 : 1500   935552351    15388  980    10     2      233707    4525   0      5      0      UBLEthG
lo0 : 0      168          3      0      0      0      168       3      0      0      0      UPL
"#;
        let list = parse_netstat_interfaces(raw);
        assert_eq!(list.len(), 3);

        assert_eq!(list[0].name, "en3");
        assert_eq!(list[0].mtu, 1500);
        assert_eq!(list[0].flags, "UBEthG");

        assert_eq!(list[1].name, "en2");
        assert_eq!(list[1].rx_bytes, 935552351);
        assert_eq!(list[1].rx_packets, 15388);
        assert_eq!(list[1].rx_errors, 980);
        assert_eq!(list[1].rx_drops, 10);
        assert_eq!(list[1].tx_bytes, 233707);
        assert_eq!(list[1].tx_packets, 4525);
        assert_eq!(list[1].flags, "UBLEthG");

        assert_eq!(list[2].name, "lo0");
        assert_eq!(list[2].mtu, 0);
        assert_eq!(list[2].rx_bytes, 168);
        assert_eq!(list[2].flags, "UPL");
    }

    #[test]
    fn test_parse_netstat_sockets() {
        let raw = r#"
--TCP LISTEN--:
LOCAL REMOTE STATUS RETRANS RCV_WND SND_WND
*:23 *:* LISTEN 0 65535 65535
0.0.0.0:80 0.0.0.0:0 LISTEN 0 65535 65535

--TCP--:
LOCAL REMOTE STATUS KA RETRANS RCV_WND SND_WND
192.168.2.37:23 192.168.2.105:63083 estab * 0 65535 1048576

--UDP--:
LOCAL6 REMOTE6 UDPLITE
*:161 *:* no

--UNIX--:
TYPE FLAG STATUS LCONN SHUTD NREAD MAX BUFFER PATH
stream NONBLOCK estab 0 rw 0 4096 /var/run/sylixos.sock
stream 4002 estab * no 0 65536
stream 4002 estab * no 0 4096 /var/run/my sock.sock

--PACKET--:
TYPE FLAG PROTOCOL INDEX MMAP MMAP SIZE TOTAL DROP
raw NONBLOCK IPPROTO_IP 2 no 0 100 0
"#;
        let sockets = parse_netstat_sockets(raw);
        assert_eq!(sockets.len(), 8);

        // TCP LISTEN
        assert_eq!(sockets[0].protocol, "TCP");
        assert_eq!(sockets[0].local_addr, "*:23");
        assert_eq!(sockets[0].status, "LISTEN");
        assert_eq!(sockets[0].rcv_wnd, 65535);

        assert_eq!(sockets[1].local_addr, "0.0.0.0:80");
        assert_eq!(sockets[1].status, "LISTEN");

        // TCP Connected
        assert_eq!(sockets[2].protocol, "TCP");
        assert_eq!(sockets[2].local_addr, "192.168.2.37:23");
        assert_eq!(sockets[2].remote_addr, "192.168.2.105:63083");
        assert_eq!(sockets[2].status, "estab");
        assert_eq!(sockets[2].snd_wnd, 1048576);

        // UDP
        assert_eq!(sockets[3].protocol, "UDP");
        assert_eq!(sockets[3].local_addr, "*:161");

        // UNIX
        assert_eq!(sockets[4].protocol, "UNIX");
        assert_eq!(sockets[4].local_addr, "/var/run/sylixos.sock");
        assert_eq!(sockets[4].status, "estab");

        // UNIX 空 PATH（未命名 socket）
        assert_eq!(sockets[5].protocol, "UNIX");
        assert_eq!(sockets[5].local_addr, "-");
        assert_eq!(sockets[5].status, "estab");
        assert!(sockets[5].raw_info.as_deref().unwrap().contains("Path: -"));

        // UNIX 带空格的 PATH
        assert_eq!(sockets[6].local_addr, "/var/run/my sock.sock");

        // PACKET
        assert_eq!(sockets[7].protocol, "PACKET");
        assert_eq!(sockets[7].local_addr, "Index: 2");
    }

    #[test]
    fn test_parse_netstat_sockets_real_board_capture() {
        // 真实板卡 netstat 回显：多空格分隔、UNIX 区块 PATH 列为空
        let raw = r#"
--UNIX--:
TYPE      FLAG STATUS  LCONN SHUTD      NREAD MAX_BUFFER PATH
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream    4002 estab       * no             0      65536
stream       2 estab       * no             0      65536
stream       2 estab       * no             1      65536
--PACKET--:
TYPE      FLAG PROTOCOL INDEX MMAP MMAP_SIZE TOTAL    DROP
--TCP LISTEN--:
LOCAL                 REMOTE                STATUS   RETRANS RCV_WND SND_WND
*:23                  *:*                   listen         0       0       0
*:3000                *:*                   listen         0       0       0
*:22                  *:*                   listen         0       0       0
*:21                  *:*                   listen         0       0       0
--TCP--:
LOCAL                 REMOTE                STATUS   KA RETRANS RCV_WND SND_WND
192.168.1.186:23      192.168.1.181:56907   estab    *        0  131070   65280
--UDP--:
LOCAL6                                       REMOTE6                                      UDPLITE
*:137                                        *:0                                          no
*:161                                        *:0                                          no
"#;
        let sockets = parse_netstat_sockets(raw);
        // 真实回显中 PACKET 区块只有表头没有数据行
        assert_eq!(sockets.len(), 21);

        let unix = &sockets[0..14];
        assert!(unix.iter().all(|s| s.protocol == "UNIX"));
        assert!(unix.iter().all(|s| s.local_addr == "-"));
        assert!(unix.iter().all(|s| s.status == "estab"));
        assert!(unix[0]
            .raw_info
            .as_deref()
            .unwrap()
            .starts_with("Type: stream, Flag: 4002"));

        let listen = &sockets[14..18];
        assert!(listen.iter().all(|s| s.protocol == "TCP"));
        assert!(listen.iter().all(|s| s.status == "listen"));

        let telnet = &sockets[18];
        assert_eq!(telnet.local_addr, "192.168.1.186:23");
        assert_eq!(telnet.remote_addr, "192.168.1.181:56907");
        assert_eq!(telnet.status, "estab");
        assert_eq!(telnet.rcv_wnd, 131070);
        assert_eq!(telnet.snd_wnd, 65280);

        let udp = &sockets[19..21];
        assert!(udp.iter().all(|s| s.protocol == "UDP"));
        assert_eq!(udp[0].local_addr, "*:137");
    }

    #[test]
    fn test_parse_netstat_routes() {
        let raw = r#"
IPv4 Route Table:
Destination Gateway Flags RefCnt Use Metric Iface
0.0.0.0 192.168.1.1 UG 0 0 1 en1
192.168.1.0 0.0.0.0 U 0 0 1 en1
127.0.0.1 127.0.0.1 UH 0 0 1 lo0
"#;
        let routes = parse_netstat_routes(raw);
        assert_eq!(routes.len(), 3);

        assert_eq!(routes[0].destination, "0.0.0.0");
        assert_eq!(routes[0].gateway, "192.168.1.1");
        assert_eq!(routes[0].flags, "UG");
        assert_eq!(routes[0].metric, 1);
        assert_eq!(routes[0].iface, "en1");

        assert_eq!(routes[2].destination, "127.0.0.1");
        assert_eq!(routes[2].iface, "lo0");
    }

    #[test]
    fn test_parse_netstat_stats() {
        let sylixos_raw = r#"
proto     xmit     recv     fw       drop     chkerr   lenerr   memerr   rterr    proterr  opterr   err      cachehit
LINK      15943    22054    0        0        0        0        0        0        0        0        0        0       
ETHARP    30       4498     0        381      0        0        0        0        381      0        0        231     
IP        15903    17160    0        0        0        0        0        0        0        0        0        0       
ND        7        1        0        0        0        0        0        0        0        0        0        0       

name      xmit     recv     fw       drop     chkerr   lenerr   memerr   rterr    proterr  opterr   err      cachehit
ICMP      2        2        0        2        0        0        0        0        2        0        0        0       
UDP       7        852      0        2        0        0        0        0        2        0        0        1       
TCP       15894    15831    0        15656    0        0        0        0        15656    0        0        123     

semaphore used     max      error   
          1        1        0       
mutex     used     max      error   
          4        4        0       
mbox      used     max      error   
          38       39       0       
"#;
        let stats = parse_netstat_stats(sylixos_raw);
        assert_eq!(stats.ip.get("发送报文 (xmit)"), Some(&15903));
        assert_eq!(stats.ip.get("接收报文 (recv)"), Some(&17160));
        assert_eq!(stats.tcp.get("发送报文 (xmit)"), Some(&15894));
        assert_eq!(stats.tcp.get("接收报文 (recv)"), Some(&15831));
        assert_eq!(stats.udp.get("接收报文 (recv)"), Some(&852));
        assert_eq!(stats.icmp.get("发送报文 (xmit)"), Some(&2));

        assert!(!stats.ip.contains_key("1 0"));
        assert!(!stats.ip.contains_key("4 0"));
        assert!(!stats.ip.contains_key("39 0"));

        let key_val_raw = r#"
IP Statistics:
  Total packets received: 15388
  Incoming packets discarded: 10
TCP Statistics:
  Active connections openings: 45
  Failed connection attempts: 2
"#;
        let kv_stats = parse_netstat_stats(key_val_raw);
        assert_eq!(kv_stats.ip.get("Total packets received"), Some(&15388));
        assert_eq!(kv_stats.ip.get("Incoming packets discarded"), Some(&10));
        assert_eq!(kv_stats.tcp.get("Active connections openings"), Some(&45));
    }
}
