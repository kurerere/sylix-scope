import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { McpControlDrawer } from './McpControlDrawer'

const mockRestartServer = vi.fn()
const mockStopServer = vi.fn()
const mockResetToken = vi.fn()
const mockSetAllowExecCommand = vi.fn()
const mockClearLogs = vi.fn()

vi.mock('@/application/useMcpServer', () => ({
    useMcpServer: () => ({
        status: {
            is_running: true,
            port: 3001,
            active_sessions: 2,
            sessions: [
                {
                    session_id: 'session-123',
                    client_ip: '192.168.1.88:51234',
                    connected_at: 1700000000,
                    user_agent: 'Google Antigravity/2.0',
                },
            ],
            server_url: 'http://127.0.0.1:3001/sse',
            lan_ip: '192.168.1.100',
            lan_ips: [
                { name: 'en0', ip: '192.168.1.100', is_default: true },
                { name: 'utun10', ip: '100.64.0.94', is_default: false },
            ],
            lan_server_url: 'http://192.168.1.100:3001/sse',
            token: 'sk-sylixos-testsecrettoken123',
            allow_exec_command: true,
        },
        auditLogs: [
            {
                id: 'log-1',
                timestamp: 1700000000,
                client_id: 'session-123',
                tool_name: 'sylixos_get_realtime_metrics',
                params: { force_fresh: false },
                duration_ms: 15,
                success: true,
            },
        ],
        isLoading: false,
        error: null,
        startServer: mockRestartServer,
        restartServer: mockRestartServer,
        stopServer: mockStopServer,
        resetToken: mockResetToken,
        setAllowExecCommand: mockSetAllowExecCommand,
        clearLogs: mockClearLogs,
    }),
}))

describe('McpControlDrawer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        })
    })

    it('should not render when isOpen is false', () => {
        const { container } = render(<McpControlDrawer isOpen={false} onClose={vi.fn()} />)
        expect(container.firstChild).toBeNull()
    })

    it('should render MCP server status, token, active sessions, and LAN IP options when open', () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        expect(screen.getByText('MCP 服务')).toBeDefined()
        expect(screen.getByText('运行中 (0.0.0.0)')).toBeDefined()
        expect(screen.getByText('2 会话')).toBeDefined()
        expect(screen.getByText('192.168.1.88:51234')).toBeDefined()
        expect(screen.getByText('Google Antigravity/2.0')).toBeDefined()
        expect(screen.getByText('127.0.0.1 (本机)')).toBeDefined()
        expect(screen.getByText('192.168.1.100 (en0)')).toBeDefined()
        expect(screen.getByText('100.64.0.94 (utun10)')).toBeDefined()
        expect(screen.getByText('••••••••••••••••••••••••••••••••')).toBeDefined()
    })

    it('should toggle token plain text and mask', () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const toggleBtn = screen.getByRole('button', { name: '显示完整 Token' })
        fireEvent.click(toggleBtn)

        expect(screen.getByText('sk-sylixos-testsecrettoken123')).toBeDefined()

        const hideBtn = screen.getByRole('button', { name: '隐藏完整 Token' })
        fireEvent.click(hideBtn)

        expect(screen.getByText('••••••••••••••••••••••••••••••••')).toBeDefined()
    })

    it('should copy token when clicking token copy button', () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const copyTokenBtn = screen.getByRole('button', { name: '复制' })
        fireEvent.click(copyTokenBtn)

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('sk-sylixos-testsecrettoken123')
    })

    it('should switch between Antigravity, Codex, and Raw URL tabs and copy content in Streamable HTTP mode by default', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const copyConfigBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyConfigBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('http://127.0.0.1:3001/mcp'),
        )
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('Authorization'),
        )

        const codexTab = screen.getByRole('button', { name: 'Codex / VSCode' })
        fireEvent.click(codexTab)

        const copyCodexBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyCodexBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('http://127.0.0.1:3001/mcp'),
        )

        const rawTab = screen.getByRole('button', { name: 'Raw URL (/mcp)' })
        fireEvent.click(rawTab)

        const copyRawBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyRawBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://127.0.0.1:3001/mcp')
    })

    it('should switch protocol to SSE and generate legacy SSE configs', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const sseProtocolBtn = screen.getByRole('button', { name: /SSE/ })
        fireEvent.click(sseProtocolBtn)

        const copyConfigBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyConfigBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining(
                'http://127.0.0.1:3001/sse?token=sk-sylixos-testsecrettoken123',
            ),
        )

        const rawTab = screen.getByRole('button', { name: 'SSE URL (/sse)' })
        fireEvent.click(rawTab)

        const copyRawBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyRawBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            'http://127.0.0.1:3001/sse?token=sk-sylixos-testsecrettoken123',
        )
    })

    it('should switch network mode to LAN and update config URLs', () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const lanBtn = screen.getByRole('button', { name: /192\.168\.1\.100 \(en0\)/ })
        fireEvent.click(lanBtn)

        const copyBtn = screen.getByRole('button', { name: '复制配置' })
        fireEvent.click(copyBtn)

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('http://192.168.1.100:3001/mcp'),
        )
    })

    it('should handle reset token confirmation modal flow', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const resetBtn = screen.getByRole('button', { name: '重置' })
        fireEvent.click(resetBtn)

        expect(screen.getAllByText('重置 Token').length).toBeGreaterThan(0)

        const confirmBtn = screen.getByRole('button', { name: /确认重置/ })
        await act(async () => {
            fireEvent.click(confirmBtn)
        })

        expect(mockResetToken).toHaveBeenCalled()
    })

    it('should toggle read-only safety mode', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const toggleSwitch = screen.getByRole('switch', { name: '允许 Shell 执行' })
        await act(async () => {
            fireEvent.click(toggleSwitch)
        })

        expect(mockSetAllowExecCommand).toHaveBeenCalledWith(false)
    })

    it('should trigger restartServer when clicking restart button', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        const restartBtn = screen.getByRole('button', { name: /重启/ })
        await act(async () => {
            fireEvent.click(restartBtn)
        })

        expect(mockRestartServer).toHaveBeenCalledWith(3001)
    })

    it('should display audit logs and expand log details on click', async () => {
        render(<McpControlDrawer isOpen={true} onClose={vi.fn()} />)

        expect(screen.getByText('sylixos_get_realtime_metrics')).toBeDefined()
        expect(screen.getByText('15ms')).toBeDefined()

        const logItem = screen.getByText('sylixos_get_realtime_metrics')
        await act(async () => {
            fireEvent.click(logItem)
        })

        expect(screen.getByText('session-123')).toBeDefined()
    })

    it('should call onClose when clicking close button, backdrop, or pressing Escape', () => {
        const onClose = vi.fn()
        render(<McpControlDrawer isOpen={true} onClose={onClose} />)

        const closeBtn = screen.getByRole('button', { name: '关闭 MCP 控制面板' })
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)

        const backdrop = document.querySelector('[data-slot="sheet-overlay"]')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalledTimes(2)

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(3)
    })
})
