import { Play, Sliders, Square, Loader2, Bot, X } from 'lucide-react'
import { useState } from 'react'

import { useMcpServer } from '@/application/useMcpServer'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { ActionTooltip } from '@/components/ui/tooltip'
import { McpControlDrawer } from '@/ui/components/McpControlDrawer'

const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Mac')

export function Header({
    activeTab,
    isMonitoring,
    isConnecting,
    ip,
    port,
    setShowConfig,
    handleStart,
    handleStop,
    statusMessage,
    statusType,
}: {
    activeTab: 'monitor' | 'network' | 'settings' | 'history'
    isMonitoring: boolean
    isConnecting: boolean
    ip: string
    port: number
    setShowConfig: (show: boolean) => void
    handleStart: () => void
    handleStop: () => void
    statusMessage: string
    statusType: 'info' | 'success' | 'error'
}) {
    const { status: mcpStatus } = useMcpServer()
    const [showMcpDrawer, setShowMcpDrawer] = useState(false)
    const [dismissedMessage, setDismissedMessage] = useState<string | null>(null)

    const isError = statusType === 'error' && Boolean(statusMessage)
    const showToast = isError && dismissedMessage !== statusMessage

    const mcpTooltipText = mcpStatus?.is_running
        ? `MCP 服务在线 (端口 ${mcpStatus.port})`
        : 'MCP 服务已停止'

    return (
        <header
            className={`border-border bg-card flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-3 py-3 sm:px-6 lg:min-h-18 lg:px-8 ${isMac ? 'pt-7 lg:pt-5' : ''}`}
            data-tauri-drag-region>
            <h1 className="text-foreground text-lg font-semibold sm:text-xl">
                {activeTab === 'monitor'
                    ? '实时监控'
                    : activeTab === 'network'
                      ? '网络看板'
                      : activeTab === 'settings'
                        ? '设置'
                        : '历史记录'}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <ActionTooltip content={mcpTooltipText} side="bottom">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMcpDrawer(true)}
                        aria-label="打开 MCP 服务面板"
                        className="gap-1.5 font-mono">
                        <Bot className="text-primary size-3.5" />
                        <StatusDot tone={mcpStatus?.is_running ? 'ok' : 'idle'} />
                        <span className="hidden sm:inline">MCP {mcpStatus?.port ?? 3001}</span>
                    </Button>
                </ActionTooltip>

                <div className="border-border bg-secondary/50 flex flex-wrap items-center gap-2 rounded-sm border py-1 pr-1 pl-2.5">
                    <div className="flex min-w-0 items-center gap-2 text-xs">
                        <StatusDot
                            tone={isMonitoring ? 'ok' : statusType === 'error' ? 'bad' : 'idle'}
                        />
                        <span className={isMonitoring ? 'text-sig-ok' : 'text-muted-foreground'}>
                            {isMonitoring
                                ? '已连接'
                                : isConnecting
                                  ? '连接中'
                                  : isError
                                    ? '连接异常'
                                    : '未连接'}
                        </span>
                        {isMonitoring ? (
                            <span className="font-mono break-all">
                                {ip}:{port}
                            </span>
                        ) : (
                            <ActionTooltip content="点击配置连接参数" side="bottom">
                                <button
                                    onClick={() => setShowConfig(true)}
                                    disabled={isConnecting}
                                    aria-label="配置连接参数"
                                    className="text-muted-foreground hover:text-foreground font-mono break-all transition-colors disabled:pointer-events-none">
                                    {ip}:{port}
                                </button>
                            </ActionTooltip>
                        )}
                    </div>

                    <div className="border-border flex shrink-0 items-center gap-1 border-l pl-1">
                        <ActionTooltip content="修改连接配置" side="bottom">
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setShowConfig(true)}
                                disabled={isConnecting}
                                aria-label="修改连接配置"
                                className="text-muted-foreground hover:text-primary">
                                <Sliders className="size-3" />
                            </Button>
                        </ActionTooltip>

                        {isMonitoring ? (
                            <ActionTooltip content="断开当前连接" side="bottom">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleStop}
                                    aria-label="断开当前连接"
                                    className="text-muted-foreground hover:text-destructive h-7">
                                    <Square className="size-3 fill-current" />
                                    <span className="hidden sm:inline">断开</span>
                                </Button>
                            </ActionTooltip>
                        ) : (
                            <ActionTooltip
                                content={isConnecting ? '正在连接...' : '开始连接'}
                                side="bottom">
                                <Button
                                    size="sm"
                                    onClick={handleStart}
                                    disabled={isConnecting}
                                    aria-label={isConnecting ? '正在连接...' : '开始连接'}
                                    className="h-7">
                                    {isConnecting ? (
                                        <Loader2 className="text-primary size-3 animate-spin" />
                                    ) : (
                                        <Play className="size-2.5 fill-current" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {isConnecting ? '连接中' : '开始连接'}
                                    </span>
                                </Button>
                            </ActionTooltip>
                        )}
                    </div>
                </div>
            </div>

            {statusType === 'error' && statusMessage && showToast && (
                <div
                    className="border-sig-bad/30 bg-popover animate-in fade-in slide-in-from-top-2 text-sig-bad fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-sm border px-4 py-2 text-xs font-medium shadow-2xl"
                    role="alert">
                    <StatusDot tone="bad" />
                    <span className="max-w-md truncate">{statusMessage}</span>
                    <ActionTooltip content="关闭提示" side="bottom">
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDismissedMessage(statusMessage)}
                            aria-label="关闭提示"
                            className="text-sig-bad/70 hover:bg-sig-bad/10 hover:text-sig-bad ml-1">
                            <X className="size-3.5" />
                        </Button>
                    </ActionTooltip>
                </div>
            )}

            <McpControlDrawer isOpen={showMcpDrawer} onClose={() => setShowMcpDrawer(false)} />
        </header>
    )
}
