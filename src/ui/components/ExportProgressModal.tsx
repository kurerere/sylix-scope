import { AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

export interface ExportStep {
    label: string
    status: 'pending' | 'active' | 'success' | 'error'
}

const EMPTY_STEPS: ExportStep[] = []

export function ExportProgressModal({
    isOpen,
    progress,
    stepText,
    steps = EMPTY_STEPS,
    error,
    onClose,
}: {
    isOpen: boolean
    progress: number
    stepText: string
    steps?: ExportStep[]
    error?: string | null
    onClose: () => void
}) {
    const isRunning = progress < 100 && !error
    const title = error ? '导出失败' : progress === 100 ? '导出完成' : '正在导出快照'

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
            <DialogContent showCloseButton={false} className="max-w-md">
                <div className="flex items-center gap-3">
                    <div className="border-border bg-secondary text-chart-cpu flex size-10 items-center justify-center rounded-sm border">
                        {error ? (
                            <AlertCircle className="text-sig-bad size-5" />
                        ) : progress === 100 ? (
                            <CheckCircle2 className="text-sig-ok size-5" />
                        ) : (
                            <Download className="size-5 animate-pulse" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-sm">{title}</DialogTitle>
                        <p className="text-muted-foreground text-[0.625rem] font-medium">
                            {error
                                ? '发生了预料之外的错误'
                                : progress === 100
                                  ? '文件已成功写入目标路径'
                                  : '请耐心等待导出完成'}
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="border-sig-bad/25 bg-sig-bad/10 text-sig-bad rounded-sm border p-3.5 text-xs">
                        {error}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Progress value={progress} className="h-2">
                            <span className="text-muted-foreground text-xs">{stepText}</span>
                        </Progress>

                        {steps.length > 0 && (
                            <div className="border-border/60 rounded-sm border p-4">
                                {steps.map((step) => {
                                    const isActive = step.status === 'active'
                                    const isSuccess = step.status === 'success'
                                    const isError = step.status === 'error'

                                    return (
                                        <div
                                            key={step.label}
                                            className="flex items-center justify-between py-1 text-xs">
                                            <span
                                                className={`font-semibold tracking-wide ${
                                                    isActive
                                                        ? 'text-chart-cpu font-bold'
                                                        : isSuccess
                                                          ? 'text-foreground'
                                                          : isError
                                                            ? 'text-sig-bad'
                                                            : 'text-muted-foreground'
                                                }`}>
                                                {step.label}
                                            </span>
                                            {isActive && (
                                                <Loader2 className="text-chart-cpu size-3.5 animate-spin" />
                                            )}
                                            {isSuccess && (
                                                <CheckCircle2 className="text-sig-ok size-3.5" />
                                            )}
                                            {isError && (
                                                <AlertCircle className="text-sig-bad size-3.5" />
                                            )}
                                            {step.status === 'pending' && (
                                                <div className="border-muted-foreground/40 size-3.5 rounded-[1px] border-2" />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button
                        onClick={onClose}
                        disabled={isRunning}
                        variant="secondary"
                        size="sm"
                        className="px-4">
                        {error ? '关闭' : progress === 100 ? '确定' : '导出中...'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
