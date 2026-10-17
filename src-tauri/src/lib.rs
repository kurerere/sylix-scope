pub mod history_db;
pub mod mcp_server;
pub mod mcp_types;
pub mod monitor_manager;
pub mod network_manager;
pub mod telnet_client;

use history_db::HistoryDb;
pub use monitor_manager::{
    start_monitoring_task, MemoryMetrics, MonitorPayload, MonitorState, SharedState,
    SystemMetrics, TargetConfig,
};
use tauri::{AppHandle, Manager, State};
use tokio::sync::{watch, Mutex};

pub mod commands {
    use super::*;

#[tauri::command]
pub async fn start_monitoring(
    app: AppHandle,
    state: State<'_, SharedState>,
    ip: String,
    port: u16,
    username: String,
    password: String,
) -> Result<(), String> {
    let mut lock = state.state.lock().await;

    if lock.is_running {
        if let Some(stop_tx) = lock.stop_tx.take() {
            let _ = stop_tx.send(true);
        }
        lock.is_running = false;
    }

    let (stop_tx, stop_rx) = watch::channel(false);
    lock.stop_tx = Some(stop_tx);
    lock.is_running = true;
    lock.target_config = Some(TargetConfig {
        ip: ip.clone(),
        port,
        username: username.clone(),
        password: password.clone(),
    });

    tokio::spawn(async move {
        start_monitoring_task(app, ip, port, username, password, stop_rx).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, SharedState>) -> Result<(), String> {
    let mut lock = state.state.lock().await;
    if lock.is_running {
        if let Some(stop_tx) = lock.stop_tx.take() {
            let _ = stop_tx.send(true);
        }
        lock.is_running = false;
        lock.latest_snapshot = None;
    }
    Ok(())
}


use std::path::PathBuf;

/// 改名为 SylixScope 之前使用的应用标识符，对应旧的数据目录
const LEGACY_IDENTIFIER: &str = "com.sylixos.monitor";

pub fn get_data_dir<R: tauri::Runtime>(app: &AppHandle<R>) -> PathBuf {
    let path = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    if !path.exists() {
        migrate_legacy_data_dir(&path);
    }
    let _ = std::fs::create_dir_all(&path);
    path
}

/// 新数据目录首次创建时，从同级的旧标识符目录复制历史数据（保留旧目录，旧版本仍可使用）
fn migrate_legacy_data_dir(path: &std::path::Path) {
    let Some(legacy) = path.parent().map(|p| p.join(LEGACY_IDENTIFIER)) else {
        return;
    };
    if legacy.is_dir() {
        let _ = copy_dir_all(&legacy, path);
    }
}

fn copy_dir_all(from: &std::path::Path, to: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod data_dir_tests {
    use super::*;

    #[test]
    fn migrates_legacy_data_dir_once() {
        let base = tempfile::tempdir().unwrap();
        let legacy = base.path().join(LEGACY_IDENTIFIER);
        std::fs::create_dir_all(legacy.join("sub")).unwrap();
        std::fs::write(legacy.join("history.db"), b"db").unwrap();
        std::fs::write(legacy.join("sub/a.json"), b"{}").unwrap();

        let new_dir = base.path().join("io.github.kurerere.sylixscope");
        migrate_legacy_data_dir(&new_dir);

        assert_eq!(std::fs::read(new_dir.join("history.db")).unwrap(), b"db");
        assert_eq!(std::fs::read(new_dir.join("sub/a.json")).unwrap(), b"{}");
        assert!(legacy.join("history.db").exists());
    }
}

pub fn get_db_path<R: tauri::Runtime>(app: &AppHandle<R>) -> PathBuf {
    let mut path = get_data_dir(app);
    path.push("history.db");
    path
}

#[tauri::command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let dir = get_data_dir(&app);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_data_dir(app: AppHandle) -> Result<(), String> {
    let dir = get_data_dir(&app);
    open_directory_in_system(&dir)
}

fn open_directory_in_system(path: &std::path::Path) -> Result<(), String> {
    let _ = std::fs::create_dir_all(path);
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("当前操作系统不支持打开文件夹".to_string())
    }
}

#[tauri::command]
pub async fn start_recording(
    db: State<'_, HistoryDb>,
    state: State<'_, SharedState>,
    name: Option<String>,
) -> Result<u64, String> {
    let mut lock = state.state.lock().await;
    if !lock.is_running {
        return Err("当前未运行监控数据引擎，无法开始录制".to_string());
    }
    if lock.recording_id.is_some() {
        return Err("已在录制中".to_string());
    }

    let record_name = name.unwrap_or_else(|| {
        let now = std::time::SystemTime::now();
        let duration = now
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        format!("{}-record", duration.as_secs())
    });

    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let rid = db
        .with_conn(|conn| history_db::insert_record(conn, &record_name, now_secs))
        .map_err(|e| e.to_string())?;
    lock.recording_id = Some(rid);

    Ok(rid)
}

#[tauri::command]
pub async fn stop_recording(
    db: State<'_, HistoryDb>,
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let mut lock = state.state.lock().await;
    if let Some(rid) = lock.recording_id.take() {
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        db.with_conn(|conn| history_db::stop_record(conn, rid, now_secs))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_current_recording_status(
    state: State<'_, SharedState>,
) -> Result<Option<u64>, String> {
    let lock = state.state.lock().await;
    Ok(lock.recording_id)
}

#[tauri::command]
pub async fn get_records(db: State<'_, HistoryDb>) -> Result<Vec<history_db::RecordInfo>, String> {
    db.with_conn(|conn| history_db::get_records(conn))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_record(
    db: State<'_, HistoryDb>,
    id: u64,
    name: String,
) -> Result<(), String> {
    db.with_conn(|conn| history_db::rename_record(conn, id, &name))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_record(db: State<'_, HistoryDb>, id: u64) -> Result<(), String> {
    db.with_conn(|conn| history_db::delete_record(conn, id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_record_metrics(
    db: State<'_, HistoryDb>,
    id: u64,
) -> Result<Vec<history_db::SystemMetricsPoint>, String> {
    db.with_conn(|conn| history_db::get_record_metrics(conn, id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_record_processes(
    db: State<'_, HistoryDb>,
    id: u64,
    timestamp: i64,
) -> Result<Vec<monitor_manager::ProcessInfo>, String> {
    db.with_conn(|conn| history_db::get_record_processes(conn, id, timestamp))
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct ExportedRecordData {
    record: history_db::RecordInfo,
    metrics: Vec<history_db::SystemMetricsPoint>,
    processes: Vec<history_db::ProcessMetricPoint>,
}

fn load_exported_record(
    db: &HistoryDb,
    id: u64,
) -> Result<ExportedRecordData, String> {
    let record = db
        .with_conn(|conn| history_db::get_records(conn))
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|r| r.id == id)
        .ok_or_else(|| "未找到指定的历史录制包".to_string())?;

    db.with_conn(|conn| {
        Ok(ExportedRecordData {
            metrics: history_db::get_record_metrics(conn, id)?,
            processes: history_db::get_record_processes_all(conn, id)?,
            record: record.clone(),
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_record(db: State<'_, HistoryDb>, id: u64) -> Result<ExportedRecordData, String> {
    load_exported_record(&db, id)
}

#[tauri::command]
pub async fn select_save_path(
    default_name: String,
    initial_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new()
        .add_filter("JSON", &["json"])
        .set_file_name(&default_name);
    if let Some(dir) = initial_dir {
        dialog = dialog.set_directory(dir);
    }
    let path = dialog.save_file();
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn save_snapshot_to_file(path: String, snapshot: serde_json::Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_record_to_file(db: State<'_, HistoryDb>, id: u64, path: String) -> Result<(), String> {
    let data = load_exported_record(&db, id)?;

    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_mcp_server_status(app: AppHandle) -> Result<mcp_server::McpStatusInfo, String> {
    Ok(mcp_server::get_mcp_manager().get_status(&app).await)
}

#[tauri::command]
pub async fn restart_mcp_server(app: AppHandle, port: u16) -> Result<(), String> {
    mcp_server::get_mcp_manager().start(app, port).await
}

#[tauri::command]
pub async fn reset_mcp_token(app: AppHandle) -> Result<mcp_server::McpStatusInfo, String> {
    mcp_server::get_mcp_manager().reset_token(&app).await
}

#[tauri::command]
pub async fn set_mcp_allow_exec_command(app: AppHandle, allow: bool) -> Result<mcp_server::McpStatusInfo, String> {
    mcp_server::get_mcp_manager().set_allow_exec_command(&app, allow).await
}

#[tauri::command]
pub async fn stop_mcp_server() -> Result<(), String> {
    mcp_server::get_mcp_manager().stop().await
}

#[tauri::command]
pub async fn reboot_target(
    state: State<'_, SharedState>,
    ip: Option<String>,
    port: Option<u16>,
    username: Option<String>,
    password: Option<String>,
    sync_before: Option<bool>,
) -> Result<String, String> {
    let cfg = {
        let mut lock = state.state.lock().await;
        if lock.is_running {
            if let Some(stop_tx) = lock.stop_tx.take() {
                let _ = stop_tx.send(true);
            }
            lock.is_running = false;
            lock.latest_snapshot = None;
        }

        if let (Some(ip), Some(port), Some(username), Some(password)) = (ip, port, username, password) {
            TargetConfig {
                ip,
                port,
                username,
                password,
            }
        } else if let Some(ref c) = lock.target_config {
            c.clone()
        } else {
            return Err("未配置目标板连接信息".to_string());
        }
    };

    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

    let addr = format!("{}:{}", cfg.ip, cfg.port);
    let mut client = telnet_client::TelnetClient::connect(
        &addr,
        &cfg.username,
        &cfg.password,
        std::time::Duration::from_secs(5),
    )
    .await
    .map_err(|e| format!("连接目标板失败: {}", e))?;

    if sync_before.unwrap_or(true) {
        let _ = client
            .execute_command("sync", std::time::Duration::from_secs(2))
            .await;
    }

    let _ = client
        .execute_command("reboot", std::time::Duration::from_secs(2))
        .await;

    Ok("已成功发送重启指令，目标板正在重启...".to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppInfo {
    pub app_name: String,
    pub app_version: String,
    pub tauri_version: String,
    pub build_date: String,
    pub target: String,
}

#[tauri::command]
pub async fn get_app_info() -> Result<AppInfo, String> {
    Ok(AppInfo {
        app_name: env!("CARGO_PKG_NAME").to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: tauri::VERSION.to_string(),
        build_date: env!("BUILD_DATE").to_string(),
        target: format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
    })
}

#[tauri::command]
pub async fn get_network_interfaces(
    state: State<'_, SharedState>,
) -> Result<Vec<network_manager::NetInterface>, String> {
    let cfg = {
        let lock = state.state.lock().await;
        lock.target_config.clone().ok_or_else(|| "目标板未连接，无法获取网络接口信息".to_string())?
    };
    network_manager::fetch_network_interfaces(&cfg).await
}

#[tauri::command]
pub async fn get_network_sockets(
    state: State<'_, SharedState>,
    protocol: Option<String>,
) -> Result<Vec<network_manager::NetSocket>, String> {
    let cfg = {
        let lock = state.state.lock().await;
        lock.target_config.clone().ok_or_else(|| "目标板未连接，无法获取套接字连接信息".to_string())?
    };
    network_manager::fetch_network_sockets(&cfg, protocol).await
}

#[tauri::command]
pub async fn get_network_routes(
    state: State<'_, SharedState>,
) -> Result<Vec<network_manager::RouteEntry>, String> {
    let cfg = {
        let lock = state.state.lock().await;
        lock.target_config.clone().ok_or_else(|| "目标板未连接，无法获取路由表信息".to_string())?
    };
    network_manager::fetch_network_routes(&cfg).await
}

#[tauri::command]
pub async fn get_network_stats(
    state: State<'_, SharedState>,
) -> Result<network_manager::NetStatistics, String> {
    let cfg = {
        let lock = state.state.lock().await;
        lock.target_config.clone().ok_or_else(|| "目标板未连接，无法获取网络统计信息".to_string())?
    };
    network_manager::fetch_network_stats(&cfg).await
}

}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedState {
            state: Mutex::new(MonitorState {
                stop_tx: None,
                is_running: false,
                recording_id: None,
                latest_snapshot: None,
                target_config: None,
            }),
        })
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    if let Err(_) = window_vibrancy::apply_mica(&window, Some(true)) {
                        let _ = window_vibrancy::apply_acrylic(&window, Some((3, 7, 18, 200)));
                    }
                }
            }

            _app.manage(
                HistoryDb::open(commands::get_db_path(_app.handle()))
                    .map_err(|e| format!("初始化历史数据库失败: {e}"))?,
            );

            let app_handle = _app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = mcp_server::get_mcp_manager().start(app_handle, 3001).await;
            });

            Ok(())

        })
        .invoke_handler(tauri::generate_handler![
            commands::start_monitoring,
            commands::stop_monitoring,
            commands::start_recording,
            commands::stop_recording,
            commands::get_current_recording_status,
            commands::get_records,
            commands::rename_record,
            commands::delete_record,
            commands::get_record_metrics,
            commands::get_record_processes,
            commands::export_record,
            commands::select_save_path,
            commands::save_snapshot_to_file,
            commands::export_record_to_file,
            commands::get_mcp_server_status,
            commands::restart_mcp_server,
            commands::reset_mcp_token,
            commands::set_mcp_allow_exec_command,
            commands::stop_mcp_server,
            commands::reboot_target,
            commands::get_app_data_dir,
            commands::open_data_dir,
            commands::get_app_info,
            commands::get_network_interfaces,
            commands::get_network_sockets,
            commands::get_network_routes,
            commands::get_network_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

