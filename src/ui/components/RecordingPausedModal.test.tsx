import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { RecordingPausedModal } from './RecordingPausedModal'

describe('RecordingPausedModal Component', () => {
    it('renders nothing when show is false', () => {
        const { container } = render(
            <RecordingPausedModal show={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders modal content correctly when show is true', () => {
        render(<RecordingPausedModal show={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

        expect(screen.getByText('数据更新已暂停')).toBeInTheDocument()
        expect(screen.getByText('数据更新已暂停，恢复后才能开始录制')).toBeInTheDocument()
        expect(
            screen.getByText(
                '开始录制需要有效的数据流。继续操作将自动恢复实时数据流更新并开始录制监控数据。',
            ),
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
        expect(screen.getByTestId('confirm-resume-and-record-btn')).toBeInTheDocument()
    })

    it('calls onClose when cancel button, close icon or backdrop is clicked', () => {
        const onClose = vi.fn()
        render(<RecordingPausedModal show={true} onClose={onClose} onConfirm={vi.fn()} />)

        fireEvent.click(screen.getByRole('button', { name: '取消' }))
        expect(onClose).toHaveBeenCalledTimes(1)

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('calls onConfirm when confirm button is clicked', () => {
        const onConfirm = vi.fn()
        render(<RecordingPausedModal show={true} onClose={vi.fn()} onConfirm={onConfirm} />)

        fireEvent.click(screen.getByTestId('confirm-resume-and-record-btn'))
        expect(onConfirm).toHaveBeenCalledTimes(1)
    })
})
