import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useSyncExternalStore,
    ReactNode,
} from 'react'

import {
    TelemetryBufferEngine,
    TelemetrySnapshot,
    MonitorPayload,
} from '@/domain/metrics/TelemetryBufferEngine'
import { storage, ConnectionConfig } from '@/infrastructure/storage/localStorage'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

export interface TelemetrySessionState {
    isMonitoring: boolean
    isConnecting: boolean
    statusMessage: string
    statusType: 'info' | 'success' | 'error'
    config: ConnectionConfig
    ip: string
    port: number
    username: string
    password: string
    historyList: ConnectionConfig[]
    deleteHistoryItem: (item: ConnectionConfig) => void
    isRecording: boolean
    recordingSeconds: number
    isRebooting: boolean
    rebootTarget: (syncBefore?: boolean) => Promise<void>
    startMonitoring: (cfg?: ConnectionConfig, onSuccess?: () => void) => Promise<void>
    stopMonitoring: (onSuccess?: () => Promise<void> | void) => Promise<void>
    updateConfig: (patch: Partial<ConnectionConfig>) => void
    toggleRecording: () => Promise<void>
}

export interface TelemetryChartState {
    chartData: ReturnType<TelemetryBufferEngine['getChartData']>
    selectedIndex: number | null
    setSelectedIndex: (index: number | null) => void
    isPaused: boolean
    setIsPaused: (val: boolean) => void
    historySeconds: number
    setHistorySeconds: (sec: number) => void
    clearChartData: () => void
}

export interface TelemetryThresholdsState {
    warningCpu: number
    setWarningCpu: (val: number) => void
    warningMem: number
    setWarningMem: (val: number) => void
}

const SessionContext = createContext<TelemetrySessionState | null>(null)
const SnapshotContext = createContext<TelemetrySnapshot | null>(null)
const ChartContext = createContext<TelemetryChartState | null>(null)
const ThresholdsContext = createContext<TelemetryThresholdsState | null>(null)

export interface TelemetrySessionProviderProps {
    children: ReactNode
    initialHistorySeconds?: number
}

