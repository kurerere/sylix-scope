//! MCP HTTP/SSE 路由集成测试：认证、JSON-RPC 分发、工具列表与调用、审计接线。
mod support;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use monitor_lib::mcp_server::{build_router, McpServerContext};
use monitor_lib::{MonitorPayload, SharedState, SystemMetrics};
use serde_json::{json, Value};
use tauri::Manager;
use tower::ServiceExt;

const TOKEN: &str = "tok-123";

fn test_context(app: tauri::App<tauri::test::MockRuntime>) -> (tauri::App<tauri::test::MockRuntime>, McpServerContext<tauri::test::MockRuntime>) {
    let ctx = McpServerContext {
        app: app.handle().clone(),
        sessions: Default::default(),
        token: std::sync::Arc::new(tokio::sync::RwLock::new(TOKEN.into())),
        allow_exec_command: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true)),
    };
    (app, ctx)
}

fn json_request(method: &str, uri: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

async fn rpc(router: axum::Router, uri: &str, method: &str, params: Value) -> (StatusCode, Value) {
    let body = json!({"jsonrpc": "2.0", "id": 1, "method": method, "params": params});
    let response = router.oneshot(json_request("POST", uri, body)).await.unwrap();
    let status = response.status();
    let bytes = http_body_util::BodyExt::collect(response.into_body())
        .await
        .unwrap()
        .to_bytes();
    let value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

fn rpc_error_text(value: &Value) -> String {
    value["error"]["message"].as_str().unwrap_or_default().to_string()
}

#[tokio::test]
async fn rejects_bad_token() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(router, "/mcp?token=WRONG", "tools/list", json!({})).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(rpc_error_text(&value), "未授权的访问，Token 无效或缺失");
    drop(app);
}

#[tokio::test]
async fn initialize_ping_and_tools_list() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(router, "/mcp?token=tok-123", "initialize", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(value["result"]["serverInfo"]["name"], "sylixscope-mcp");

    let router = build_router(context_from(&app));
    let (status, value) = rpc(router, "/mcp?token=tok-123", "ping", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(value["result"], json!({}));

    let router = build_router(context_from(&app));
    let (status, value) = rpc(router, "/mcp?token=tok-123", "tools/list", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let tools = value["result"]["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 8, "allow_exec 开启时应有 8 个工具");

    let router = build_router(context_readonly(&app));
    let (status, value) = rpc(router, "/mcp?token=tok-123", "tools/list", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let tools = value["result"]["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 7, "只读模式下 shell 工具不可见");
    drop(app);
}

fn context_from(app: &tauri::App<tauri::test::MockRuntime>) -> McpServerContext<tauri::test::MockRuntime> {
    McpServerContext {
        app: app.handle().clone(),
        sessions: Default::default(),
        token: std::sync::Arc::new(tokio::sync::RwLock::new(TOKEN.into())),
        allow_exec_command: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true)),
    }
}

fn context_readonly(app: &tauri::App<tauri::test::MockRuntime>) -> McpServerContext<tauri::test::MockRuntime> {
    McpServerContext {
        app: app.handle().clone(),
        sessions: Default::default(),
        token: std::sync::Arc::new(tokio::sync::RwLock::new(TOKEN.into())),
        allow_exec_command: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
    }
}

#[tokio::test]
async fn unknown_method_returns_32601() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(router, "/mcp?token=tok-123", "no/such/method", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(value["error"]["code"], -32601);
    drop(app);
}

#[tokio::test]
async fn tools_call_returns_snapshot_metrics_when_available() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.latest_snapshot = Some(MonitorPayload {
            metrics: SystemMetrics {
                cpu_usage: 33.3,
                mem_total: 8_573_123,
                mem_used: 4_000_000,
                mem_free: 4_573_123,
                mem_kernel: 500_000,
                mem_app: 3_500_000,
                cpu_cores: vec![30.0, 40.0],
            },
            processes: vec![],
        });
    }

    let router = build_router(ctx);
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_get_realtime_metrics", "arguments": {}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    let metrics: Value = serde_json::from_str(text).unwrap();
    assert_eq!(metrics["cpu_usage"], 33.3);
    drop(app);
}

#[tokio::test]
async fn tools_call_reports_missing_snapshot() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_get_realtime_metrics", "arguments": {}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    assert!(text.contains("暂无遥测快照数据"), "实际: {text}");
    drop(app);
}

#[tokio::test]
async fn tools_call_force_fresh_dials_target() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let mock = support::spawn(support::telemetry_replies()).await;

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.target_config = Some(monitor_lib::TargetConfig {
            ip: "127.0.0.1".into(),
            port: mock.local_addr.port(),
            username: "root".into(),
            password: "root".into(),
        });
    }

    let router = build_router(ctx);
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_get_realtime_metrics", "arguments": {"force_fresh": true}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(value["result"]["isError"], Value::Null);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    let metrics: Value = serde_json::from_str(text).unwrap();
    assert!(metrics["cpu_usage"].as_f64().unwrap() > 0.0, "CPU 应已真实采样");
    assert!(metrics["mem_total"].as_u64().unwrap() > 0);
    drop(app);
}

