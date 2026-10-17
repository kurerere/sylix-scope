import { AlertCircle, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface RecordingPausedModalProps {
    show: boolean
    onClose: () => void
    onConfirm: () => void
}

export function RecordingPausedModal({ show, onClose, onConfirm }: RecordingPausedModalProps) {
    return (
        <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="max-w-md"
                data-testid="recording-paused-modal">
                <div className="flex items-start gap-3">
                    <div className="border-sig-warn/40 bg-sig-warn/10 text-sig-warn rounded-sm border p-2.5">
                        <AlertCircle className="size-5" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle>数据更新已暂停</DialogTitle>
                        <DialogDescription>数据更新已暂停，恢复后才能开始录制</DialogDescription>
                    </div>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                    开始录制需要有效的数据流。继续操作将自动恢复实时数据流更新并开始录制监控数据。
                </p>

                <div className="flex items-center justify-end gap-2.5">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                        取消
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onConfirm}
                        data-testid="confirm-resume-and-record-btn"
                        className="bg-sig-warn hover:bg-sig-warn/85 border-transparent text-white">
                        <Play className="fill-current" />
                        <span>恢复并开始录制</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
