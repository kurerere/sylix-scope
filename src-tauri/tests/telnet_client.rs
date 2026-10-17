//! TelnetClient 协议集成测试：登录握手、命令回显清洗、IAC 过滤、超时。
mod support;

use monitor_lib::telnet_client::TelnetClient;
use std::time::Duration;
use support::{spawn, spawn_with_options, telemetry_replies, ScriptedReply};

#[tokio::test]
async fn connect_logs_in_and_executes_command() {
    let mock = spawn(telemetry_replies()).await;

    let mut client = TelnetClient::connect(&mock.addr, "root", "root", Duration::from_secs(5))
        .await
        .expect("登录应成功");

    let out = client
        .execute_command("top", Duration::from_secs(3))
        .await
        .expect("top 命令应成功");
    assert!(out.contains("worker"), "实际输出: {out}");

    let out = client
        .execute_command("free", Duration::from_secs(3))
        .await
        .expect("free 命令应成功");
    assert!(out.contains("8174MB"), "实际输出: {out}");

    let received = mock.received();
    let received = received.lock().await;
    assert!(received.contains(&"top".to_string()));
    assert!(received.contains(&"free".to_string()));
}

#[tokio::test]
async fn filters_iac_and_escape_sequences() {
    let mock = spawn_with_options(telemetry_replies(), true).await;
    let mut client = TelnetClient::connect(&mock.addr, "root", "root", Duration::from_secs(5))
        .await
        .expect("带 IAC 协商的登录应成功");
    let out = client
        .execute_command("top", Duration::from_secs(3))
        .await
        .unwrap();
    assert!(!out.contains('\u{fffd}'), "不应出现乱码字节: {out}");
}

#[tokio::test]
async fn connect_times_out_when_no_server() {
    // 端口 1 上几乎不可能有服务；短超时验证错误路径
    let result = TelnetClient::connect("127.0.0.1:1", "root", "root", Duration::from_millis(300))
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn command_timeout_returns_error() {
    // 空脚本服务器：收到命令后不回显任何内容，触发读超时
    let mock = spawn(vec![ScriptedReply {
        prefix: "__never__".into(),
        output: None,
    }])
    .await;
    let mut client = TelnetClient::connect(&mock.addr, "root", "root", Duration::from_secs(5))
        .await
        .unwrap();
    let result = client
        .execute_command("__never__cmd", Duration::from_millis(300))
        .await;
    assert!(result.is_err(), "无响应命令应超时报错");
}

#[tokio::test]
async fn unknown_command_returns_empty_output() {
    let mock = spawn(telemetry_replies()).await;
    let mut client = TelnetClient::connect(&mock.addr, "root", "root", Duration::from_secs(5))
        .await
        .unwrap();
    let out = client
        .execute_command("totally_unknown_cmd", Duration::from_secs(2))
        .await
        .unwrap();
    assert_eq!(out.trim(), "");
}
