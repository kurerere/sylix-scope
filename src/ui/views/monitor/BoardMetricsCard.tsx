import { Pause, Play, RotateCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
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
        <div className="bg-rail flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-5">
            {isMonitoring ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <span className={isPaused ? 'text-sig-warn' : 'text-sig-ok'}>
                        {isPaused ? '已暂停' : '更新中'}
                    </span>
                    <span className="text-muted-foreground">
                        活跃进程{' '}
                        <strong className="text-foreground font-mono">{processCount}</strong>
                    </span>
                </div>
            ) : (
                <span className="text-muted-foreground text-xs">
                    {isConnecting ? '正在连接板卡...' : '未连接板卡，点击顶部“开始连接”。'}
                </span>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {isMonitoring && (
                    <Button onClick={() => setIsPaused(!isPaused)} variant="outline" size="sm">
                        {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                        {isPaused ? '继续更新' : '暂停更新'}
                    </Button>
                )}
                <ActionTooltip content={rebootTitle} side="bottom">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShowRebootModal(true)}
                        disabled={!canReboot}
                        aria-label="重启目标设备"
                        className="text-sig-bad hover:text-sig-bad">
                        <RotateCw className={`size-3.5 ${isRebooting ? 'animate-spin' : ''}`} />
                    </Button>
                </ActionTooltip>
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
        </div>
    )
}
