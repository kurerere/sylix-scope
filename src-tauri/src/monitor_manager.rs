use crate::telnet_client::TelnetClient;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{watch, Mutex};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub mem_total: u64,  // KB
    pub mem_used: u64,   // KB
    pub mem_free: u64,   // KB
    pub mem_kernel: u64, // KB
    pub mem_app: u64,    // KB
    pub cpu_cores: Vec<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu: f64,
    pub mem: f64,
    pub cmdline: Option<String>,
    pub execfile: Option<String>,
    pub threads: Vec<ThreadInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ThreadInfo {
    pub name: String,
    pub tid: String,
    pub tid_decimal: u64,
    pub cpu: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MonitorPayload {
    pub metrics: SystemMetrics,
    pub processes: Vec<ProcessInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TargetConfig {
    pub ip: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

pub struct MonitorState {
    pub stop_tx: Option<watch::Sender<bool>>,
    pub is_running: bool,
    pub recording_id: Option<u64>,
    pub latest_snapshot: Option<MonitorPayload>,
    pub target_config: Option<TargetConfig>,
}

pub struct SharedState {
    pub state: Mutex<MonitorState>,
}


const PROCESS_SAMPLE_INTERVAL: Duration = Duration::from_secs(2);
const MEMORY_SAMPLE_INTERVAL: Duration = Duration::from_secs(5);

#[derive(Clone, Copy)]
pub struct MemoryMetrics {
    total: u64,
    used: u64,
    free: u64,
    kernel: u64,
    app: u64,
}

impl Default for MemoryMetrics {
    fn default() -> Self {
        Self {
            total: 1024 * 1024,
            used: 200 * 1024,
            free: 824 * 1024,
            kernel: 0,
            app: 200 * 1024,
        }
    }
}

fn should_sample(last_sample_at: Option<Instant>, now: Instant, interval: Duration) -> bool {
    last_sample_at.is_none_or(|last_sample_at| now.duration_since(last_sample_at) >= interval)
}

fn monitoring_interval() -> tokio::time::Interval {
    let mut interval = tokio::time::interval(Duration::from_secs(1));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    interval
}

// 缓存用于保存已经获取过的进程详情，防止重复拉取
use std::sync::OnceLock;

static PROCESS_DETAIL_CACHE: OnceLock<Arc<Mutex<HashMap<u32, (String, String)>>>> = OnceLock::new();

fn get_process_detail_cache() -> &'static Arc<Mutex<HashMap<u32, (String, String)>>> {
    PROCESS_DETAIL_CACHE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

async fn start_process_details_worker(
    ip: String,
    port: u16,
    username: String,
    password: String,
    mut rx: tokio::sync::mpsc::Receiver<u32>,
    mut stop_rx: watch::Receiver<bool>,
) {
    let addr = format!("{}:{}", ip, port);
    let mut telnet =
        match TelnetClient::connect(&addr, &username, &password, Duration::from_secs(5)).await {
            Ok(client) => {
                println!("[DEBUG-worker] 后台详情 Telnet 连接成功建立。");
                client
            }
            Err(e) => {
                println!("[DEBUG-worker] 后台详情 Telnet 连接失败: {}", e);
                return;
            }
        };

    let mut pending_pids = Vec::new();
    let mut interval = tokio::time::interval(Duration::from_millis(200));

    loop {
        tokio::select! {
            res = stop_rx.changed() => {
                if res.is_err() || *stop_rx.borrow() {
                    break;
                }
            }
            _ = interval.tick() => {
                pending_pids.clear();
                while let Ok(pid) = rx.try_recv() {
                    pending_pids.push(pid);
                    if pending_pids.len() >= 1 {
                        break;
                    }
                }

                if !pending_pids.is_empty() {
                    {
                        let cache = get_process_detail_cache().lock().await;
                        pending_pids.retain(|pid| !cache.contains_key(pid));
                    }
                }

                if !pending_pids.is_empty() {
                    let pid = pending_pids[0];
                    let cmdline = telnet
                        .execute_command(&format!("cat /proc/{pid}/cmdline"), Duration::from_secs(1))
                        .await
                        .ok()
                        .map(|output| output.trim().to_string())
                        .unwrap_or_default();
                    let execfile = telnet
                        .execute_command(&format!("ll /proc/{pid}"), Duration::from_secs(1))
                        .await
                        .ok()
                        .and_then(|output| parse_execfile(&output))
                        .unwrap_or_default();
                    if !cmdline.is_empty() || !execfile.is_empty() {
                        let mut cache = get_process_detail_cache().lock().await;
                        cache.insert(pid, (cmdline, execfile));
                    }
                }
            }
        }
    }
}

pub async fn start_monitoring_task<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    ip: String,
    port: u16,
    username: String,
    password: String,
    mut stop_rx: watch::Receiver<bool>,
) {
    let mut interval = monitoring_interval();
    let mut ps_map = HashMap::new();
    let mut last_process_sample_at = None;
    let mut memory_metrics = MemoryMetrics::default();
    let mut last_memory_sample_at = None;

    let addr = format!("{}:{}", ip, port);
    let mut telnet =
        match TelnetClient::connect(&addr, &username, &password, Duration::from_secs(5)).await {
            Ok(client) => {
                let _ = app.emit("monitor_status", "已连接，开始数据采集".to_string());
                client
            }
            Err(e) => {
                let _ = app.emit("monitor_error", format!("Telnet 连接失败: {}", e));
                return;
            }
        };

    let (tx, rx) = tokio::sync::mpsc::channel::<u32>(100);
    let stop_rx_clone = stop_rx.clone();
    let ip_clone = ip.clone();
    let username_clone = username.clone();
    let password_clone = password.clone();

    tokio::spawn(async move {
        start_process_details_worker(
            ip_clone,
            port,
            username_clone,
            password_clone,
            rx,
            stop_rx_clone,
        )
        .await;
    });

    loop {
        tokio::select! {
            res = stop_rx.changed() => {
                if res.is_err() {
                    break;
                }
                if *stop_rx.borrow() {
                    let is_running = {
                        let lock = app.state::<SharedState>();
                        let state_lock = lock.state.lock().await;
                        state_lock.is_running
                    };
                    if !is_running {
                        let _ = app.emit("monitor_status", "监控已停止".to_string());
                    }
                    break;
                }
            }
            _ = interval.tick() => {
                let mut cpu_usage = 0.0;
                let mut cpu_cores = Vec::new();
                let mut cpu_map = HashMap::new();
                let mut threads_by_pid = HashMap::new();
                match telnet.execute_command("top", Duration::from_secs(3)).await {
                    Ok(top_out) => {
                        let (parsed_cpu_map, parsed_sys_cpu, parsed_cores, parsed_threads_by_pid) = parse_sylixos_top(&top_out);
                        cpu_map = parsed_cpu_map;
                        cpu_usage = parsed_sys_cpu;
                        cpu_cores = parsed_cores;
                        threads_by_pid = parsed_threads_by_pid;
                    }
                    Err(_e) => {}
                }

                let now = Instant::now();
                if should_sample(last_process_sample_at, now, PROCESS_SAMPLE_INTERVAL) {
                    if let Ok(ps_out) = telnet.execute_command("ps", Duration::from_secs(2)).await {
                        ps_map = parse_sylixos_ps(&ps_out);
                    }
                    last_process_sample_at = Some(Instant::now());
                }

                if should_sample(last_memory_sample_at, now, MEMORY_SAMPLE_INTERVAL) {
                    if let Ok(mem_out) = telnet.execute_command("free", Duration::from_secs(2)).await {
                        if let Some(memory) = build_memory_metrics(&mem_out, &ps_map) {
                            memory_metrics = memory;
                        }
                    }
                    last_memory_sample_at = Some(Instant::now());
                }

                let mut payload = assemble_payload(
                    cpu_usage,
                    cpu_cores,
                    &cpu_map,
                    &threads_by_pid,
                    &ps_map,
                    memory_metrics,
                );

                let current_pids: HashSet<u32> = payload.processes.iter().map(|p| p.pid).collect();

                {
                    let mut cache = get_process_detail_cache().lock().await;
                    cache.retain(|pid, _| current_pids.contains(pid));
                }

                {
                    let cache = get_process_detail_cache().lock().await;
                    for pid in &current_pids {
                        if *pid != 0 && !cache.contains_key(pid) {
                            let _ = tx.try_send(*pid);
                        }
                        if let Some(details) = cache.get(pid) {
                            if let Some(process) = payload.processes.iter_mut().find(|p| p.pid == *pid) {
                                process.cmdline = if details.0.is_empty() { None } else { Some(details.0.clone()) };
                                process.execfile = if details.1.is_empty() { None } else { Some(details.1.clone()) };
                            }
                        }
                    }
                }

                let rec_id = {
                    let lock = app.state::<SharedState>();
                    let state_lock = lock.state.lock().await;
                    state_lock.recording_id
                };

                if let Some(rid) = rec_id {
                    let metrics_clone = payload.metrics.clone();
                    let procs_clone = payload.processes.clone();
                    let app_clone = app.clone();
                    tokio::spawn(async move {
                        let db = app_clone.state::<crate::history_db::HistoryDb>();
                        let now_secs = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0);
                        let _ = db.with_conn(|conn| {
                            crate::history_db::insert_metrics(conn, rid, now_secs, &metrics_clone)?;
                            crate::history_db::insert_processes(conn, rid, now_secs, &procs_clone)
                        });
                    });
                }

                {
                    let lock = app.state::<SharedState>();
                    let mut state_lock = lock.state.lock().await;
                    state_lock.latest_snapshot = Some(payload.clone());
                }

                let _ = app.emit("monitor_data", payload);
            }
        }
    }
}

pub(crate) fn parse_free_output(out: &str, v_app_opt: Option<u64>) -> Option<(u64, u64, u64, u64, u64)> {
    let re_vmm_size = Regex::new(r"(?i)VMM-Physical memory size:\s*(\d+)\s*(KB|MB|GB)?").unwrap();
    let re_vmm_free = Regex::new(r"(?i)VMM-Physical memory free:\s*(\d+)\s*(KB|MB|GB)?").unwrap();
    let re_all_size = Regex::new(r"(?i)ALL-Physical memory size:\s*(\d+)\s*(KB|MB|GB)?").unwrap();
    let re_kersys = Regex::new(r"(?i)kersys\s+(\d+)\s*(KB|MB|GB)?\s+(\d+)\s*(KB|MB|GB)?").unwrap();
    let re_vmm_zone =
        Regex::new(r"^\s*(\d+)\s+[0-9a-fA-F]+\s+[0-9a-fA-F]+\s+(\d+)\s+\d+\s+[0-9a-fA-F]+\s+(\d+)")
            .unwrap();

    let mut vmm_size = None;
    let mut vmm_free = None;
    let mut all_size = None;
    let mut kersys_used = None;
    let mut zone_free_kb = 0;

    for line in out.lines() {
        let trimmed = line.trim();
        if let Some(caps) = re_kersys.captures(trimmed) {
            let used_val = caps.get(3).and_then(|m| m.as_str().parse::<u64>().ok());
            let used_unit = caps.get(4).map(|m| m.as_str()).unwrap_or("KB");
            if let Some(u) = used_val {
                kersys_used = Some(parse_to_kb(u, used_unit));
            }
        }
        if let Some(caps) = re_vmm_zone.captures(trimmed) {
            let ps = caps
                .get(2)
                .and_then(|m| m.as_str().parse::<u32>().ok())
                .unwrap_or(0);
            let freepage = caps
                .get(3)
                .and_then(|m| m.as_str().parse::<u64>().ok())
                .unwrap_or(0);
            if ps >= 10 {
                zone_free_kb += freepage * (1 << (ps - 10));
            }
        }
        if let Some(caps) = re_vmm_size.captures(trimmed) {
            let val = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
            let unit = caps.get(2).map(|m| m.as_str()).unwrap_or("MB");
            if let Some(v) = val {
                vmm_size = Some(parse_to_kb(v, unit));
            }
        }
        if let Some(caps) = re_vmm_free.captures(trimmed) {
            let val = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
            let unit = caps.get(2).map(|m| m.as_str()).unwrap_or("MB");
            if let Some(v) = val {
                vmm_free = Some(parse_to_kb(v, unit));
            }
        }
        if let Some(caps) = re_all_size.captures(trimmed) {
            let val = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
            let unit = caps.get(2).map(|m| m.as_str()).unwrap_or("MB");
            if let Some(v) = val {
                all_size = Some(parse_to_kb(v, unit));
            }
        }
    }

    if vmm_free.is_none() && zone_free_kb > 0 {
        vmm_free = Some(zone_free_kb);
    }

    if let Some(free_val) = vmm_free {
        let total_val = all_size.or(vmm_size);
        if let Some(t) = total_val {
            let used_val = if t >= free_val { t - free_val } else { 0 };
            let vmm_total_val = vmm_size.unwrap_or(t);
            let kernel_static = if t >= vmm_total_val {
                t - vmm_total_val
            } else {
                0
            };
            let vmm_used = if vmm_total_val >= free_val {
                vmm_total_val - free_val
            } else {
                0
            };

            let v_kernel = kersys_used.unwrap_or(0);

            // Reconcile application virtual memory v_app
            let v_app = match v_app_opt {
                Some(val) if val > 0 => val,
                _ => {
                    // Fallback estimation when no ps info is provided
                    if vmm_used > v_kernel {
                        vmm_used - v_kernel
                    } else {
                        // If vmm_used <= v_kernel, assume 10% of vmm_used is app memory
                        // (at least 1024 KB to avoid 0 KB app memory if possible)
                        (vmm_used / 10).max(1024).min(vmm_used)
                    }
                }
            };

            let v_total = v_kernel + v_app;
            let (kernel_dynamic, app_val) = if v_total > 0 {
                // Distribute vmm_used proportionally
                let k_dyn = (vmm_used as f64 * (v_kernel as f64 / v_total as f64)) as u64;
                let a_val = vmm_used - k_dyn;
                (k_dyn, a_val)
            } else {
                (0, vmm_used)
            };

            let kernel_val = kernel_static + kernel_dynamic;
            return Some((t, used_val, free_val, kernel_val, app_val));
        }
    }

    // 匹配 SylixOS 旧格式:
    // total: 1048576 KB
    // used:  209716 KB
    // free:  838860 KB
    let re_total = Regex::new(r"total:\s*(\d+)").unwrap();
    let re_used = Regex::new(r"used:\s*(\d+)").unwrap();
    let re_free = Regex::new(r"free:\s*(\d+)").unwrap();

    let mut total = None;
    let mut used = None;
    let mut free = None;

    for line in out.lines() {
        let clean_line = line.to_lowercase();
        if let Some(caps) = re_total.captures(&clean_line) {
            total = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
        }
        if let Some(caps) = re_used.captures(&clean_line) {
            used = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
        }
        if let Some(caps) = re_free.captures(&clean_line) {
            free = caps.get(1).and_then(|m| m.as_str().parse::<u64>().ok());
        }
    }

    if let (Some(t), Some(u), Some(f)) = (total, used, free) {
        return Some((t, u, f, 0, u));
    }

    // 匹配标准的 Linux free 格式:
    // Mem:       1017464       62164      955300 ...
    for line in out.lines() {
        if line.trim().starts_with("Mem:") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 {
                let t = parts[1].parse::<u64>().ok();
                let u = parts[2].parse::<u64>().ok();
                let f = parts[3].parse::<u64>().ok();
                if let (Some(t_val), Some(u_val), Some(f_val)) = (t, u, f) {
                    return Some((t_val, u_val, f_val, 0, u_val));
                }
            }
        }
    }

    None
}

