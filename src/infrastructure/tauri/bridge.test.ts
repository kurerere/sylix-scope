import { describe, it, expect, vi, beforeEach } from 'vitest'

import { tauriBridge } from './bridge'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// 可重赋值占位符共享的空实现（避免在用例内定义无捕获函数）
const noop = () => {}

describe('Tauri Bridge Infrastructure', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should invoke start_monitoring with correct parameters', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined as any)

        await tauriBridge.startMonitoring({
            ip: '192.168.1.1',
            port: 23,
            username: 'root',
            password: 'pwd',
        })

        expect(invoke).toHaveBeenCalledWith('start_monitoring', {
            ip: '192.168.1.1',
            port: 23,
            username: 'root',
            password: 'pwd',
        })
    })

    it('should invoke stop_monitoring', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined as any)

        await tauriBridge.stopMonitoring()

        expect(invoke).toHaveBeenCalledWith('stop_monitoring')
    })

    it('should invoke start_recording and return recording ID', async () => {
        vi.mocked(invoke).mockResolvedValue(42 as any)

        const id = await tauriBridge.startRecording('session-1')

        expect(invoke).toHaveBeenCalledWith('start_recording', { name: 'session-1' })
        expect(id).toBe(42)
    })

    it('should set up monitor data listener with sync unsubscribe', async () => {
        const mockUnlisten = vi.fn()
        vi.mocked(listen).mockResolvedValue(mockUnlisten as any)

        const callback = vi.fn()
        const unlisten = tauriBridge.onMonitorData(callback)

        expect(listen).toHaveBeenCalledWith('monitor_data', expect.any(Function))

        const listenCall = vi.mocked(listen).mock.calls[0]
        const registeredCallback = listenCall[1] as Function
        registeredCallback({ payload: { cpu: 10 } })

        expect(callback).toHaveBeenCalledWith({ cpu: 10 })

        unlisten()
        await Promise.resolve()
        expect(mockUnlisten).toHaveBeenCalled()
    })

    it('drops events fired after unsubscribe even if listen resolves late', async () => {
        const mockUnlisten = vi.fn()
        let captured: Function = noop
        let resolveListen: (u: () => void) => void = noop
        vi.mocked(listen).mockImplementation((_event: string, cb: Function) => {
            captured = cb
            return new Promise((resolve) => {
                resolveListen = resolve as (u: () => void) => void
            })
        })

        const callback = vi.fn()
        const unlisten = tauriBridge.onMonitorData(callback)
        unlisten()
        resolveListen(mockUnlisten)
        await Promise.resolve()
        captured({ payload: { late: true } })

        expect(callback).not.toHaveBeenCalled()
        expect(mockUnlisten).toHaveBeenCalled()
    })

    it('should invoke get_mcp_server_status and return status', async () => {
        const mockStatus = {
            is_running: true,
            port: 3001,
            active_sessions: 2,
            server_url: 'http://127.0.0.1:3001/sse',
        }
        vi.mocked(invoke).mockResolvedValue(mockStatus as any)

        const status = await tauriBridge.getMcpServerStatus()

        expect(invoke).toHaveBeenCalledWith('get_mcp_server_status')
        expect(status).toEqual(mockStatus)
    })

    it('should invoke restart_mcp_server with new port', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined as any)

        await tauriBridge.restartMcpServer(3005)

        expect(invoke).toHaveBeenCalledWith('restart_mcp_server', { port: 3005 })
    })

    it('should invoke stop_mcp_server', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined as any)

        await tauriBridge.stopMcpServer()

        expect(invoke).toHaveBeenCalledWith('stop_mcp_server')
    })

    it('should set up mcp audit log listener', async () => {
        const mockUnlisten = vi.fn()
        vi.mocked(listen).mockResolvedValue(mockUnlisten as any)

        const callback = vi.fn()
        const unlisten = tauriBridge.onMcpAuditLog(callback)

        expect(listen).toHaveBeenCalledWith('mcp_audit_log', expect.any(Function))

        const listenCall = vi.mocked(listen).mock.calls[0]
        const registeredCallback = listenCall[1] as Function
        const mockLog = {
            id: 'log-1',
            timestamp: 123456,
            client_id: 'client-1',
            tool_name: 'sylixos_get_realtime_metrics',
            params: {},
            duration_ms: 12,
            success: true,
        }
        registeredCallback({ payload: mockLog })

        expect(callback).toHaveBeenCalledWith(mockLog)

        unlisten()
        await Promise.resolve()
        expect(mockUnlisten).toHaveBeenCalled()
    })

    it('should invoke reboot_target with config and syncBefore', async () => {
        vi.mocked(invoke).mockResolvedValue('重启指令已发送' as any)

        const result = await tauriBridge.rebootTarget(
            {
                ip: '192.168.1.1',
                port: 23,
                username: 'root',
                password: 'pwd',
            },
            true,
        )

        expect(invoke).toHaveBeenCalledWith('reboot_target', {
            ip: '192.168.1.1',
            port: 23,
            username: 'root',
            password: 'pwd',
            syncBefore: true,
        })
        expect(result).toBe('重启指令已发送')
    })

    it('should invoke get_app_data_dir and return directory path', async () => {
        vi.mocked(invoke).mockResolvedValue('/path/to/app/data' as any)

        const dir = await tauriBridge.getDataDir()

        expect(invoke).toHaveBeenCalledWith('get_app_data_dir')
        expect(dir).toBe('/path/to/app/data')
    })

    it('should invoke open_data_dir to open folder in system file manager', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined as any)

        await tauriBridge.openDataDir()

        expect(invoke).toHaveBeenCalledWith('open_data_dir')
    })

    it('should invoke get_app_info and return app information', async () => {
        const mockInfo = {
            app_name: 'sylixos-monitor',
            app_version: '1.2.0',
            tauri_version: '2.0.0',
            build_date: '2026-08-17 23:00:00 UTC',
            target: 'windows-x86_64',
        }
        vi.mocked(invoke).mockResolvedValue(mockInfo as any)

        const info = await tauriBridge.getAppInfo()

        expect(invoke).toHaveBeenCalledWith('get_app_info')
        expect(info).toEqual(mockInfo)
    })

    it('should return fallback app info when get_app_info throws', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Tauri not available'))

        const info = await tauriBridge.getAppInfo()

        expect(info.app_name).toBe('sylixos-monitor')
        expect(info.app_version).toBe('1.0.0')
        expect(info.tauri_version).toBe('2.0')
        expect(info.target).toBe('unknown')
        expect(info.build_date).toBeDefined()
    })

    it('should invoke reboot_target with syncBefore false', async () => {
        vi.mocked(invoke).mockResolvedValue('ok' as any)
        await tauriBridge.rebootTarget(
            { ip: '1.1.1.1', port: 23, username: 'root', password: 'p' },
            false,
        )
        expect(invoke).toHaveBeenCalledWith(
            'reboot_target',
            expect.objectContaining({ syncBefore: false }),
        )
    })

    it('should invoke get_app_data_dir and open_data_dir', async () => {
        vi.mocked(invoke).mockResolvedValue('/tmp/dir' as any)
        expect(await tauriBridge.getDataDir()).toBe('/tmp/dir')
        await tauriBridge.openDataDir()
        expect(invoke).toHaveBeenCalledWith('open_data_dir')
    })

    it('should return fallback app info on invoke failure', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('nope'))
        const info = await tauriBridge.getAppInfo()
        expect(info.app_version).toBe('1.0.0')
    })

    it('should invoke network commands', async () => {
        vi.mocked(invoke).mockResolvedValue([] as any)
        await tauriBridge.getNetworkInterfaces()
        await tauriBridge.getNetworkSockets('TCP')
        await tauriBridge.getNetworkRoutes()
        await tauriBridge.getNetworkStats()
        expect(invoke).toHaveBeenCalledWith('get_network_interfaces')
        expect(invoke).toHaveBeenCalledWith('get_network_sockets', { protocol: 'TCP' })
        expect(invoke).toHaveBeenCalledWith('get_network_routes')
        expect(invoke).toHaveBeenCalledWith('get_network_stats')
    })

    it('should unsubscribe monitor status and error listeners', async () => {
        const mockUnlisten = vi.fn()
        vi.mocked(listen).mockResolvedValue(mockUnlisten as any)

        const unsubStatus = tauriBridge.onMonitorStatus(() => {})
        unsubStatus()
        const unsubError = tauriBridge.onMonitorError(() => {})
        unsubError()
        await Promise.resolve()
        expect(mockUnlisten).toHaveBeenCalledTimes(2)
    })

    it('should unsubscribe audit log listener', () => {
        const mockUnlisten = vi.fn()
        vi.mocked(listen).mockResolvedValue(mockUnlisten as any)
        const unsub = tauriBridge.onMcpAuditLog(() => {})
        unsub()
        return Promise.resolve().then(() => expect(mockUnlisten).toHaveBeenCalled())
    })
})
