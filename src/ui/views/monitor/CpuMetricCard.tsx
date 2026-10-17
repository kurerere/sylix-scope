import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CircularGauge } from '@/ui/components/CircularGauge'

export interface CpuCoreStat {
    label: string
    key: string
    usage: number
    originalUsage: number
}

interface CpuMetricCardProps {
    cpuUsage: number
    warningCpu: number
    isSpiking: boolean
    peakCpu: number
    avgCpu: number
    cpuCoresList: CpuCoreStat[]
}

export function CpuMetricCard({
    cpuUsage,
    warningCpu,
    isSpiking,
    peakCpu,
    avgCpu,
    cpuCoresList,
}: CpuMetricCardProps) {
    const isOverload = cpuUsage >= warningCpu
    const cardStatusClass = isOverload
        ? 'alert-glow-rose border-sig-bad/40'
        : isSpiking
          ? 'alert-glow-amber border-sig-warn/40'
          : 'border-border'

    const badgeTone = isOverload ? 'bad' : isSpiking ? 'warn' : 'ok'
    const gaugeTone = isOverload ? 'bad' : isSpiking ? 'warn' : 'ok'

    return (
        <Card
            className={`relative col-span-1 flex flex-col md:col-span-1 lg:col-span-1 ${cardStatusClass}`}>
            <div className="relative z-10 flex items-center justify-between px-4 pt-4 select-none">
                <span className="text-muted-foreground text-xs font-semibold">CPU 使用情况</span>
                <Badge tone={badgeTone}>
                    {isOverload ? '负载过高' : isSpiking ? '波动' : '正常'}
                </Badge>
            </div>
            <CardContent className="relative z-10 flex flex-1 flex-col items-center justify-between p-4 pt-3 pb-4">
                <div className="my-1 flex w-full justify-center">
                    <CircularGauge value={cpuUsage} tone={gaugeTone} size={132} />
                </div>

                <div className="text-muted-foreground mt-2 flex items-center justify-center gap-3.5 font-mono text-xs font-bold select-none">
                    <span>
                        Peak:{' '}
                        <span className="text-foreground tabular-nums">{peakCpu.toFixed(1)}%</span>
                    </span>
                    <span className="text-border">•</span>
                    <span>
                        Avg:{' '}
                        <span className="text-foreground tabular-nums">{avgCpu.toFixed(1)}%</span>
                    </span>
                </div>

                {cpuCoresList.length > 0 && (
                    <div className="border-border/40 mt-3 w-full border-t pt-3 select-none">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[0.6875rem]">
                            {cpuCoresList.map((core) => {
                                const tone =
                                    core.originalUsage >= 90
                                        ? 'bg-sig-bad'
                                        : core.originalUsage >= 70
                                          ? 'bg-sig-warn'
                                          : 'bg-chart-cpu'
                                return (
                                    <div key={core.key} className="flex flex-col space-y-0.5">
                                        <div className="text-muted-foreground flex items-center justify-between">
                                            <span>{core.label}</span>
                                            <span className="text-foreground/90 font-bold tabular-nums">
                                                {core.usage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="bg-secondary h-1 w-full overflow-hidden rounded-[1px]">
                                            <div
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, core.originalUsage))}%`,
                                                }}
                                                className={`h-full rounded-[1px] transition-all duration-300 ${tone}`}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
