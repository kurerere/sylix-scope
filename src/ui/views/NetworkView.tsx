import {
    Activity,
    CheckCircle2,
    Clock,
    Network,
    RefreshCw,
    ShieldAlert,
    Wifi,
    Radio,
} from 'lucide-react'

import { useNetworkDiagnostics, NetworkSubTab } from '@/application/network/useNetworkDiagnostics'
import { useTelemetrySession } from '@/application/telemetry/TelemetrySessionContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { InterfacesTableCard } from '@/ui/views/network/InterfacesTableCard'
import { ProtocolStatsCard } from '@/ui/views/network/ProtocolStatsCard'
import { RawStatsCard } from '@/ui/views/network/RawStatsCard'
import { RoutesTableCard } from '@/ui/views/network/RoutesTableCard'
import { SocketsTableCard } from '@/ui/views/network/SocketsTableCard'

const REFRESH_INTERVAL_OPTIONS = [
    { value: 0, label: '手动', title: '关闭自动刷新' },
    { value: 3, label: '3s', title: '每 3 秒刷新一次' },
    { value: 5, label: '5s', title: '每 5 秒刷新一次' },
    { value: 10, label: '10s', title: '每 10 秒刷新一次' },
    { value: 30, label: '30s', title: '每 30 秒刷新一次' },
] as const

const SUB_TAB_OPTIONS = [
    { value: 'interfaces', label: '网络接口' },
    { value: 'sockets', label: '套接字连接' },
    { value: 'routes', label: '路由表' },
    { value: 'stats', label: '协议统计' },
    { value: 'raw', label: '原始统计' },
] as const

interface OverviewCardProps {
    title: string
    icon: React.ReactNode
    value: number
    unit: string
    valueClass?: string
    onClick: () => void
    ariaLabel: string
    tooltip: string
}

function OverviewCard({
    title,
    icon,
    value,
    unit,
    valueClass,
    onClick,
    ariaLabel,
    tooltip,
}: OverviewCardProps) {
    return (
        <button
            type="button"
            title={tooltip}
            aria-label={ariaLabel}
            onClick={onClick}
            className="border-border bg-card hover:border-primary/40 cursor-pointer rounded-sm border p-4 text-left transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">{title}</span>
                {icon}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span
                    className={`text-2xl font-bold tabular-nums ${valueClass ?? 'text-foreground'}`}>
                    {value}
                </span>
                <span className="text-muted-foreground text-xs">{unit}</span>
            </div>
        </button>
    )
}

export function NetworkView() {
    const { isMonitoring } = useTelemetrySession()
    const {
        activeSubTab,
        setActiveSubTab,
        selectedProtocol,
        setSelectedProtocol,
        socketSearch,
        setSocketSearch,
        socketTypeFilter,
        setSocketTypeFilter,
        refreshIntervalSecs,
        setRefreshIntervalSecs,
        interfaces,
        interfaceRates,
        sockets,
        routes,
        stats,
        loading,
        error,
        lastRefreshedAt,
        fetchCurrentTabData,
        summary,
    } = useNetworkDiagnostics({ isMonitoring })

    if (!isMonitoring) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center select-none">
                <div className="bg-secondary border-border rounded-sm border p-4">
                    <Network className="text-muted-foreground size-10" />
                </div>
                <h2 className="text-foreground mt-4 text-base font-bold">未连接板卡</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                    点击顶部“开始连接”后查看网络数据
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-6">
            <div className="border-border flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
                <SegmentedControl
                    size="default"
                    aria-label="网络数据子视图"
                    value={activeSubTab}
                    onChange={(tab) => setActiveSubTab(tab as NetworkSubTab)}
                    options={SUB_TAB_OPTIONS}
                />

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Clock className="text-muted-foreground size-3.5" />
                        <span className="text-muted-foreground">自动刷新:</span>
                        <SegmentedControl
                            value={refreshIntervalSecs}
                            onChange={setRefreshIntervalSecs}
                            options={REFRESH_INTERVAL_OPTIONS}
                            size="sm"
                            aria-label="选择自动刷新频率"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchCurrentTabData()}
                        disabled={loading}
                        title="刷新当前网络数据"
                        className="h-8 gap-1.5 px-3 text-xs font-semibold">
                        <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>刷新</span>
                    </Button>
                </div>
            </div>

            {error && (
                <Alert
                    variant="destructive"
                    className="border-sig-bad/25 bg-sig-bad/10 text-sig-bad flex items-center gap-2 px-4 py-3 text-xs">
                    <ShieldAlert className="size-4 shrink-0" />
                    <AlertDescription>拉取网络数据失败: {error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <OverviewCard
                    title="网络接口"
                    icon={<Wifi className="text-primary size-4" />}
                    value={summary.totalInterfaces}
                    unit="个网卡"
                    ariaLabel="查看网络接口列表"
                    tooltip="点击查看网络接口列表"
                    onClick={() => setActiveSubTab('interfaces')}
                />
                <OverviewCard
                    title="监听服务 (LISTEN)"
                    icon={<CheckCircle2 className="text-sig-ok size-4" />}
                    value={summary.listenSocketsCount}
                    unit="个端口"
                    valueClass="text-sig-ok"
                    ariaLabel="筛选监听服务端口"
                    tooltip="点击筛选监听服务端口"
                    onClick={() => {
                        setActiveSubTab('sockets')
                        setSelectedProtocol('ALL')
                        setSocketTypeFilter('listen')
                    }}
                />
                <OverviewCard
                    title="活动连接 (ESTAB)"
                    icon={<Activity className="text-chart-cpu size-4" />}
                    value={summary.establishedCount}
                    unit="个会话"
                    valueClass="text-chart-cpu"
                    ariaLabel="筛选活动连接会话"
                    tooltip="点击筛选活动连接会话"
                    onClick={() => {
                        setActiveSubTab('sockets')
                        setSelectedProtocol('ALL')
                        setSocketTypeFilter('connected')
                    }}
                />
                <OverviewCard
                    title="UDP 端点"
                    icon={<Radio className="text-sig-warn size-4" />}
                    value={summary.udpCount}
                    unit="个端点"
                    valueClass="text-sig-warn"
                    ariaLabel="筛选 UDP 端点"
                    tooltip="点击筛选 UDP 端点"
                    onClick={() => {
                        setActiveSubTab('sockets')
                        setSelectedProtocol('UDP')
                        setSocketTypeFilter('all')
                    }}
                />
            </div>

            {activeSubTab === 'interfaces' && (
                <InterfacesTableCard
                    interfaces={interfaces}
                    interfaceRates={interfaceRates}
                    loading={loading}
                    lastRefreshedAt={lastRefreshedAt}
                />
            )}

            {activeSubTab === 'sockets' && (
                <SocketsTableCard
                    sockets={sockets}
                    loading={loading}
                    selectedProtocol={selectedProtocol}
                    setSelectedProtocol={setSelectedProtocol}
                    socketTypeFilter={socketTypeFilter}
                    setSocketTypeFilter={setSocketTypeFilter}
                    socketSearch={socketSearch}
                    setSocketSearch={setSocketSearch}
                />
            )}

            {activeSubTab === 'routes' && <RoutesTableCard routes={routes} loading={loading} />}

            {activeSubTab === 'stats' && <ProtocolStatsCard stats={stats} loading={loading} />}

            {activeSubTab === 'raw' && (
                <RawStatsCard stats={stats} loading={loading} lastRefreshedAt={lastRefreshedAt} />
            )}
        </div>
    )
}