fn parse_to_kb(val: u64, unit: &str) -> u64 {
    match unit.to_uppercase().as_str() {
        "GB" => val * 1024 * 1024,
        "KB" => val,
        _ => val * 1024, // 默认 MB
    }
}

pub(crate) fn parse_sylixos_ps(out: &str) -> HashMap<u32, (String, u64)> {
    let ansi_re = Regex::new(r"\[[0-9;]*m").unwrap();
    let clean_out = ansi_re.replace_all(out, "");
    let mut ps_map = HashMap::new();
    for line in clean_out.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 6 {
            continue;
        }
        if parts[0] == "NAME" || parts[0].starts_with('-') {
            continue;
        }
        if let Ok(pid) = parts[3].parse::<u32>() {
            let name = if pid == 0 {
                "kernel".to_string()
            } else {
                parts[0].to_string()
            };
            let mem_kb = if pid == 0 {
                0
            } else {
                let mem_str = parts[5].to_lowercase();
                if mem_str.ends_with("kb") {
                    mem_str.replace("kb", "").parse::<u64>().unwrap_or(0)
                } else if mem_str.ends_with("mb") {
                    mem_str.replace("mb", "").parse::<u64>().unwrap_or(0) * 1024
                } else if mem_str.ends_with("gb") {
                    mem_str.replace("gb", "").parse::<u64>().unwrap_or(0) * 1024 * 1024
                } else {
                    mem_str.parse::<u64>().unwrap_or(0)
                }
            };
            ps_map.insert(pid, (name, mem_kb));
        }
    }
    ps_map
}

