# Specification: 内置 HTTP-SSE MCP 服务 (Built-in HTTP-SSE MCP Server)

## Problem Statement

当前 SylixScope 作为桌面遥测看板，系统资源监控指标与进程诊断数据仅能通过图形界面由人工肉眼观测。当嵌入式工程师使用 AI 辅助编程或系统排错工具（如 Cursor、Claude Desktop、Antigravity 等）时，AI 无法直接感知目标硬件的实时运行状态，也无法自动化采集指标、调取历史记录或执行诊断指令，导致调试与问题复现过程中存在大量重复的手动搬运与割裂。

## Solution

在 SylixScope 后端内置原生基于 HTTP-SSE 传输协议的 Model Context Protocol (MCP) 服务。外部 AI 客户端通过标准 `GET /sse` 和 `POST /messages` 端点连接，获得对目标板的实时遥测快照查询、进程与线程追踪、历史录制管理以及受控 Shell 命令执行能力；同时在桌面端提供极客风格的 MCP 驾驶舱面板，实现服务状态感知、一键配置导出与实时调用审计流水呈现。

## User Stories

1. As an embedded engineer using an AI assistant, I want the AI to connect to SylixScope via standard HTTP-SSE endpoint, so that the AI can seamlessly interact with the local monitoring engine without extra proxy services.
2. As an embedded engineer, I want the AI to query real-time CPU (total and per-core) and memory partition usage from the Target Board, so that it can evaluate system health during code execution.
3. As an embedded engineer, I want the AI to list active processes and sort them by CPU or memory usage, so that high-load processes causing performance bottlenecks can be identified automatically.
4. As an embedded engineer, I want the AI to retrieve detailed process metadata (command line, executable path, thread list with CPU usage), so that thread-level abnormal load can be diagnosed in depth.
5. As an embedded engineer, I want the AI to execute arbitrary SylixOS shell commands through an isolated Command Session, so that diagnostic tools like `ts`, `netstat`, and `ping` can be executed without stalling the real-time monitoring graph.
6. As an embedded engineer, I want the telemetry querying tools to support both cached snapshots and force-fresh sampling, so that common queries return instantly while verification queries reflect fresh hardware changes.
7. As an embedded engineer, I want the AI to start and stop the Monitor Engine connection to a Target Board, so that multi-board automated testing workflows can be driven programmatically.
8. As an embedded engineer, I want the AI to manage Recording Sessions (start, stop, list, export data), so that diagnostic telemetry packages can be archived during automated load tests.
9. As an embedded engineer, I want to see the active status and listening port of the MCP Server in the GUI cockpit, so that I have clear operational awareness of the AI connection state.
10. As an embedded engineer, I want to copy client configuration JSON snippets with a single click in the UI, so that I can configure Cursor or Claude Desktop without manual typing.
11. As an embedded engineer, I want to inspect a live terminal-style audit stream of AI tool invocations in the UI, so that I can monitor every parameter, execution latency, and result from external AI callers.
12. As an embedded engineer, I want to customize the MCP Server listening port and restart the service from the UI, so that port conflicts on development workstations can be resolved smoothly.
13. As a developer, I want the MCP Server to handle multiple concurrent SSE client sessions safely, so that multiple IDE windows or agents can collaborate simultaneously.
14. As a developer, I want all tool invocations to be protected by strict CORS and local loopback binding by default, so that untrusted web applications cannot trigger unauthorized hardware actions.

## Implementation Decisions

### 1. 服务宿主与运行时架构
- MCP Server 直接由 Tauri 后端（Rust 侧）的原生异步 HTTP 框架承载，随桌面应用生命周期启动，无需额外的 Node.js 或进程级 Sidecar。
- 服务默认绑定到本地回环地址 `127.0.0.1:3001`，并预留可通过 Tauri IPC 命令动态切换端口并重启的能力。

### 2. 协议与传输层规范
- 采用符合 Model Context Protocol 规范的标准 SSE 传输方式：
  - `GET /sse`：分配客户端唯一的 Session 标识，建立长连接事件流。
  - `POST /messages?sessionId=<id>`：接收客户端发出的 JSON-RPC 2.0 请求（支持 `initialize`, `tools/list`, `tools/call`, `ping` 等方法），并通过对应 Session 队列异步推回结果。
