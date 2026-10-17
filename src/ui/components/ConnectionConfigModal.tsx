import { Server, Loader2, Play, Square, History, ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useTelemetrySession } from '@/application/telemetry/TelemetrySessionContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ConnectionConfig } from '@/infrastructure/storage/localStorage'

interface ConnectionStateLike {
    isMonitoring: boolean
    isConnecting: boolean
    ip: string
    port: number
    username: string
    password: string
    statusMessage?: string
    statusType?: 'info' | 'success' | 'error'
    historyList?: ConnectionConfig[]
    updateConfig: (patch: Partial<ConnectionConfig>) => void
    deleteHistoryItem?: (item: ConnectionConfig) => void
    startMonitoring?: (cfg?: ConnectionConfig, onSuccess?: () => void) => Promise<void>
    stopMonitoring?: (onSuccess?: () => Promise<void> | void) => Promise<void>
}

interface ConnectionConfigModalProps {
    show: boolean
    onClose: () => void
    connection?: ConnectionStateLike
    onStart?: () => void
    onStop?: () => void
}

function ConnectionConfigModalContent({
    connection,
    onClose,
    onStart,
    onStop,
}: {
    connection: ConnectionStateLike
    onClose: () => void
    onStart?: () => void
    onStop?: () => void
}) {
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

    const handleClose = () => {
        setShowHistoryDropdown(false)
        onClose()
    }

    const handleStart = () => {
        if (onStart) {
            onStart()
        } else {
            connection.startMonitoring?.(undefined, () => {
                handleClose()
            })
        }
    }

    const handleStop = () => {
        if (onStop) {
            onStop()
        } else {
            connection.stopMonitoring?.()
        }
    }

    const inputsDisabled = connection.isMonitoring || connection.isConnecting

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) handleClose()
            }}>
            <DialogContent
                className="w-[380px] gap-5 select-none"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !connection.isMonitoring) {
                        handleStart()
                    }
                }}>
                <div className="flex items-center gap-2">
                    <Server className="text-muted-foreground size-4" />
                    <div className="space-y-0.5">
                        <DialogTitle className="text-sm">连接配置</DialogTitle>
                        <DialogDescription>请配置 SylixOS 板卡的 Telnet 连接凭证</DialogDescription>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="relative col-span-2">
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="text-muted-foreground block text-xs">
                                    IP 地址
                                </label>
                                {connection.historyList && connection.historyList.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                                        className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-[0.625rem] font-medium transition-colors"
                                        disabled={inputsDisabled}>
                                        <History className="size-2.5" />
                                        <span>历史连接</span>
                                        <ChevronDown
                                            className={`size-2.5 transition-transform duration-200 ${showHistoryDropdown ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                )}
                            </div>
                            <Input
                                type="text"
                                value={connection.ip}
                                onChange={(e) => connection.updateConfig({ ip: e.target.value })}
                                disabled={inputsDisabled}
                                placeholder="192.168.1.187"
                                className="font-mono"
                            />
                            {showHistoryDropdown &&
                                connection.historyList &&
                                connection.historyList.length > 0 && (
                                    <div className="border-border bg-popover animate-in fade-in-50 slide-in-from-top-1 absolute right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-sm border p-1 shadow-xl duration-150">
                                        {connection.historyList.map((item) => (
                                            <div
                                                key={`${item.ip}-${item.port}-${item.username}`}
                                                className="group hover:bg-muted/60 flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors"
                                                onClick={() => {
                                                    connection.updateConfig(item)
                                                    setShowHistoryDropdown(false)
                                                }}>
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="text-foreground truncate font-mono font-medium">
                                                        {item.ip}:{item.port}
                                                    </span>
                                                    <span className="text-muted-foreground truncate text-[0.625rem]">
                                                        User: {item.username}
                                                    </span>
                                                </div>
                                                {connection.deleteHistoryItem && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            connection.deleteHistoryItem?.(item)
                                                        }}
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm p-1 opacity-0 transition-all group-hover:opacity-100"
                                                        title="删除此记录"
                                                        aria-label="删除此记录">
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                        <div>
                            <label className="text-muted-foreground mb-1.5 block text-xs">
                                端口
                            </label>
                            <Input
                                type="number"
                                value={connection.port}
                                onChange={(e) =>
                                    connection.updateConfig({
                                        port: parseInt(e.target.value, 10) || 23,
                                    })
                                }
                                disabled={inputsDisabled}
                                placeholder="23"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground mb-1.5 block text-xs">
                                用户名
                            </label>
                            <Input
                                type="text"
                                value={connection.username}
                                onChange={(e) =>
                                    connection.updateConfig({ username: e.target.value })
                                }
                                disabled={inputsDisabled}
                                placeholder="root"
                            />
                        </div>
                        <div>
                            <label className="text-muted-foreground mb-1.5 block text-xs">
                                密码
                            </label>
                            <Input
                                type="password"
                                value={connection.password}
                                onChange={(e) =>
                                    connection.updateConfig({ password: e.target.value })
                                }
                                disabled={inputsDisabled}
                                placeholder="root"
                            />
                        </div>
                    </div>
                </div>

                {connection.statusType === 'error' && (
                    <div className="border-sig-bad/25 bg-sig-bad/10 text-sig-bad rounded-sm border p-2.5 text-xs leading-normal font-semibold">
                        {connection.statusMessage}
                    </div>
                )}

                <div className="border-border border-t pt-4">
                    {!connection.isMonitoring ? (
                        <Button
                            onClick={handleStart}
                            disabled={connection.isConnecting}
                            size="lg"
                            className="w-full text-xs font-semibold">
                            {connection.isConnecting ? (
                                <>
                                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                    <span>正在连接...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="mr-1.5 size-3 fill-current" />
                                    <span>开始监控</span>
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStop}
                            variant="destructive"
                            size="lg"
                            className="w-full text-xs font-semibold">
                            <Square className="mr-1.5 size-3 fill-current" />
                            <span>断开当前连接</span>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ConnectionConfigModal(props: ConnectionConfigModalProps) {
    if (!props.show) return null

    if (props.connection) {
        return <ConnectionConfigModalContent {...props} connection={props.connection} />
    }

    return <ConnectionConfigModalWithContext {...props} />
}

function ConnectionConfigModalWithContext(props: ConnectionConfigModalProps) {
    const session = useTelemetrySession()
    return <ConnectionConfigModalContent {...props} connection={session} />
}