fn parse_execfile(out: &str) -> Option<String> {
    let ansi_re = Regex::new(r"\[[0-9;]*m").unwrap();
    out.lines()
        .find_map(|line| {
            line.contains("exe")
                .then(|| line.split_once("->"))
                .flatten()
        })
        .map(|(_, path)| ansi_re.replace_all(path.trim(), "").into_owned())
}

fn build_processes(
    ps_map: &HashMap<u32, (String, u64)>,
    cpu_map: &HashMap<u32, f64>,
    threads_by_pid: &HashMap<u32, Vec<ThreadInfo>>,
) -> Vec<ProcessInfo> {
    let mut pids: HashSet<u32> = ps_map.keys().chain(cpu_map.keys()).copied().collect();
    let mut processes = Vec::with_capacity(pids.len());

    for pid in pids.drain() {
        let (name, mem) = ps_map
            .get(&pid)
            .map(|(name, mem)| (name.clone(), *mem as f64))
            .unwrap_or_else(|| ("未知进程".to_string(), 0.0));
        processes.push(ProcessInfo {
            pid,
            name,
            cpu: *cpu_map.get(&pid).unwrap_or(&0.0),
            mem,
            cmdline: None,
            execfile: None,
            threads: threads_by_pid.get(&pid).cloned().unwrap_or_default(),
        });
    }

    processes
}