- 采用读写锁保护的多会话管理器，支持多客户端独立收发与并发隔离。

### 3. 工具契约体系 (Tools Schema)
- 暴露 7 个细粒度动宾语义的 MCP Tools：
  - `sylixos_get_realtime_metrics`: 查询最新 CPU（总体/各核心）与内存分布。支持参数 `force_fresh: boolean`。
  - `sylixos_list_processes`: 查询活跃进程列表。支持参数 `sort_by: "cpu" | "mem" | "pid"`, `limit: number`, `force_fresh: boolean`。
  - `sylixos_get_process_detail`: 查询指定进程的启动命令、二进制路径及线程详情。参数 `pid: number`。
  - `sylixos_execute_command`: 在目标板执行原生 Shell 调试命令。参数 `command: string`, `timeout_secs?: number`。
  - `sylixos_start_monitoring`: 启动与目标板的遥测监控连接。参数 `ip: string`, `port?: number`, `username?: string`, `password?: string`。
  - `sylixos_stop_monitoring`: 停止当前的遥测监控连接。
  - `sylixos_manage_recording`: 控制数据包录制与导出。参数 `action: "start" | "stop" | "list" | "get_data"`, `name?: string`, `record_id?: number`。

### 4. 通道隔离与双模遥测策略
- **命令通道隔离**：Shell 命令执行通过独立的专属 Command Session 通道进行，网络通信与会话互斥独立于主监控采集轮询协程，杜绝图表丢点与数据交织。
- **双模遥测**：查询指标默认优先读取内存中由 Monitor Engine 周期性更新的最新 Telemetry Snapshot（< 5ms 返回）；当指定 `force_fresh = true` 时触发即时 Telnet 查询。

### 5. 前端遥测驾驶舱与审计联动
- 在主界面工具栏/抽屉中集成 MCP 驾驶舱面板，提供状态呼吸灯指示、端点展示、一键复制客户端 JSON 配置片段、端口变更控制。
- 每次工具调用均生成包含客户端标识、工具名称、入参、耗时与执行结果的 Audit Log，通过 Tauri 事件实时广播给前端，在 UI 上以极客终端瀑布流形式滚动呈现。

## Testing Decisions

### 1. 测试质量准则
- 坚持从外部行为视角切入测试（Black-box behavioral testing），重点校验 HTTP-SSE 协议契约、JSON-RPC 状态机及 IPC 数据转换的正确性，不依赖内部私有实现细节。

### 2. 测试接缝与层级 (Testing Seams)
- **协议与传输接缝 (HTTP-SSE Wire Seam)**：针对 Axum 路由分发器，验证 `GET /sse` 会话初始化握手、`POST /messages` JSON-RPC 方法路由（`initialize` / `tools/list` / `tools/call`）以及错误响应结构。
- **前端服务与事件接缝 (IPC & Audit Seam)**：针对前端 MCP 服务模块，使用 Vitest 测试 Tauri Invoke 包装、状态管理、端口重载响应及 `mcp_audit_log` 实时事件流的追加与消费。
- **快照与解析接缝 (Domain Logic Seam)**：验证双模遥测数据（CPU 浮点计算、内存分区大小转换）与各 Tool Call 的输入/输出 Schema 校验逻辑。

### 3. 代码库先例参考 (Prior Art)
- 前端测试参考既有 `env.test.ts` 及 Vitest 规范。
- 后端数据解析与 Telnet 契约参考 `telnet_client.rs` 与 `history_db.rs` 中的单元测试组织模式。

## Out of Scope

- 远程广域网公网穿透或多租户云端代理转发（当前仅聚焦本地局域网/环回调试）。
- 对 SylixOS 板卡进行文件系统大文件流式批量同步（已规划在后续专用文件传输工具中支持）。
- 网页端免安装 Web 版的前端直接监听（限于浏览器沙箱机制，仅在桌面宿主内运行）。

## Further Notes

- 该规范完全符合 Model Context Protocol (MCP) 2024-11-05 协议版本标准。
- 与项目既有的 `The Telemetric Cockpit` 设计规范深度融合，保持暗色硬核科技工业风格。
