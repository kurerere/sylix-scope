# 0001: Rust 原生基于 Axum 的 HTTP-SSE 内置 MCP 服务架构

## Context
SylixScope 需要为外部 AI 客户端（如 Cursor、Claude Desktop、Antigravity 等）提供系统可观测性与控制能力。由于本程序为 Tauri 桌面应用，后端由 Rust (Tokio) 驱动，直接掌控与目标板的 Telnet 采集链路和 SQLite 历史数据库。

## Decision
我们决定在 Tauri 后端（Rust 侧）直接集成 `axum`，实现符合 Model Context Protocol (MCP) 规范的 HTTP-SSE 传输服务（`GET /sse` + `POST /messages`），默认监听 `127.0.0.1:3001`。

## Rationale
1. **零进程通信与内存直通**：直接在 Tokio 异步运行时内与 `SharedState` 及 SQLite 交互，无需引入 Node.js 或单独进程 Sidecar，保持单二进制部署的简洁与高性能。
2. **广泛的 AI 客户端兼容性**：标准 HTTP-SSE 传输是目前主流 AI 工具接入远程/本地网络 MCP 服务的黄金标准。
