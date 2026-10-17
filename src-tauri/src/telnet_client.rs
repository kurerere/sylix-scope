use regex::Regex;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

pub struct TelnetClient {
    stream: TcpStream,
    prompt: String,
}

impl TelnetClient {
    pub async fn connect(
        addr: &str,
        username: &str,
        password: &str,
        timeout_duration: Duration,
    ) -> Result<Self, String> {
        let stream = timeout(timeout_duration, TcpStream::connect(addr))
            .await
            .map_err(|_| format!("连接 {} 超时", addr))?
            .map_err(|e| format!("连接失败: {}", e))?;

        let mut client = Self {
            stream,
            prompt: String::new(),
        };

        client.login(username, password, timeout_duration).await?;

        Ok(client)
    }

    async fn read_until_match(
        &mut self,
        expected: &[&str],
        buf: &mut Vec<u8>,
        timeout_duration: Duration,
    ) -> Result<(String, String), String> {
        let mut temp_buf = [0u8; 1024];
        let mut text = String::new();

        let result = timeout(timeout_duration, async {
            loop {
                for &exp in expected {
                    if text.ends_with(exp) {
                        return Ok((text.clone(), exp.to_string()));
                    }
                }

                let n = self
                    .stream
                    .read(&mut temp_buf)
                    .await
                    .map_err(|e| e.to_string())?;
                if n == 0 {
                    return Err("连接被服务器关闭".to_string());
                }

                let mut i = 0;
                while i < n {
                    if temp_buf[i] == 255 {
                        if i + 1 < n {
                            let cmd = temp_buf[i + 1];
                            if cmd >= 251 && cmd <= 254 {
                                i += 3;
                            } else {
                                i += 2;
                            }
                        } else {
                            i += 1;
                        }
                    } else {
                        buf.push(temp_buf[i]);
                        i += 1;
                    }
                }

                // 移除 ASCII 转义序列，方便正则匹配和干净的文本处理
                let clean_bytes: Vec<u8> = buf
                    .iter()
                    .cloned()
                    .filter(|&b| b >= 32 || b == 10 || b == 13 || b == 9)
                    .collect();

                if let Ok(s) = String::from_utf8(clean_bytes) {
                    text = s;
                }
            }
        })
        .await;

        match result {
            Ok(val) => val,
            Err(e) => Err(format!("读取超时或失败: {}", e)),
        }
    }

    async fn login(
        &mut self,
        username: &str,
        password: &str,
        timeout_duration: Duration,
    ) -> Result<(), String> {
        let mut buf = Vec::new();

        let (_, _) = self
            .read_until_match(
                &[
                    "login:",
                    "username:",
                    "login :",
                    "username :",
                    "login: ",
                    "username: ",
                ],
                &mut buf,
                timeout_duration,
            )
            .await?;

        buf.clear();
        self.stream
            .write_all(format!("{}\n", username).as_bytes())
            .await
            .map_err(|e| format!("发送用户名失败: {}", e))?;

        let _ = self
            .read_until_match(
                &[
                    "password:",
                    "Password:",
                    "password :",
                    "Password :",
                    "password: ",
                    "Password: ",
                ],
                &mut buf,
                timeout_duration,
            )
            .await?;

        buf.clear();
        self.stream
            .write_all(format!("{}\n", password).as_bytes())
            .await
            .map_err(|e| format!("发送密码失败: {}", e))?;

        let (_, matched_prompt) = self
            .read_until_match(
                &["]#", "]# ", "]#  ", "#", "# ", "$", "$ "],
                &mut buf,
                timeout_duration,
            )
            .await?;

        self.prompt = matched_prompt.clone();
        Ok(())
    }

    pub async fn execute_command(
        &mut self,
        cmd: &str,
        timeout_duration: Duration,
    ) -> Result<String, String> {
        let mut garbage = vec![0u8; 1024];
        loop {
            match timeout(Duration::from_millis(50), self.stream.read(&mut garbage)).await {
                Ok(Ok(n)) if n > 0 => continue,
                _ => break,
            }
        }

        self.stream
            .write_all(format!("{}\n", cmd).as_bytes())
            .await
            .map_err(|e| format!("发送命令失败: {}", e))?;

        let mut buf = Vec::new();
        let prompt_clone = self.prompt.clone();
        let (output, _) = self
            .read_until_match(&[&prompt_clone], &mut buf, timeout_duration)
            .await?;

        let clean_output = clean_command_output(&output, cmd, &prompt_clone);
        Ok(clean_output)
    }
}

