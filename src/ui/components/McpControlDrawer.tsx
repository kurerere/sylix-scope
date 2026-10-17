import {
    Bot,
    Copy,
    Check,
    X,
    RotateCw,
    RefreshCw,
    Square,
    Terminal,
    Zap,
    Trash2,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
    Shield,
    ShieldAlert,
    Key,
    Globe,
    Laptop,
    AlertTriangle,
    Users,
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'

import { buildClientSnippet, buildEndpointUrl } from '@/application/mcp/clientSnippet'
import { useMcpServer } from '@/application/useMcpServer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Switch } from '@/components/ui/switch'
import { ActionTooltip } from '@/components/ui/tooltip'
import { McpAuditLog } from '@/infrastructure/tauri/bridge'

interface McpControlDrawerProps {
    isOpen: boolean
    onClose: () => void
}

type ConfigTab = 'antigravity' | 'codex' | 'raw'
type ProtocolMode = 'streamable' | 'sse'

export function McpControlDrawer({ isOpen, onClose }: McpControlDrawerProps) {
    const {
        status,
        auditLogs,
        isLoading,
        error,
        restartServer,
        stopServer,
        resetToken,
        setAllowExecCommand,
        clearLogs,
    } = useMcpServer()

    const [userPort, setUserPort] = useState<string | null>(null)
    const portInput = userPort !== null ? userPort : String(status?.port || 3001)
    const [selectedHost, setSelectedHost] = useState<string>('127.0.0.1')
    const [protocolMode, setProtocolMode] = useState<ProtocolMode>('streamable')
    const [configTab, setConfigTab] = useState<ConfigTab>('antigravity')
    const [showTokenPlain, setShowTokenPlain] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
    const [actionMsg, setActionMsg] = useState<string | null>(null)

    const currentEndpointUrl = useMemo(
        () => buildEndpointUrl(protocolMode, selectedHost, portInput, status?.token || ''),
        [selectedHost, status?.token, portInput, protocolMode],
    )

    const clientConfig = useMemo(
        () => buildClientSnippet(protocolMode, selectedHost, portInput, status?.token || ''),
        [selectedHost, status?.token, portInput, protocolMode],
    )

    const handleCopy = useCallback((text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSnippet(type)
        setTimeout(() => setCopiedSnippet(null), 2000)
    }, [])

    const handleRestart = async () => {
        const p = parseInt(portInput, 10)
        if (isNaN(p) || p <= 0 || p > 65535) {
            setActionMsg('请输入 1~65535 范围内的有效端口')
            return
        }
        try {
            await restartServer(p)
            setActionMsg(`已成功在端口 ${p} 重启 MCP 服务 (全网卡 0.0.0.0 监听)`)
            setTimeout(() => setActionMsg(null), 3000)
        } catch (err) {
            setActionMsg(`重启失败: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    const handleStop = async () => {
        try {
            await stopServer()
            setActionMsg('已停止 MCP 服务')
            setTimeout(() => setActionMsg(null), 3000)
        } catch (err) {
            setActionMsg(`停止失败: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    const handleConfirmResetToken = async () => {
        try {
            await resetToken()
            setShowResetConfirm(false)
            setActionMsg('已重置鉴权 Token，并强制断开所有旧连接')
            setTimeout(() => setActionMsg(null), 3000)
        } catch (err) {
            setActionMsg(`重置 Token 失败: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    const handleToggleAllowExec = async () => {
        const target = !(status?.allow_exec_command ?? true)
        try {
            await setAllowExecCommand(target)
            setActionMsg(
                target
                    ? '已允许外部 AI 执行 Shell 调试命令'
                    : '已开启只读安全模式 (禁用 Shell 命令执行)',
            )
            setTimeout(() => setActionMsg(null), 3000)
        } catch (err) {
            setActionMsg(`更新安全模式失败: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-xl" showCloseButton={false}>
                <div className="border-border flex shrink-0 items-center justify-between border-b px-1 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-sm p-2">
                            <Bot className="text-primary size-5" />
                        </div>
                        <div className="space-y-0.5">
                            <DialogTitle className="text-sm font-bold tracking-wider uppercase">
                                MCP 服务
                            </DialogTitle>
                            <p className="text-muted-foreground font-mono text-xs">
                                Model Context Protocol (Streamable HTTP / SSE)
                            </p>
                        </div>
                    </div>
                    <ActionTooltip content="关闭 MCP 控制面板 (ESC)">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onClose}
                            aria-label="关闭 MCP 控制面板">
                            <X className="size-4" />
                        </Button>
                    </ActionTooltip>
                </div>

                <div className="flex-1 space-y-4 px-1 pb-2">
                    <div className="bg-secondary/30 border-border space-y-3 rounded-sm border p-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <StatusDot
                                    tone={status?.is_running ? 'ok' : 'idle'}
                                    pulse={status?.is_running}
                                    className="size-2"
                                />
                                <span className="text-foreground text-xs font-bold">
                                    {status?.is_running ? '运行中 (0.0.0.0)' : '已停止'}
                                </span>
                                <span className="bg-secondary text-muted-foreground rounded-sm px-2 py-0.5 font-mono text-[0.625rem]">
                                    {status?.active_sessions ?? 0} 会话
                                </span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-xs">
                                <span className="text-muted-foreground text-[0.6875rem]">
                                    端口:
                                </span>
                                <span className="text-foreground font-bold">{portInput}</span>
                            </div>
                        </div>

                        <div className="border-border/60 bg-background/60 flex flex-wrap items-center justify-between gap-2 rounded-sm border p-1.5 text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5 pl-2 text-[0.6875rem] font-medium">
                                <Globe className="size-3.5" />
                                <span>网络:</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedHost('127.0.0.1')}
                                    className={`flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
                                        selectedHost === '127.0.0.1'
                                            ? 'bg-primary text-primary-foreground font-bold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}>
                                    <Laptop className="size-3" />
                                    <span>127.0.0.1 (本机)</span>
                                </button>
                                {status?.lan_ips && status.lan_ips.length > 0 ? (
                                    status.lan_ips.map((iface) => {
                                        const isSelected = selectedHost === iface.ip
                                        return (
                                            <button
                                                key={`${iface.name}-${iface.ip}`}
                                                type="button"
                                                onClick={() => setSelectedHost(iface.ip)}
                                                title={`网卡: ${iface.name}`}
                                                className={`flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground font-bold'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}>
                                                <Globe className="size-3" />
                                                <span>
                                                    {iface.ip} ({iface.name})
                                                </span>
                                            </button>
                                        )
                                    })
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        className="text-muted-foreground/50 flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono text-[0.6875rem]">
                                        <Globe className="size-3" />
                                        <span>无可用局域网</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="border-sig-bad/30 bg-sig-bad/10 text-sig-bad flex items-center gap-2 rounded-sm border p-2.5 text-xs">
                                <AlertCircle className="size-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {actionMsg && (
                            <div className="border-sig-ok/30 bg-sig-ok/10 text-sig-ok flex items-center gap-2 rounded-sm border p-2 text-xs">
                                <CheckCircle2 className="size-3.5 shrink-0" />
                                <span>{actionMsg}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Users className="text-primary size-3.5" />
                                <h3 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                    已连接客户端 (
                                    {status?.sessions?.length ?? status?.active_sessions ?? 0})
                                </h3>
                            </div>
                        </div>

                        {!status?.sessions || status.sessions.length === 0 ? (
                            <div className="bg-secondary/10 border-border rounded-sm border border-dashed px-3 py-3 text-center">
                                <p className="text-muted-foreground text-xs">暂无连接</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {status.sessions.map((sess) => (
                                    <div
                                        key={sess.session_id}
                                        className="bg-secondary/30 border-border/80 flex items-center justify-between rounded-sm border p-2.5 text-xs">
                                        <div className="flex items-center gap-2">
                                            <StatusDot tone="ok" pulse />
                                            <span className="text-foreground font-mono font-bold">
                                                {sess.client_ip}
                                            </span>
                                            {sess.user_agent && (
                                                <span
                                                    className="bg-secondary text-muted-foreground max-w-[150px] truncate rounded-sm px-1.5 py-0.5 font-mono text-[0.625rem]"
                                                    title={sess.user_agent}>
                                                    {sess.user_agent}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-muted-foreground font-mono text-[0.6875rem]">
                                            {new Date(
                                                sess.connected_at * 1000,
                                            ).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Key className="text-primary size-3.5" />
                                <h3 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                    访问 Token
                                </h3>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowResetConfirm(true)}
                                disabled={isLoading}
                                title="重置安全访问 Token"
                                className="h-6 gap-1 px-2 text-[0.6875rem]">
                                <RefreshCw className="size-3" />
                                <span>重置</span>
                            </Button>
                        </div>

                        <div className="bg-secondary/20 border-border flex items-center gap-2 rounded-sm border p-2.5">
                            <div className="bg-background border-border flex flex-1 items-center justify-between rounded-sm border px-3 py-1.5 font-mono text-xs">
                                <span className="text-foreground select-all">
                                    {showTokenPlain
                                        ? status?.token || '未生成'
                                        : status?.token
                                          ? '••••••••••••••••••••••••••••••••'
                                          : '••••••••'}
                                </span>
                                <ActionTooltip
                                    content={showTokenPlain ? '隐藏完整 Token' : '显示完整 Token'}>
                                    <button
                                        type="button"
                                        onClick={() => setShowTokenPlain((prev) => !prev)}
                                        className="text-muted-foreground hover:text-foreground ml-2 cursor-pointer transition-colors"
                                        aria-label={
                                            showTokenPlain ? '隐藏完整 Token' : '显示完整 Token'
                                        }>
                                        {showTokenPlain ? (
                                            <EyeOff className="size-3.5" />
                                        ) : (
                                            <Eye className="size-3.5" />
                                        )}
                                    </button>
                                </ActionTooltip>
                            </div>
                            <ActionTooltip content="复制访问 Token 到剪贴板">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(status?.token || '', 'token')}
                                    className="h-8 gap-1 text-xs">
                                    {copiedSnippet === 'token' ? (
                                        <>
                                            <Check className="text-sig-ok size-3" />
                                            <span className="text-sig-ok">已复制</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3" />
                                            <span>复制</span>
                                        </>
                                    )}
                                </Button>
                            </ActionTooltip>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="bg-secondary/20 border-border flex items-center justify-between rounded-sm border p-3">
                            <span className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                                {status?.allow_exec_command ? (
                                    <ShieldAlert className="text-sig-warn size-4" />
                                ) : (
                                    <Shield className="text-sig-ok size-4" />
                                )}
                                <span>允许 Shell 执行</span>
                            </span>
                            <Switch
                                checked={status?.allow_exec_command ?? true}
                                onCheckedChange={handleToggleAllowExec}
                                disabled={isLoading}
                                title="切换是否允许外部 AI 执行调试 Shell 指令"
                                aria-label="允许 Shell 执行"
                            />
                        </div>

                        <div className="bg-secondary/20 border-border flex items-center justify-between rounded-sm border p-3">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs font-medium">
                                    端口:
                                </span>
                                <Input
                                    type="number"
                                    value={portInput}
                                    onChange={(e) => setUserPort(e.target.value)}
                                    placeholder="3001"
                                    title="设置 MCP 服务运行端口"
                                    className="h-7 w-16 px-1.5 text-center font-mono text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    onClick={handleRestart}
                                    disabled={isLoading}
                                    title={status?.is_running ? '重启 MCP 服务' : '启动 MCP 服务'}
                                    className="h-7 gap-1 px-2.5 text-xs">
                                    <RotateCw
                                        className={`size-3 ${isLoading ? 'animate-spin' : ''}`}
                                    />
                                    <span>{status?.is_running ? '重启' : '启动'}</span>
                                </Button>
                                {status?.is_running && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleStop}
                                        disabled={isLoading}
                                        title="停止 MCP 服务"
                                        className="h-7 gap-1 px-2 text-xs">
                                        <Square className="size-3 fill-current" />
                                        <span>停止</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                客户端配置
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                title="复制客户端配置到剪贴板"
                                onClick={() =>
                                    handleCopy(
                                        configTab === 'raw' ? currentEndpointUrl : clientConfig,
                                        configTab,
                                    )
                                }
                                className="h-7 gap-1.5 text-xs">
                                {copiedSnippet === configTab ? (
                                    <>
                                        <Check className="text-sig-ok size-3" />
                                        <span className="text-sig-ok">已复制</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-3" />
                                        <span>复制配置</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="border-border/60 bg-background/60 flex items-center justify-between rounded-sm border p-1 text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5 pl-2 text-[0.6875rem] font-medium">
                                <Zap className="text-sig-warn size-3.5" />
                                <span>传输协议:</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setProtocolMode('streamable')}
                                    className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.6875rem] transition-colors ${
                                        protocolMode === 'streamable'
                                            ? 'bg-primary text-primary-foreground font-bold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}>
                                    <span>Streamable HTTP</span>
                                    <span className="bg-sig-ok/15 text-sig-ok rounded-sm px-1 py-0.5 font-mono text-[0.5625rem]">
                                        默认
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProtocolMode('sse')}
                                    className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.6875rem] transition-colors ${
                                        protocolMode === 'sse'
                                            ? 'bg-primary text-primary-foreground font-bold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}>
                                    <span>SSE</span>
                                    <span className="text-muted-foreground/70 font-mono text-[0.5625rem]">
                                        Legacy
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="border-border bg-secondary/40 flex items-center rounded-sm border p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setConfigTab('antigravity')}
                                className={`flex-1 rounded-sm py-1 text-center font-semibold transition-colors ${
                                    configTab === 'antigravity'
                                        ? 'bg-background text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}>
                                Antigravity
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfigTab('codex')}
                                className={`flex-1 rounded-sm py-1 text-center font-semibold transition-colors ${
                                    configTab === 'codex'
                                        ? 'bg-background text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}>
                                Codex / VSCode
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfigTab('raw')}
                                className={`flex-1 rounded-sm py-1 text-center font-semibold transition-colors ${
                                    configTab === 'raw'
                                        ? 'bg-background text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}>
                                {protocolMode === 'streamable'
                                    ? 'Raw URL (/mcp)'
                                    : 'SSE URL (/sse)'}
                            </button>
                        </div>

                        <div className="border-border bg-muted text-foreground relative rounded-sm border p-3 font-mono text-[0.6875rem]">
                            {configTab === 'raw' ? (
                                <p className="break-all select-all">{currentEndpointUrl}</p>
                            ) : (
                                <pre className="overflow-x-auto whitespace-pre-wrap">
                                    {clientConfig}
                                </pre>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal className="text-primary size-4" />
                                <h3 className="text-foreground text-xs font-bold tracking-wider uppercase">
                                    调用流水 ({auditLogs.length})
                                </h3>
                            </div>
                            {auditLogs.length > 0 && (
                                <ActionTooltip content="清空 MCP 调用流水记录">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearLogs}
                                        className="text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1 text-xs">
                                        <Trash2 className="size-3" />
                                        <span>清空</span>
                                    </Button>
                                </ActionTooltip>
                            )}
                        </div>

                        {auditLogs.length === 0 ? (
                            <div className="bg-secondary/10 border-border rounded-sm border border-dashed py-6 text-center">
                                <Zap className="text-muted-foreground/40 mx-auto mb-1.5 size-5" />
                                <p className="text-muted-foreground text-xs font-medium">
                                    暂无调用记录
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {auditLogs.map((log: McpAuditLog) => {
                                    const isExpanded = expandedLogId === log.id
                                    const timeStr = new Date(
                                        log.timestamp * 1000,
                                    ).toLocaleTimeString()
                                    return (
                                        <div
                                            key={log.id}
                                            className="bg-secondary/30 hover:bg-secondary/40 border-border rounded-sm border p-2.5 text-xs transition-colors">
                                            <div
                                                className="flex cursor-pointer items-center justify-between"
                                                onClick={() =>
                                                    setExpandedLogId(isExpanded ? null : log.id)
                                                }>
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="text-muted-foreground size-3.5" />
                                                    ) : (
                                                        <ChevronRight className="text-muted-foreground size-3.5" />
                                                    )}
                                                    <Badge tone={log.success ? 'ok' : 'bad'}>
                                                        {log.success ? 'SUCCESS' : 'ERROR'}
                                                    </Badge>
                                                    <span className="text-foreground font-mono font-bold">
                                                        {log.tool_name}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center gap-3 font-mono text-[0.6875rem]">
                                                    <span>{log.duration_ms}ms</span>
                                                    <span>{timeStr}</span>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="border-border/60 mt-2.5 space-y-1.5 border-t pt-2 text-[0.6875rem]">
                                                    <div>
                                                        <span className="text-muted-foreground">
                                                            会话 ID:{' '}
                                                        </span>
                                                        <span className="text-foreground font-mono">
                                                            {log.client_id}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">
                                                            参数:{' '}
                                                        </span>
                                                        <pre className="bg-background border-border text-foreground mt-1 rounded-sm border p-2 font-mono">
                                                            {JSON.stringify(log.params, null, 2)}
                                                        </pre>
                                                    </div>
                                                    {log.error && (
                                                        <div>
                                                            <span className="text-sig-bad">
                                                                错误:{' '}
                                                            </span>
                                                            <div className="border-sig-bad/25 bg-sig-bad/10 text-sig-bad mt-1 rounded-sm border p-2 font-mono">
                                                                {log.error}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>

            <Dialog
                open={showResetConfirm}
                onOpenChange={(open) => !open && setShowResetConfirm(false)}>
                <DialogContent showCloseButton={false} className="max-w-sm">
                    <div className="flex items-center gap-3">
                        <div className="border-sig-bad/40 bg-sig-bad/10 text-sig-bad rounded-sm border p-2.5">
                            <AlertTriangle className="size-5" />
                        </div>
                        <DialogTitle className="text-sm">重置 Token</DialogTitle>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        重置后将生成新 Token，现有已连接客户端将被强制断开。
                    </p>
                    <div className="flex items-center justify-end gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResetConfirm(false)}
                            className="text-xs font-semibold">
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmResetToken}
                            disabled={isLoading}
                            className="gap-1 text-xs font-semibold">
                            <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>确认重置</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
