# Specification: MCP 服务全网卡监听、Token 鉴权与 AI 客户端生态增强 (MCP Server Auth & Ecosystem Enhancements)

## Problem Statement

当前 SylixScope 内置的 MCP Server 仅默认绑定到本地回环地址 `127.0.0.1`，且缺乏连接鉴权机制。在实际团队研发与自动化调试场景中存在以下痛点：
1. **局域网协同受限**：当工程师在多台开发机、测试机或远程调试主机上使用 AI 工具时，无法通过局域网连接同一台工控机上运行的 SylixOS 监控服务；
2. **安全凭证缺失与高危操作风险**：一旦将网络端口向局域网广播，未鉴权的任何客户端均可向目标板发起 Shell 命令注入或触发系统重启，存在严重的安全隐患；
3. **客户端适配割裂**：用户日常主流的开发环境（如 Google Antigravity、VS Code Codex / Cline）配置格式各异，手动拼装 URL 与凭证参数容易出错；
4. **凭证生命周期缺乏控制**：缺乏 Token 查看、复制及一键重置销毁能力，无法在怀疑凭证泄露时快速切断所有现有会话。

## Solution

升级 MCP 服务体系：
1. **全网卡安全监听**：MCP Server 默认绑定 `0.0.0.0`，同时自动探测本机活跃局域网 IP，UI 智能提供「本机回环」与「局域网」多模式连接端点；
2. **Token 安全鉴权体系**：自动生成 `sk-sylixos-` 前缀的高强随机 Token 并持久化存储，支持通过 URL Query (`?token=...`) 与 HTTP Header (`Authorization: Bearer ...`) 双轨鉴权，未授权请求严密拦截；
3. **Token 生命周期控制**：在设置面板提供 Token 密文/明文切换、独立复制与一键重置功能，重置时自动强制断开并清理所有旧活跃 Session；
4. **只读安全防护模式**：支持一键切换「只读安全模式」，开启后过滤并禁用 Shell 命令执行等高危工具，仅暴露安全的监控查询类接口；
5. **AI 客户端生态深度集成**：界面原生支持 **Google Antigravity** 与 **Codex / VS Code** 标准配置片段的 Tab 切换与一键复制，自动填充最新 Token 与对应网络 IP。

## User Stories

1. As an embedded engineer, I want the MCP Server to bind to `0.0.0.0` by default, so that my AI agents running on another development workstation in the local network can connect to the monitor server.
2. As an embedded engineer, I want the monitor app to automatically detect my active LAN IP address, so that I don't have to manually look up `ifconfig` or `ipconfig` when configuring remote AI tools.
3. As an embedded engineer, I want all incoming MCP requests to be authenticated with a persistent token, so that unauthorized devices on the local network cannot access or manipulate my Target Board.
4. As an embedded engineer, I want the authentication token to persist across desktop app restarts, so that I don't have to update configuration files in my IDE every time I open the monitor application.
5. As an embedded engineer, I want to view my current authentication token with a masked/unmasked toggle in the UI, so that I can inspect or copy it while avoiding accidental exposure during screen shares.
6. As an embedded engineer, I want to reset the authentication token with a single click in the UI, so that I can instantly revoke access if the token is compromised.
7. As an embedded engineer, I want all active client sessions to be terminated immediately when the token is reset, so that stale or compromised connections cannot continue executing commands.
8. As an embedded engineer, I want the MCP Server to support token authentication via both URL query parameters (`?token=...`) and HTTP `Authorization: Bearer` headers, so that any AI client or HTTP library can connect without compatibility hurdles.
9. As an embedded engineer, I want to toggle a "Read-Only Security Mode" for the MCP server, so that external AI agents are strictly restricted to metric queries and cannot execute arbitrary shell commands on the hardware.
10. As an embedded engineer using Google Antigravity, I want to copy a pre-formatted `mcp_config.json` snippet with my active IP and token, so that I can integrate with Antigravity in seconds.
11. As an embedded engineer using Codex or VS Code plugins, I want to copy standard `mcpServers` JSON snippets, so that my IDE coding assistant can instantly discover SylixOS tools.
12. As an embedded engineer, I want to copy the raw SSE endpoint URL with the embedded token, so that I can easily test the server using custom scripts or CLI tools.
13. As an embedded engineer, I want the audit stream to mask sensitive token credentials, so that logs and history view do not leak security tokens.
14. As an embedded engineer, I want unauthorized requests (invalid/missing token) to be rejected with standard HTTP 401 Unauthorized responses and logged as security audit events, so that I have visibility into intrusion attempts.

## Implementation Decisions

