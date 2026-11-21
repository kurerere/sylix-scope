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

    const viewTitle =
        activeTab === 'monitor'
            ? '实时监控'
            : activeTab === 'network'
              ? '网络看板'
              : activeTab === 'settings'
                ? '设置'
                : '历史记录'

    return (
        <header
            className={`flex shrink-0 items-center justify-between px-3 ${isMac ? 'h-14 pt-4' : 'h-10'}`}
            data-tauri-drag-region>
            <div className="flex items-center gap-2">
                <img src="/icon.svg" alt="" draggable={false} className="size-4 shrink-0" />
                <span className="text-ink text-[13px] font-semibold">SylixScope</span>
                <span className="text-text-quaternary">/</span>
                <span className="text-text-tertiary text-xs">{viewTitle}</span>
            </div>

            <div className="flex items-center gap-1.5">
                <ActionTooltip content={mcpTooltipText} side="bottom">
                    <button
                        onClick={() => setShowMcpDrawer(true)}
                        aria-label="打开 MCP 服务面板"
                        className="text-text-secondary hover:bg-tint-surface-hover hover:text-ink flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-mono text-[0.6875rem] transition-colors duration-150">
                        <Bot className="text-accent-azure size-3.5" />
                        <StatusDot
                            tone={mcpStatus?.is_running ? 'ok' : 'idle'}
                            pulse={mcpStatus?.is_running}
                        />
                        <span>MCP:{mcpStatus?.port ?? 3001}</span>
                    </button>
                </ActionTooltip>

                <div className="bg-tint-surface flex h-7 items-center rounded-md px-2">
                    <div className="text-text-secondary flex shrink-0 items-center gap-1.5 font-mono text-[0.6875rem]">
                        <StatusDot
                            tone={isMonitoring ? 'ok' : statusType === 'error' ? 'bad' : 'idle'}
                            pulse={isMonitoring}
                        />
                        {isMonitoring ? (
                            <span className="text-text-secondary">
                                {ip}:{port}
                            </span>
                        ) : (
                            <ActionTooltip content="点击配置连接参数" side="bottom">
                                <button
                                    onClick={() => setShowConfig(true)}
                                    disabled={isConnecting}
                                    aria-label="配置连接参数"
                                    className="text-text-tertiary hover:text-ink cursor-pointer transition-colors disabled:pointer-events-none">
                                    {ip}:{port}
                                </button>
                            </ActionTooltip>
                        )}
                    </div>

                    <div className="bg-tint-surface-border mx-2 h-3.5 w-px shrink-0" />

                    <div className="flex shrink-0 items-center gap-0.5">
                        <ActionTooltip content="修改连接配置" side="bottom">
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setShowConfig(true)}
                                disabled={isConnecting}
                                aria-label="修改连接配置"
                                className="text-text-tertiary hover:text-accent-azure">
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
                                    className="text-text-tertiary hover:text-destructive">
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
                                    className="text-text-tertiary hover:text-accent-azure">
                                    {isConnecting ? (
                                        <Loader2 className="text-accent-azure size-3 animate-spin" />
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
                    className="border-sig-bad/30 bg-elevated animate-in fade-in slide-in-from-top-2 text-sig-bad fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border px-4 py-2 text-xs font-medium shadow-l4"
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
