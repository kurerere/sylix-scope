import { AlertTriangle, RotateCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface RebootConfirmModalProps {
    show: boolean
    ip: string
    port: number
    isRebooting?: boolean
    onClose: () => void
    onConfirm: (syncBefore: boolean) => void | Promise<void>
}

export function RebootConfirmModal({
    show,
    ip,
    port,
    isRebooting = false,
    onClose,
    onConfirm,
}: RebootConfirmModalProps) {
    const [syncBefore, setSyncBefore] = useState(true)

    return (
        <Dialog
            open={show}
            onOpenChange={(open) => {
                if (!open && !isRebooting) onClose()
            }}>
            <DialogContent
                showCloseButton={false}
                className="max-w-md"
                data-testid="reboot-confirm-modal">
                <div className="flex items-start gap-3">
                    <div className="border-sig-bad/40 bg-sig-bad/10 text-sig-bad rounded-sm border p-2.5">
                        <AlertTriangle className="size-5" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle>重启板卡确认</DialogTitle>
                        <DialogDescription className="font-mono">
                            目标节点:
                            <span className="bg-secondary text-foreground ml-1.5 rounded-sm px-1.5 py-0.5 font-bold">
                                {ip}:{port}
                            </span>
                        </DialogDescription>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        即将向板卡发送{' '}
                        <code className="bg-secondary text-foreground rounded-sm px-1 py-0.5 font-mono font-bold">
                            reboot
                        </code>{' '}
                        指令。 系统重启期间，当前的遥测采集与连接将被中断。
                    </p>

                    <label className="border-border bg-secondary/30 hover:bg-secondary/50 flex cursor-pointer items-center gap-3 rounded-sm border p-3 transition-colors">
                        <Checkbox
                            checked={syncBefore}
                            onCheckedChange={(checked) => setSyncBefore(Boolean(checked))}
                            disabled={isRebooting}
                        />
                        <div className="flex-1 text-xs">
                            <span className="text-foreground font-semibold">
                                重启前先执行磁盘同步 (sync)
                            </span>
                            <p className="text-muted-foreground text-[0.6875rem]">
                                将内存缓存数据刷写入文件系统存储介质 (推荐)
                            </p>
                        </div>
                    </label>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isRebooting}>
                        取消
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onConfirm(syncBefore)}
                        disabled={isRebooting}
                        data-testid="confirm-reboot-btn">
                        <RotateCw className={isRebooting ? 'animate-spin' : ''} />
                        <span>{isRebooting ? '正在发送指令...' : '确认重启'}</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