/// 内存采样装配：以 ps 的用户态内存合计（v_app）调和 app/kernel 占比。
/// Monitor Engine 与 MCP force_fresh 共用，保证两条路径产出一致数字。
pub(crate) fn build_memory_metrics(
    mem_out: &str,
    ps_map: &HashMap<u32, (String, u64)>,
) -> Option<MemoryMetrics> {
    let v_app: u64 = ps_map.values().map(|(_, mem)| *mem).sum();
    parse_free_output(mem_out, Some(v_app))
        .map(|(total, used, free, kernel, app)| MemoryMetrics { total, used, free, kernel, app })
}

/// 遥测快照装配：top/ps 解析结果 + 内存指标 → MonitorPayload。
/// pid 0 统一打上 kernel 标记，cmdline/execfile 由详情缓存后续合并。
pub(crate) fn assemble_payload(
    sys_cpu: f64,
    cpu_cores: Vec<f64>,
    cpu_map: &HashMap<u32, f64>,
    threads_by_pid: &HashMap<u32, Vec<ThreadInfo>>,
    ps_map: &HashMap<u32, (String, u64)>,
    memory: MemoryMetrics,
) -> MonitorPayload {
    let raw_processes = build_processes(ps_map, cpu_map, threads_by_pid);
    let mut processes = Vec::with_capacity(raw_processes.len());
    for rp in raw_processes {
        let (cmdline, execfile) = if rp.pid == 0 {
            (Some("kernel".to_string()), Some("kernel".to_string()))
        } else {
            (None, None)
        };
        processes.push(ProcessInfo {
            pid: rp.pid,
            name: rp.name,
            cpu: rp.cpu,
            mem: rp.mem,
            cmdline,
            execfile,
            threads: rp.threads,
        });
    }

    MonitorPayload {
        metrics: SystemMetrics {
            cpu_usage: sys_cpu,
            mem_total: memory.total,
            mem_used: memory.used,
            mem_free: memory.free,
            mem_kernel: memory.kernel,
            mem_app: memory.app,
            cpu_cores,
        },
        processes,
    }
}

