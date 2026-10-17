//! lib.rs 命令层集成测试：经 pub mod commands 用 mock runtime 直驱。
mod support;


use monitor_lib::commands;
use monitor_lib::history_db::HistoryDb;
use monitor_lib::SharedState;
use tauri::State;
use tauri::Manager;

#[tokio::test]
async fn recording_lifecycle_roundtrip() {
    let app = support::mock_app();
    let db: State<'_, HistoryDb> = app.state();
    let state: State<'_, SharedState> = app.state();

    {
        let mut lock = state.state.lock().await;
        lock.is_running = true;
    }
    let rid = commands::start_recording(db.clone(), state.clone(), Some("it".into()))
        .await
        .unwrap();
    assert_eq!(
        commands::get_current_recording_status(state.clone())
            .await
            .unwrap(),
        Some(rid)
    );

    commands::stop_recording(db.clone(), state.clone()).await.unwrap();
    assert_eq!(
        commands::get_current_recording_status(state.clone())
            .await
            .unwrap(),
        None
    );

    let records = commands::get_records(db.clone()).await.unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].name, "it");
    assert!(records[0].end_time.is_some());

    commands::rename_record(db.clone(), rid, "renamed".into())
        .await
        .unwrap();
    commands::delete_record(db.clone(), rid).await.unwrap();
    assert!(commands::get_records(db.clone()).await.unwrap().is_empty());
}

#[tokio::test]
async fn export_record_to_file_roundtrip() {
    let app = support::mock_app();
    let db: State<'_, HistoryDb> = app.state();
    let state: State<'_, SharedState> = app.state();

    {
        let mut lock = state.state.lock().await;
        lock.is_running = true;
    }
    let rid = commands::start_recording(db.clone(), state.clone(), None)
        .await
        .unwrap();

    let path = std::env::temp_dir().join(format!("sylixos-cov-export-{rid}.json"));
    commands::export_record_to_file(db.clone(), rid, path.to_string_lossy().to_string())
        .await
        .unwrap();
    let content = std::fs::read_to_string(&path).unwrap();
    assert!(content.contains("\"record\""));
    std::fs::remove_file(&path).ok();
}

#[tokio::test]
async fn save_snapshot_writes_file() {
    let path = std::env::temp_dir().join("sylixos-cov-snapshot.json");
    commands::save_snapshot_to_file(path.to_string_lossy().to_string(), serde_json::json!({"k": 1}))
        .await
        .unwrap();
    let content = std::fs::read_to_string(&path).unwrap();
    assert!(content.contains("\"k\": 1"));
    std::fs::remove_file(&path).ok();
}

#[tokio::test]
async fn stop_monitoring_without_session_is_noop() {
    let app = support::mock_app();
    let state: State<'_, SharedState> = app.state();
    commands::stop_monitoring(state.clone()).await.unwrap();
    let lock = state.state.lock().await;
    assert!(!lock.is_running);
}

