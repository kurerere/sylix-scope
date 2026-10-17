import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { useHistoryExport } from './useHistoryExport'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        selectSavePath: vi.fn(),
        exportRecordToFile: vi.fn(),
    },
}))

describe('useHistoryExport', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    it('initializes with idle state', () => {
        const { result } = renderHook(() => useHistoryExport())
        expect(result.current.isExporting).toBe(false)
        expect(result.current.exportProgress).toBe(0)
        expect(result.current.exportError).toBeNull()
        expect(result.current.exportSteps).toEqual([])
    })

    it('completes successful export flow and remembers directory', async () => {
        vi.mocked(tauriBridge.selectSavePath).mockResolvedValue('C:\\exports\\record-1.json')
        vi.mocked(tauriBridge.exportRecordToFile).mockResolvedValue(undefined)

        const { result } = renderHook(() => useHistoryExport({ delayMs: 0 }))

        await act(async () => {
            await result.current.exportRecord(101, 'test-record')
        })

        expect(tauriBridge.selectSavePath).toHaveBeenCalled()
        expect(tauriBridge.exportRecordToFile).toHaveBeenCalledWith(
            101,
            'C:\\exports\\record-1.json',
        )
        expect(localStorage.getItem('last_export_dir')).toBe('C:\\exports')
        expect(result.current.isExporting).toBe(true)
        expect(result.current.exportProgress).toBe(100)
        expect(result.current.exportError).toBeNull()
    })

    it('handles cancellation during path selection', async () => {
        vi.mocked(tauriBridge.selectSavePath).mockResolvedValue(null)

        const { result } = renderHook(() => useHistoryExport({ delayMs: 0 }))

        await act(async () => {
            await result.current.exportRecord(102, 'test-cancel')
        })

        expect(tauriBridge.exportRecordToFile).not.toHaveBeenCalled()
        expect(result.current.isExporting).toBe(false)
    })

    it('handles export error and flags error step', async () => {
        vi.mocked(tauriBridge.selectSavePath).mockResolvedValue('/tmp/record.json')
        vi.mocked(tauriBridge.exportRecordToFile).mockRejectedValue(new Error('Disk full'))

        const { result } = renderHook(() => useHistoryExport({ delayMs: 0 }))

        await act(async () => {
            await result.current.exportRecord(103, 'test-error')
        })

        expect(result.current.exportError).toContain('Disk full')
        const activeOrErrorStep = result.current.exportSteps.find((s) => s.status === 'error')
        expect(activeOrErrorStep).toBeDefined()
    })

    it('resets export modal state when closed', () => {
        const { result } = renderHook(() => useHistoryExport())

        act(() => {
            result.current.closeExportModal()
        })

        expect(result.current.isExporting).toBe(false)
        expect(result.current.exportProgress).toBe(0)
        expect(result.current.exportError).toBeNull()
    })
})
