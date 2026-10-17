import { Square, Circle } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/ui/tooltip'
import { RecordingPausedModal } from '@/ui/components/RecordingPausedModal'

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function RecordingPanel({
    isMonitoring,
    isRecording,
    recordingSeconds,
    isPaused = false,
    setIsPaused,
    handleToggleRecording,
}: {
    isMonitoring: boolean
    isRecording: boolean
    recordingSeconds: number
    isPaused?: boolean
    setIsPaused?: (paused: boolean) => void
    handleToggleRecording: () => void
}) {
    const [showPausedModal, setShowPausedModal] = useState(false)

    if (!isMonitoring) return null

    const handleStartClick = () => {
        if (!isRecording && isPaused) {
            setShowPausedModal(true)
        } else {
            handleToggleRecording()
        }
    }

    const handleConfirmResume = () => {
        setShowPausedModal(false)
        setIsPaused?.(false)
        handleToggleRecording()
    }

    return (
        <>
            <div
                className={`bg-popover border-border fixed right-6 bottom-6 z-40 rounded-sm border shadow-2xl transition-colors duration-300 ${
                    isRecording
                        ? 'recording-active p-4'
                        : 'hover:border-muted-foreground/40 px-4 py-2.5'
                }`}
                data-testid="recording-panel">
                {isRecording ? (
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-8 items-center justify-center">
                            <div className="animate-ripple-rose-1 bg-sig-bad/30 absolute inset-0 rounded-[1px]" />
                            <div className="animate-ripple-rose-2 bg-sig-bad/30 absolute inset-0 rounded-[1px]" />
                            <div className="animate-ripple-rose-3 bg-sig-bad/30 absolute inset-0 rounded-[1px]" />
                            <div className="bg-sig-bad relative flex size-4 items-center justify-center rounded-[1px]">
                                <span className="size-1.5 animate-pulse rounded-[1px] bg-white" />
                            </div>
                        </div>

                        <div className="flex flex-col pr-2">
                            <span className="text-sig-bad text-[0.6875rem] font-bold tracking-widest uppercase">
                                正在录制
                            </span>
                            <span className="text-foreground font-mono text-lg font-bold tracking-widest tabular-nums">
                                {formatTime(recordingSeconds)}
                            </span>
                        </div>

                        <ActionTooltip content="停止录制并保存至历史" side="top">
                            <Button
                                onClick={handleToggleRecording}
                                variant="destructive"
                                size="sm"
                                aria-label="停止录制"
                                className="cursor-pointer gap-1.5 px-4 text-xs font-bold">
                                <Square className="size-3 fill-current" />
                                <span>停止录制</span>
                            </Button>
                        </ActionTooltip>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="bg-sig-bad relative flex size-2 items-center justify-center rounded-[1px]">
                                <span className="bg-sig-bad/40 absolute -inset-1 animate-ping rounded-[1px] opacity-75" />
                            </span>
                            <span className="text-muted-foreground text-xs font-medium tracking-wide">
                                就绪 • 等待录制
                            </span>
                        </div>

                        <ActionTooltip content="开始录制" side="top">
                            <Button
                                onClick={handleStartClick}
                                size="sm"
                                aria-label="开始录制"
                                className="border-sig-bad/40 bg-sig-bad/10 text-sig-bad hover:bg-sig-bad/20 hover:text-sig-bad h-7 cursor-pointer gap-1 rounded-sm border px-3.5 text-xs font-bold">
                                <Circle className="size-2.5 fill-current" />
                                <span>开始录制</span>
                            </Button>
                        </ActionTooltip>
                    </div>
                )}
            </div>

            <RecordingPausedModal
                show={showPausedModal}
                onClose={() => setShowPausedModal(false)}
                onConfirm={handleConfirmResume}
            />
        </>
    )
}
