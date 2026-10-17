import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { tauriBridge, RecordItem, MetricPoint } from '@/infrastructure/tauri/bridge'

import { useHistoryPlayback } from './useHistoryPlayback'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getRecords: vi.fn(),
        getRecordMetrics: vi.fn(),
        getRecordProcesses: vi.fn(),
        deleteRecord: vi.fn(),
        renameRecord: vi.fn(),
    },
}))

describe('useHistoryPlayback', () => {
    const mockRecords: RecordItem[] = [
        {
            id: 1,
            name: 'test_record',
            start_time: 1000,
            end_time: 2000,
        },
    ]

    const mockMetrics: MetricPoint[] = [
        {
            timestamp: 1000,
            cpu_usage: 10.0,
            cpu_cores: [10],
            mem_used: 100,
            mem_free: 900,
            mem_total: 1000,
            mem_kernel: 20,
            mem_app: 80,
        },
        {
            timestamp: 2000,
            cpu_usage: 20.0,
            cpu_cores: [20],
            mem_used: 200,
            mem_free: 800,
            mem_total: 1000,
            mem_kernel: 30,
            mem_app: 170,
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(tauriBridge.getRecords).mockResolvedValue(mockRecords)
        vi.mocked(tauriBridge.getRecordMetrics).mockResolvedValue(mockMetrics)
        vi.mocked(tauriBridge.getRecordProcesses).mockResolvedValue([])
    })

    it('loads records on mount and allows selecting record', async () => {
        const { result } = renderHook(() => useHistoryPlayback())

        await act(async () => {
            await result.current.loadRecords()
        })

        expect(result.current.records.length).toBe(1)
        expect(result.current.records[0].name).toBe('test_record')

        await act(async () => {
            await result.current.handleSelectRecord(mockRecords[0])
        })

        expect(result.current.selectedRecord?.id).toBe(1)
        expect(result.current.metrics.length).toBe(2)
        expect(result.current.playbackIndex).toBe(0)
    })

    it('handles seek, speed change and playback pause', async () => {
        const { result } = renderHook(() => useHistoryPlayback())

        await act(async () => {
            await result.current.handleSelectRecord(mockRecords[0])
        })

        act(() => {
            result.current.handleSelectIndex(1)
            result.current.setPlaybackSpeed(2)
        })

        expect(result.current.playbackIndex).toBe(1)
        expect(result.current.playbackSpeed).toBe(2)
        expect(result.current.isPlaying).toBe(false)
    })

    it('handles delete and rename records', async () => {
        const { result } = renderHook(() => useHistoryPlayback())

        await act(async () => {
            await result.current.loadRecords()
            await result.current.handleSelectRecord(mockRecords[0])
        })

        await act(async () => {
            await result.current.handleRenameRecord(1, 'renamed_record')
        })

        expect(tauriBridge.renameRecord).toHaveBeenCalledWith(1, 'renamed_record')
        expect(result.current.selectedRecord?.name).toBe('renamed_record')

        await act(async () => {
            await result.current.handleDeleteRecord(1)
        })

        expect(tauriBridge.deleteRecord).toHaveBeenCalledWith(1)
        expect(result.current.records.length).toBe(0)
        expect(result.current.selectedRecord).toBeNull()
    })
})
