import { X } from 'lucide-react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import { SegmentedControl } from '@/components/ui/segmented-control'
import { ChartDataPoint } from '@/domain/metrics/types'

interface TelemetryChartCardProps {
    chartData: ChartDataPoint[]
    historySeconds: number
    setHistorySeconds: (sec: number) => void
    isPaused: boolean
    selectedPoint: ChartDataPoint | null
    setSelectedIndex: (index: number | null) => void
    warningCpu: number
    warningMem: number
}

export function TelemetryChartCard({
    chartData,
    historySeconds,
    setHistorySeconds,
    isPaused,
    selectedPoint,
    setSelectedIndex,
    warningCpu,
    warningMem,
}: TelemetryChartCardProps) {
    const sample = selectedPoint ?? chartData[chartData.length - 1]
    const overThreshold = chartData.filter(({ cpu, mem }) => cpu >= warningCpu || mem >= warningMem)

    return (
        <section className="bg-card @container" aria-labelledby="resource-chart-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 @lg:px-5">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 id="resource-chart-heading" className="text-base font-semibold">
                        资源曲线
                    </h2>
                    {selectedPoint && (
                        <button
                            type="button"
                            onClick={() => setSelectedIndex(null)}
                            className="border-sig-warn/40 bg-sig-warn/10 text-sig-warn hover:bg-sig-warn/20 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs"
                            aria-label="清除锁定，返回实时最新">
                            <span>快照锁定: {selectedPoint.time}</span>
                            <X aria-hidden="true" className="size-3" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isPaused && chartData.length > 0 && (
                        <select
                            aria-label="锁定采样时间"
                            value={selectedPoint ? chartData.indexOf(selectedPoint) : ''}
                            onChange={(event) =>
                                setSelectedIndex(
                                    event.target.value === '' ? null : Number(event.target.value),
                                )
                            }
                            className="border-input bg-plot h-8 max-w-full rounded-sm border px-2 font-mono text-xs">
                            <option value="">锁定采样时间</option>
                            {chartData.map(({ time }, index) => (
                                <option key={time} value={index}>
                                    {time}
                                </option>
                            ))}
                        </select>
                    )}
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
                </div>
            </div>
            <div className="bg-plot grid border-t @2xl:grid-cols-[11rem_minmax(0,1fr)]">
                <dl className="grid min-w-0 grid-cols-2 divide-x border-b @2xl:grid-cols-1 @2xl:divide-x-0 @2xl:divide-y @2xl:border-r @2xl:border-b-0">
                    <div className="flex flex-col justify-center gap-1.5 px-3 py-4 @lg:px-5">
                        <dt className="flex items-center gap-2 text-xs font-medium">
                            <span
                                aria-hidden="true"
                                className="border-chart-cpu w-4 shrink-0 border-t-2"
                            />
                            CPU 使用率
                        </dt>
                        <dd className="text-chart-cpu font-mono text-2xl leading-none @xs:text-3xl">
                            {sample ? `${sample.cpu.toFixed(1)}%` : '—'}
                        </dd>
                        <dd className="text-muted-foreground font-mono text-xs">
                            阈值 {warningCpu}%
                        </dd>
                    </div>
                    <div className="flex flex-col justify-center gap-1.5 px-3 py-4 @lg:px-5">
                        <dt className="flex items-center gap-2 text-xs font-medium">
                            <span
                                aria-hidden="true"
                                className="border-chart-mem w-4 shrink-0 border-t-2 border-dashed"
                            />
                            内存使用率
                        </dt>
                        <dd className="text-chart-mem font-mono text-2xl leading-none @xs:text-3xl">
                            {sample ? `${sample.mem.toFixed(1)}%` : '—'}
                        </dd>
                        <dd className="text-muted-foreground font-mono text-xs">
                            阈值 {warningMem}%
                        </dd>
                    </div>
                </dl>

                {chartData.length === 0 ? (
                    <div className="text-muted-foreground flex min-h-48 items-center justify-center px-4 text-center text-sm @lg:min-h-64">
                        暂无监控数据
                    </div>
                ) : (
                    <div className="min-w-0 pt-3 pr-3 pl-1 @lg:pr-5 @lg:pl-3">
                        <div className={`h-52 @lg:h-60 ${isPaused ? 'cursor-crosshair' : ''}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={chartData}
                                    onClick={({ activeTooltipIndex }) => {
                                        if (isPaused && activeTooltipIndex != null) {
                                            const index = Number(activeTooltipIndex)
                                            if (chartData[index]) setSelectedIndex(index)
                                        }
                                    }}
                                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="var(--border)" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        className="font-mono"
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                        minTickGap={28}
                                    />
                                    <YAxis
                                        width={40}
                                        domain={[0, 100]}
                                        ticks={[0, 25, 50, 75, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        className="font-mono"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                                        contentStyle={{
                                            background: 'var(--popover)',
                                            border: '1px solid var(--border)',
                                            fontSize: '0.75rem',
                                        }}
                                        labelStyle={{ color: 'var(--muted-foreground)' }}
                                        cursor={{
                                            stroke: 'var(--muted-foreground)',
                                            strokeWidth: 1,
                                        }}
                                    />
                                    <Line
                                        isAnimationActive={false}
                                        dot={chartData.length === 1}
                                        type="linear"
                                        name="CPU 使用率"
                                        dataKey="cpu"
                                        stroke="var(--chart-cpu)"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        isAnimationActive={false}
                                        dot={chartData.length === 1}
                                        type="linear"
                                        name="内存使用率"
                                        dataKey="mem"
                                        stroke="var(--chart-mem)"
                                        strokeDasharray="5 3"
                                        strokeWidth={2}
                                    />
                                    {overThreshold.map(({ time }) => (
                                        <ReferenceLine
                                            key={time}
                                            segment={[
                                                { x: time, y: 0 },
                                                { x: time, y: 8 },
                                            ]}
                                            stroke="var(--sig-warn)"
                                            strokeWidth={3}
                                        />
                                    ))}
                                    {selectedPoint && (
                                        <ReferenceLine
                                            x={selectedPoint.time}
                                            stroke="var(--muted-foreground)"
                                            strokeDasharray="4 3"
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-muted-foreground ml-10 flex w-fit items-center gap-2 pb-3 text-xs">
                            <span aria-hidden="true" className="bg-sig-warn h-3 w-0.5" />
                            越阈采样 {overThreshold.length} 次
                        </p>
                    </div>
                )}
            </div>
        </section>
    )
}
