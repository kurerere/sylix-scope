import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { useMcpServer } from './useMcpServer'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getMcpServerStatus: vi.fn(),
        restartMcpServer: vi.fn(),
        stopMcpServer: vi.fn(),
        resetMcpToken: vi.fn(),
        setMcpAllowExecCommand: vi.fn(),
        onMcpAuditLog: vi.fn(),
    },
}))

describe('useMcpServer Hook', () => {
    let mockAuditCallback: (log: any) => void
    const mockUnsubscribe = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()

        vi.mocked(tauriBridge.onMcpAuditLog).mockImplementation((callback) => {
            mockAuditCallback = callback
            return mockUnsubscribe
        })

        vi.mocked(tauriBridge.getMcpServerStatus).mockResolvedValue({
            is_running: true,
            port: 3001,
            active_sessions: 1,
            sessions: [
                {
                    session_id: 'sess-1',
                    client_ip: '192.168.1.88:52341',
                    connected_at: 1700000000,
                    user_agent: 'Antigravity/2.0',
                },
            ],
            server_url: 'http://127.0.0.1:3001/sse',
            lan_ip: '192.168.1.100',
            lan_server_url: 'http://192.168.1.100:3001/sse',
            token: 'sk-sylixos-testtoken',
            allow_exec_command: true,
        })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should fetch status on mount and subscribe to audit logs', async () => {
        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await Promise.resolve()
        })

        expect(tauriBridge.getMcpServerStatus).toHaveBeenCalled()
        expect(tauriBridge.onMcpAuditLog).toHaveBeenCalled()
        expect(result.current.status?.is_running).toBe(true)
        expect(result.current.status?.port).toBe(3001)
    })

    it('should receive and append audit logs up to 50 items', async () => {
        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await Promise.resolve()
        })

        const log1 = {
            id: 'log-1',
            timestamp: 100,
            client_id: 'c1',
            tool_name: 'sylixos_get_realtime_metrics',
            params: {},
            duration_ms: 5,
            success: true,
        }

        act(() => {
            mockAuditCallback(log1)
        })

        expect(result.current.auditLogs).toHaveLength(1)
        expect(result.current.auditLogs[0]).toEqual(log1)

        act(() => {
            result.current.clearLogs()
        })

        expect(result.current.auditLogs).toHaveLength(0)
    })

    it('should start server and refresh status', async () => {
        vi.mocked(tauriBridge.restartMcpServer).mockResolvedValue(undefined as any)
        vi.mocked(tauriBridge.getMcpServerStatus).mockResolvedValue({
            is_running: true,
            port: 3005,
            active_sessions: 0,
            sessions: [],
            server_url: 'http://127.0.0.1:3005/sse',
            token: 'sk-sylixos-testtoken',
            allow_exec_command: true,
        })

        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await result.current.startServer(3005)
        })

        expect(tauriBridge.restartMcpServer).toHaveBeenCalledWith(3005)
        expect(result.current.status?.port).toBe(3005)
    })

    it('should stop server and refresh status', async () => {
        vi.mocked(tauriBridge.stopMcpServer).mockResolvedValue(undefined as any)
        vi.mocked(tauriBridge.getMcpServerStatus).mockResolvedValue({
            is_running: false,
            port: 3001,
            active_sessions: 0,
            sessions: [],
            server_url: 'http://127.0.0.1:3001/sse',
            token: 'sk-sylixos-testtoken',
            allow_exec_command: true,
        })

        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await result.current.stopServer()
        })

        expect(tauriBridge.stopMcpServer).toHaveBeenCalled()
        expect(result.current.status?.is_running).toBe(false)
    })

    it('should reset token and update status', async () => {
        vi.mocked(tauriBridge.resetMcpToken).mockResolvedValue({
            is_running: true,
            port: 3001,
            active_sessions: 0,
            sessions: [],
            server_url: 'http://127.0.0.1:3001/sse',
            lan_ip: '192.168.1.100',
            lan_server_url: 'http://192.168.1.100:3001/sse',
            token: 'sk-sylixos-brandnewtoken',
            allow_exec_command: true,
        })

        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await result.current.resetToken()
        })

        expect(tauriBridge.resetMcpToken).toHaveBeenCalled()
        expect(result.current.status?.token).toBe('sk-sylixos-brandnewtoken')
        expect(result.current.status?.active_sessions).toBe(0)
    })

    it('should toggle allowExecCommand and update status', async () => {
        vi.mocked(tauriBridge.setMcpAllowExecCommand).mockResolvedValue({
            is_running: true,
            port: 3001,
            active_sessions: 1,
            sessions: [
                {
                    session_id: 'sess-1',
                    client_ip: '192.168.1.88:52341',
                    connected_at: 1700000000,
                    user_agent: 'Antigravity/2.0',
                },
            ],
            server_url: 'http://127.0.0.1:3001/sse',
            lan_ip: '192.168.1.100',
            lan_server_url: 'http://192.168.1.100:3001/sse',
            token: 'sk-sylixos-testtoken',
            allow_exec_command: false,
        })

        const { result } = renderHook(() => useMcpServer())

        await act(async () => {
            await result.current.setAllowExecCommand(false)
        })

        expect(tauriBridge.setMcpAllowExecCommand).toHaveBeenCalledWith(false)
        expect(result.current.status?.allow_exec_command).toBe(false)
    })
})
