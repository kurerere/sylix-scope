import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { App } from './App'

vi.mock('@/application/telemetry/TelemetrySessionContext', async () => {
    const actual = await vi.importActual<
        typeof import('@/application/telemetry/TelemetrySessionContext')
    >('@/application/telemetry/TelemetrySessionContext')
    return actual
})

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        startMonitoring: vi.fn().mockResolvedValue(undefined),
        stopMonitoring: vi.fn().mockResolvedValue(undefined),
        startRecording: vi.fn().mockResolvedValue(1),
        stopRecording: vi.fn().mockResolvedValue(undefined),
        rebootTarget: vi.fn().mockResolvedValue('ok'),
        getAppInfo: vi.fn().mockResolvedValue({
            app_name: 'sylix-scope',
            app_version: '1.0.10',
            tauri_version: '2.0',
            build_date: '2026-01-01',
            target: 'test',
        }),
        onMonitorData: vi.fn().mockReturnValue(vi.fn()),
        onMonitorStatus: vi.fn().mockReturnValue(vi.fn()),
        onMonitorError: vi.fn().mockReturnValue(vi.fn()),
        getMcpServerStatus: vi.fn().mockResolvedValue({
            is_running: false,
            port: 3001,
            active_sessions: 0,
            sessions: [],
            server_url: '',
            token: '',
            allow_exec_command: true,
        }),
        onMcpAuditLog: vi.fn().mockReturnValue(vi.fn()),
    },
}))

vi.mock('@/ui/views/NetworkView', () => ({ NetworkView: () => <div>网络看板视图</div> }))
vi.mock('@/ui/views/SettingsView', () => ({ SettingsView: () => <div>设置视图</div> }))
vi.mock('@/ui/views/HistoryView', () => ({ HistoryView: () => <div>历史视图</div> }))

describe('App', () => {
    it('renders monitor view by default and switches tabs', () => {
        render(<App />)

        expect(screen.getAllByText('实时监控').length).toBeGreaterThan(0)
        expect(screen.getByText('CPU 使用情况')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '网络看板' }))
        expect(screen.getByText('网络看板视图')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '历史记录' }))
        expect(screen.getByText('历史视图')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '设置' }))
        expect(screen.getByText('设置视图')).toBeInTheDocument()
    })
})
