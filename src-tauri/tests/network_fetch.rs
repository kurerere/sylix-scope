//! network_manager 的 fetch_* 集成测试：经 Telnet 仿真服务器拉取并解析。
mod support;

use monitor_lib::network_manager::{fetch_network_interfaces, fetch_network_routes, fetch_network_sockets, fetch_network_stats};
use monitor_lib::TargetConfig;

fn cfg(port: u16) -> TargetConfig {
    TargetConfig {
        ip: "127.0.0.1".into(),
        port,
        username: "root".into(),
        password: "root".into(),
    }
}

#[tokio::test]
async fn fetch_interfaces_parses_entries() {
    let mock = support::spawn(support::telemetry_replies()).await;
    let interfaces = fetch_network_interfaces(&cfg(mock.local_addr.port())).await.unwrap();
    let _ = interfaces;
}

#[tokio::test]
async fn fetch_sockets_returns_ok() {
    let mock = support::spawn(support::telemetry_replies()).await;
    let sockets = fetch_network_sockets(&cfg(mock.local_addr.port()), None).await.unwrap();
    let _ = sockets;
}

#[tokio::test]
async fn fetch_routes_returns_ok() {
    let mock = support::spawn(support::telemetry_replies()).await;
    let routes = fetch_network_routes(&cfg(mock.local_addr.port())).await.unwrap();
    let _ = routes;
}

#[tokio::test]
async fn fetch_stats_returns_ok() {
    let mock = support::spawn(support::telemetry_replies()).await;
    let stats = fetch_network_stats(&cfg(mock.local_addr.port())).await.unwrap();
    let _ = stats;
}
