import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ThemeProvider } from '@/application/theme/ThemeProvider'

import { Header } from './Header'

describe('Header Component', () => {
    const defaultProps = {
        activeTab: 'monitor' as const,
        isMonitoring: false,
        isConnecting: false,
        ip: '192.168.1.100',
        port: 23,
        setShowConfig: vi.fn(),
        handleStart: vi.fn(),
        handleStop: vi.fn(),
        statusMessage: '正常监控中',
        statusType: 'success' as const,
    }

    it('renders Header with correct active tab text', () => {
        render(
            <ThemeProvider>
                <Header {...defaultProps} />
            </ThemeProvider>,
        )
        expect(screen.getByText('实时监控')).toBeDefined()
    })

    it('renders connection parameters and handle config/connect actions when not monitoring', () => {
        const { container } = render(
            <ThemeProvider>
                <Header {...defaultProps} isMonitoring={false} />
            </ThemeProvider>,
        )

        const ipButton = screen.getByText('192.168.1.100:23')
        expect(ipButton).toBeDefined()

        fireEvent.click(ipButton)
        expect(defaultProps.setShowConfig).toHaveBeenCalledWith(true)

        const editButton = container.querySelector('button[aria-label="修改连接配置"]')
        const connectButton = container.querySelector('button[aria-label="开始连接"]')

        expect(editButton).not.toBeNull()
        expect(connectButton).not.toBeNull()

        if (editButton) {
            fireEvent.click(editButton)
            expect(defaultProps.setShowConfig).toHaveBeenCalledWith(true)
        }

        if (connectButton) {
            fireEvent.click(connectButton)
            expect(defaultProps.handleStart).toHaveBeenCalled()
        }
    })

    it('shows loading indicator and disables config actions when connecting', () => {
        const { container } = render(
            <ThemeProvider>
                <Header {...defaultProps} isMonitoring={false} isConnecting={true} />
            </ThemeProvider>,
        )

        const connectingButton = container.querySelector('button[aria-label="正在连接..."]')
        expect(connectingButton).not.toBeNull()
        expect(connectingButton?.getAttribute('disabled')).not.toBeNull()

        const editButton = container.querySelector('button[aria-label="修改连接配置"]')
        expect(editButton?.getAttribute('disabled')).not.toBeNull()
    })

    it('renders IP address and handles config/stop actions when monitoring', () => {
        const { container } = render(
            <ThemeProvider>
                <Header {...defaultProps} isMonitoring={true} />
            </ThemeProvider>,
        )

        expect(screen.getByText('192.168.1.100:23')).toBeDefined()

        const editButton = container.querySelector('button[aria-label="修改连接配置"]')
        const stopButton = container.querySelector('button[aria-label="断开当前连接"]')

        expect(editButton).not.toBeNull()
        expect(stopButton).not.toBeNull()

        if (editButton) {
            fireEvent.click(editButton)
            expect(defaultProps.setShowConfig).toHaveBeenCalledWith(true)
        }

        if (stopButton) {
            fireEvent.click(stopButton)
            expect(defaultProps.handleStop).toHaveBeenCalled()
        }
    })

    it('applies custom styles for different status messages', () => {
        const { unmount } = render(
            <ThemeProvider>
                <Header {...defaultProps} statusMessage="连接失败" statusType="error" />
            </ThemeProvider>,
        )
        expect(screen.getByText('连接失败')).toBeDefined()

        const alertEl = screen.getByRole('alert')
        expect(alertEl).toBeDefined()

        unmount()

        render(
            <ThemeProvider>
                <Header {...defaultProps} statusMessage="正常" statusType="success" />
            </ThemeProvider>,
        )
        expect(screen.queryByText('正常')).toBeNull()
    })
})
