import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { RebootConfirmModal } from './RebootConfirmModal'

describe('RebootConfirmModal Component', () => {
    it('does not render when show is false', () => {
        const { container } = render(
            <RebootConfirmModal
                show={false}
                ip="192.168.1.100"
                port={23}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders modal with target IP and handles confirm with sync', () => {
        const onConfirm = vi.fn()
        const onClose = vi.fn()

        render(
            <RebootConfirmModal
                show={true}
                ip="192.168.1.100"
                port={23}
                onClose={onClose}
                onConfirm={onConfirm}
            />,
        )

        expect(screen.getByText('重启板卡确认')).toBeDefined()
        expect(screen.getByText('192.168.1.100:23')).toBeDefined()

        const confirmBtn = screen.getByTestId('confirm-reboot-btn')
        fireEvent.click(confirmBtn)

        expect(onConfirm).toHaveBeenCalledWith(true)
    })

    it('toggles sync checkbox and passes false to onConfirm when unchecked', () => {
        const onConfirm = vi.fn()

        render(
            <RebootConfirmModal
                show={true}
                ip="192.168.1.100"
                port={23}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        )

        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeChecked()

        fireEvent.click(checkbox)
        expect(checkbox).not.toBeChecked()

        const confirmBtn = screen.getByTestId('confirm-reboot-btn')
        fireEvent.click(confirmBtn)

        expect(onConfirm).toHaveBeenCalledWith(false)
    })

    it('handles close on cancel button click', () => {
        const onClose = vi.fn()

        render(
            <RebootConfirmModal
                show={true}
                ip="192.168.1.100"
                port={23}
                onClose={onClose}
                onConfirm={vi.fn()}
            />,
        )

        const cancelBtn = screen.getByText('取消')
        fireEvent.click(cancelBtn)

        expect(onClose).toHaveBeenCalled()
    })

    it('disables buttons when isRebooting is true', () => {
        render(
            <RebootConfirmModal
                show={true}
                ip="192.168.1.100"
                port={23}
                isRebooting={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        const confirmBtn = screen.getByTestId('confirm-reboot-btn')
        expect(confirmBtn).toBeDisabled()
        expect(screen.getByText('正在发送指令...')).toBeDefined()
    })
})
