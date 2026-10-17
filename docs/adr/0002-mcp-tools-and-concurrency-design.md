# 0002: MCP 工具契约、并发通道与双模遥测策略

## Context
在内置 MCP 服务中，AI 客户端需要并发执行系统诊断命令并高频查询系统资源，同时不能干扰 UI 前端实时波形图的流畅绘制。

## Decision
1. **独立 Command Session**：为 MCP 的 `sylixos_execute_command` 建立独立专属的 Telnet 会话通道，与主监控采集循环在网络与时序上完全物理隔离。
2. **细粒度 Tool 命名与契约**：对外提供 `sylixos_get_realtime_metrics`、`sylixos_list_processes`、`sylixos_get_process_detail`、`sylixos_execute_command`、`sylixos_start_monitoring`、`sylixos_stop_monitoring`、`sylixos_manage_recording` 等动宾明确的 Tool。
3. **快照与即时双模查询**：实时指标默认读取内存中的最新 Telemetry Snapshot（< 5ms 响应），同时支持 `force_fresh: true` 触发即时 Telnet 查询。
4. **多客户端隔离与审计流水**：基于 UUID 分配独立 `sessionId` 与 `mpsc` 队列，并通过 Tauri 事件向前端实时推送审计流水（Audit Log）。
