//! 集成测试共享设施：SylixOS Telnet 仿真服务器与 Tauri mock app 构造器。
#![allow(dead_code)]

use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

/// 一条命令的仿真响应；命令匹配按前缀进行。
/// `output: None` 表示对该命令保持沉默（用于测试客户端读超时路径）。
#[derive(Clone)]
pub struct ScriptedReply {
    pub prefix: String,
    pub output: Option<String>,
}

fn reply(prefix: &str, output: &str) -> ScriptedReply {
    ScriptedReply {
        prefix: prefix.into(),
        output: Some(output.into()),
    }
}

fn silent(prefix: &str) -> ScriptedReply {
    ScriptedReply {
        prefix: prefix.into(),
        output: None,
    }
}

pub struct MockSylixos {
    pub addr: String,
    pub local_addr: std::net::SocketAddr,
    received: Arc<Mutex<Vec<String>>>,
    shutdown: Arc<tokio::sync::Notify>,
}

impl MockSylixos {
    pub fn received(&self) -> Arc<Mutex<Vec<String>>> {
        self.received.clone()
    }
}

const PROMPT: &[u8] = b"\r\n[root@sylixos:/]# ";

pub async fn spawn(replies: Vec<ScriptedReply>) -> MockSylixos {
    spawn_with_options(replies, true).await
}

pub async fn spawn_with_options(replies: Vec<ScriptedReply>, send_iac: bool) -> MockSylixos {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let local_addr = listener.local_addr().unwrap();
    let received = Arc::new(Mutex::new(Vec::new()));
    let shutdown = Arc::new(tokio::sync::Notify::new());
    let shutdown_clone = shutdown.clone();
    let received_clone = received.clone();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_clone.notified() => break,
                accepted = listener.accept() => {
                    let Ok((stream, _)) = accepted else { break };
                    let replies = replies.clone();
                    let received = received_clone.clone();
                    tokio::spawn(async move {
                        handle_conn(stream, replies, received, send_iac).await;
                    });
                }
            }
        }
    });

    MockSylixos {
        addr: local_addr.to_string(),
        local_addr,
        received,
        shutdown,
    }
}

async fn handle_conn(
    stream: TcpStream,
    replies: Vec<ScriptedReply>,
    received: Arc<Mutex<Vec<String>>>,
    send_iac: bool,
) {
    let (reader, mut writer) = tokio::io::split(stream);
    let mut lines = tokio::io::BufReader::new(reader).lines();

    if send_iac {
        // IAC WILL ECHO(255 251 1) + IAC WILL SGA(255 251 3)
        let _ = writer.write_all(&[255u8, 251, 1, 255, 251, 3]).await;
    }
    let _ = writer.write_all(b"login: ").await;

    for _ in 0..2 {
        let Ok(Some(line)) = lines.next_line().await else { return };
        let _ = line;
        let _ = writer.write_all(b"Password: ").await;
    }

    let _ = writer.write_all(b"[root@sylixos:/]# ").await;

    loop {
        let Ok(Some(line)) = lines.next_line().await else { break };
        let cmd = line.trim().to_string();
        received.lock().await.push(cmd.clone());

        match replies
            .iter()
            .find(|r| cmd.starts_with(r.prefix.as_str()))
            .map(|r| r.output.clone())
        {
            Some(Some(output)) => {
                let _ = writer.write_all(output.as_bytes()).await;
                let _ = writer.write_all(PROMPT).await;
            }
            // None：完全沉默，客户端应命中读超时
            Some(None) => {}
            None => {
                let _ = writer.write_all(PROMPT).await;
            }
        }
    }
    let _ = writer.shutdown().await;
}

/// 遥测采样输出：top / ps / free 三件套，数字与 monitor_manager 解析器对齐。
pub fn telemetry_replies() -> Vec<ScriptedReply> {
    let free_out = concat!(
        "\r\n     HEAP         TOTAL      USED     MAX USED  SEGMENT USED\r\n",
        "--------------- ---------- ---------- ---------- ------- ----\r\n",
        "kersys           455886KB    93235KB   106022KB   24142  20%\r\n",
        "\r\nvmm physical zone show >>\r\n",
        "\r\nZONE     PHYSICAL         SIZE     PS AFFI       PGD        FREEPAGE  DMA  USED\r\n",
        "----- ---------------- ------------ -- ---- ---------------- -------- ----- ----\r\n",
        "   0         2a500000     30000000 16    0          f9db200    12174 true    0%\r\n",
        "   1           200000      8200000 16    0          f9db200     1634 false   21%\r\n",
        "   2         5a500000     95b00000 16    0          f9db200     37401 false   2%\r\n",
        "   3        100000000    100000000 16    0          f9db200     65536 false   0%\r\n",
        "   4        2f0000000     10000000 16    0          f9db200     2470 false  39%\r\n",
        "\r\nALL-Physical memory size:  8174MB\r\n",
        "VMM-Physical memory size:  7645MB\r\n",
        "VMM-Physical memory free:  7450MB",
    );
    vec![
        reply(
            "top",
            concat!(
                "
       NAME        TID    PID  PRI   CPU   KERN
",
                "---------------- ------- ----- --- ------ ------
",
                "top              4000126     0 150   1.5%   0.0%
",
                "worker           40000a3    41 200  22.0%   0.0%
",
                "worker           40000a2    41 200   9.0%   0.0%
",
                "t_idle0          4000000     0 255  10.0%   0.0%
",
                "t_idle1          4000001     0 255  10.0%   0.0%
",
            ),
        ),
        reply(
            "ps",
            concat!(
                "
      NAME            FATHER      STAT  PID   GRP    MEMORY    UID   GID   USER
",
                "---------------- ---------------- ---- ----- ----- ---------- ----- ----- ------
",
                "kernel           <orphan>         R        0     0        0KB     0     0 root
",
                "app_main         app_main         R       41     9     2048KB     0     0 root
",
            ),
        ),
        reply("free", free_out),
        reply("cat /proc", "/usr/bin/app_main"),
        reply("ifconfig", "en1  Link encap  192.168.1.100  MTU:1500  RUNNING"),
        reply("netstat", "tcp  0.0.0.0:23  0.0.0.0:0  LISTEN"),
        reply("route", "default  192.168.1.1  0.0.0.0  UG  0  en1"),
        reply(
            "cat /proc/net",
            "Ip: 100 forwarding\r\nTcp: 5 active\r\nUdp: 2 open\r\nIcmp: 0",
        ),
        silent("__never__"),
    ]
}

/// 构造带 SharedState + HistoryDb（临时目录）的 mock app。
pub fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
    use tauri::Manager;
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();

    app.manage(monitor_lib::SharedState {
        state: tokio::sync::Mutex::new(monitor_lib::MonitorState {
            stop_tx: None,
            is_running: false,
            recording_id: None,
            latest_snapshot: None,
            target_config: None,
        }),
    });

    let db_dir = tempfile::tempdir().unwrap();
    let db_path = db_dir.path().join("history.db");
    // TempDir drop 即删除目录；对句柄 forget 以保活到进程退出
    std::mem::forget(db_dir);
    let db = monitor_lib::history_db::HistoryDb::open(db_path).unwrap();
    app.manage(db);

    app
}
