use crate::history_db;
use crate::history_db::HistoryDb;
use crate::mcp_types::*;
use crate::monitor_manager::{
    assemble_payload, build_memory_metrics, parse_sylixos_ps, parse_sylixos_top,
    MemoryMetrics, MonitorPayload, ProcessInfo, SharedState, TargetConfig,
};
use crate::telnet_client::TelnetClient;
use axum::{
    extract::{ConnectInfo, Query, State},
    http::{Method, StatusCode},
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};


use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct McpSessionInfo {
    pub session_id: String,
    pub client_ip: String,
    pub connected_at: i64,
    pub user_agent: Option<String>,
}

pub struct SessionItem {
    pub tx: mpsc::Sender<String>,
    pub info: McpSessionInfo,
}

pub type SessionsMap = Arc<RwLock<HashMap<String, SessionItem>>>;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NetworkInterfaceIp {
    pub name: String,
    pub ip: String,
    pub is_default: bool,
}

pub fn is_valid_accessible_ipv4(ip: &std::net::Ipv4Addr) -> bool {
    let octets = ip.octets();

    if ip.is_unspecified() || ip.is_broadcast() || ip.is_multicast() {
        return false;
    }

    // 排除回环 (127.0.0.0/8)
    if octets[0] == 127 {
        return false;
    }

    // 排除链路本地 / APIPA (169.254.0.0/16)
    if octets[0] == 169 && octets[1] == 254 {
        return false;
    }

    // 排除代理/FakeIP/基准测试保留网段 198.18.0.0/15 (198.18.0.0 ~ 198.19.255.255)
    if octets[0] == 198 && (octets[1] == 18 || octets[1] == 19) {
        return false;
    }

    // 排除 TEST-NET 文档保留网段 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
    if octets[0] == 192 && octets[1] == 0 && octets[2] == 2 {
        return false;
    }
    if octets[0] == 198 && octets[1] == 51 && octets[2] == 100 {
        return false;
    }
    if octets[0] == 203 && octets[1] == 0 && octets[2] == 113 {
        return false;
    }

    if octets[0] == 0 {
        return false;
    }

    true
}

pub fn detect_all_accessible_ips() -> Vec<NetworkInterfaceIp> {
    let mut list = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(ifaces) = local_ip_address::list_afinet_netifas() {
        for (name, ip_addr) in ifaces {
            if let std::net::IpAddr::V4(ipv4) = ip_addr {
                if is_valid_accessible_ipv4(&ipv4) {
                    let ip_str = ipv4.to_string();
                    if !seen.contains(&ip_str) {
                        seen.insert(ip_str.clone());
                        list.push(NetworkInterfaceIp {
                            name,
                            ip: ip_str,
                            is_default: false,
                        });
                    }
                }
            }
        }
    }

    list.sort_by_key(|item| {
        let ip_parts: Vec<u8> = item.ip.split('.').filter_map(|s| s.parse().ok()).collect();
        if ip_parts.len() == 4 {
            let o0 = ip_parts[0];
            let o1 = ip_parts[1];
            if o0 == 192 && o1 == 168 {
                return 1;
            }
            if o0 == 10 {
                return 2;
            }
            if o0 == 172 && (16..=31).contains(&o1) {
                return 3;
            }
            if o0 == 100 && (64..=127).contains(&o1) {
                return 4;
            }
        }
        5
    });

    if let Some(first) = list.first_mut() {
        first.is_default = true;
    }

    list
}

#[allow(dead_code)]
pub fn detect_lan_ip() -> Option<String> {
    let ips = detect_all_accessible_ips();
    ips.first().map(|item| item.ip.clone())
}

pub struct McpServerContext<R: tauri::Runtime> {
    pub app: AppHandle<R>,
    pub sessions: SessionsMap,
    pub token: Arc<RwLock<String>>,
    pub allow_exec_command: Arc<AtomicBool>,
}

impl<R: tauri::Runtime> Clone for McpServerContext<R> {
    fn clone(&self) -> Self {
        Self {
            app: self.app.clone(),
            sessions: self.sessions.clone(),
            token: self.token.clone(),
            allow_exec_command: self.allow_exec_command.clone(),
        }
    }
}

/// 组装 MCP HTTP/SSE 路由。独立成函数以便测试通过 tower::oneshot 直驱
/// handler，而无需绑定真实端口。
pub fn build_router<R: tauri::Runtime>(context: McpServerContext<R>) -> axum::Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        .route(
            "/mcp",
            post(streamable_http_post_handler)
                .get(streamable_http_get_handler)
                .delete(streamable_http_delete_handler),
        )
        .route("/sse", get(sse_handler))
        .route("/messages", post(messages_handler))
        .layer(cors)
        .with_state(context)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct McpStatusInfo {
    pub is_running: bool,
    pub port: u16,
    pub active_sessions: usize,
    pub sessions: Vec<McpSessionInfo>,
    pub server_url: String,
    pub lan_ip: Option<String>,
    pub lan_ips: Vec<NetworkInterfaceIp>,
    pub lan_server_url: Option<String>,
    pub streamable_url: String,
    pub lan_streamable_url: Option<String>,
    pub token: String,
    pub allow_exec_command: bool,
}

pub struct McpServerManager {
    port: Arc<AtomicU16>,
    is_running: Arc<AtomicBool>,
    allow_exec_command: Arc<AtomicBool>,
    token: Arc<RwLock<String>>,
    shutdown_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
    sessions: SessionsMap,
}

