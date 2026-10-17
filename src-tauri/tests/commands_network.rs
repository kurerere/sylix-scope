//! reboot_target 与网络命令集成测试。
mod support;

use monitor_lib::{SharedState, TargetConfig};
use tauri::Manager;

async fn with_target(app: &tauri::App<tauri::test::MockRuntime>, port: u16) {
    use tauri::Manager;
    let state = app.state::<SharedState>();
    let mut lock = state.state.lock().await;
    lock.is_running = true;
    lock.target_config = Some(TargetConfig {
        ip: "127.0.0.1".into(),
        port,
        username: "root".into(),
        password: "root".into(),
    });
}

#[tokio::test]
async fn network_commands_parse_mock_output() {
    let app = support::mock_app();
    let mock = support::spawn(support::telemetry_replies()).await;
    with_target(&app, mock.local_addr.port()).await;
    {
        let interfaces = monitor_lib::commands::get_network_interfaces(app.state()).await;
        assert!(interfaces.is_ok(), "{:?}", interfaces.err());
    }
    {
        let sockets = monitor_lib::commands::get_network_sockets(app.state(), None).await;
        assert!(sockets.is_ok(), "{:?}", sockets.err());
    }
    {
        let routes = monitor_lib::commands::get_network_routes(app.state()).await;
        assert!(routes.is_ok(), "{:?}", routes.err());
    }
    {
        let stats = monitor_lib::commands::get_network_stats(app.state()).await;
        assert!(stats.is_ok(), "{:?}", stats.err());
    }
}

#[tokio::test]
async fn reboot_target_sends_reboot_command() {
    let app = support::mock_app();
    let mock = support::spawn(vec![support::ScriptedReply {
        prefix: "reboot".into(),
        output: Some("rebooting".into()),
    }])
    .await;
    with_target(&app, mock.local_addr.port()).await;

    let result = monitor_lib::commands::reboot_target(
        app.state(),
        Some("127.0.0.1".into()),
        Some(mock.local_addr.port()),
        Some("root".into()),
        Some("root".into()),
        Some(true),
    )
    .await;

    assert!(result.is_ok(), "{:?}", result.err());
    let received = mock.received();
    let received = received.lock().await;
    assert!(received.iter().any(|c| c == "reboot"));
}

#[tokio::test]
async fn reboot_target_fails_without_config() {
    let app = support::mock_app();
    let handle = app.handle().clone();
    let result = monitor_lib::commands::reboot_target(
        app.state(), None, None, None, None, Some(false),
    )
    .await;
    assert!(result.is_err());
}