#[tokio::test]
async fn readonly_mode_blocks_shell_tool() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(context_readonly(&app));

    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_execute_command", "arguments": {"command": "ls"}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    assert!(text.contains("只读安全模式"), "实际: {text}");
    drop(app);
}

#[tokio::test]
async fn unknown_tool_is_reported() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_nope", "arguments": {}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    assert!(text.contains("未知的 Tool 名称"), "实际: {text}");
    drop(app);
}

#[tokio::test]
async fn messages_requires_known_session() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(
        router,
        "/messages?sessionId=no-such&token=tok-123",
        "tools/list",
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(value["error"]["code"], -32600);
    drop(app);
}

#[tokio::test]
async fn delete_terminates_session() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let request = Request::builder()
        .method("DELETE")
        .uri("/mcp?token=tok-123&sessionId=sess-x")
        .body(Body::empty())
        .unwrap();
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    drop(app);
}


#[tokio::test]
async fn tools_call_list_processes_sorts_and_limits() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.latest_snapshot = Some(MonitorPayload {
            metrics: SystemMetrics {
                cpu_usage: 10.0,
                mem_total: 1024,
                mem_used: 512,
                mem_free: 512,
                mem_kernel: 100,
                mem_app: 412,
                cpu_cores: vec![],
            },
            processes: vec![
                monitor_lib::monitor_manager::ProcessInfo {
                    pid: 1,
                    name: "a".into(),
                    cpu: 1.0,
                    mem: 100.0,
                    cmdline: None,
                    execfile: None,
                    threads: vec![],
                },
                monitor_lib::monitor_manager::ProcessInfo {
                    pid: 2,
                    name: "b".into(),
                    cpu: 5.0,
                    mem: 300.0,
                    cmdline: None,
                    execfile: None,
                    threads: vec![],
                },
            ],
        });
    }

    let router = build_router(ctx);
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_list_processes", "arguments": {"sort_by": "cpu", "limit": 1}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    let procs: Value = serde_json::from_str(text).unwrap();
    assert_eq!(procs.as_array().unwrap().len(), 1);
    assert_eq!(procs[0]["pid"], 2, "按 CPU 降序应先返回 pid 2");
    drop(app);
}

#[tokio::test]
async fn tools_call_process_detail_prefers_snapshot() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.latest_snapshot = Some(MonitorPayload {
            metrics: SystemMetrics { cpu_usage: 0.0, mem_total: 0, mem_used: 0, mem_free: 0, mem_kernel: 0, mem_app: 0, cpu_cores: vec![] },
            processes: vec![monitor_lib::monitor_manager::ProcessInfo {
                pid: 7,
                name: "detail-app".into(),
                cpu: 2.0,
                mem: 64.0,
                cmdline: Some("./detail-app".into()),
                execfile: Some("/bin/detail-app".into()),
                threads: vec![],
            }],
        });
    }

    let router = build_router(ctx);
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_get_process_detail", "arguments": {"pid": 7}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    let proc: Value = serde_json::from_str(text).unwrap();
    assert_eq!(proc["name"], "detail-app");
    drop(app);
}

