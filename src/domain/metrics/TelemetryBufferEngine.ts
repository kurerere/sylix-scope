import { ProcessInfo } from '../process/types'
import { SystemMetrics, ChartDataPoint } from './types'
import { calculateMemoryPercent, RingBuffer } from './utils'

export interface CpuCoreStat {
    label: string
    key: string
    usage: number
    originalUsage: number
}

export interface ProcessMetricsSummary {
    totalCount: number
    filteredCount: number
    totalThreads: number
    totalRss: number
    topCpuProc: ProcessInfo | null
}

export interface TelemetryAnalytics {
    peakCpu: number
    peakMemPercent: number
    peakMemUsed: number
    avgCpu: number
    avgMemPercent: number
    isSpiking: boolean
    cpuCoresList: CpuCoreStat[]
    processSummary: ProcessMetricsSummary
}

export interface TelemetrySnapshot {
    metrics: SystemMetrics
    processes: ProcessInfo[]
    prevProcessesMap: Map<number, ProcessInfo>
    analytics: TelemetryAnalytics
    isPaused: boolean
    selectedIndex: number | null
}

export interface MonitorPayload {
    metrics: SystemMetrics
    processes: ProcessInfo[]
}

const DEFAULT_METRICS: SystemMetrics = {
    cpu_usage: 0,
    mem_total: 0,
    mem_used: 0,
    mem_free: 0,
    mem_kernel: 0,
    mem_app: 0,
}

export class TelemetryBufferEngine {
    private chartData: ChartDataPoint[] = []
    private latestPayload: MonitorPayload | null = null
    private currentMetrics: SystemMetrics = { ...DEFAULT_METRICS }
    private currentProcesses: ProcessInfo[] = []
    private prevProcessesMap: Map<number, ProcessInfo> = new Map()
    private historyLimit: number = 30
    private isPaused: boolean = false
    private selectedIndex: number | null = null

    private peakCpu: number = 0
    private peakMemPercent: number = 0
    private peakMemUsed: number = 0
    private cpu10sBuffer = new RingBuffer(10)
    private mem10sBuffer = new RingBuffer(10)

    private listeners = new Set<() => void>()
    private tickTimer: ReturnType<typeof setInterval> | null = null
    private isRunning = false
    private snapshotVersion = 0
    private cachedSnapshot: TelemetrySnapshot | null = null