impl McpServerManager {
    pub fn new() -> Self {
        Self {
            port: Arc::new(AtomicU16::new(3001)),
            is_running: Arc::new(AtomicBool::new(false)),
            allow_exec_command: Arc::new(AtomicBool::new(true)),
            token: Arc::new(RwLock::new(String::new())),
            shutdown_tx: Arc::new(Mutex::new(None)),
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    async fn ensure_initialized(&self, app: &AppHandle) {
        let mut current_token = self.token.write().await;
        if current_token.is_empty() {
            let db = app.state::<HistoryDb>();
            if let Ok(Some(saved_token)) = db.with_conn(|conn| {
                match history_db::get_mcp_setting(conn, "mcp_token")? {
                    Some(token) => Ok(Some(token)),
                    None => {
                        let new_tok = format!("sk-sylixos-{}", Uuid::new_v4().simple());
                        history_db::set_mcp_setting(conn, "mcp_token", &new_tok)?;
                        Ok(Some(new_tok))
                    }
                }
            }) {
                *current_token = saved_token;
            } else {
                *current_token = format!("sk-sylixos-{}", Uuid::new_v4().simple());
            }

            if let Ok(Some(saved_allow)) = db.with_conn(|conn| {
                history_db::get_mcp_setting(conn, "mcp_allow_exec_command")
            }) {
                self.allow_exec_command.store(saved_allow == "1", Ordering::SeqCst);
            }
        }
    }

    pub async fn get_status(&self, app: &AppHandle) -> McpStatusInfo {
        self.ensure_initialized(app).await;
        let running = self.is_running.load(Ordering::SeqCst);
        let port = self.port.load(Ordering::SeqCst);
        let sessions_lock = self.sessions.read().await;
        let active_sessions = sessions_lock.len();
        let sessions_list: Vec<McpSessionInfo> = sessions_lock.values().map(|s| s.info.clone()).collect();
        drop(sessions_lock);
        let token = self.token.read().await.clone();
        let allow_exec = self.allow_exec_command.load(Ordering::SeqCst);
        let lan_ips = detect_all_accessible_ips();
        let lan_ip = lan_ips
            .iter()
            .find(|i| i.is_default)
            .map(|i| i.ip.clone())
            .or_else(|| lan_ips.first().map(|i| i.ip.clone()));
        let server_url = format!("http://127.0.0.1:{}/sse", port);
        let lan_server_url = lan_ip.as_ref().map(|ip| format!("http://{}:{}/sse", ip, port));
        let streamable_url = format!("http://127.0.0.1:{}/mcp", port);
        let lan_streamable_url = lan_ip.as_ref().map(|ip| format!("http://{}:{}/mcp", ip, port));

        McpStatusInfo {
            is_running: running,
            port,
            active_sessions,
            sessions: sessions_list,
            server_url,
            lan_ip,
            lan_ips,
            lan_server_url,
            streamable_url,
            lan_streamable_url,
            token,
            allow_exec_command: allow_exec,
        }
    }

    pub async fn reset_token(&self, app: &AppHandle) -> Result<McpStatusInfo, String> {
        let new_token = format!("sk-sylixos-{}", Uuid::new_v4().simple());
        let db = app.state::<HistoryDb>();
        let _ = db.with_conn(|conn| history_db::set_mcp_setting(conn, "mcp_token", &new_token));
        {
            let mut tok_lock = self.token.write().await;
            *tok_lock = new_token;
        }
        self.sessions.write().await.clear();
        Ok(self.get_status(app).await)
    }

    pub async fn set_allow_exec_command(&self, app: &AppHandle, allow: bool) -> Result<McpStatusInfo, String> {
        self.allow_exec_command.store(allow, Ordering::SeqCst);
        let db = app.state::<HistoryDb>();
        let flag = if allow { "1" } else { "0" };
        let _ = db.with_conn(|conn| history_db::set_mcp_setting(conn, "mcp_allow_exec_command", flag));
        Ok(self.get_status(app).await)
    }

    pub async fn stop(&self) -> Result<(), String> {
        let mut lock = self.shutdown_tx.lock().await;
        if let Some(tx) = lock.take() {
            let _ = tx.send(());
        }
        self.is_running.store(false, Ordering::SeqCst);
        self.sessions.write().await.clear();
        Ok(())
    }

    pub async fn start(&self, app: AppHandle, port: u16) -> Result<(), String> {
        self.ensure_initialized(&app).await;
        self.stop().await.ok();

        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        {
            let mut lock = self.shutdown_tx.lock().await;
            *lock = Some(shutdown_tx);
        }

        self.port.store(port, Ordering::SeqCst);
        self.is_running.store(true, Ordering::SeqCst);

        let sessions = self.sessions.clone();
        let context = McpServerContext {
            app: app.clone(),
            sessions: sessions.clone(),
            token: self.token.clone(),
            allow_exec_command: self.allow_exec_command.clone(),
        };

        let router = build_router(context);

        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        let listener = match tokio::net::TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                self.is_running.store(false, Ordering::SeqCst);
                return Err(format!("绑定端口 {} 失败: {}", port, e));
            }
        };

        let is_running_flag = self.is_running.clone();

        tauri::async_runtime::spawn(async move {
            let server = axum::serve(
                listener,
                router.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            });

            if let Err(e) = server.await {
                eprintln!("[MCP Server] 运行异常: {}", e);
            }
            is_running_flag.store(false, Ordering::SeqCst);
        });

        Ok(())
    }
}

static MCP_MANAGER: std::sync::OnceLock<McpServerManager> = std::sync::OnceLock::new();

pub fn get_mcp_manager() -> &'static McpServerManager {
    MCP_MANAGER.get_or_init(McpServerManager::new)
}

#[derive(Deserialize)]
struct SseQuery {
    token: Option<String>,
}

#[derive(Deserialize)]
struct McpQuery {
    token: Option<String>,
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
}