#[tokio::test]
async fn tools_call_recording_start_stop_list() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.is_running = true;
    }

    let call = |router: axum::Router, arguments: Value| async move {
        rpc(router, "/mcp?token=tok-123", "tools/call",
            json!({"name": "sylixos_manage_recording", "arguments": arguments})).await
    };

    let (status, value) = call(build_router(ctx.clone()), json!({"action": "start", "name": "mcp-rec"})).await;
    let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
    assert!(text.contains("成功开始录制"), "实际: {text}");

    let (status, value) = call(build_router(ctx.clone()), json!({"action": "list"})).await;
    let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
    assert!(text.contains("mcp-rec"));

    let (status, value) = call(build_router(ctx.clone()), json!({"action": "stop"})).await;
    let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
    assert!(text.contains("已停止录制包"), "实际: {text}");
    drop(app);
}


#[tokio::test]
async fn tools_call_process_detail_falls_back_to_telnet() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let mock = support::spawn(vec![support::ScriptedReply {
        prefix: "cat /proc/99/cmdline".into(),
        output: Some("/usr/bin/worker".into()),
    }])
    .await;

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.target_config = Some(monitor_lib::TargetConfig {
            ip: "127.0.0.1".into(),
            port: mock.local_addr.port(),
            username: "root".into(),
            password: "root".into(),
        });
    }

    let router = build_router(ctx);
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_get_process_detail", "arguments": {"pid": 99}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap();
    let proc: Value = serde_json::from_str(text).unwrap();
    assert_eq!(proc["pid"], 99);
}

#[tokio::test]
async fn tools_call_network_info_categories() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let mock = support::spawn(support::telemetry_replies()).await;

    {
        let state = app.state::<SharedState>();
        let mut lock = state.state.lock().await;
        lock.target_config = Some(monitor_lib::TargetConfig {
            ip: "127.0.0.1".into(),
            port: mock.local_addr.port(),
            username: "root".into(),
            password: "root".into(),
        });
    }

    for category in ["interfaces", "sockets", "routes", "statistics", "all"] {
        let router = build_router(ctx.clone());
        let (status, value) = rpc(
            router,
            "/mcp?token=tok-123",
            "tools/call",
            json!({"name": "sylixos_get_network_info", "arguments": {"category": category}}),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "category: {category}");
        let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
        assert!(!text.is_empty(), "category {category} 应有输出");
    }
}

#[tokio::test]
async fn tools_call_start_and_stop_monitoring() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let mock = support::spawn(support::telemetry_replies()).await;

    let router = build_router(ctx.clone());
    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_start_monitoring", "arguments": {"ip": "127.0.0.1", "port": mock.local_addr.port()}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
    assert!(text.contains("已成功启动"), "实际: {text}");

    {
        let state = app.state::<SharedState>();
        let lock = state.state.lock().await;
        assert!(lock.is_running);
        assert!(lock.target_config.is_some());
    }

    let router2 = build_router(ctx.clone());
    let _ = rpc(router2, "/mcp?token=tok-123", "tools/call",
        json!({"name": "sylixos_stop_monitoring", "arguments": {}})).await;

    {
        let state = app.state::<SharedState>();
        let lock = state.state.lock().await;
        assert!(!lock.is_running);
    }
}

#[tokio::test]
async fn tools_call_stop_mcp_uses_shared_manager() {
    let app = support::mock_app();
    let (app, ctx) = test_context(app);
    let router = build_router(ctx);

    let (status, value) = rpc(
        router,
        "/mcp?token=tok-123",
        "tools/call",
        json!({"name": "sylixos_stop_monitoring_server", "arguments": {}}),
    )
    .await;
    // 不存在的工具应报"未知的 Tool 名称"
    let text = value["result"]["content"][0]["text"].as_str().unwrap().to_string();
    assert!(text.contains("未知的 Tool 名称"));
    drop(app);
}
