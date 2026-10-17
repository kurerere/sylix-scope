import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { RecordItem } from '@/infrastructure/tauri/bridge'

import { HistoryView } from './HistoryView'

vi.mock('@/application/history/useHistoryExport', () => ({
    useHistoryExport: vi.fn(),
}))
vi.mock('@/application/history/useHistoryPlayback', () => ({
    useHistoryPlayback: vi.fn(),
}))

import { useHistoryExport } from '@/application/history/useHistoryExport'
import { useHistoryPlayback } from '@/application/history/useHistoryPlayback'

const record: RecordItem = {
    id: 1,
    name: 'session-a',
    start_time: 1_700_000_000,
    end_time: 1_700_000_060,
}

const metrics = Array.from({ length: 5 }, (_, i) => ({
    timestamp: 1_700_000_000 + i,
    cpu_usage: 10 + i,
    mem_total: 1024,
    mem_used: 512,
    mem_free: 512,
    mem_kernel: 64,
    mem_app: 448,
}))

function mockPlayback(overrides: Record<string, unknown> = {}) {
    vi.mocked(useHistoryExport).mockReturnValue({
        isExporting: false,
        exportProgress: 0,
        exportStepText: '',
        exportSteps: [],
        exportError: null,
        exportRecord: vi.fn(),
        closeExportModal: vi.fn(),
    })
    vi.mocked(useHistoryPlayback).mockReturnValue({
        records: [record],
        selectedRecord: null,
        metrics: [],
        editingRecordId: null,
        setEditingRecordId: vi.fn(),
        isPlaying: false,
        setIsPlaying: vi.fn(),
        playbackIndex: 0,
        setPlaybackIndex: vi.fn(),
        playbackSpeed: 1,
        setPlaybackSpeed: vi.fn(),
        procSearch: '',
        setProcSearch: vi.fn(),
        procSortField: 'cpu' as const,
        setProcSortField: vi.fn(),
        isRefreshing: false,
        loadRecords: vi.fn(),
        handleSelectRecord: vi.fn(),
        handleDeleteRecord: vi.fn(),
        handleRenameRecord: vi.fn(),
        handleSelectIndex: vi.fn(),
        filteredProcesses: [],
        selectedProcess: null,
        setSelectedProcess: vi.fn(),
        ...overrides,
    } as never)
}

describe('HistoryView Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPlayback()
    })

    it('renders record list and empty playback hint', () => {
        render(<HistoryView />)

        expect(screen.getByText('录制历史')).toBeInTheDocument()
        expect(screen.getByText('session-a')).toBeInTheDocument()
        expect(
            screen.getAllByText((_, el) =>
                (el?.textContent ?? '').includes('请在左侧列表中选择一次性能录制'),
            )[0],
        ).toBeInTheDocument()
    })

    it('shows empty list hint when no records', () => {
        mockPlayback({ records: [] })
        render(<HistoryView />)
        expect(screen.getByText('暂无录制历史')).toBeInTheDocument()
    })

    it('selecting a record reveals playback controls', () => {
        mockPlayback({ selectedRecord: record, metrics })
        render(<HistoryView />)

        expect(screen.getByText(/数据范围/)).toBeInTheDocument()
        expect(screen.getByText('播放')).toBeInTheDocument()
        expect(screen.getByText('导出数据')).toBeInTheDocument()
    })

    it('renders speed options and process snapshot panel', () => {
        mockPlayback({
            selectedRecord: record,
            metrics,
            filteredProcesses: [
                {
                    pid: 41,
                    name: 'app_main',
                    cpu: 12.0,
                    mem: 2048,
                    cmdline: './app',
                    execfile: '/bin/app',
                    threads: [],
                },
            ],
        })
        render(<HistoryView />)

        expect(screen.getByText(/进程快照/)).toBeInTheDocument()
        expect(screen.getByText('app_main')).toBeInTheDocument()
        expect(screen.getByText('倍速:')).toBeInTheDocument()
    })

    it('reveals hover actions and confirm delete flow on a record', async () => {
        const handleDeleteRecord = vi.fn()
        mockPlayback({ handleDeleteRecord })
        render(<HistoryView />)

        const exportBtn = screen.getByTitle('导出快照')
        expect(exportBtn).toBeInTheDocument()

        fireEvent.click(screen.getByTitle('删除'))
        const confirmBtn = screen.getByText('确定')
        fireEvent.click(confirmBtn)
        expect(handleDeleteRecord).toHaveBeenCalledWith(1)
    })

    it('enters inline editing from the sidebar pencil', () => {
        const setEditingRecordId = vi.fn()
        mockPlayback({ setEditingRecordId })
        render(<HistoryView />)

        fireEvent.click(screen.getByTitle('重命名'))
        expect(setEditingRecordId).toHaveBeenCalledWith('sidebar-1')
    })

    it('selecting a record shows process rows and playback progress', () => {
        mockPlayback({
            selectedRecord: record,
            metrics,
            filteredProcesses: [
                {
                    pid: 41,
                    name: 'app_main',
                    cpu: 12.0,
                    mem: 2048,
                    cmdline: './app',
                    execfile: '/bin/app',
                    threads: [],
                },
            ],
            isPlaying: true,
            playbackIndex: 2,
        })
        render(<HistoryView />)

        expect(screen.getByText('暂停')).toBeInTheDocument()
        expect(screen.getByText('app_main')).toBeInTheDocument()
        expect(screen.getByText('12.0%')).toBeInTheDocument()
    })

    it('shows recording panel controls while recording', () => {
        mockPlayback({
            selectedRecord: record,
            metrics,
            isRecording: true,
            recordingSeconds: 42,
            isPlaying: true,
            playbackIndex: 1,
            filteredProcesses: [
                {
                    pid: 9,
                    name: 'bg_worker',
                    cpu: 3.0,
                    mem: 128,
                    cmdline: './bg',
                    execfile: '/bin/bg',
                    threads: [],
                },
            ],
        })
        render(<HistoryView />)

        expect(screen.getByText('暂停')).toBeInTheDocument()
        expect(screen.getByText('bg_worker')).toBeInTheDocument()
    })

    it('toggles play/pause state', () => {
        const setIsPlaying = vi.fn()
        mockPlayback({ selectedRecord: record, metrics, setIsPlaying })
        render(<HistoryView />)

        fireEvent.click(screen.getByText('播放'))
        expect(setIsPlaying).toHaveBeenCalledWith(true)
    })

    it('changes playback speed', () => {
        const setPlaybackSpeed = vi.fn()
        mockPlayback({
            selectedRecord: record,
            metrics,
            setPlaybackSpeed,
        })
        render(<HistoryView />)

        fireEvent.click(screen.getByTitle('切换至 5x 回放倍速'))
        expect(setPlaybackSpeed).toHaveBeenCalledWith(5)
    })

    it('sorts process snapshot by memory', () => {
        const setProcSortField = vi.fn()
        mockPlayback({
            selectedRecord: record,
            metrics,
            setProcSortField,
        })
        render(<HistoryView />)

        fireEvent.click(screen.getByTitle('按内存占用排序'))
        expect(setProcSortField).toHaveBeenCalledWith('mem')
    })

    it('seeks playback via the range slider', () => {
        const setPlaybackIndex = vi.fn()
        mockPlayback({ selectedRecord: record, metrics, setPlaybackIndex })
        render(<HistoryView />)

        const slider = screen.getByRole('slider', { name: '回放进度' })
        fireEvent.change(slider, { target: { value: '3' } })
        expect(setPlaybackIndex).toHaveBeenCalledWith(3)
    })
})