/// 全部受保护路由共用的 token 比对：非空且与当前 token 一致才放行
fn token_matches(current_token: &str, provided_token: Option<String>) -> bool {
    match provided_token {
        Some(token) if !token.is_empty() => token == current_token,
        _ => false,
    }
}

fn extract_token(headers: &axum::http::HeaderMap, query_token: Option<&str>) -> Option<String> {
    if let Some(auth_val) = headers.get(axum::http::header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_val.to_str() {
            if let Some(bearer) = auth_str.strip_prefix("Bearer ") {
                return Some(bearer.trim().to_string());
            }
        }
    }
    query_token.map(|s| s.to_string())
}

struct SessionGuard {
    session_id: String,
    sessions: SessionsMap,
}

impl Drop for SessionGuard {
    fn drop(&mut self) {
        let session_id = self.session_id.clone();
        let sessions = self.sessions.clone();
        tauri::async_runtime::spawn(async move {
            let mut map = sessions.write().await;
            map.remove(&session_id);
        });
    }
}

async fn streamable_http_post_handler<R: tauri::Runtime>(
    State(context): State<McpServerContext<R>>,
    headers: axum::http::HeaderMap,
    Query(query): Query<McpQuery>,
    Json(request): Json<JsonRpcRequest>,
) -> impl axum::response::IntoResponse {
    let current_token = context.token.read().await.clone();
    let provided_token = extract_token(&headers, query.token.as_deref());
    if !token_matches(&current_token, provided_token.clone()) {
        let mut resp_headers = axum::http::HeaderMap::new();
        resp_headers.insert(
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderValue::from_static("application/json"),
        );
        return (
            StatusCode::UNAUTHORIZED,
            resp_headers,
            serde_json::to_string(&JsonRpcResponse::error(
                request.id,
                -32000,
                "未授权的访问，Token 无效或缺失",
                None,
            ))
            .unwrap_or_default(),
        );
    }

    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or(query.session_id)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/json"),
    );
    if let Ok(val) = axum::http::HeaderValue::from_str(&session_id) {
        resp_headers.insert("mcp-session-id", val);
    }

    let app = context.app.clone();
    let allow_exec = context.allow_exec_command.load(Ordering::SeqCst);

    if request.method == "notifications/initialized" {
        return (StatusCode::NO_CONTENT, resp_headers, String::new());
    }

    let response = handle_rpc_request(&app, request, &session_id, allow_exec).await;
    let resp_str = match response {
        Some(resp) => serde_json::to_string(&resp).unwrap_or_default(),
        None => String::new(),
    };

    (StatusCode::OK, resp_headers, resp_str)
}

async fn streamable_http_get_handler<R: tauri::Runtime>(
    State(context): State<McpServerContext<R>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Query(query): Query<McpQuery>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, (StatusCode, &'static str)> {
    let current_token = context.token.read().await.clone();
    let provided_token = extract_token(&headers, query.token.as_deref());
    if !token_matches(&current_token, provided_token.clone()) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized: Invalid or missing token"));
    }

    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or(query.session_id)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let (tx, rx) = mpsc::channel::<String>(100);
    let client_ip = addr.to_string();
    let connected_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let user_agent = headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let session_info = McpSessionInfo {
        session_id: session_id.clone(),
        client_ip,
        connected_at,
        user_agent,
    };

    {
        let mut sessions = context.sessions.write().await;
        sessions.insert(
            session_id.clone(),
            SessionItem {
                tx,
                info: session_info,
            },
        );
    }

    let guard = Arc::new(SessionGuard {
        session_id: session_id.clone(),
        sessions: context.sessions.clone(),
    });

    let stream = ReceiverStream::new(rx).map(|msg| Ok(Event::default().event("message").data(msg)));
    let combined_stream = stream.map(move |item| {
        let _g = guard.clone();
        item
    });

    Ok(Sse::new(combined_stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15))))
}

async fn streamable_http_delete_handler<R: tauri::Runtime>(
    State(context): State<McpServerContext<R>>,
    headers: axum::http::HeaderMap,
    Query(query): Query<McpQuery>,
) -> impl axum::response::IntoResponse {
    let current_token = context.token.read().await.clone();
    if !token_matches(&current_token, extract_token(&headers, query.token.as_deref())) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized");
    }

    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or(query.session_id);

    if let Some(id) = session_id {
        let mut sessions = context.sessions.write().await;
        sessions.remove(&id);
    }

    (StatusCode::OK, "Session terminated")
}

async fn sse_handler<R: tauri::Runtime>(
    State(context): State<McpServerContext<R>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Query(query): Query<SseQuery>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, (StatusCode, &'static str)> {
    let current_token = context.token.read().await.clone();
    let provided_token = query.token.as_deref().unwrap_or_default();
    if provided_token.is_empty() || provided_token != current_token {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized: Invalid or missing token"));
    }

    let session_id = Uuid::new_v4().to_string();
    let (tx, rx) = mpsc::channel::<String>(100);

    let client_ip = addr.to_string();
    let connected_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let user_agent = headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let session_info = McpSessionInfo {
        session_id: session_id.clone(),
        client_ip,
        connected_at,
        user_agent,
    };

    {
        let mut sessions = context.sessions.write().await;
        sessions.insert(
            session_id.clone(),
            SessionItem {
                tx,
                info: session_info,
            },
        );
    }

    let endpoint_url = format!("/messages?sessionId={}&token={}", session_id, provided_token);
    let endpoint_event = Event::default().event("endpoint").data(endpoint_url);

    let guard = Arc::new(SessionGuard {
        session_id: session_id.clone(),
        sessions: context.sessions.clone(),
    });

    let stream = ReceiverStream::new(rx).map(|msg| Ok(Event::default().event("message").data(msg)));
    let initial_stream = tokio_stream::once(Ok(endpoint_event));
    let combined_stream = initial_stream.chain(stream).map(move |item| {
        let _g = guard.clone();
        item
    });

    Ok(Sse::new(combined_stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15))))
}

