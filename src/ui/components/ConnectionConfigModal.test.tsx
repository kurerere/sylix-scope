import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ConnectionConfigModal } from './ConnectionConfigModal'

describe('ConnectionConfigModal Component', () => {
    const mockConnection: any = {
        ip: '192.168.1.50',
        port: 23,
        username: 'root',
        password: 'pwd',
        isMonitoring: false,
        isConnecting: false,
        statusMessage: '',
        statusType: 'info',
        historyList: [{ ip: '10.0.0.1', port: 23, username: 'admin', password: '123' }],
        updateConfig: vi.fn(),
        deleteHistoryItem: vi.fn(),
    }

    it('renders nothing when show is false', () => {
        const { container } = render(
            <ConnectionConfigModal
                show={false}
                onClose={vi.fn()}
                connection={mockConnection}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders form inputs and handles start button click', () => {
        const onStart = vi.fn()
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={mockConnection}
                onStart={onStart}
                onStop={vi.fn()}
            />,
        )
        expect(screen.getByText('连接配置')).toBeInTheDocument()
        expect(screen.getByDisplayValue('192.168.1.50')).toBeInTheDocument()
        const startBtn = screen.getByRole('button', { name: /开始监控/i })
        fireEvent.click(startBtn)
        expect(onStart).toHaveBeenCalled()
    })

    it('renders error status message when present', () => {
        const errConnection = {
            ...mockConnection,
            statusType: 'error',
            statusMessage: '连接超时，无法访问目标板卡',
        }
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={errConnection}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        expect(screen.getByText('连接超时，无法访问目标板卡')).toBeInTheDocument()
    })

    it('renders history entries and deletes one', () => {
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={mockConnection}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        fireEvent.click(screen.getByText('历史连接'))
        expect(screen.getByText('10.0.0.1:23')).toBeInTheDocument()
        expect(screen.getByText('User: admin')).toBeInTheDocument()

        fireEvent.click(screen.getByTitle('删除此记录'))
        expect(mockConnection.deleteHistoryItem).toHaveBeenCalledWith(mockConnection.historyList[0])
    })

    it('updates config via ip field change', () => {
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={mockConnection}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        fireEvent.change(screen.getByDisplayValue('192.168.1.50'), {
            target: { value: '10.0.0.9' },
        })
        expect(mockConnection.updateConfig).toHaveBeenCalledWith({ ip: '10.0.0.9' })
    })

    it('shows disconnect button when monitoring', () => {
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={{ ...mockConnection, isMonitoring: true }}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        expect(screen.getByText('断开当前连接')).toBeInTheDocument()
    })

    it('shows connecting state and disables start', () => {
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={{ ...mockConnection, isConnecting: true }}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        expect(screen.getByText('正在连接...')).toBeInTheDocument()
    })

    it('selects a history entry and submits with Enter', async () => {
        const onStart = vi.fn()
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={mockConnection}
                onStart={onStart}
                onStop={vi.fn()}
            />,
        )
        fireEvent.click(screen.getByText('历史连接'))
        fireEvent.click(screen.getByText('10.0.0.1:23'))
        expect(mockConnection.updateConfig).toHaveBeenCalledWith(mockConnection.historyList[0])

        // 历史选中后 IP 输入框值更新，Enter 提交
        fireEvent.keyDown(screen.getByText('连接配置'), { key: 'Enter' })
        expect(onStart).toHaveBeenCalled()
    })

    it('shows connecting spinner state', () => {
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={{ ...mockConnection, isConnecting: true, isMonitoring: false }}
                onStart={vi.fn()}
                onStop={vi.fn()}
            />,
        )
        expect(screen.getByText('正在连接...')).toBeInTheDocument()
    })

    it('submits stop via disconnect button', () => {
        const onStop = vi.fn()
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={{ ...mockConnection, isMonitoring: true }}
                onStart={vi.fn()}
                onStop={onStop}
            />,
        )
        fireEvent.click(screen.getByText('断开当前连接'))
        expect(onStop).toHaveBeenCalled()
    })

    it('submits via stop when monitoring', () => {
        const onStop = vi.fn()
        render(
            <ConnectionConfigModal
                show={true}
                onClose={vi.fn()}
                connection={{ ...mockConnection, isMonitoring: true }}
                onStart={vi.fn()}
                onStop={onStop}
            />,
        )
        fireEvent.click(screen.getByText('断开当前连接'))
        expect(onStop).toHaveBeenCalled()
    })
})