    constructor(historyLimit = 30) {
        this.historyLimit = historyLimit
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    getVersion(): number {
        return this.snapshotVersion
    }

    private notify(): void {
        this.snapshotVersion++
        this.cachedSnapshot = null
        for (const listener of this.listeners) {
            listener()
        }
    }

    beginSession(): void {
        this.clear()
        this.isRunning = true
        this.ensureTimer()
    }

    endSession(): void {
        this.isRunning = false
        this.clearTimer()
    }

    private ensureTimer(): void {
        if (this.tickTimer !== null) return
        this.tickTimer = setInterval(() => {
            if (!this.isRunning || this.isPaused) return
            this.tick()
            this.notify()
        }, 1000)
    }

    private clearTimer(): void {
        if (this.tickTimer !== null) {
            clearInterval(this.tickTimer)
            this.tickTimer = null
        }
    }

    setHistoryLimit(limit: number): void {
        this.historyLimit = limit > 0 ? limit : 30
        if (this.chartData.length > this.historyLimit) {
            this.chartData = this.chartData.slice(this.chartData.length - this.historyLimit)
        }
        this.notify()
    }

    getHistoryLimit = (): number => {
        return this.historyLimit
    }

    setPaused(paused: boolean): void {
        this.isPaused = paused
        if (!paused) {
            this.selectedIndex = null
        }
        this.notify()
    }

    getIsPaused = (): boolean => {
        return this.isPaused
    }

    setSelectedIndex(index: number | null): void {
        if (!this.isPaused) {
            this.selectedIndex = null
            return
        }
        if (index === null || index < 0 || index >= this.chartData.length) {
            this.selectedIndex = null
        } else {
            this.selectedIndex = index
        }
        this.notify()
    }

    getSelectedIndex = (): number | null => {
        return this.selectedIndex
    }

    onPayloadReceived(payload: MonitorPayload): void {
        this.latestPayload = payload
        this.currentMetrics = payload.metrics
        this.prevProcessesMap = new Map(this.currentProcesses.map((p) => [p.pid, p]))
        this.currentProcesses = payload.processes

        if (!this.isPaused) {
            const memPercent = calculateMemoryPercent(
                payload.metrics.mem_used,
                payload.metrics.mem_total,
            )
            this.cpu10sBuffer.push(payload.metrics.cpu_usage)
            this.mem10sBuffer.push(memPercent)

            if (payload.metrics.cpu_usage > this.peakCpu) {
                this.peakCpu = payload.metrics.cpu_usage
            }
            if (memPercent > this.peakMemPercent) {
                this.peakMemPercent = memPercent
            }
            if (payload.metrics.mem_used > this.peakMemUsed) {
                this.peakMemUsed = payload.metrics.mem_used
            }
        }
        this.notify()
    }

    tick(nowDate: Date = new Date()): ChartDataPoint[] {
        if (this.isPaused || !this.latestPayload) {
            return this.chartData
        }

        const payload = this.latestPayload
        const nowSecs = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds()
        const memPercent = calculateMemoryPercent(
            payload.metrics.mem_used,
            payload.metrics.mem_total,
        )

        const next = [...this.chartData]
        const lastPoint = next[next.length - 1]
        let timeStr: string

        if (lastPoint) {
            const lastSecs = this.timeStringToSeconds(lastPoint.time)
            let diff = nowSecs - lastSecs
            if (diff < -43200) {
                diff += 86400
            } else if (diff > 43200) {
                diff -= 86400
            }

            if (Math.abs(diff) <= 2) {
                const nextSecs = (lastSecs + 1) % 86400
                timeStr = this.secondsToTimeString(nextSecs)
            } else {
                timeStr = nowDate.toTimeString().split(' ')[0]
            }
        } else {
            timeStr = nowDate.toTimeString().split(' ')[0]
        }

        const newPoint: ChartDataPoint = {
            time: timeStr,
            cpu: parseFloat(payload.metrics.cpu_usage.toFixed(1)),
            mem: parseFloat(memPercent.toFixed(1)),
            processes: payload.processes,
            metrics: payload.metrics,
        }

        if (lastPoint && lastPoint.time === timeStr) {
            next[next.length - 1] = newPoint
        } else {
            next.push(newPoint)
        }

        if (next.length > this.historyLimit) {
            this.chartData = next.slice(next.length - this.historyLimit)
        } else {
            this.chartData = next
        }

        return this.chartData
    }

    getChartData = (): ChartDataPoint[] => {
        return this.chartData
    }

    getSnapshot = (): TelemetrySnapshot => {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = this.buildSnapshot()
        }
        return this.cachedSnapshot
    }

    private buildSnapshot(): TelemetrySnapshot {
        const isSelectedValid =
            this.isPaused &&
            this.selectedIndex !== null &&
            this.selectedIndex >= 0 &&
            this.selectedIndex < this.chartData.length

        const activePoint = isSelectedValid ? this.chartData[this.selectedIndex!] : null

        const metrics = activePoint?.metrics || this.currentMetrics
        const rawProcesses = activePoint?.processes || this.currentProcesses
        const processes = this.reconcileProcessesWithKernel(metrics, rawProcesses)

        let prevMap = this.prevProcessesMap
        if (isSelectedValid && this.selectedIndex! > 0) {
            const prevPoint = this.chartData[this.selectedIndex! - 1]
            if (prevPoint?.processes) {
                const prevMetrics = prevPoint.metrics || {
                    ...DEFAULT_METRICS,
                    cpu_usage: prevPoint.cpu,
                }
                const prevReconciled = this.reconcileProcessesWithKernel(
                    prevMetrics,
                    prevPoint.processes,
                )
                prevMap = new Map(prevReconciled.map((p) => [p.pid, p]))
            }
        }

        const analytics = this.calculateAnalytics(metrics, processes)

        return {
            metrics,
            processes,
            prevProcessesMap: prevMap,
            analytics,
            isPaused: this.isPaused,
            selectedIndex: this.selectedIndex,
        }
    }