#[derive(Deserialize)]
struct MessagesQuery {
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
    token: Option<String>,
}

async fn messages_handler<R: tauri::Runtime>(
    State(context): State<McpServerContext<R>>,
    headers: axum::http::HeaderMap,
    Query(query): Query<MessagesQuery>,
    Json(request): Json<JsonRpcRequest>,
) -> (StatusCode, Json<Value>) {
    let current_token = context.token.read().await.clone();
    let provided_token = extract_token(&headers, query.token.as_deref()).unwrap_or_default();
    if !token_matches(&current_token, Some(provided_token.clone())) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::to_value(JsonRpcResponse::error(
                request.id,
                -32000,
                "未授权的访问，Token 无效或缺失",
                None,
            )).unwrap()),
        );
    }

    let session_id = match query.session_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::to_value(JsonRpcResponse::error(
                    request.id,
                    -32600,
                    "缺少 sessionId 参数",
                    None,
                )).unwrap()),
            );
        }
    };

    let sender = {
        let sessions = context.sessions.read().await;
        sessions.get(&session_id).map(|item| item.tx.clone())
    };

    let Some(tx) = sender else {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::to_value(JsonRpcResponse::error(
                request.id,
                -32600,
                "未找到对应的 SSE Session",
                None,
            )).unwrap()),
        );
    };

    let app = context.app.clone();
    let allow_exec = context.allow_exec_command.load(Ordering::SeqCst);
    tauri::async_runtime::spawn(async move {
        let response = handle_rpc_request(&app, request, &session_id, allow_exec).await;
        if let Some(resp) = response {
            if let Ok(json_str) = serde_json::to_string(&resp) {
                let _ = tx.send(json_str).await;
            }
        }
    });

    (StatusCode::ACCEPTED, Json(json!({"status": "accepted"})))
}

async fn handle_rpc_request<R: tauri::Runtime>(
    app: &AppHandle<R>,
    request: JsonRpcRequest,
    client_id: &str,
    allow_exec_command: bool,
) -> Option<JsonRpcResponse> {
    let id = request.id;
    match request.method.as_str() {
        "initialize" => {
            let result = InitializeResult {
                protocol_version: "2024-11-05".to_string(),
                capabilities: ServerCapabilities {
                    tools: Some(ToolsCapability {
                        list_changed: Some(true),
                    }),
                    resources: Some(ResourcesCapability {
                        subscribe: Some(false),
                        list_changed: Some(false),
                    }),
                },
                server_info: ServerInfo {
                    name: "sylixscope-mcp".to_string(),
                    version: env!("CARGO_PKG_VERSION").to_string(),
                },
            };
            Some(JsonRpcResponse::success(
                id,
                serde_json::to_value(result).unwrap_or(Value::Null),
            ))
        }
        "notifications/initialized" => None,
        "ping" => Some(JsonRpcResponse::success(id, json!({}))),
        "tools/list" => {
            let tools = get_all_tools::<R>(allow_exec_command);
            Some(JsonRpcResponse::success(id, json!({ "tools": tools })))
        }
        "tools/call" => {
            let params = request.params.unwrap_or(Value::Null);
            let tool_name = params
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            #[cfg(test)]
            {
                let _ = (&tool_name, &arguments, client_id);
                return Some(JsonRpcResponse::success(
                    id,
                    serde_json::to_value(ToolCallResult::error(
                        "工具分发仅在非测试构建中可用",
                    ))
                    .unwrap_or(Value::Null),
                ));
            }

            #[cfg(not(test))]
            {
                let start_time = Instant::now();
                let result =
                    execute_tool_call(app, &tool_name, &arguments, allow_exec_command).await;
                let duration_ms = start_time.elapsed().as_millis() as u64;

                let success = result.is_error.unwrap_or(false) == false;
                let error_msg = if !success {
                    result.content.first().map(|c| c.text.clone())
                } else {
                    None
                };

                let audit_log = McpAuditLog {
                    id: Uuid::new_v4().to_string(),
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64,
                    client_id: client_id.to_string(),
                    tool_name: tool_name.clone(),
                    params: arguments,
                    duration_ms,
                    success,
                    error: error_msg,
                };

                let _ = app.emit("mcp_audit_log", audit_log);

                Some(JsonRpcResponse::success(
                    id,
                    serde_json::to_value(result).unwrap_or(Value::Null),
                ))
            }
        }
        _ => Some(JsonRpcResponse::error(
            id,
            -32601,
            format!("未知的方法: {}", request.method),
            None,
        )),
    }
}

#[cfg_attr(not(test), allow(dead_code))]
const TOOL_NAMES: &[&str] = &[
    "sylixos_get_realtime_metrics",
    "sylixos_list_processes",
    "sylixos_get_process_detail",
    "sylixos_start_monitoring",
    "sylixos_stop_monitoring",
    "sylixos_manage_recording",
    "sylixos_get_network_info",
    "sylixos_execute_command",
];

type ToolFuture = Pin<Box<dyn Future<Output = ToolCallResult> + Send>>;
type ToolHandler<R> = fn(AppHandle<R>, Value) -> ToolFuture;

struct ToolEntry<R: tauri::Runtime> {
    tool: Tool,
    handler: ToolHandler<R>,
}

