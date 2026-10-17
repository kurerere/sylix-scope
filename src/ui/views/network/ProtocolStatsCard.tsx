import { RefreshCw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NetStatistics } from '@/domain/network/types'

export interface ProtocolStatsCardProps {
    stats: NetStatistics | null
    loading: boolean
}

interface StatSectionProps {
    title: string
    data: Record<string, number> | undefined
    loading: boolean
    emptyText: string
}

function StatSection({ title, data, loading, emptyText }: StatSectionProps) {
    const hasData = data && Object.keys(data).length > 0

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
                {loading && !hasData ? (
                    ['skel-stat-1', 'skel-stat-2', 'skel-stat-3'].map((key) => (
                        <div key={key} className="flex justify-between py-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))
                ) : hasData ? (
                    Object.entries(data).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground font-mono font-bold">{v}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-muted-foreground py-4 text-xs">{emptyText}</div>
                )}
            </CardContent>
        </Card>
    )
}

export function ProtocolStatsCard({ stats, loading }: ProtocolStatsCardProps) {
    return (
        <div className="relative">
            {loading && stats && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-sm">
                    <div className="border-border bg-popover flex items-center gap-2 rounded-sm border px-3.5 py-1.5">
                        <RefreshCw className="text-foreground size-3.5 animate-spin" />
                        <span className="text-foreground text-xs font-medium">
                            正在刷新协议统计...
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <StatSection
                    title="IP 协议统计"
                    data={stats?.ip}
                    loading={loading}
                    emptyText="暂无 IP 统计"
                />
                <StatSection
                    title="TCP 协议统计"
                    data={stats?.tcp}
                    loading={loading}
                    emptyText="暂无 TCP 统计"
                />
                <StatSection
                    title="UDP 协议统计"
                    data={stats?.udp}
                    loading={loading}
                    emptyText="暂无 UDP 统计"
                />
                <StatSection
                    title="ICMP 协议统计"
                    data={stats?.icmp}
                    loading={loading}
                    emptyText="暂无 ICMP 统计"
                />
            </div>
        </div>
    )
}
