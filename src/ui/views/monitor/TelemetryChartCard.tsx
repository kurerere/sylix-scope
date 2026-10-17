import { TrendingUp, Clock } from 'lucide-react'
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

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ActionTooltip } from '@/components/ui/tooltip'
import { ChartDataPoint } from '@/domain/metrics/types'
import { getThemeColors } from '@/domain/metrics/utils'

interface TelemetryChartCardProps {
    chartData: ChartDataPoint[]
    historySeconds: number
    setHistorySeconds: (sec: number) => void
    isPaused: boolean
    selectedPoint: ChartDataPoint | null
    setSelectedIndex: (index: number | null) => void
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="border-border bg-popover rounded-sm border p-4 text-xs shadow-2xl">
                <p className="text-muted-foreground mb-2 font-mono font-bold">{label}</p>
                {payload.map((item: any) => (
                    <div
                        key={item.dataKey || item.name}
                        className="flex items-center gap-2.5 py-0.5">
                        <div
                            className="size-2 rounded-[1px]"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-foreground/90 font-semibold">{item.name}:</span>
                        <span className="text-foreground font-mono font-bold tabular-nums">
                            {item.value.toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export function TelemetryChartCard({
    chartData,
    historySeconds,
    setHistorySeconds,
    isPaused,
    selectedPoint,
    setSelectedIndex,
}: TelemetryChartCardProps) {
    const colors = getThemeColors()

    return (
        <Card className="border-border border p-6">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-chart-cpu size-4" />
                    <CardTitle className="text-foreground text-sm font-semibold">
                        资源曲线
                    </CardTitle>
                    {selectedPoint && (
                        <span className="border-sig-warn/40 bg-sig-warn/10 text-sig-warn animate-in fade-in zoom-in-95 inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 font-mono text-[0.625rem] font-bold">
                            <span>快照锁定: {selectedPoint.time}</span>
                            <ActionTooltip content="清除锁定，返回实时最新">
                                <button
                                    onClick={() => setSelectedIndex(null)}
                                    className="hover:text-sig-warn/70 cursor-pointer font-extrabold transition-colors focus:outline-none"
                                    aria-label="清除锁定，返回实时最新">
                                    ✕
                                </button>
                            </ActionTooltip>
                        </span>
                    )}
                </div>

                <SegmentedControl
                    size="sm"
                    aria-label="时间窗口"
                    value={historySeconds}
                    onChange={(sec) => setHistorySeconds(Number(sec))}
                    options={[
                        { value: 10, label: '10s' },
                        { value: 30, label: '30s' },
                        { value: 60, label: '60s' },
                    ]}
                />
            </CardHeader>
            <CardContent className="p-0">
                <div
                    className={`h-80 min-h-[320px] w-full transition-all outline-none select-none ${
                        isPaused ? 'cursor-pointer' : ''
                    }`}>
                    {chartData.length === 0 ? (
                        <div className="border-border bg-secondary/20 text-muted-foreground animate-in fade-in flex h-full w-full flex-col items-center justify-center gap-4 rounded-sm border border-dashed p-6 text-center duration-300 select-none">
                            <div className="bg-secondary border-border rounded-sm border p-3">
                                <Clock className="text-muted-foreground size-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-foreground text-xs font-bold">暂无监控数据</p>
                                <p className="text-muted-foreground mx-auto max-w-[280px] text-[0.6875rem] leading-relaxed">
                                    未连接板卡或已暂停更新。连接后点击右侧“继续更新”恢复。
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                onClick={(state: any) => {
                                    if (isPaused && state) {
                                        const index = state.activeTooltipIndex
                                        if (
                                            index !== undefined &&
                                            index !== null &&
                                            chartData[index]
                                        ) {
                                            setSelectedIndex(index)
                                        }
                                    }
                                }}
                                margin={{
                                    top: 5,
                                    right: 5,
                                    left: -25,
                                    bottom: 0,
                                }}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--chart-cpu)"
                                            stopOpacity={0.22}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--chart-cpu)"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--chart-mem)"
                                            stopOpacity={0.18}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--chart-mem)"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--border)"
                                />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={45}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{
                                        stroke: 'var(--border)',
                                        strokeWidth: 1,
                                    }}
                                />
                                <Area
                                    isAnimationActive={false}
                                    type="linear"
                                    name="CPU 使用率"
                                    dataKey="cpu"
                                    stroke={colors.cpuStroke}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={colors.cpuGrad}
                                />
                                <Area
                                    isAnimationActive={false}
                                    type="linear"
                                    name="内存使用率"
                                    dataKey="mem"
                                    stroke={colors.memStroke}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={colors.memGrad}
                                />
                                {selectedPoint && (
                                    <ReferenceLine
                                        x={selectedPoint.time}
                                        stroke="var(--sig-warn)"
                                        strokeDasharray="3 3"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