#[cfg(not(test))]
fn handle_get_realtime_metrics<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let force_fresh = args.get("force_fresh").and_then(|v| v.as_bool()).unwrap_or(false);
            if force_fresh {
                if let Some(cfg) = get_target_config(app).await {
                    match sample_fresh_snapshot(&cfg).await {
                        Ok(payload) => {
                            ToolCallResult::text(serde_json::to_string_pretty(&payload.metrics).unwrap())
                        }
                        Err(e) => ToolCallResult::error(format!("即时采样失败: {}", e)),
                    }
                } else {
                    ToolCallResult::error("当前未连接目标板，无法执行即时采样")
                }
            } else {
                let snapshot = get_latest_snapshot(app).await;
                match snapshot {
                    Some(payload) => ToolCallResult::text(serde_json::to_string_pretty(&payload.metrics).unwrap()),
                    None => ToolCallResult::error("当前暂无遥测快照数据，请确认目标板监控是否已启动"),
                }
            }
        
    })
}

#[cfg(not(test))]
fn handle_list_processes<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let sort_by = args.get("sort_by").and_then(|v| v.as_str()).unwrap_or("cpu");
            let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(50) as usize;
            let force_fresh = args.get("force_fresh").and_then(|v| v.as_bool()).unwrap_or(false);

            let mut processes = if force_fresh {
                if let Some(cfg) = get_target_config(app).await {
                    match sample_fresh_snapshot(&cfg).await {
                        Ok(payload) => payload.processes,
                        Err(e) => return ToolCallResult::error(format!("即时进程采样失败: {}", e)),
                    }
                } else {
                    return ToolCallResult::error("当前未连接目标板，无法执行即时采样");
                }
            } else {
                match get_latest_snapshot(app).await {
                    Some(payload) => payload.processes,
                    None => return ToolCallResult::error("当前暂无进程数据，请确认目标板监控是否已启动"),
                }
            };

            match sort_by {
                "mem" => processes.sort_by(|a, b| b.mem.partial_cmp(&a.mem).unwrap_or(std::cmp::Ordering::Equal)),
                "pid" => processes.sort_by_key(|p| p.pid),
                _ => processes.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal)),
            }

            if processes.len() > limit {
                processes.truncate(limit);
            }

            ToolCallResult::text(serde_json::to_string_pretty(&processes).unwrap())
        
    })
}

#[cfg(not(test))]
fn handle_get_process_detail<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let Some(pid) = args.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32) else {
                return ToolCallResult::error("缺少必需的参数 pid");
            };

            let snapshot = get_latest_snapshot(app).await;
            if let Some(payload) = snapshot {
                if let Some(proc) = payload.processes.into_iter().find(|p| p.pid == pid) {
                    return ToolCallResult::text(serde_json::to_string_pretty(&proc).unwrap());
                }
            }

            if let Some(cfg) = get_target_config(app).await {
                match fetch_single_process_detail(&cfg, pid).await {
                    Ok(proc) => ToolCallResult::text(serde_json::to_string_pretty(&proc).unwrap()),
                    Err(e) => ToolCallResult::error(format!("获取进程 {} 详情失败: {}", pid, e)),
                }
            } else {
                ToolCallResult::error(format!("未找到 PID 为 {} 的进程信息", pid))
            }
        
    })
}

#[cfg(not(test))]
fn handle_get_network_info<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let category = args.get("category").and_then(|v| v.as_str()).unwrap_or("interfaces");
            let protocol = args.get("protocol").and_then(|v| v.as_str()).map(|s| s.to_string());

            let Some(cfg) = get_target_config(app).await else {
                return ToolCallResult::error("目标板未连接，无法获取网络信息。请先连接目标板。");
            };

            match category {
                "interfaces" => match crate::network_manager::fetch_network_interfaces(&cfg).await {
                    Ok(data) => ToolCallResult::text(serde_json::to_string_pretty(&data).unwrap()),
                    Err(e) => ToolCallResult::error(format!("获取网络接口失败: {}", e)),
                },
                "sockets" => match crate::network_manager::fetch_network_sockets(&cfg, protocol).await {
                    Ok(data) => ToolCallResult::text(serde_json::to_string_pretty(&data).unwrap()),
                    Err(e) => ToolCallResult::error(format!("获取套接字列表失败: {}", e)),
                },
                "routes" => match crate::network_manager::fetch_network_routes(&cfg).await {
                    Ok(data) => ToolCallResult::text(serde_json::to_string_pretty(&data).unwrap()),
                    Err(e) => ToolCallResult::error(format!("获取路由表失败: {}", e)),
                },
                "statistics" => match crate::network_manager::fetch_network_stats(&cfg).await {
                    Ok(data) => ToolCallResult::text(serde_json::to_string_pretty(&data).unwrap()),
                    Err(e) => ToolCallResult::error(format!("获取网络统计失败: {}", e)),
                },
                "all" => {
                    let ifaces = crate::network_manager::fetch_network_interfaces(&cfg).await.ok();
                    let sockets = crate::network_manager::fetch_network_sockets(&cfg, None).await.ok();
                    let routes = crate::network_manager::fetch_network_routes(&cfg).await.ok();
                    let stats = crate::network_manager::fetch_network_stats(&cfg).await.ok();
                    let res = serde_json::json!({
                        "interfaces": ifaces,
                        "sockets": sockets,
                        "routes": routes,
                        "statistics": stats,
                    });
                    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
                }
                _ => ToolCallResult::error(format!("未知的 category: {}", category)),
            }
        
    })
}