export function TelemetrySessionProvider({
    children,
    initialHistorySeconds = 30,
}: TelemetrySessionProviderProps) {
    const [config, setConfig] = useState<ConnectionConfig>(() => storage.getConnectionConfig())
    const [historyList, setHistoryList] = useState<ConnectionConfig[]>(() =>
        storage.getConnectionHistory(),
    )
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isRebooting, setIsRebooting] = useState(false)
    const isRebootingRef = useRef(false)
    const [statusMessage, setStatusMessage] = useState('')
    const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info')

    const [isRecording, setIsRecording] = useState(false)
    const [recordingSeconds, setRecordingSeconds] = useState(0)

    const [warningCpu, setWarningCpuState] = useState(() => storage.getWarningThresholds().cpu)
    const [warningMem, setWarningMemState] = useState(() => storage.getWarningThresholds().mem)
    const [engine] = useState(() => new TelemetryBufferEngine(initialHistorySeconds))

    const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
    const chartData = useSyncExternalStore(engine.subscribe, engine.getChartData)
    const isPaused = useSyncExternalStore(engine.subscribe, engine.getIsPaused)
    const selectedIndex = useSyncExternalStore(engine.subscribe, engine.getSelectedIndex)
    const historySeconds = useSyncExternalStore(engine.subscribe, engine.getHistoryLimit)

    const updateConfig = useCallback((patch: Partial<ConnectionConfig>) => {
        setConfig((prev) => {
            const next = { ...prev, ...patch }
            storage.saveConnectionConfig(next)
            return next
        })
    }, [])

    const deleteHistoryItem = useCallback((item: ConnectionConfig) => {
        storage.removeConnectionFromHistory(item)
        setHistoryList(storage.getConnectionHistory())
    }, [])

    const setHistorySeconds = useCallback(
        (sec: number) => {
            engine.setHistoryLimit(sec)
        },
        [engine],
    )

    const setWarningCpu = useCallback((val: number) => {
        setWarningCpuState(val)
        storage.saveWarningCpu(val)
    }, [])

    const setWarningMem = useCallback((val: number) => {
        setWarningMemState(val)
        storage.saveWarningMem(val)
    }, [])

    const setIsPaused = useCallback(
        (val: boolean) => {
            engine.setPaused(val)
        },
        [engine],
    )

    const setSelectedIndex = useCallback(
        (index: number | null) => {
            engine.setSelectedIndex(index)
        },
        [engine],
    )

    const clearChartData = useCallback(() => {
        engine.clear()
    }, [engine])

    useEffect(() => {
        if (!isRecording) return
        const timer = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [isRecording])

    const startMonitoring = useCallback(
        async (cfg?: ConnectionConfig, onSuccess?: () => void) => {
            const targetConfig = cfg || config
            setIsConnecting(true)
            setStatusMessage('正在连接目标板...')
            setStatusType('info')
            engine.clear()

            try {
                await tauriBridge.startMonitoring(targetConfig)
                engine.beginSession()
                setIsMonitoring(true)
                storage.saveConnectionConfig(targetConfig)
                storage.addConnectionToHistory(targetConfig)
                setHistoryList(storage.getConnectionHistory())
                onSuccess?.()
            } catch (err: any) {
                setStatusMessage(err?.toString() || '连接失败')
                setStatusType('error')
                setIsMonitoring(false)
            } finally {
                setIsConnecting(false)
            }
        },
        [config, engine],
    )

    const stopMonitoring = useCallback(
        async (onSuccess?: () => Promise<void> | void) => {
            try {
                await tauriBridge.stopMonitoring()
                engine.endSession()
                setIsMonitoring(false)
                setStatusMessage('监控已停止')
                setStatusType('info')
                if (isRecording) {
                    await tauriBridge.stopRecording()
                    setIsRecording(false)
                }
                await onSuccess?.()
            } catch (err: any) {
                setStatusMessage(err?.toString() || '停止监控失败')
                setStatusType('error')
            }
        },
        [engine, isRecording],
    )

    const toggleRecording = useCallback(async () => {
        if (!isMonitoring) return

        try {
            if (isRecording) {
                await tauriBridge.stopRecording()
                setIsRecording(false)
            } else {
                setRecordingSeconds(0)
                const now = new Date()
                const nameStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}-record`
                await tauriBridge.startRecording(nameStr)
                setIsRecording(true)
            }
        } catch (e) {
            console.error('录制切换失败:', e)
        }
    }, [isMonitoring, isRecording])

    useEffect(() => {
        const unlistenData = tauriBridge.onMonitorData((payload: MonitorPayload) => {
            engine.onPayloadReceived(payload)
        })

        const unlistenStatus = tauriBridge.onMonitorStatus((status: string) => {
            setStatusMessage(status)
            setStatusType('success')
        })

        const unlistenError = tauriBridge.onMonitorError((err: string) => {
            if (isRebootingRef.current) {
                return
            }
            setStatusMessage(err)
            setStatusType('error')
            engine.endSession()
            setIsMonitoring(false)
            setIsRecording(false)
        })

        return () => {
            unlistenData()
            unlistenStatus()
            unlistenError()
        }
    }, [engine])

    const rebootTarget = useCallback(
        async (syncBefore: boolean = true) => {
            isRebootingRef.current = true
            setIsRebooting(true)
            engine.endSession()
            setIsMonitoring(false)
            setIsRecording(false)
            setStatusMessage('正在向目标板发送重启指令...')
            setStatusType('info')

            try {
                if (isRecording) {
                    await tauriBridge.stopRecording()
                }
                await tauriBridge.rebootTarget(config, syncBefore)
                setStatusMessage('已成功发送重启指令，目标板正在重启...')
                setStatusType('info')
            } catch (err: any) {
                setStatusMessage(err?.toString() || '重启指令发送失败')
                setStatusType('error')
            } finally {
                setIsRebooting(false)
                setTimeout(() => {
                    isRebootingRef.current = false
                }, 4000)
            }
        },
        [config, engine, isRecording],
    )

    const sessionState = useMemo<TelemetrySessionState>(
        () => ({
            isMonitoring,
            isConnecting,
            isRebooting,
            statusMessage,
            statusType,
            config,
            ip: config.ip,
            port: config.port,
            username: config.username,
            password: config.password,
            historyList,
            deleteHistoryItem,
            isRecording,
            recordingSeconds,
            startMonitoring,
            stopMonitoring,
            rebootTarget,
            updateConfig,
            toggleRecording,
        }),
        [
            isMonitoring,
            isConnecting,
            isRebooting,
            statusMessage,
            statusType,
            config,
            historyList,
            deleteHistoryItem,
            isRecording,
            recordingSeconds,
            startMonitoring,
            stopMonitoring,
            rebootTarget,
            updateConfig,
            toggleRecording,
        ],
    )

    const chartState = useMemo<TelemetryChartState>(
        () => ({
            chartData,
            selectedIndex,
            setSelectedIndex,
            isPaused,
            setIsPaused,
            historySeconds,
            setHistorySeconds,
            clearChartData,
        }),
        [
            chartData,
            selectedIndex,
            setSelectedIndex,
            isPaused,
            setIsPaused,
            historySeconds,
            setHistorySeconds,
            clearChartData,
        ],
    )

    const thresholdsState = useMemo<TelemetryThresholdsState>(
        () => ({
            warningCpu,
            setWarningCpu,
            warningMem,
            setWarningMem,
        }),
        [warningCpu, setWarningCpu, warningMem, setWarningMem],
    )

    return (
        <SessionContext.Provider value={sessionState}>
            <SnapshotContext.Provider value={snapshot}>
                <ChartContext.Provider value={chartState}>
                    <ThresholdsContext.Provider value={thresholdsState}>
                        {children}
                    </ThresholdsContext.Provider>
                </ChartContext.Provider>
            </SnapshotContext.Provider>
        </SessionContext.Provider>
    )
}

export function useTelemetrySession(): TelemetrySessionState {
    const ctx = useContext(SessionContext)
    if (!ctx) {
        throw new Error('useTelemetrySession must be used within a TelemetrySessionProvider')
    }
    return ctx
}

export function useTelemetrySnapshot(): TelemetrySnapshot {
    const ctx = useContext(SnapshotContext)
    if (!ctx) {
        throw new Error('useTelemetrySnapshot must be used within a TelemetrySessionProvider')
    }
    return ctx
}

export function useTelemetryChart(): TelemetryChartState {
    const ctx = useContext(ChartContext)
    if (!ctx) {
        throw new Error('useTelemetryChart must be used within a TelemetrySessionProvider')
    }
    return ctx
}

export function useTelemetryThresholds(): TelemetryThresholdsState {
    const ctx = useContext(ThresholdsContext)
    if (!ctx) {
        throw new Error('useTelemetryThresholds must be used within a TelemetrySessionProvider')
    }
    return ctx
}
