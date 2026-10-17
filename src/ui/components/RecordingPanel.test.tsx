import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { RecordingPanel } from './RecordingPanel'

describe('RecordingPanel Component', () => {
    const defaultProps = {
        isMonitoring: true,
        isRecording: false,
        recordingSeconds: 0,
        handleToggleRecording: vi.fn(),
    }

    it('does not render when isMonitoring is false', () => {
        const { container } = render(<RecordingPanel {...defaultProps} isMonitoring={false} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders ready state when isMonitoring is true but not recording', () => {
        render(<RecordingPanel {...defaultProps} />)

        expect(screen.getByText('就绪 • 等待录制')).toBeDefined()
        expect(screen.getByText('开始录制')).toBeDefined()
        expect(screen.queryByText('停止录制')).toBeNull()
    })

    it('renders active recording state with formatted time when recording', () => {
        render(
            <RecordingPanel
                {...defaultProps}
                isRecording={true}
                recordingSeconds={125} // 2 mins 5 secs -> 02:05
            />,
        )

        expect(screen.getByText('正在录制')).toBeDefined()
        expect(screen.getByText('02:05')).toBeDefined()
        expect(screen.getByText('停止录制')).toBeDefined()
        expect(screen.queryByText('开始录制')).toBeNull()
    })

    it('calls handleToggleRecording when start recording button is clicked', () => {
        const handleToggleRecording = vi.fn()
        render(<RecordingPanel {...defaultProps} handleToggleRecording={handleToggleRecording} />)

        const startButton = screen.getByText('开始录制')
        fireEvent.click(startButton)

        expect(handleToggleRecording).toHaveBeenCalledTimes(1)
    })

    it('calls handleToggleRecording when stop recording button is clicked', () => {
        const handleToggleRecording = vi.fn()
        render(
            <RecordingPanel
                {...defaultProps}
                isRecording={true}
                handleToggleRecording={handleToggleRecording}
            />,
        )

        const stopButton = screen.getByText('停止录制')
        fireEvent.click(stopButton)

        expect(handleToggleRecording).toHaveBeenCalledTimes(1)
    })

    it('opens paused modal when start recording is clicked while isPaused is true', () => {
        const handleToggleRecording = vi.fn()
        render(
            <RecordingPanel
                {...defaultProps}
                isPaused={true}
                handleToggleRecording={handleToggleRecording}
            />,
        )

        const startButton = screen.getByText('开始录制')
        fireEvent.click(startButton)

        expect(screen.getByText('数据更新已暂停')).toBeInTheDocument()
        expect(
            screen.getByText(
                '开始录制需要有效的数据流。继续操作将自动恢复实时数据流更新并开始录制监控数据。',
            ),
        ).toBeInTheDocument()
        expect(handleToggleRecording).not.toHaveBeenCalled()
    })

    it('closes modal without starting recording when cancel button is clicked', () => {
        const handleToggleRecording = vi.fn()
        render(
            <RecordingPanel
                {...defaultProps}
                isPaused={true}
                handleToggleRecording={handleToggleRecording}
            />,
        )

        fireEvent.click(screen.getByText('开始录制'))
        expect(screen.getByText('数据更新已暂停')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '取消' }))
        expect(screen.queryByText('数据更新已暂停')).toBeNull()
        expect(handleToggleRecording).not.toHaveBeenCalled()
    })

    it('resumes data updates and starts recording when confirm button is clicked in modal', () => {
        const handleToggleRecording = vi.fn()
        const setIsPaused = vi.fn()
        render(
            <RecordingPanel
                {...defaultProps}
                isPaused={true}
                setIsPaused={setIsPaused}
                handleToggleRecording={handleToggleRecording}
            />,
        )

        fireEvent.click(screen.getByText('开始录制'))
        expect(screen.getByText('数据更新已暂停')).toBeInTheDocument()

        const confirmBtn = screen.getByTestId('confirm-resume-and-record-btn')
        fireEvent.click(confirmBtn)

        expect(setIsPaused).toHaveBeenCalledWith(false)
        expect(handleToggleRecording).toHaveBeenCalledTimes(1)
        expect(screen.queryByText('数据更新已暂停')).toBeNull()
    })
})