#[cfg(not(test))]
fn handle_execute_command_tool<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let Some(cmd) = args.get("command").and_then(|v| v.as_str()) else {
                return ToolCallResult::error("缺少必需的参数 command");
            };
            let timeout_secs = args.get("timeout_secs").and_then(|v| v.as_u64()).unwrap_or(5);

            let Some(cfg) = get_target_config(app).await else {
                return ToolCallResult::error("目标板未连接，无法执行 Shell 命令。请先调用 sylixos_start_monitoring 连接目标板。");
            };

            let addr = format!("{}:{}", cfg.ip, cfg.port);
            match TelnetClient::connect(&addr, &cfg.username, &cfg.password, Duration::from_secs(5)).await {
                Ok(mut client) => {
                    match client.execute_command(cmd, Duration::from_secs(timeout_secs)).await {
                        Ok(output) => ToolCallResult::text(output),
                        Err(e) => ToolCallResult::error(format!("命令执行失败或超时: {}", e)),
                    }
                }
                Err(e) => ToolCallResult::error(format!("建立独立 Command Session 失败: {}", e)),
            }
        
    })
}

#[cfg(not(test))]
fn handle_start_monitoring_tool<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let Some(ip) = args.get("ip").and_then(|v| v.as_str()) else {
                return ToolCallResult::error("缺少必需的参数 ip");
            };
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(23) as u16;
            let username = args.get("username").and_then(|v| v.as_str()).unwrap_or("root").to_string();
            let password = args.get("password").and_then(|v| v.as_str()).unwrap_or("root").to_string();

            let lock = app.state::<SharedState>();
            let mut state_lock = lock.state.lock().await;

            if state_lock.is_running {
                if let Some(stop_tx) = state_lock.stop_tx.take() {
                    let _ = stop_tx.send(true);
                }
                state_lock.is_running = false;
            }

            let (stop_tx, stop_rx) = tokio::sync::watch::channel(false);
            state_lock.stop_tx = Some(stop_tx);
            state_lock.is_running = true;
            state_lock.target_config = Some(TargetConfig {
                ip: ip.to_string(),
                port,
                username: username.clone(),
                password: password.clone(),
            });

            let app_clone = app.clone();
            let ip_str = ip.to_string();
            tauri::async_runtime::spawn(async move {
                crate::monitor_manager::start_monitoring_task(
                    app_clone, ip_str, port, username, password, stop_rx,
                )
                .await;
            });


            ToolCallResult::text(format!("已成功启动对目标板 {}:{} 的监控采集任务", ip, port))
        
    })
}

#[cfg(not(test))]
fn handle_stop_monitoring_tool<R: tauri::Runtime>(app: AppHandle<R>, _args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let lock = app.state::<SharedState>();
            let mut state_lock = lock.state.lock().await;
            if state_lock.is_running {
                if let Some(stop_tx) = state_lock.stop_tx.take() {
                    let _ = stop_tx.send(true);
                }
                state_lock.is_running = false;
                state_lock.latest_snapshot = None;
                ToolCallResult::text("已停止目标板监控采集")
            } else {
                ToolCallResult::text("当前监控采集未运行")
            }
        
    })
}

#[cfg(not(test))]
fn handle_manage_recording_tool<R: tauri::Runtime>(app: AppHandle<R>, args: Value) -> ToolFuture {
    Box::pin(async move {
        let app = &app;
            let Some(action) = args.get("action").and_then(|v| v.as_str()) else {
                return ToolCallResult::error("缺少必需的参数 action");
            };

            let db = app.state::<HistoryDb>();

            match action {
                "start" => {
                    let lock = app.state::<SharedState>();
                    let mut state_lock = lock.state.lock().await;
                    if !state_lock.is_running {
                        return ToolCallResult::error("当前未运行监控数据引擎，无法开始录制");
                    }
                    if state_lock.recording_id.is_some() {
                        return ToolCallResult::error("当前已在录制中");
                    }

                    let name = args.get("name").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| {
                        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
                        format!("{}-mcp-record", now)
                    });

                    let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
                    match db.with_conn(|conn| history_db::insert_record(conn, &name, now_secs)) {
                        Ok(rid) => {
                            state_lock.recording_id = Some(rid);
                            ToolCallResult::text(format!("成功开始录制，录制包 ID: {}, 名称: {}", rid, name))
                        }
                        Err(e) => ToolCallResult::error(format!("创建录制包失败: {}", e)),
                    }
                }
                "stop" => {
                    let lock = app.state::<SharedState>();
                    let mut state_lock = lock.state.lock().await;
                    if let Some(rid) = state_lock.recording_id.take() {
                        let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
                        match db.with_conn(|conn| history_db::stop_record(conn, rid, now_secs)) {
                            Ok(_) => ToolCallResult::text(format!("已停止录制包 (ID: {})", rid)),
                            Err(e) => ToolCallResult::error(format!("停止录制失败: {}", e)),
                        }
                    } else {
                        ToolCallResult::error("当前未在录制中")
                    }
                }
                "list" => {
                    match db.with_conn(|conn| history_db::get_records(conn)) {
                        Ok(records) => ToolCallResult::text(serde_json::to_string_pretty(&records).unwrap()),
                        Err(e) => ToolCallResult::error(format!("获取录制包列表失败: {}", e)),
                    }
                }
                "get_data" => {
                    let Some(rid) = args.get("record_id").and_then(|v| v.as_u64()) else {
                        return ToolCallResult::error("action=get_data 时必需提供 record_id 参数");
                    };
                    match db.with_conn(|conn| {
                        let metrics = history_db::get_record_metrics(conn, rid)?;
                        let processes = history_db::get_record_processes_all(conn, rid)?;
                        Ok(json!({
                            "record_id": rid,
                            "metrics": metrics,
                            "processes": processes,
                        }))
                    }) {
                        Ok(data) => ToolCallResult::text(serde_json::to_string_pretty(&data).unwrap()),
                        Err(e) => ToolCallResult::error(format!("获取录制数据失败: {}", e)),
                    }
                }
                _ => ToolCallResult::error(format!("不支持的 action: {}", action)),
            }
        
    })
}