### 1. 网络绑定与局域网路由自适应
- MCP HTTP 服务监听地址由 `127.0.0.1:port` 升级为 `0.0.0.0:port`。
- 后端在状态查询时，通过轻量级内核路由表探测（UDP Socket 连接探测默认出口）解析本机当前活跃的局域网 IP，并在状态响应中下发 `lan_ip` 与 `lan_server_url`。
- 前端抽屉提供「本机连接 (`127.0.0.1`)」与「局域网连接 (`LAN: {lan_ip}`)」的模式切换开关，配置模板随之动态更新。

### 2. Token 生成、持久化与双轨鉴权
- **Token 格式**：`sk-sylixos-` + 32位安全随机十六进制字符串（如 `sk-sylixos-9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d`）。
- **持久化策略**：保存在本地应用持久化存储/数据库中；应用启动时若无 Token 则自动初始化，若已存在则直接加载复用。
- **双轨鉴权规范**：
  - `GET /sse`：解析 Query 参数 `?token=<token>`，校验成功后建立 SSE 连接，失败返回 `401 Unauthorized`；
  - `POST /messages`：优先从 HTTP Header `Authorization: Bearer <token>` 提取，若无则降级从 Query 参数 `?token=<token>` 提取，校验失败返回 `401 Unauthorized`。
- **会话销毁联动**：执行 `reset_token` 时，生成并写入新 Token，同时主动清空会话映射表并关闭所有活跃的 SSE 发送通道。

### 3. 只读安全模式与高危指令拦截
- 服务端维护 `allow_exec_command` 布尔安全标志。
- 当 `allow_exec_command == false` 时：
  - `tools/list` 响应中动态剔除 `sylixos_execute_command` 等写入/执行类高危工具；
  - `tools/call` 若强行调用受限工具，直接拦截并返回友好安全拒绝响应；
  - 遥测快照、进程分析、线程查看、录制包读取等只读查询工具保持正常可用。

### 4. 前端交互与客户端配置生态
- **Token 安全控制台**：
  - 默认以密文（`••••••••`）渲染，支持眼睛图标一键切换明文；
  - 独立「复制 Token」快捷按钮；
  - 「重置 Token」按钮，触发二次确认对话框并提示旧会话将强制断开。
- **AI 客户端生态配置区**：
  - **Antigravity Tab**：展示标准 `mcp_config.json` 片段；
  - **Codex / VS Code Tab**：展示标准 `mcpServers` 配置片段；
  - **原始 URL Tab**：展示携带 Token 的单行 SSE 端点；
  - 各 Tab 均支持一键复制，并根据当前选中的网络模式（本机/局域网）实时联动。

## Testing Decisions

### 1. 测试质量准则
- 坚持黑盒行为驱动测试（Black-box behavioral testing），重点覆盖鉴权状态机（有效 Token、错误 Token、缺失 Token、Header/Query 双通道）、Token 重置前后会话隔离、只读模式工具过滤以及 UI 复制/切换交互。

### 2. 测试接缝与层级 (Testing Seams)
- **鉴权与协议接缝 (HTTP Wire & Auth Seam)**：
  - 验证携带有效 Token 时 `GET /sse` 与 `POST /messages` 握手成功；
  - 验证无效/缺失 Token 时返回 401 拦截并产生审计记录；
  - 验证 Token 重置后，携带旧 Token 的请求被拒绝，所有旧会话被清空。
- **权限过滤接缝 (Security Policy Seam)**：
  - 验证开启只读模式时 `tools/list` 仅返回只读遥测工具；
  - 验证只读模式下调用 `sylixos_execute_command` 触发安全拦截。
- **前端状态与交互接缝 (UI & React Context Seam)**：
  - 验证 Token 密文/明文展示状态切换；
  - 验证 Antigravity / Codex / 原始 URL 各 Tab 代码片段的内容与复制功能；
  - 验证网络模式切换对生成配置的影响；
  - 验证重置 Token 确认弹窗的操作流。

### 3. 代码库先例参考 (Prior Art)
- 前端单元测试遵循既有 `src/ui/components/McpControlDrawer.test.tsx` 及 `src/application/useMcpServer.test.ts` 模式。
- 后端测试遵循 `src-tauri` 现有的模块化与异步集成测试范式。

## Out of Scope

- 基于 OAuth2 / OIDC 的第三方外部身份源统一接入（当前聚焦轻量级 API Token 凭证）。
- 细粒度基于 RBAC 用户角色的多租户权限系统（当前采用单主机统一 Token + 全局安全模式）。
- 自动向公网暴露或 NAT 端口映射服务（仅限局域网与本地网络访问）。

## Further Notes

- 本次升级完全向下兼容现有的遥测采集管线与图表渲染逻辑。
- 遵循 SOLID 设计原则与项目本地安全工程规范。
