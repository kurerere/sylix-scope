import { useState } from 'react'

import {
    TelemetrySessionProvider,
    useTelemetrySession,
    useTelemetryThresholds,
    useTelemetryChart,
} from '@/application/telemetry/TelemetrySessionContext'
import { TooltipProvider } from '@/components/ui/tooltip'
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
    const thresholds = useTelemetryThresholds()
    const chart = useTelemetryChart()

    const handleStart = async () => {
        await session.startMonitoring(undefined, () => {
            setShowConfig(false)
        })
    }

    const handleStop = async () => {
        await session.stopMonitoring()
    }

    return (
        <div className="bg-background text-foreground flex h-dvh w-full overflow-hidden antialiased">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
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

                <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6 lg:px-8">
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
                <RecordingPanel
                    isMonitoring={session.isMonitoring}
                    isRecording={session.isRecording}
                    recordingSeconds={session.recordingSeconds}
                    isPaused={chart.isPaused}
                    setIsPaused={chart.setIsPaused}
                    handleToggleRecording={session.toggleRecording}
                />
            </main>

            <ConnectionConfigModal
                show={showConfig}
                onClose={() => setShowConfig(false)}
                onStart={handleStart}
                onStop={handleStop}
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