/// 工具目录与实现注册表：schema 声明与 handler 同处一地，
/// 新增工具只碰一处，杜绝目录与分发的漂移。
#[cfg(not(test))]
fn tool_registry<R: tauri::Runtime>() -> Vec<ToolEntry<R>> {
    vec![
            ToolEntry {
                tool:             Tool {
                name: "sylixos_get_realtime_metrics".to_string(),
                description: "获取 SylixOS 目标板当前的实时 CPU（总使用率与各核心使用率）及内存分布详情（总计、已用、空闲、内核态、用户态）。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "force_fresh": {
                            "type": "boolean",
                            "description": "是否强制向硬件发起即时 Telnet 采样（默认 false 使用最新内存快照）。"
                        }
                    }
                }),
            },
                handler: handle_get_realtime_metrics,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_list_processes".to_string(),
                description: "查询 SylixOS 目标板当前正在运行的活跃进程列表及各进程的 CPU/内存占用。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "sort_by": {
                            "type": "string",
                            "enum": ["cpu", "mem", "pid"],
                            "description": "排序字段，支持 cpu, mem 或 pid，默认按 cpu 降序。"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "返回的进程数量上限，默认 50。"
                        },
                        "force_fresh": {
                            "type": "boolean",
                            "description": "是否强制即时刷新。"
                        }
                    }
                }),
            },
                handler: handle_list_processes,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_get_process_detail".to_string(),
                description: "查询指定 PID 进程的详细信息，包含启动命令行、可执行文件完整路径及各线程详情。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "pid": {
                            "type": "integer",
                            "description": "需要查询的进程 PID。"
                        }
                    },
                    "required": ["pid"]
                }),
            },
                handler: handle_get_process_detail,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_start_monitoring".to_string(),
                description: "启动与 SylixOS 目标板的遥测监控连接。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "ip": { "type": "string", "description": "目标板 IP 地址。" },
                        "port": { "type": "integer", "description": "Telnet 端口，默认 23。" },
                        "username": { "type": "string", "description": "登录用户名，默认 root。" },
                        "password": { "type": "string", "description": "登录密码，默认 root。" }
                    },
                    "required": ["ip"]
                }),
            },
                handler: handle_start_monitoring_tool,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_stop_monitoring".to_string(),
                description: "停止当前与 SylixOS 目标板的遥测数据采集连接。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {}
                }),
            },
                handler: handle_stop_monitoring_tool,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_manage_recording".to_string(),
                description: "管理系统监控历史数据包录制（开始录制、停止录制、查看历史包列表、读取历史指标）。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["start", "stop", "list", "get_data"],
                            "description": "录制操作类型。"
                        },
                        "name": {
                            "type": "string",
                            "description": "开始录制时的自定义数据包名称。"
                        },
                        "record_id": {
                            "type": "integer",
                            "description": "读取历史数据时的录制包 ID。"
                        }
                    },
                    "required": ["action"]
                }),
            },
                handler: handle_manage_recording_tool,
            },
            ToolEntry {
                tool:             Tool {
                name: "sylixos_get_network_info".to_string(),
                description: "查询 SylixOS 目标板网络状态，包括网络接口流量、活跃套接字连接、路由表及协议统计。".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["interfaces", "sockets", "routes", "statistics", "all"],
                            "description": "要查询的网络信息分类，默认 interfaces。"
                        },
                        "protocol": {
                            "type": "string",
                            "enum": ["ALL", "TCP", "UDP", "UNIX", "PACKET"],
                            "description": "当 category 为 sockets 时，指定过滤协议类型。"
                        }
                    }
                }),
            },
                handler: handle_get_network_info,
            },
            ToolEntry {
                tool: Tool {
                    name: "sylixos_execute_command".to_string(),
                    description: "在 SylixOS 目标板通过独立 Command Session 执行原生 Shell 调试命令（如 ts, ps, netstat, ping, df 等），并返回完整终端回显。".to_string(),
                    input_schema: json!({
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "要在 SylixOS 终端执行的 Shell 命令。"
                            },
                            "timeout_secs": {
                                "type": "integer",
                                "description": "命令执行超时时间（秒），默认 5 秒。"
                            }
                        },
                        "required": ["command"]
                    }),
                },
                handler: handle_execute_command_tool,
            },
        ]
}

// 测试 harness 链接不了 GUI 运行时（Windows 缺 comctl32 v6 manifest 时
// STATUS_ENTRYPOINT_NOT_FOUND），测试构建只保留 schema 表 + 桩 handler，
// get_all_tools 的目录/分发漂移防线依旧可测。
#[cfg(test)]
fn tool_registry<R: tauri::Runtime>() -> Vec<ToolEntry<R>> {
    TOOL_NAMES
        .iter()
        .map(|name| ToolEntry {
            tool: Tool {
                name: name.to_string(),
                description: String::new(),
                input_schema: json!({"type": "object"}),
            },
            handler: stub_handler::<R>,
        })
        .collect()
}

#[cfg(test)]
fn stub_handler<R: tauri::Runtime>(_app: AppHandle<R>, _args: Value) -> ToolFuture {
    Box::pin(async { ToolCallResult::error("工具分发仅在非测试构建中可用") })
}

#[cfg(not(test))]
fn get_all_tools<R: tauri::Runtime>(allow_exec_command: bool) -> Vec<Tool> {
    tool_registry::<R>()
        .iter()
        .filter(|entry| allow_exec_command || entry.tool.name != "sylixos_execute_command")
        .map(|entry| entry.tool.clone())
        .collect()
}