    private calculateAnalytics(
        metrics: SystemMetrics,
        processes: ProcessInfo[],
        filteredProcessesCount?: number,
    ): TelemetryAnalytics {
        const cores = metrics.cpu_cores || []
        const count = cores.length || 1
        const cpuCoresList: CpuCoreStat[] = cores.map((usage, index) => ({
            label: `Core ${index}`,
            key: `cpu-core-item-${index}`,
            usage: usage / count,
            originalUsage: usage,
        }))

        let totalThreads = 0
        let totalRss = 0
        let topCpuProc: ProcessInfo | null = null

        for (const proc of processes) {
            totalThreads += proc.threads?.length || 1
            totalRss += proc.mem
            if (!topCpuProc || proc.cpu > topCpuProc.cpu) {
                topCpuProc = proc
            }
        }

        const isSpiking = (() => {
            if (this.chartData.length < 3) return false
            const recentCpu = this.chartData.slice(-5).map((d) => d.cpu)
            const max = Math.max(...recentCpu)
            const min = Math.min(...recentCpu)
            return max - min > 25
        })()

        return {
            peakCpu: this.peakCpu,
            peakMemPercent: this.peakMemPercent,
            peakMemUsed: this.peakMemUsed,
            avgCpu: this.cpu10sBuffer.getAverage(),
            avgMemPercent: this.mem10sBuffer.getAverage(),
            isSpiking,
            cpuCoresList,
            processSummary: {
                totalCount: processes.length,
                filteredCount:
                    filteredProcessesCount !== undefined
                        ? filteredProcessesCount
                        : processes.length,
                totalThreads,
                totalRss,
                topCpuProc,
            },
        }
    }

    clear(): void {
        this.chartData = []
        this.latestPayload = null
        this.currentMetrics = { ...DEFAULT_METRICS }
        this.currentProcesses = []
        this.prevProcessesMap = new Map()
        this.selectedIndex = null
        this.peakCpu = 0
        this.peakMemPercent = 0
        this.peakMemUsed = 0
        this.cpu10sBuffer.clear()
        this.mem10sBuffer.clear()
        this.notify()
    }

    private reconcileProcessesWithKernel(
        metrics: SystemMetrics,
        processes: ProcessInfo[],
    ): ProcessInfo[] {
        if (processes.length === 0 && metrics.cpu_usage === 0) {
            return processes
        }

        const userProcessesCpu = processes
            .filter((p) => p.pid !== 0)
            .reduce((acc, p) => acc + p.cpu, 0)
        const expectedKernelCpu = Math.max(
            0,
            parseFloat((metrics.cpu_usage - userProcessesCpu).toFixed(1)),
        )

        const kernelProcIndex = processes.findIndex((p) => p.pid === 0)
        const currentKernelProc = kernelProcIndex >= 0 ? processes[kernelProcIndex] : null
        const currentKernelCpu = currentKernelProc ? currentKernelProc.cpu : 0

        const finalKernelCpu = Math.max(currentKernelCpu, expectedKernelCpu)
        const otherCpu = parseFloat((finalKernelCpu - currentKernelCpu).toFixed(1))

        let updatedKernelProc: ProcessInfo
        if (currentKernelProc) {
            const rawThreads = (currentKernelProc.threads || []).filter((t) => t.name !== 'other')
            const threads = [...rawThreads]
            if (otherCpu >= 0.1) {
                threads.push({
                    name: 'other',
                    tid: '-',
                    tid_decimal: 0,
                    cpu: otherCpu,
                })
            }
            threads.sort((a, b) => b.cpu - a.cpu)
            updatedKernelProc = {
                ...currentKernelProc,
                cpu: finalKernelCpu,
                threads,
            }
        } else {
            const threads =
                otherCpu >= 0.1 ? [{ name: 'other', tid: '-', tid_decimal: 0, cpu: otherCpu }] : []
            updatedKernelProc = {
                pid: 0,
                name: 'kernel',
                cpu: finalKernelCpu,
                mem: 0,
                cmdline: 'kernel',
                execfile: 'kernel',
                threads,
            }
        }

        if (kernelProcIndex >= 0) {
            const nextProcesses = [...processes]
            nextProcesses[kernelProcIndex] = updatedKernelProc
            return nextProcesses
        } else if (finalKernelCpu > 0) {
            return [...processes, updatedKernelProc]
        } else {
            return processes
        }
    }

    private timeStringToSeconds(timeStr: string): number {
        const [h, m, s] = timeStr.split(':').map(Number)
        return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
    }

    private secondsToTimeString(totalSeconds: number): string {
        const h = Math.floor(totalSeconds / 3600) % 24
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
}
