//! Monitor Engine 采样循环集成测试：对着 Telnet 仿真服务器跑真实循环，
//! 断言 Telemetry Snapshot 组装、进程 diff 与停止语义。
mod support;

use monitor_lib::start_monitoring_task;
use tauri::Manager;
use std::time::Duration;
use tokio::sync::watch;

#[tokio::test]
async fn sampling_loop_populates_latest_snapshot() {
    let app = support::mock_app();
    let mock = support::spawn(support::telemetry_replies()).await;

    let (stop_tx, stop_rx) = watch::channel(false);
    let handle = app.handle().clone();
    let task = tokio::spawn(async move {
        start_monitoring_task(
            handle,
            "127.0.0.1".into(),
            mock.local_addr.port(),
            "root".into(),
            "root".into(),
            stop_rx,
        )
        .await;
    });

    // tick 1s；ps 间隔 2s；free 间隔 5s。等 7s 覆盖三轮 tick + 一次 free。
    tokio::time::sleep(Duration::from_secs(7)).await;

    {
        let state = app.state::<monitor_lib::SharedState>();
        let lock = state.state.lock().await;
        let snapshot = lock.latest_snapshot.as_ref().expect("应有遥测快照");
        assert!(snapshot.metrics.cpu_usage > 0.0, "CPU 使用率应已采样");
        assert!(snapshot.metrics.mem_total > 0, "内存总量应已采样");
        assert!(
            snapshot.processes.iter().any(|p| p.pid == 41),
            "进程表应包含 ps 输出的进程"
        );
        assert!(
            snapshot.processes.iter().any(|p| p.pid == 0),
            "pid 0 应被标记为 kernel 进程"
        );
    }

    let _ = stop_tx.send(true);
    let _ = task.await;

    let state = app.state::<monitor_lib::SharedState>();
    let lock = state.state.lock().await;
    assert!(!lock.is_running, "停止后 is_running 应为 false");
}
