import {
    useTelemetrySession,
    useTelemetrySnapshot,
    useTelemetryChart,
    useTelemetryThresholds,
} from '@/application/telemetry/TelemetrySessionContext'
import { useProcessTable } from '@/application/telemetry/useProcessTable'
import { calculateMemoryPercent } from '@/domain/metrics/utils'
import { BoardMetricsCard } from '@/ui/views/monitor/BoardMetricsCard'
import { CpuMetricCard } from '@/ui/views/monitor/CpuMetricCard'
import { MemDistributionCard } from '@/ui/views/monitor/MemDistributionCard'
import { ProcessTableCard } from '@/ui/views/monitor/ProcessTableCard'
import { TelemetryChartCard } from '@/ui/views/monitor/TelemetryChartCard'

export function MonitorView() {
    const { isMonitoring, isConnecting, isRebooting, rebootTarget, config } = useTelemetrySession()
    const { metrics, processes, prevProcessesMap, analytics } = useTelemetrySnapshot()
    const {
        chartData,
        selectedIndex,
        setSelectedIndex,
        isPaused,
        setIsPaused,
        historySeconds,
        setHistorySeconds,
    } = useTelemetryChart()
    const { warningCpu, warningMem } = useTelemetryThresholds()

    const {
        searchTerm,
        setSearchTerm,
        sortField,
        sortAsc,
        selectedProcess,
        setSelectedProcess,
        handleSort,
        filteredProcesses,
    } = useProcessTable(processes)

    const displayedMemPercent = calculateMemoryPercent(metrics.mem_used, metrics.mem_total)
    const memWarning = displayedMemPercent >= warningMem

    const selectedPoint =
        isPaused && selectedIndex !== null && selectedIndex >= 0 && selectedIndex < chartData.length
            ? chartData[selectedIndex]
            : null

    const effectiveProcessSummary = {
        ...analytics.processSummary,
        filteredCount: filteredProcesses.length,
    }

    return (
        <div className="space-y-5">
            <div className="overflow-hidden rounded-sm border">
                <BoardMetricsCard
                    isMonitoring={isMonitoring}
                    isConnecting={isConnecting}
                    isRebooting={isRebooting}
                    ip={config.ip}
                    port={config.port}
                    processCount={processes.length}
                    isPaused={isPaused}
                    setIsPaused={setIsPaused}
                    onReboot={rebootTarget}
                />
                <TelemetryChartCard
                    chartData={chartData}
                    historySeconds={historySeconds}
                    setHistorySeconds={setHistorySeconds}
                    isPaused={isPaused}
                    selectedPoint={selectedPoint}
                    setSelectedIndex={setSelectedIndex}
                    warningCpu={warningCpu}
                    warningMem={warningMem}
                />
            </div>

            <ProcessTableCard
                isMonitoring={isMonitoring}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortField={sortField}
                sortAsc={sortAsc}
                handleSort={handleSort}
                filteredProcesses={filteredProcesses}
                displayedProcesses={processes}
                displayedPrevProcessesMap={prevProcessesMap}
                selectedProcess={selectedProcess}
                setSelectedProcess={setSelectedProcess}
                processSummary={effectiveProcessSummary}
            />

            <div className="@container grid gap-5">
                <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <CpuMetricCard
                        cpuUsage={metrics.cpu_usage}
                        warningCpu={warningCpu}
                        isSpiking={analytics.isSpiking}
                        peakCpu={analytics.peakCpu}
                        avgCpu={analytics.avgCpu}
                        cpuCoresList={analytics.cpuCoresList}
                    />
                    <MemDistributionCard
                        metrics={metrics}
                        memWarning={memWarning}
                        peakMemPercent={analytics.peakMemPercent}
                        avgMemPercent={analytics.avgMemPercent}
                        peakMemUsed={analytics.peakMemUsed}
                    />
                </div>
            </div>
        </div>
    )
}
