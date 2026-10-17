import { useState, useEffect, useRef, useCallback } from 'react'

import { useProcessTable } from '@/application/telemetry/useProcessTable'
import { PlaybackTimelineEngine } from '@/domain/history/PlaybackTimelineEngine'
import { ProcessInfo } from '@/domain/process/types'
import { tauriBridge, RecordItem, MetricPoint } from '@/infrastructure/tauri/bridge'

export function useHistoryPlayback() {
    const [records, setRecords] = useState<RecordItem[]>([])
    const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null)
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const [engine] = useState(() => new PlaybackTimelineEngine())
    const [metrics, setMetrics] = useState<MetricPoint[]>([])
    const [isPlaying, setIsPlayingState] = useState(false)
    const [playbackIndex, setPlaybackIndexState] = useState(0)
    const [playbackSpeed, setPlaybackSpeedState] = useState(1)

    const [rawProcesses, setRawProcesses] = useState<ProcessInfo[]>([])

    const processTable = useProcessTable(rawProcesses)

    const playTimerRef = useRef<any>(null)

    const syncPlaybackState = useCallback(() => {
        setIsPlayingState(engine.getIsPlaying())
        setPlaybackIndexState(engine.getIndex())
        setPlaybackSpeedState(engine.getSpeed())
    }, [engine])

    const loadRecords = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true)
        try {
            const data = await tauriBridge.getRecords()
            setRecords(data)
        } catch (e) {
            console.error('加载历史记录失败:', e)
        } finally {
            if (!silent) {
                setTimeout(() => {
                    setIsRefreshing(false)
                }, 500)
            }
        }
    }, [])

    useEffect(() => {
        let isMounted = true
        const load = async () => {
            try {
                const data = await tauriBridge.getRecords()
                if (isMounted) setRecords(data)
            } catch (e) {
                console.error('加载历史记录失败:', e)
            }
        }
        load()
        return () => {
            isMounted = false
        }
    }, [])

    const handleSelectRecord = useCallback(
        async (rec: RecordItem) => {
            setSelectedRecord(rec)
            engine.reset()
            syncPlaybackState()
            setRawProcesses([])
            processTable.setSelectedProcess(null)

            try {
                const data = await tauriBridge.getRecordMetrics(rec.id)
                engine.loadMetrics(data)
                setMetrics([...data])
                syncPlaybackState()
            } catch (e) {
                console.error('加载指标数据失败:', e)
            }
        },
        [engine, syncPlaybackState, processTable],
    )

    const loadProcessesForPoint = useCallback(async (recordId: number, timestamp: number) => {
        try {
            const data = await tauriBridge.getRecordProcesses(recordId, timestamp)
            setRawProcesses(data)
        } catch (e) {
            console.error('加载进程快照失败:', e)
        }
    }, [])

    useEffect(() => {
        if (!selectedRecord || metrics.length === 0 || playbackIndex >= metrics.length) {
            return
        }
        let isMounted = true
        const load = async () => {
            try {
                const data = await tauriBridge.getRecordProcesses(
                    selectedRecord.id,
                    metrics[playbackIndex].timestamp,
                )
                if (isMounted) setRawProcesses(data)
            } catch (e) {
                console.error('加载进程快照失败:', e)
            }
        }
        load()
        return () => {
            isMounted = false
        }
    }, [selectedRecord, metrics, playbackIndex])

    const setIsPlaying = useCallback(
        (playing: boolean) => {
            engine.setIsPlaying(playing)
            syncPlaybackState()
        },
        [engine, syncPlaybackState],
    )

    const setPlaybackIndex = useCallback(
        (index: number) => {
            engine.seek(index)
            syncPlaybackState()
        },
        [engine, syncPlaybackState],
    )

    const setPlaybackSpeed = useCallback(
        (speed: number) => {
            engine.setSpeed(speed)
            syncPlaybackState()
        },
        [engine, syncPlaybackState],
    )

    useEffect(() => {
        if (isPlaying) {
            playTimerRef.current = setInterval(() => {
                engine.tick()
                syncPlaybackState()
            }, engine.getIntervalMs())
        } else {
            if (playTimerRef.current) clearInterval(playTimerRef.current)
        }
        return () => {
            if (playTimerRef.current) clearInterval(playTimerRef.current)
        }
    }, [isPlaying, playbackSpeed, engine, syncPlaybackState])

    const handleDeleteRecord = useCallback(
        async (id: number) => {
            try {
                await tauriBridge.deleteRecord(id)
                setRecords((prev) => prev.filter((r) => r.id !== id))
                if (selectedRecord?.id === id) {
                    setSelectedRecord(null)
                    engine.reset()
                    setMetrics([])
                    setRawProcesses([])
                    syncPlaybackState()
                }
            } catch (e) {
                console.error('删除记录失败:', e)
            }
        },
        [selectedRecord, engine, syncPlaybackState],
    )

    const handleRenameRecord = useCallback(async (id: number, newName: string) => {
        try {
            await tauriBridge.renameRecord(id, newName)
            setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, name: newName } : r)))
            setSelectedRecord((prev) =>
                prev && prev.id === id ? { ...prev, name: newName } : prev,
            )
            setEditingRecordId(null)
        } catch (e) {
            console.error('重命名记录失败:', e)
            throw e
        }
    }, [])

    const handleSelectIndex = useCallback(
        (index: number) => {
            engine.pause()
            engine.seek(index)
            syncPlaybackState()
        },
        [engine, syncPlaybackState],
    )

    return {
        records,
        selectedRecord,
        metrics,
        editingRecordId,
        setEditingRecordId,
        isPlaying,
        setIsPlaying,
        playbackIndex,
        setPlaybackIndex,
        playbackSpeed,
        setPlaybackSpeed,
        processes: rawProcesses,
        procSearch: processTable.searchTerm,
        setProcSearch: processTable.setSearchTerm,
        procSortField: processTable.sortField,
        setProcSortField: (field: 'cpu' | 'mem') => {
            processTable.handleSort(field)
        },
        isRefreshing,
        loadRecords,
        handleSelectRecord,
        loadProcessesForPoint,
        handleDeleteRecord,
        handleRenameRecord,
        handleSelectIndex,
        filteredProcesses: processTable.filteredProcesses,
        selectedProcess: processTable.selectedProcess,
        setSelectedProcess: processTable.setSelectedProcess,
    }
}