fn clean_command_output(output: &str, cmd: &str, prompt: &str) -> String {
    let prompt_re = Regex::new(r"\[[^\]\s]+\][#$]\s*$").unwrap();
    output
        .lines()
        .filter(|line| !line.contains(cmd))
        .map(|line| {
            if let Some(mat) = prompt_re.find(line) {
                &line[..mat.start()]
            } else {
                let trimmed_prompt = prompt.trim();
                if line.trim().ends_with(trimmed_prompt) {
                    let prompt_pos = line.rfind(trimmed_prompt).unwrap_or(line.len());
                    &line[..prompt_pos]
                } else {
                    line
                }
            }
        })
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<&str>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_command_output_with_regex() {
        let cmd = "cat /proc/55/cmdline";
        let raw_output = "cat /proc/55/cmdline\r\n./ecsd-vsoa++ [root@sylixos-node02:/root]# ";
        let prompt = "# ";
        let cleaned = clean_command_output(raw_output, cmd, prompt);
        assert_eq!(cleaned, "./ecsd-vsoa++ ");

        let raw_output_2 =
            "cat /proc/55/cmdline\n./ecsd-vsoa++ [root@sylixos-node02:/apps/ecsd-cpp-vsoa]#";
        let cleaned_2 = clean_command_output(raw_output_2, cmd, prompt);
        assert_eq!(cleaned_2, "./ecsd-vsoa++ ");

        let raw_output_3 = "cat /proc/55/cmdline\n./ecsd-vsoa++[root@sylixos-node02:/root]$";
        let cleaned_3 = clean_command_output(raw_output_3, cmd, prompt);
        assert_eq!(cleaned_3, "./ecsd-vsoa++");
    }

    #[test]
    fn test_clean_command_output_fallback() {
        let cmd = "some_cmd";
        let raw_output = "some_cmd\r\noutput line\r\n# ";
        let prompt = "# ";
        let cleaned = clean_command_output(raw_output, cmd, prompt);
        assert_eq!(cleaned, "output line");
    }

    // 逐字保留真实板卡 netstat 回显：UNIX 区块 PATH 列为空
    const REAL_BOARD_NETSTAT: &str = r#"
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

    async fn read_line(sock: &mut TcpStream) -> String {
        let mut buf = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            if sock.read(&mut byte).await.unwrap() == 0 {
                break;
            }
            buf.push(byte[0]);
            if byte[0] == b'\n' {
                break;
            }
        }
        String::from_utf8_lossy(&buf).to_string()
    }

    async fn send_all(sock: &mut TcpStream, data: &[u8]) {
        sock.write_all(data).await.unwrap();
    }

    // 假板卡：登录握手后，对指定命令回放真实终端回显（含命令回显与提示符）
    fn spawn_fake_board(netstat_reply: &'static str) -> (String, tokio::task::JoinHandle<()>) {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        let handle = tokio::spawn(async move {
            let listener = tokio::net::TcpListener::from_std(listener).unwrap();
            let (mut sock, _) = listener.accept().await.unwrap();
            send_all(&mut sock, b"SylixOS 1.3.3\r\nlogin: ").await;
            let _user = read_line(&mut sock).await;
            send_all(&mut sock, b"password: ").await;
            let _pass = read_line(&mut sock).await;
            send_all(&mut sock, b"[root@sylixos:/root]# ").await;

            loop {
                let line = read_line(&mut sock).await;
                if line.is_empty() {
                    break;
                }
                if line.trim() == "netstat -a" {
                    let echo = format!("netstat -a\r\n{}\r\n", netstat_reply);
                    send_all(&mut sock, echo.as_bytes()).await;
                }
                send_all(&mut sock, b"[root@sylixos:/root]# ").await;
            }
        });
        (addr, handle)
    }

    #[tokio::test]
    async fn test_login_and_execute_netstat_on_fake_board() {
        let (addr, server) = spawn_fake_board(REAL_BOARD_NETSTAT);

        let mut client = TelnetClient::connect(&addr, "root", "root", Duration::from_secs(2))
            .await
            .expect("登录假板卡失败");

        let output = client
            .execute_command("netstat -a", Duration::from_secs(2))
            .await
            .expect("执行 netstat -a 失败");

        let sockets = crate::network_manager::parse_netstat_sockets(&output);
        assert_eq!(sockets.len(), 21);
        assert!(sockets[..14]
            .iter()
            .all(|s| s.protocol == "UNIX" && s.local_addr == "-"));
        assert!(sockets[14..18].iter().all(|s| s.status == "listen"));

        // 假板卡任务阻塞在等待下一条命令上，主动终止以结束测试
        server.abort();
    }
}