pub(crate) fn parse_sylixos_top(
    out: &str,
) -> (
    HashMap<u32, f64>,
    f64,
    Vec<f64>,
    HashMap<u32, Vec<ThreadInfo>>,
) {
    let ansi_re = Regex::new(r"\[[0-9;]*m").unwrap();
    let clean_out = ansi_re.replace_all(out, "");
    let core_re1 = Regex::new(r"(?i)CPU\s*(\d+).*?([\d\.]+)%\s*idle").unwrap();
    let core_re2 = Regex::new(r"(?i)CPU\s*(\d+)\s*(?:idle|free)\s*:\s*([\d\.]+)%").unwrap();
    let mut cpu_map: HashMap<u32, f64> = HashMap::new();
    let mut total_idle_cpu = 0.0;
    let mut parsed_cores = HashMap::new();
    let mut t_idle_map = HashMap::new();
    let mut threads_by_pid: HashMap<u32, Vec<ThreadInfo>> = HashMap::new();
    for line in clean_out.lines() {
        let trimmed = line.trim();
        if let Some(caps) = core_re1
            .captures(trimmed)
            .or_else(|| core_re2.captures(trimmed))
        {
            if let (Some(idx_str), Some(idle_str)) = (caps.get(1), caps.get(2)) {
                if let (Ok(idx), Ok(idle_val)) = (
                    idx_str.as_str().parse::<usize>(),
                    idle_str.as_str().parse::<f64>(),
                ) {
                    let usage_val = (100.0 - idle_val).max(0.0).min(100.0);
                    parsed_cores.insert(idx, usage_val);
                }
            }
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        let len = parts.len();
        if len < 6 {
            continue;
        }
        if parts[0] == "NAME" || parts[0].starts_with('-') {
            continue;
        }

        let pid_str = parts[len - 4];
        let tid_str = parts[len - 5];
        let cpu_str = parts[len - 2].replace('%', "");
        let name = parts[..len - 5].join(" ");

        if let (Ok(pid), Ok(cpu_val)) = (pid_str.parse::<u32>(), cpu_str.parse::<f64>()) {
            let clean_name = name.replace('_', " ");
            if clean_name.starts_with("t idle") || name.starts_with("t_idle") {
                total_idle_cpu += cpu_val;
                let core_num_str: String = name.chars().filter(|c| c.is_ascii_digit()).collect();
                if let Ok(core_idx) = core_num_str.parse::<usize>() {
                    t_idle_map.insert(core_idx, cpu_val);
                }
            } else {
                *cpu_map.entry(pid).or_insert(0.0) += cpu_val;
                if let Ok(tid_decimal) = u64::from_str_radix(tid_str, 16) {
                    threads_by_pid.entry(pid).or_default().push(ThreadInfo {
                        name: name.to_string(),
                        tid: tid_str.to_string(),
                        tid_decimal,
                        cpu: cpu_val,
                    });
                }
            }
        }
    }
    let system_cpu = if total_idle_cpu > 0.0 {
        (100.0 - total_idle_cpu).max(0.0).min(100.0)
    } else {
        let total_active: f64 = cpu_map.values().sum();
        total_active.min(100.0)
    };
    let mut cpu_cores = Vec::new();
    if !parsed_cores.is_empty() {
        let max_idx = parsed_cores.keys().max().copied().unwrap_or(0);
        cpu_cores.resize(max_idx + 1, 0.0);
        for (idx, val) in parsed_cores {
            cpu_cores[idx] = val;
        }
    } else if !t_idle_map.is_empty() {
        let core_count = t_idle_map.len();
        let max_idx = t_idle_map.keys().max().copied().unwrap_or(0);
        cpu_cores.resize(max_idx + 1, 0.0);
        for (&idx, &idle_pct) in &t_idle_map {
            let usage_val = (100.0 - (idle_pct * core_count as f64)).max(0.0).min(100.0);
            cpu_cores[idx] = usage_val;
        }
    }
    for threads in threads_by_pid.values_mut() {
        threads.sort_by(|left, right| right.cpu.total_cmp(&left.cpu));
    }
    (cpu_map, system_cpu, cpu_cores, threads_by_pid)
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    #[tokio::test(start_paused = true)]
    async fn monitoring_interval_skips_ticks_missed_while_a_sample_is_running() {
        let mut interval = super::monitoring_interval();
        interval.tick().await;

        tokio::time::advance(Duration::from_secs(3)).await;
        interval.tick().await;

        assert!(tokio::time::timeout(Duration::from_millis(1), interval.tick())
            .await
            .is_err());
    }

    use super::*;

    const FREE_SAMPLE_OUTPUT: &str = r#"
heap show >>

     HEAP         TOTAL      USED     MAX USED  SEGMENT USED
--------------- ---------- ---------- ---------- ------- ----
kersys           455886KB    93235KB   106022KB   24142  20%

vmm physical zone show >>

ZONE     PHYSICAL         SIZE     PS AFFI       PGD        FREEPAGE  DMA  USED
----- ---------------- ------------ -- ---- ---------------- -------- ----- ----
   0         2a500000     30000000 16    0          f9db200    12174 true    0%
   1           200000      8200000 16    0          f9db200     1634 false   21%
   2         5a500000     95b00000 16    0          f9db200     37401 false   2%
   3        100000000    100000000 16    0          f9db200     65536 false   0%
   4        2f0000000     10000000 16    0          f9db200     2470 false  39%

ALL-Physical memory size:  8174MB
VMM-Physical memory size:  7645MB
VMM-Physical memory free:  7450MB
"#;

    #[test]
    fn test_build_memory_metrics_uses_ps_sum_as_app_hint() {
        let mut ps_map = HashMap::new();
        ps_map.insert(41, ("app_a".to_string(), 100_000u64));
        ps_map.insert(52, ("app_b".to_string(), 50_000u64));

        let memory = build_memory_metrics(FREE_SAMPLE_OUTPUT, &ps_map).expect("解析应成功");

        let v_app: u64 = ps_map.values().map(|(_, mem)| *mem).sum();
        let expected = parse_free_output(FREE_SAMPLE_OUTPUT, Some(v_app)).unwrap();
        assert_eq!(
            (memory.total, memory.used, memory.free, memory.kernel, memory.app),
            expected
        );
    }

    #[test]
    fn test_assemble_payload_tags_kernel_and_propagates_memory() {
        let mut cpu_map = HashMap::new();
        cpu_map.insert(0u32, 3.0);
        cpu_map.insert(41u32, 12.0);
        let mut ps_map = HashMap::new();
        ps_map.insert(41u32, ("app_main".to_string(), 2048u64));
        let memory = MemoryMetrics {
            total: 1024 * 1024,
            used: 512 * 1024,
            free: 512 * 1024,
            kernel: 128 * 1024,
            app: 384 * 1024,
        };

        let payload = assemble_payload(
            15.0,
            vec![10.0, 20.0],
            &cpu_map,
            &HashMap::new(),
            &ps_map,
            memory,
        );

        assert_eq!(payload.metrics.cpu_usage, 15.0);
        assert_eq!(payload.metrics.cpu_cores, vec![10.0, 20.0]);
        assert_eq!(payload.metrics.mem_app, 384 * 1024);

        let kernel = payload
            .processes
            .iter()
            .find(|p| p.pid == 0)
            .expect("pid 0 应装配为 kernel 标记进程");
        assert_eq!(kernel.cmdline.as_deref(), Some("kernel"));
        assert_eq!(kernel.execfile.as_deref(), Some("kernel"));

        let app = payload.processes.iter().find(|p| p.pid == 41).unwrap();
        assert_eq!(app.cmdline, None);
    }

    #[test]
    fn test_parse_free_sylixos() {
        let out = r#"
heap show >>

     HEAP         TOTAL      USED     MAX USED  SEGMENT USED
-------------- ---------- ---------- ---------- ------- ----
kersys           455886KB    93235KB   106022KB   24142  20%

vmm physical zone show >>

ZONE     PHYSICAL         SIZE     PS AFFI       PGD        FREEPAGE  DMA  USED
---- ---------------- ------------ -- ---- ---------------- -------- ----- ----
   0         2a500000     30000000 16    0          f9db200    12174 true    0%
   1           200000      8200000 16    0          f9db200     1634 false  21%
   2         5a500000     95b00000 16    0          f9db200    37401 false   2%
   3        100000000    100000000 16    0          f9db200     65536 false   0%
   4        2f0000000     10000000 16    0          f9db200     2470 false  39%

ALL-Physical memory size:  8174MB
VMM-Physical memory size:  7645MB
VMM-Physical memory free:  7450MB
"#;
        let res = parse_free_output(out, None);
        assert!(res.is_some());
        let (total, used, free, kernel, app) = res.unwrap();
        assert_eq!(total, 8174 * 1024);
        assert_eq!(free, 7450 * 1024);
        assert_eq!(used, (8174 - 7450) * 1024);

        let expected_kernel_static = (8174 - 7645) * 1024;
        let expected_kernel_dynamic = 93235;
        assert_eq!(kernel, expected_kernel_static + expected_kernel_dynamic);
        assert_eq!(
            app,
            used - (expected_kernel_static + expected_kernel_dynamic)
        );
    }

    #[test]
    fn test_parse_free_sylixos_kernel_overflow() {
        let out = r#"
heap show >>

     HEAP         TOTAL      USED     MAX USED  SEGMENT USED
-------------- ---------- ---------- ---------- ------- ----
kersys           455886KB    89190KB   106022KB   24142  20%

vmm physical zone show >>

ZONE     PHYSICAL         SIZE     PS AFFI       PGD        FREEPAGE  DMA  USED
---- ---------------- ------------ -- ---- ---------------- -------- ----- ----
   0         2a500000     30000000 16    0          f9db200     7190 true    0%

ALL-Physical memory size:  1008MB
VMM-Physical memory size:  512MB
VMM-Physical memory free:  449MB
"#;
        // Total = 1008 MB = 1032192 KB
        // VMM physical size = 512 MB = 524288 KB
        // VMM free = 449 MB = 459776 KB
        // kernel_static = 1008 - 512 = 496 MB = 507904 KB
        // vmm_used = 524288 - 459776 = 64512 KB
        // v_kernel (kersys used) = 89190 KB
        //
        // In old math: kernel = kernel_static + v_kernel = 507904 + 89190 = 597094 KB
        // But total used physical memory = 1032192 - 459776 = 572416 KB.
        // Thus kernel (597094 KB) > used (572416 KB), which overflows.
        //
        // Under new proportional math (with v_app = 120MB = 122880 KB):
        // v_total = v_kernel + v_app = 89190 + 122880 = 212070 KB
        // kernel_dynamic = vmm_used * (v_kernel / v_total) = 64512 * 89190 / 212070 = 27131 KB
        // app_val = vmm_used - kernel_dynamic = 64512 - 27131 = 37381 KB
        // kernel_val = kernel_static + kernel_dynamic = 507904 + 27131 = 535035 KB

        let res = parse_free_output(out, Some(122880));
        assert!(res.is_some());
        let (total, used, free, kernel, app) = res.unwrap();
        assert_eq!(total, 1008 * 1024);
        assert_eq!(free, 449 * 1024);
        assert_eq!(used, (1008 - 449) * 1024);

        assert_eq!(kernel, 507904 + 27131);
        assert_eq!(app, 37381);
        assert_eq!(kernel + app, used);
    }

    #[test]
    fn test_parse_ps_sylixos() {
        let out = r#"
      NAME            FATHER      STAT  PID   GRP    MEMORY    UID   GID   USER
---------------- ---------------- ---- ----- ----- ---------- ----- ----- ------
kernel           <orphan>         R        0     0        0KB     0     0 root
javascript       javascript       R       21     9    40320KB     0     0 root
javascript       javascript       R       20     9    16128KB     0     0 root
sshd             <orphan>         R        1     1     7808KB     0     0 root
"#;
        let map = parse_sylixos_ps(out);
        assert_eq!(map.len(), 4);
        assert!(map.contains_key(&0));
        assert!(map.contains_key(&21));
        assert!(map.contains_key(&20));
        assert!(map.contains_key(&1));

        let kern = map.get(&0).unwrap();
        assert_eq!(kern.0, "kernel");
        assert_eq!(kern.1, 0);

        let js21 = map.get(&21).unwrap();
        assert_eq!(js21.0, "javascript");
        assert_eq!(js21.1, 40320);

        let sshd = map.get(&1).unwrap();
        assert_eq!(sshd.0, "sshd");
        assert_eq!(sshd.1, 7808);
    }

    #[test]
    fn test_build_processes_keeps_cpu_pid_missing_from_ps() {
        let ps_map = HashMap::from([(10, ("known".to_string(), 1024))]);
        let cpu_map = HashMap::from([(10, 1.5), (99, 20.0)]);

        let processes = build_processes(&ps_map, &cpu_map, &HashMap::new());

        assert_eq!(processes.len(), 2);
        let missing_process = processes.iter().find(|process| process.pid == 99).unwrap();
        assert_eq!(missing_process.name, "未知进程");
        assert_eq!(missing_process.cpu, 20.0);
        assert_eq!(missing_process.mem, 0.0);
    }

    #[test]
    fn test_build_processes_combines_ps_cpu_and_thread_samples() {
        let ps_map = HashMap::from([(21, ("javascript".to_string(), 40_320))]);
        let cpu_map = HashMap::from([(21, 2.0)]);
        let expected_threads = vec![ThreadInfo {
            name: "pthread".to_string(),
            tid: "40000a3".to_string(),
            tid_decimal: 67_109_027,
            cpu: 1.2,
        }];
        let threads_by_pid = HashMap::from([(21, expected_threads.clone())]);

        let processes = build_processes(&ps_map, &cpu_map, &threads_by_pid);

        let process = processes.iter().find(|process| process.pid == 21).unwrap();
        assert_eq!(process.name, "javascript");
        assert_eq!(process.cpu, 2.0);
        assert_eq!(process.mem, 40_320.0);
        assert_eq!(process.threads.len(), 1);
        assert_eq!(process.threads[0].tid, expected_threads[0].tid);
        assert_eq!(
            process.threads[0].tid_decimal,
            expected_threads[0].tid_decimal
        );
    }

    #[test]
    fn test_should_sample_only_when_interval_has_elapsed() {
        let start = std::time::Instant::now();
        let interval = Duration::from_secs(5);

        assert!(should_sample(None, start, interval));
        assert!(!should_sample(
            Some(start),
            start + Duration::from_secs(4),
            interval
        ));
        assert!(should_sample(Some(start), start + interval, interval));
    }

    #[test]
    fn test_parse_top_sylixos() {
        let out = r#"
       NAME        TID    PID  PRI   CPU   KERN
---------------- ------- ----- --- ------ ------
top              4000126     0 150   1.5%   0.0%
pthread          40000a3    21 200   1.2%   0.0%
pthread          40000a2    21 200   0.8%   0.0%
t_idle7          4000007     0 255  12.5%   0.0%
t_idle6          4000006     0 255  12.5%   0.0%
t_idle5          4000005     0 255  12.5%   0.0%
t_idle4          4000004     0 255  12.5%   0.0%
t_idle3          4000003     0 255  12.5%   0.0%
t_idle2          4000002     0 255  12.5%   0.0%
t_idle1          4000001     0 255  12.5%   0.0%
t_idle0          4000000     0 255  12.5%   0.0%
"#;
        let (cpu_map, sys_cpu, cpu_cores, threads_by_pid) = parse_sylixos_top(out);
        assert_eq!(sys_cpu, 100.0 - (12.5 * 8.0));
        assert_eq!(sys_cpu, 0.0);
        assert_eq!(cpu_cores.len(), 8);
        for val in cpu_cores {
            assert_eq!(val, 0.0);
        }

        let js_cpu = cpu_map.get(&21).unwrap();
        assert_eq!(*js_cpu, 2.0); // 1.2% + 0.8% = 2.0%

        let kern_cpu = cpu_map.get(&0).unwrap();
        assert_eq!(*kern_cpu, 1.5);

        let js_threads = threads_by_pid.get(&21).unwrap();
        assert_eq!(js_threads.len(), 2);
        assert_eq!(js_threads[0].name, "pthread");
        assert_eq!(js_threads[0].tid, "40000a3");
        assert_eq!(js_threads[0].tid_decimal, 67_109_027);
        assert_eq!(js_threads[0].cpu, 1.2);
        assert_eq!(js_threads[1].tid, "40000a2");
        assert_eq!(js_threads[1].cpu, 0.8);
        assert!(threads_by_pid
            .get(&0)
            .is_some_and(|threads| threads.iter().all(|thread| thread.name != "t_idle7")));
    }

    #[test]
    fn test_parse_execfile_from_proc_listing() {
        let listing = "lrwxrwxrwx 1 root root 0 exe -> /apps/ecsd-cpp/ecsd-vsoa++\n";

        assert_eq!(
            parse_execfile(&listing),
            Some("/apps/ecsd-cpp/ecsd-vsoa++".to_string())
        );
    }

    #[test]
    fn test_parse_execfile_removes_ansi_color_codes() {
        let listing = "lrwxrwxrwx 1 root root 0 exe -> [32m/apps/service[0m\n";

        assert_eq!(parse_execfile(listing), Some("/apps/service".to_string()));
    }

    #[test]
    fn test_parse_execfile_returns_none_without_exe_symlink() {
        let listing = "drwxr-xr-x 1 root root 0 fd\n-r--r--r-- 1 root root 0 status\n";

        assert_eq!(parse_execfile(listing), None);
    }

    #[test]
    fn test_parse_top_sylixos_multicore_summary() {
        let out = r#"
       NAME        TID    PID  PRI   CPU   KERN
---------------- ------- ----- --- ------ ------
top              4000126     0 150   0.0%   0.0%
pthread          40000a3    21 200   1.2%   0.0%

CPU 0:  1.5% used, 98.5% idle
CPU 1:  5.0% used, 95.0% idle
"#;
        let (_, _, cpu_cores, _) = parse_sylixos_top(out);
        assert_eq!(cpu_cores.len(), 2);
        assert!((cpu_cores[0] - 1.5).abs() < 0.001);
        assert!((cpu_cores[1] - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_parse_free_sylixos_no_free_summary() {
        let out = r#"
heap show >>
 
      HEAP         TOTAL      USED     MAX USED  SEGMENT USED
-------------- ---------- ---------- ---------- ------- ----
kersys           455886KB    61703KB    62202KB   15452  13%

vmm physical zone show >>

ZONE     PHYSICAL         SIZE     PS AFFI       PGD        FREEPAGE  DMA  USED
---- ---------------- ------------ -- ---- ---------------- -------- ----- ----
   0         2a500000     30000000 16    0          f9db200    12174 true    0%
   1           200000      8200000 16    0          f9db200     1967 false   5%
   2         5a500000     95b00000 16    0          f9db200    38320 false   0%
   3        100000000    100000000 16    0          f9db200     65536 false   0%
   4        2f0000000     10000000 16    0          f9db200     4096 false   0%

ALL-Physical memory size:  8174MB
VMM-Physical memory size:  7645MB
"#;
        let res = parse_free_output(out, None);
        assert!(res.is_some());
        let (total, used, free, _kernel, _app) = res.unwrap();
        assert_eq!(total, 8174 * 1024);
        assert_eq!(free, 122093 * 64);
        assert_eq!(used, (8174 * 1024) - (122093 * 64));
    }

    #[test]
    fn test_parse_ps_sylixos_colored() {
        let out = r#"
      NAME            FATHER      STAT  PID   GRP    MEMORY    UID   GID   USER
---------------- ---------------- ---- ----- ----- ---------- ----- ----- ------
[32mkernel[0m           <orphan>         R        [33m0[0m     0        0KB     0     0 root
[32mjavascript[0m       javascript       R       [33m21[0m     9    40320KB     0     0 root
[32mjavascript[0m       javascript       R       [33m20[0m     9    16128KB     0     0 root
[32msshd[0m             <orphan>         R        [33m1[0m     1     7808KB     0     0 root
"#;
        let map = parse_sylixos_ps(out);
        assert_eq!(map.len(), 4);
        assert!(map.contains_key(&0));
        assert!(map.contains_key(&21));
        assert!(map.contains_key(&20));
        assert!(map.contains_key(&1));

        let kern = map.get(&0).unwrap();
        assert_eq!(kern.0, "kernel");
        assert_eq!(kern.1, 0);

        let js21 = map.get(&21).unwrap();
        assert_eq!(js21.0, "javascript");
        assert_eq!(js21.1, 40320);
    }

    #[test]
    fn test_parse_top_sylixos_colored() {
        let out = r#"
       NAME        TID    PID  PRI   CPU   KERN
---------------- ------- ----- --- ------ ------
[32mtop[0m              4000126     [33m0[0m 150   0.5%   0.0%
[32mpthread[0m          40000a3    [33m21[0m 200   1.2%   0.0%
[32mpthread[0m          40000a2    [33m21[0m 200   0.8%   0.0%
[32mt_idle7[0m          4000007     [33m0[0m 255  12.5%   0.0%
"#;
        let (cpu_map, _sys_cpu, _, _) = parse_sylixos_top(out);
        let js_cpu = cpu_map.get(&21).unwrap();
        assert_eq!(*js_cpu, 2.0);

        let kern_cpu = cpu_map.get(&0).unwrap();
        assert_eq!(*kern_cpu, 0.5);
    }

    #[test]
    fn test_parse_top_with_spaced_thread_names() {
        let out = r#"
       NAME        TID    PID  PRI   CPU   KERN
---------------- ------- ----- --- ------ ------
t isrdefer       4000126     0 150   3.5%   0.0%
t telnetd        40000a3     0 160   2.0%   0.0%
my worker thread 40000a2     9 200   5.6%   0.0%
t idle0          4000000     0 255  88.9%   0.0%
"#;
        let (cpu_map, sys_cpu, _, threads_by_pid) = parse_sylixos_top(out);
        assert_eq!(sys_cpu, 100.0 - 88.9);
        assert_eq!(*cpu_map.get(&9).unwrap(), 5.6);
        assert_eq!(*cpu_map.get(&0).unwrap(), 5.5); // 3.5 + 2.0 = 5.5

        let proc9_threads = threads_by_pid.get(&9).unwrap();
        assert_eq!(proc9_threads[0].name, "my worker thread");
        assert_eq!(proc9_threads[0].tid, "40000a2");
        assert_eq!(proc9_threads[0].cpu, 5.6);
    }
}
