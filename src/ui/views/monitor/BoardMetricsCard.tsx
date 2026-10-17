import { Server, Terminal, Loader2, Play, Square, RotateCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusDot } from '@/components/ui/status-dot'
import { ActionTooltip } from '@/components/ui/tooltip'
import { RebootConfirmModal } from '@/ui/components/RebootConfirmModal'

interface BoardMetricsCardProps {
    isMonitoring: boolean
    isConnecting?: boolean
    isRebooting?: boolean
    ip?: string
    port?: number
    processCount: number
    isPaused: boolean
    setIsPaused: (val: boolean) => void
    onReboot?: (syncBefore?: boolean) => Promise<void> | void
}

export function BoardMetricsCard({
    isMonitoring,
    isConnecting = false,
    isRebooting = false,
    ip = '',
    port = 23,
    processCount,
    isPaused,
    setIsPaused,
    onReboot,
}: BoardMetricsCardProps) {
    const [showRebootModal, setShowRebootModal] = useState(false)

    const canReboot = isMonitoring && !isConnecting && !isRebooting
    const rebootTitle = !isMonitoring
        ? '设备未连接'
        : isRebooting
          ? '正在重启设备...'
          : '重启目标设备（危险操作）'

    return (
        <Card className="border-border col-span-1 flex flex-col md:col-span-2 lg:col-span-1">
            <div className="relative z-10 flex flex-1 flex-col justify-between p-4">
                <div className="space-y-4">
                    <div className="border-border flex items-center justify-between border-b pb-2.5">
                        <span className="text-muted-foreground text-xs font-semibold">
                            连接状态
                        </span>
                        <div className="flex items-center gap-2">
                            {isMonitoring && ip && (
                                <div className="border-border bg-secondary text-muted-foreground flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[0.625rem]">
                                    <Server className="size-2.5" />
                                    <span>
                                        {ip}:{port}
                                    </span>
                                </div>
                            )}
                            <ActionTooltip content={rebootTitle} side="bottom">
                                <Button
                                    variant="destructive"
                                    size="icon-xs"
                                    onClick={() => setShowRebootModal(true)}
                                    disabled={!canReboot}
                                    aria-label="重启目标设备"
                                    className="border">
                                    <RotateCw
                                        className={`size-3 ${isRebooting ? 'animate-spin' : ''}`}
                                    />
                                </Button>
                            </ActionTooltip>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="border-border bg-secondary/60 flex items-center justify-between rounded-sm border p-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-muted-foreground text-[0.625rem] font-bold tracking-widest uppercase">
                                    Link Status
                                </span>
                                <span className="text-foreground font-mono text-xs font-bold">
                                    {isConnecting
                                        ? 'CONNECTING'
                                        : isMonitoring
                                          ? 'ONLINE'
                                          : 'OFFLINE'}
                                </span>
                            </div>
                            <div className="flex items-center">
                                {isConnecting ? (
                                    <Loader2 className="text-primary size-3.5 animate-spin" />
                                ) : (
                                    <StatusDot
                                        tone={isMonitoring ? 'ok' : 'idle'}
                                        pulse={isMonitoring}
                                        className="size-2"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="border-border bg-secondary/60 flex items-center justify-between rounded-sm border p-2.5 px-3">
                            <div className="text-muted-foreground flex items-center gap-1.5 text-[0.625rem]">
                                <Terminal className="size-3" />
                                <span>活跃进程</span>
                            </div>
                            <span className="text-foreground font-mono text-xs font-bold tracking-wider tabular-nums">
                                {isMonitoring ? `${processCount}` : '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    {isMonitoring ? (
                        <div className="flex flex-col gap-2">
                            <div className="text-muted-foreground flex items-center justify-between text-xs">
                                <span>数据更新状态</span>
                                <span
                                    className={`font-bold ${isPaused ? 'text-sig-warn' : 'text-sig-ok'}`}>
                                    {isPaused ? '已暂停' : '更新中'}
                                </span>
                            </div>
                            <ActionTooltip content={isPaused ? '继续更新' : '暂停更新'}>
                                <Button
                                    onClick={() => setIsPaused(!isPaused)}
                                    variant="outline"
                                    aria-label={isPaused ? '继续更新' : '暂停更新'}
                                    className="focus-visible:ring-primary h-8.5 w-full px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none">
                                    {isPaused ? (
                                        <>
                                            <Play className="mr-1.5 size-3 fill-current" />
                                            <span>继续更新</span>
                                        </>
                                    ) : (
                                        <>
                                            <Square className="mr-1.5 size-3 fill-current" />
                                            <span>暂停更新</span>
                                        </>
                                    )}
                                </Button>
                            </ActionTooltip>
                        </div>
                    ) : (
                        <div className="text-muted-foreground py-2 text-center text-xs leading-relaxed select-none">
                            {isConnecting ? (
                                <span>正在连接板卡...</span>
                            ) : (
                                <span>未连接板卡，点击顶部“开始连接”。</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <RebootConfirmModal
                show={showRebootModal}
                ip={ip}
                port={port}
                isRebooting={isRebooting}
                onClose={() => setShowRebootModal(false)}
                onConfirm={async (syncBefore) => {
                    await onReboot?.(syncBefore)
                    setShowRebootModal(false)
                }}
            />
        </Card>
    )
}
