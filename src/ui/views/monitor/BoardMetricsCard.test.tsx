import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { BoardMetricsCard } from './BoardMetricsCard'

describe('BoardMetricsCard Component', () => {
    it('renders OFFLINE status and prompt when not monitoring', () => {
        render(
            <BoardMetricsCard
                isMonitoring={false}
                processCount={0}
                isPaused={false}
                setIsPaused={vi.fn()}
            />,
        )
        expect(screen.getByText('OFFLINE')).toBeInTheDocument()
        expect(screen.getByText('未连接板卡，点击顶部“开始连接”。')).toBeInTheDocument()
    })

    it('renders CONNECTING status when connecting', () => {
        render(
            <BoardMetricsCard
                isMonitoring={false}
                isConnecting={true}
                processCount={0}
                isPaused={false}
                setIsPaused={vi.fn()}
            />,
        )
        expect(screen.getByText('CONNECTING')).toBeInTheDocument()
    })

    it('renders disabled danger reboot button when not monitoring', () => {
        render(
            <BoardMetricsCard
                isMonitoring={false}
                processCount={0}
                isPaused={false}
                setIsPaused={vi.fn()}
            />,
        )
        const rebootBtn = screen.getByRole('button', { name: '重启目标设备' })
        expect(rebootBtn).toBeInTheDocument()
        expect(rebootBtn).toBeDisabled()
    })

    it('renders danger reboot button and opens confirm modal when clicked during monitoring', async () => {
        const onReboot = vi.fn()
        render(
            <BoardMetricsCard
                isMonitoring={true}
                ip="192.168.1.100"
                port={23}
                processCount={42}
                isPaused={false}
                setIsPaused={vi.fn()}
                onReboot={onReboot}
            />,
        )

        const rebootBtn = screen.getByRole('button', { name: '重启目标设备' })
        expect(rebootBtn).toBeInTheDocument()
        expect(rebootBtn).not.toBeDisabled()

        fireEvent.click(rebootBtn)
        expect(screen.getByText('重启板卡确认')).toBeInTheDocument()

        const confirmBtn = screen.getByTestId('confirm-reboot-btn')
        fireEvent.click(confirmBtn)
        expect(onReboot).toHaveBeenCalledWith(true)
    })

    it('disables reboot button when isRebooting is true', () => {
        render(
            <BoardMetricsCard
                isMonitoring={true}
                isRebooting={true}
                ip="192.168.1.100"
                port={23}
                processCount={42}
                isPaused={false}
                setIsPaused={vi.fn()}
            />,
        )

        const rebootBtn = screen.getByRole('button', { name: '重启目标设备' })
        expect(rebootBtn).toBeDisabled()
    })
})