#[cfg(test)]
fn get_all_tools<R: tauri::Runtime>(allow_exec_command: bool) -> Vec<Tool> {
    TOOL_NAMES
        .iter()
        .filter(|name| allow_exec_command || **name != "sylixos_execute_command")
        .map(|name| Tool {
            name: name.to_string(),
            description: String::new(),
            input_schema: json!({ "type": "object" }),
        })
        .collect()
}

#[cfg(not(test))]
async fn execute_tool_call<R: tauri::Runtime>(
    app: &AppHandle<R>,
    name: &str,
    args: &Value,
    allow_exec_command: bool,
) -> ToolCallResult {
    if name == "sylixos_execute_command" && !allow_exec_command {
        return ToolCallResult::error("只读安全模式已启用：禁止在 SylixOS 目标板执行 Shell 调试命令");
    }

    let registry = tool_registry::<R>();
    let Some(entry) = registry.iter().find(|entry| entry.tool.name == name) else {
        return ToolCallResult::error(format!("未知的 Tool 名称: {}", name));
    };

    (entry.handler)(app.clone(), args.clone()).await
}

async fn get_latest_snapshot<R: tauri::Runtime>(app: &AppHandle<R>) -> Option<MonitorPayload> {
    let lock = app.state::<SharedState>();
    let state_lock = lock.state.lock().await;
    state_lock.latest_snapshot.clone()
}

async fn get_target_config<R: tauri::Runtime>(app: &AppHandle<R>) -> Option<TargetConfig> {
    let lock = app.state::<SharedState>();
    let state_lock = lock.state.lock().await;
    state_lock.target_config.clone()
}

async fn sample_fresh_snapshot(cfg: &TargetConfig) -> Result<MonitorPayload, String> {
    let addr = format!("{}:{}", cfg.ip, cfg.port);
    let mut telnet = TelnetClient::connect(&addr, &cfg.username, &cfg.password, Duration::from_secs(5)).await?;

    let top_out = telnet.execute_command("top", Duration::from_secs(3)).await.unwrap_or_default();
    let (cpu_map, sys_cpu, cores, threads_by_pid) = parse_sylixos_top(&top_out);

    let ps_out = telnet.execute_command("ps", Duration::from_secs(3)).await.unwrap_or_default();
    let ps_map = parse_sylixos_ps(&ps_out);

    let free_out = telnet.execute_command("free", Duration::from_secs(3)).await.unwrap_or_default();
    let memory = build_memory_metrics(&free_out, &ps_map).unwrap_or(MemoryMetrics::default());

    Ok(assemble_payload(sys_cpu, cores, &cpu_map, &threads_by_pid, &ps_map, memory))
}

async fn fetch_single_process_detail(cfg: &TargetConfig, pid: u32) -> Result<ProcessInfo, String> {
    let addr = format!("{}:{}", cfg.ip, cfg.port);
    let mut telnet = TelnetClient::connect(&addr, &cfg.username, &cfg.password, Duration::from_secs(5)).await?;

    let cmdline_out = telnet.execute_command(&format!("cat /proc/{}/cmdline", pid), Duration::from_secs(2)).await.ok();
    let execfile_out = telnet.execute_command(&format!("cat /proc/{}/execfile", pid), Duration::from_secs(2)).await.ok();

    Ok(ProcessInfo {
        pid,
        name: format!("process-{}", pid),
        cpu: 0.0,
        mem: 0.0,
        cmdline: cmdline_out.filter(|s| !s.trim().is_empty()),
        execfile: execfile_out.filter(|s| !s.trim().is_empty()),
        threads: vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_all_tools_filtering() {
        let tools_with_exec = get_all_tools::<tauri::Wry>(true);
        assert!(tools_with_exec.iter().any(|t| t.name == "sylixos_execute_command"));
        assert!(tools_with_exec.iter().any(|t| t.name == "sylixos_get_network_info"));
        assert_eq!(tools_with_exec.len(), 8);

        let tools_read_only = get_all_tools::<tauri::Wry>(false);
        assert!(!tools_read_only.iter().any(|t| t.name == "sylixos_execute_command"));
        assert!(tools_read_only.iter().any(|t| t.name == "sylixos_get_network_info"));
        assert_eq!(tools_read_only.len(), 7);
    }

    #[test]
    fn test_detect_lan_ip_format() {
        let ip = detect_lan_ip();
        if let Some(ref addr) = ip {
            assert!(!addr.is_empty());
            assert!(!addr.starts_with("127."));
            assert!(!addr.starts_with("198.18."));
            assert!(!addr.starts_with("198.19."));
        }
    }

    #[test]
    fn test_is_valid_accessible_ipv4() {
        use std::net::Ipv4Addr;

        // 应该被排除的 FakeIP / TUN 代理内部网段
        assert!(!is_valid_accessible_ipv4(&Ipv4Addr::new(198, 18, 0, 1)));
        assert!(!is_valid_accessible_ipv4(&Ipv4Addr::new(198, 19, 255, 254)));

        // 应该被排除的回环与未指定与 APIPA
        assert!(!is_valid_accessible_ipv4(&Ipv4Addr::new(127, 0, 0, 1)));
        assert!(!is_valid_accessible_ipv4(&Ipv4Addr::new(0, 0, 0, 0)));
        assert!(!is_valid_accessible_ipv4(&Ipv4Addr::new(169, 254, 1, 1)));

        // 应该被保留的物理局域网与 Tailscale/CGNAT
        assert!(is_valid_accessible_ipv4(&Ipv4Addr::new(10, 12, 0, 206)));
        assert!(is_valid_accessible_ipv4(&Ipv4Addr::new(192, 168, 1, 100)));
        assert!(is_valid_accessible_ipv4(&Ipv4Addr::new(172, 20, 0, 5)));
        assert!(is_valid_accessible_ipv4(&Ipv4Addr::new(100, 106, 128, 94)));
    }
}
