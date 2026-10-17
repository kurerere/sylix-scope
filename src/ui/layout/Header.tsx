import { Server, Play, Sliders, Square, Loader2, Bot, X } from 'lucide-react'
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
            className={`border-border bg-card flex shrink-0 items-center justify-between border-b px-8 ${isMac ? 'h-20 pt-4' : 'h-16'}`}
            data-tauri-drag-region>
            <div className="flex items-center gap-3">
                <Server className="text-muted-foreground size-4" />
                <span className="text-foreground text-xs font-bold tracking-widest uppercase">
                    {activeTab === 'monitor'
                        ? '实时监控'
                        : activeTab === 'network'
                          ? '网络看板'
                          : activeTab === 'settings'
                            ? '设置'
                            : '历史记录'}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <ActionTooltip content={mcpTooltipText} side="bottom">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMcpDrawer(true)}
                        aria-label="打开 MCP 服务面板"
                        className="text-foreground/80 h-8 gap-2 px-2.5 font-mono text-[0.6875rem] font-semibold">
                        <Bot className="text-primary size-3.5" />
                        <StatusDot
                            tone={mcpStatus?.is_running ? 'ok' : 'idle'}
                            pulse={mcpStatus?.is_running}
                        />
                        <span className="tracking-widest uppercase">
                            MCP:{mcpStatus?.port ?? 3001}
                        </span>
                    </Button>
                </ActionTooltip>

                <div className="border-border bg-secondary/40 flex h-8 items-center rounded-sm border px-3">
                    <div className="text-foreground/80 flex shrink-0 items-center gap-2 font-mono text-[0.6875rem] font-semibold">
                        <StatusDot
                            tone={isMonitoring ? 'ok' : statusType === 'error' ? 'bad' : 'idle'}
                            pulse={isMonitoring}
                        />
                        {isMonitoring ? (
                            <span className="text-foreground/80">
                                {ip}:{port}
                            </span>
                        ) : (
                            <ActionTooltip content="点击配置连接参数" side="bottom">
                                <button
                                    onClick={() => setShowConfig(true)}
                                    disabled={isConnecting}
                                    aria-label="配置连接参数"
                                    className="text-muted-foreground hover:text-foreground/80 cursor-pointer transition-colors disabled:pointer-events-none">
                                    {ip}:{port}
                                </button>
                            </ActionTooltip>
                        )}
                    </div>

                    <div className="border-border mx-2 h-3.5 shrink-0 border-r" />

                    <div className="flex shrink-0 items-center gap-1">
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
                                    size="icon-xs"
                                    onClick={handleStop}
                                    aria-label="断开当前连接"
                                    className="text-muted-foreground hover:text-destructive">
                                    <Square className="size-2.5 fill-current" />
                                </Button>
                            </ActionTooltip>
                        ) : (
                            <ActionTooltip
                                content={isConnecting ? '正在连接...' : '开始连接'}
                                side="bottom">
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={handleStart}
                                    disabled={isConnecting}
                                    aria-label={isConnecting ? '正在连接...' : '开始连接'}
                                    className="text-muted-foreground hover:text-primary">
                                    {isConnecting ? (
                                        <Loader2 className="text-primary size-3 animate-spin" />
                                    ) : (
                                        <Play className="size-2.5 fill-current" />
                                    )}
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
