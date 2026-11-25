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
            <footer
                className="bg-rail flex shrink-0 justify-end border-t px-3 py-2 sm:px-6 lg:px-8"
                data-testid="recording-panel">
                {isRecording ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                            <span aria-hidden="true" className="bg-sig-bad size-2 rounded-[1px]" />
                            <span className="text-sig-bad text-xs font-semibold">正在录制</span>
                            <span className="text-foreground font-mono text-sm font-semibold">
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
                    <div className="flex flex-wrap items-center justify-end gap-3">
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
            </footer>

            <RecordingPausedModal
                show={showPausedModal}
                onClose={() => setShowPausedModal(false)}
                onConfirm={handleConfirmResume}
            />
        </>
    )
}
