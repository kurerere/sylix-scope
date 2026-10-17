import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { storage } from '@/infrastructure/storage/localStorage'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

import {
    TelemetrySessionProvider,
    useTelemetrySession,
    useTelemetrySnapshot,
    useTelemetryChart,
    useTelemetryThresholds,
} from './TelemetrySessionContext'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        startMonitoring: vi.fn().mockResolvedValue(undefined),
        stopMonitoring: vi.fn().mockResolvedValue(undefined),
        startRecording: vi.fn().mockResolvedValue(1),
        stopRecording: vi.fn().mockResolvedValue(undefined),
        rebootTarget: vi.fn().mockResolvedValue('ok'),
        onMonitorData: vi.fn().mockReturnValue(vi.fn()),
        onMonitorStatus: vi.fn().mockReturnValue(vi.fn()),
        onMonitorError: vi.fn().mockReturnValue(vi.fn()),
    },
}))

vi.mock('@/infrastructure/storage/localStorage', () => ({
    storage: {
        getConnectionConfig: vi
            .fn()
            .mockReturnValue({ ip: '192.168.1.100', port: 23, username: 'root', password: '' }),
        saveConnectionConfig: vi.fn(),
        getConnectionHistory: vi.fn().mockReturnValue([]),
        addConnectionToHistory: vi.fn(),
        removeConnectionFromHistory: vi.fn(),
        getWarningThresholds: vi.fn().mockReturnValue({ cpu: 80, mem: 85 }),
        saveWarningCpu: vi.fn(),
        saveWarningMem: vi.fn(),
    },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
    return <TelemetrySessionProvider>{children}</TelemetrySessionProvider>
}

function CustomLimitWrapper({ children }: { children: React.ReactNode }) {
    return (
        <TelemetrySessionProvider initialHistorySeconds={45}>{children}</TelemetrySessionProvider>
    )
}

describe('TelemetrySessionContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws error when hooks are used outside Provider', () => {
        expect(() => renderHook(() => useTelemetrySession())).toThrow(
            'useTelemetrySession must be used within a TelemetrySessionProvider',
        )
        expect(() => renderHook(() => useTelemetrySnapshot())).toThrow(
            'useTelemetrySnapshot must be used within a TelemetrySessionProvider',
        )
        expect(() => renderHook(() => useTelemetryChart())).toThrow(
            'useTelemetryChart must be used within a TelemetrySessionProvider',
        )
        expect(() => renderHook(() => useTelemetryThresholds())).toThrow(
            'useTelemetryThresholds must be used within a TelemetrySessionProvider',
        )
    })

    it('provides session state and manages start/stop monitoring lifecycle', async () => {
        const { result } = renderHook(() => useTelemetrySession(), { wrapper: TestWrapper })

        expect(result.current.isMonitoring).toBe(false)
        expect(result.current.isConnecting).toBe(false)
        expect(result.current.config.ip).toBe('192.168.1.100')

        await act(async () => {
            await result.current.startMonitoring()
        })

        expect(tauriBridge.startMonitoring).toHaveBeenCalled()
        expect(result.current.isMonitoring).toBe(true)

        await act(async () => {
            await result.current.stopMonitoring()
        })

        expect(tauriBridge.stopMonitoring).toHaveBeenCalled()
        expect(result.current.isMonitoring).toBe(false)
    })

    it('provides chart and thresholds controls', () => {
        const { result: chartResult } = renderHook(() => useTelemetryChart(), {
            wrapper: CustomLimitWrapper,
        })
        const { result: thresholdsResult } = renderHook(() => useTelemetryThresholds(), {
            wrapper: CustomLimitWrapper,
        })

        expect(chartResult.current.historySeconds).toBe(45)
        expect(chartResult.current.isPaused).toBe(false)

        act(() => {
            chartResult.current.setIsPaused(true)
            chartResult.current.setHistorySeconds(60)
            thresholdsResult.current.setWarningCpu(90)
            thresholdsResult.current.setWarningMem(95)
        })

        expect(chartResult.current.isPaused).toBe(true)
        expect(chartResult.current.historySeconds).toBe(60)
        expect(thresholdsResult.current.warningCpu).toBe(90)
        expect(thresholdsResult.current.warningMem).toBe(95)
        expect(storage.saveWarningCpu).toHaveBeenCalledWith(90)
        expect(storage.saveWarningMem).toHaveBeenCalledWith(95)
    })

    it('handles rebootTarget flow and updates session status', async () => {
        const { result } = renderHook(() => useTelemetrySession(), { wrapper: TestWrapper })

        await act(async () => {
            await result.current.rebootTarget(true)
        })

        expect(tauriBridge.rebootTarget).toHaveBeenCalledWith(
            expect.objectContaining({ ip: '192.168.1.100' }),
            true,
        )
        expect(result.current.isMonitoring).toBe(false)
        expect(result.current.statusMessage).toBe('已成功发送重启指令，目标板正在重启...')
    })
})
