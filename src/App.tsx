import { useState } from 'react'

import {
    TelemetrySessionProvider,
    useTelemetrySession,
    useTelemetrySnapshot,
    useTelemetryThresholds,
    useTelemetryChart,
} from '@/application/telemetry/TelemetrySessionContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { calculateMemoryPercent } from '@/domain/metrics/utils'
import { ConnectionConfigModal } from '@/ui/components/ConnectionConfigModal'
import { RecordingPanel } from '@/ui/components/RecordingPanel'
import { Header } from '@/ui/layout/Header'
import { Sidebar } from '@/ui/layout/Sidebar'
import { HistoryView } from '@/ui/views/HistoryView'
import { MonitorView } from '@/ui/views/MonitorView'
import { NetworkView } from '@/ui/views/NetworkView'
import { SettingsView } from '@/ui/views/SettingsView'

function AppLayout() {
    const [activeTab, setActiveTab] = useState<'monitor' | 'network' | 'settings' | 'history'>(
        'monitor',
    )
    const [showConfig, setShowConfig] = useState(false)

    const session = useTelemetrySession()
    const { metrics } = useTelemetrySnapshot()
    const thresholds = useTelemetryThresholds()
    const chart = useTelemetryChart()

    const memPercent = calculateMemoryPercent(metrics.mem_used, metrics.mem_total)
    const cpuWarning = metrics.cpu_usage >= thresholds.warningCpu
    const memWarning = memPercent >= thresholds.warningMem

    const handleStart = async () => {
        await session.startMonitoring(undefined, () => {
            setShowConfig(false)
        })
    }

    const handleStop = async () => {
        await session.stopMonitoring()
    }

    return (
        <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden antialiased">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMonitoring={session.isMonitoring}
                cpuWarning={cpuWarning}
                memWarning={memWarning}
            />

            <main className="z-10 flex h-full flex-1 flex-col overflow-hidden">
                <Header
                    activeTab={activeTab}
                    isMonitoring={session.isMonitoring}
                    isConnecting={session.isConnecting}
                    ip={session.ip}
                    port={session.port}
                    setShowConfig={setShowConfig}
                    handleStart={handleStart}
                    handleStop={handleStop}
                    statusMessage={session.statusMessage}
                    statusType={session.statusType}
                />

                <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-24">
                    {activeTab === 'monitor' ? (
                        <MonitorView />
                    ) : activeTab === 'network' ? (
                        <NetworkView />
                    ) : activeTab === 'settings' ? (
                        <SettingsView
                            warningCpu={thresholds.warningCpu}
                            setWarningCpu={thresholds.setWarningCpu}
                            warningMem={thresholds.warningMem}
                            setWarningMem={thresholds.setWarningMem}
                        />
                    ) : (
                        <HistoryView />
                    )}
                </div>
            </main>

            <ConnectionConfigModal
                show={showConfig}
                onClose={() => setShowConfig(false)}
                onStart={handleStart}
                onStop={handleStop}
            />

            <RecordingPanel
                isMonitoring={session.isMonitoring}
                isRecording={session.isRecording}
                recordingSeconds={session.recordingSeconds}
                isPaused={chart.isPaused}
                setIsPaused={chart.setIsPaused}
                handleToggleRecording={session.toggleRecording}
            />
        </div>
    )
}

export function App() {
    return (
        <TooltipProvider delay={150}>
            <TelemetrySessionProvider>
                <AppLayout />
            </TelemetrySessionProvider>
        </TooltipProvider>
    )
}

export default App
