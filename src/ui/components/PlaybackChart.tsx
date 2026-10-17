import { memo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'

import { MetricPoint } from '@/infrastructure/tauri/bridge'

const MetricTooltip = ({
    active,
    payload,
    metrics,
}: {
    active?: boolean
    payload?: any[]
    metrics: MetricPoint[]
}) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as MetricPoint
        return (
            <div className="border-border bg-popover pointer-events-none rounded-sm border p-2.5 font-mono text-[0.625rem] shadow-xl">
                <div className="text-muted-foreground">时间偏移: +{metrics.indexOf(data)}秒</div>
                <div className="text-chart-cpu mt-1 font-bold">
                    CPU 使用: {data.cpu_usage.toFixed(1)}%
                </div>
                <div className="text-chart-mem mt-0.5">
                    内存使用: {((data.mem_used / data.mem_total) * 100).toFixed(1)}%
                </div>
            </div>
        )
    }
    return null
}

export const PlaybackChart = memo(
    ({
        metrics,
        playbackIndex,
        onSelectIndex,
    }: {
        metrics: MetricPoint[]
        playbackIndex: number
        onSelectIndex: (index: number) => void
    }) => {
        if (metrics.length === 0) {
            return (
                <div className="text-muted-foreground/60 flex h-full items-center justify-center text-xs">
                    暂无采样指标
                </div>
            )
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    className="outline-none select-none focus:outline-none focus-visible:outline-none"
                    data={metrics}
                    onClick={(state: any) => {
                        if (state) {
                            let targetIndex = -1
                            if (typeof state.activeTooltipIndex === 'number') {
                                targetIndex = state.activeTooltipIndex
                            } else if (state.activePayload && state.activePayload.length > 0) {
                                const payload = state.activePayload[0].payload
                                targetIndex = metrics.findIndex(
                                    (m) => m.timestamp === payload.timestamp,
                                )
                            } else if (state.activeLabel !== undefined) {
                                targetIndex = metrics.findIndex(
                                    (m) => m.timestamp === state.activeLabel,
                                )
                            }

                            if (targetIndex >= 0 && targetIndex < metrics.length) {
                                onSelectIndex(targetIndex)
                            }
                        }
                    }}>
                    <defs>
                        <linearGradient id="playbackCpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-cpu)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--chart-cpu)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={(_, idx) => `+${idx}s`}
                        stroke="var(--muted-foreground)"
                        fontSize={9}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="var(--muted-foreground)"
                        domain={[0, 100]}
                        fontSize={9}
                        tickLine={false}
                    />
                    <Tooltip content={<MetricTooltip metrics={metrics} />} />
                    <Area
                        isAnimationActive={false}
                        type="linear"
                        dataKey="cpu_usage"
                        stroke="var(--chart-cpu)"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#playbackCpuGrad)"
                    />
                    {metrics[playbackIndex] && (
                        <ReferenceLine
                            x={metrics[playbackIndex].timestamp}
                            stroke="var(--sig-warn)"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        )
    },
)

PlaybackChart.displayName = 'PlaybackChart'
