import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ActionTooltip } from '@/components/ui/tooltip'
import { SystemMetrics } from '@/domain/metrics/types'
import { formatKB } from '@/domain/metrics/utils'

interface MemDistributionCardProps {
    metrics: SystemMetrics
    memWarning: boolean
    peakMemPercent: number
    avgMemPercent: number
    peakMemUsed: number
}

interface MemSegmentSpec {
    key: string
    label: string
    value: number
    pctOfTotal: number
    colorVar: string
}

export function MemDistributionCard({
    metrics,
    memWarning,
    peakMemPercent,
    avgMemPercent,
    peakMemUsed,
}: MemDistributionCardProps) {
    const memTotal = metrics.mem_total
    const memUsed = metrics.mem_used
    const memFree = metrics.mem_free
    const memKernel = metrics.mem_kernel
    const memApp = metrics.mem_app
    const memOther = Math.max(0, memUsed - memKernel - memApp)

    const safeTotal = memTotal > 0 ? memTotal : 1
    const usedPct = (memUsed / safeTotal) * 100
    const freePct = 100 - usedPct
    const kernelPct = (memKernel / safeTotal) * 100
    const appPct = (memApp / safeTotal) * 100
    const otherPct = (memOther / safeTotal) * 100

    const segments: MemSegmentSpec[] = [
        {
            key: 'kernel',
            label: '内核/堆',
            value: memKernel,
            pctOfTotal: kernelPct,
            colorVar: 'var(--seg-kernel)',
        },
        {
            key: 'app',
            label: '应用占用',
            value: memApp,
            pctOfTotal: appPct,
            colorVar: 'var(--seg-app)',
        },
        {
            key: 'other',
            label: '其它缓冲',
            value: memOther,
            pctOfTotal: otherPct,
            colorVar: 'var(--seg-other)',
        },
    ].filter((seg) => seg.value > 0)

    return (
        <Card
            className={`relative col-span-1 flex flex-col md:col-span-2 lg:col-span-2 ${
                memWarning ? 'alert-glow-rose border-sig-bad/40' : 'border-border'
            }`}>
            <div className="relative z-10 flex items-center justify-between px-4 pt-4 select-none">
                <span className="text-muted-foreground text-xs font-semibold">内存状态与分配</span>
                <Badge tone={memWarning ? 'bad' : 'ok'}>{memWarning ? '内存不足' : '正常'}</Badge>
            </div>
            <CardContent className="relative z-10 flex flex-1 flex-col justify-between gap-3 p-4 pt-1.5 pb-4">
                <div className="flex flex-1 flex-col justify-between gap-3.5 font-mono select-none">
                    <div className="border-border/30 text-muted-foreground flex items-center justify-between border-b pb-2 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-foreground font-bold">物理内存总量:</span>
                            <span className="text-foreground text-xs font-bold tabular-nums">
                                {formatKB(memTotal)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3.5">
                            <span>
                                Peak:{' '}
                                <span className="text-foreground font-bold tabular-nums">
                                    {peakMemPercent.toFixed(1)}%
                                </span>
                            </span>
                            <span className="text-border">•</span>
                            <span>
                                Avg:{' '}
                                <span className="text-foreground font-bold tabular-nums">
                                    {avgMemPercent.toFixed(1)}%
                                </span>
                            </span>
                            <span className="text-border">•</span>
                            <span>
                                Peak Vol:{' '}
                                <span className="text-foreground font-bold tabular-nums">
                                    {formatKB(peakMemUsed)}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="border-border/60 bg-secondary/20 flex min-h-[140px] w-full flex-1 overflow-hidden rounded-sm border">
                        <div
                            style={{ width: `${usedPct}%` }}
                            className="border-border/70 flex h-full flex-col border-r"
                            role="img"
                            aria-label={`内存已用 ${usedPct.toFixed(1)}%`}>
                            {segments.map((seg, index) => {
                                const shareOfUsed =
                                    usedPct > 0 ? (seg.pctOfTotal / usedPct) * 100 : 0
                                const showInline = shareOfUsed >= 18
                                return (
                                    <ActionTooltip
                                        key={seg.key}
                                        content={`${seg.label}: ${formatKB(seg.value)} (占总内存 ${seg.pctOfTotal.toFixed(1)}%)`}
                                        side="bottom">
                                        <div
                                            style={{
                                                height: `${shareOfUsed}%`,
                                                background: `color-mix(in srgb, ${seg.colorVar} 14%, transparent)`,
                                            }}
                                            className={`border-border/40 overflow-hidden transition-colors hover:bg-[color-mix(in_srgb,var(--border)_10%,transparent)] ${
                                                index < segments.length - 1 ? 'border-b' : ''
                                            } ${showInline ? 'flex items-center px-2.5' : 'flex items-center justify-center'}`}>
                                            {showInline ? (
                                                <div className="flex w-full items-center justify-between gap-2 whitespace-nowrap">
                                                    <span
                                                        className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-wider"
                                                        style={{ color: seg.colorVar }}>
                                                        <span
                                                            className="size-1.5 shrink-0 rounded-[1px]"
                                                            style={{ background: seg.colorVar }}
                                                        />
                                                        {seg.label}
                                                    </span>
                                                    <span className="text-foreground truncate text-xs font-extrabold tabular-nums">
                                                        {formatKB(seg.value)}
                                                        <span className="text-muted-foreground ml-1 text-[0.625rem] font-normal">
                                                            ({seg.pctOfTotal.toFixed(1)}%)
                                                        </span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span
                                                    className="size-1.5 rounded-[1px]"
                                                    style={{ background: seg.colorVar }}
                                                />
                                            )}
                                        </div>
                                    </ActionTooltip>
                                )
                            })}
                        </div>

                        <ActionTooltip
                            content={`空闲内存: ${formatKB(memFree)} (占总内存 ${freePct.toFixed(1)}%)`}
                            side="bottom">
                            <div
                                style={{ width: `${freePct}%` }}
                                className="bg-seg-free/10 hover:bg-seg-free/15 flex h-full flex-col justify-between p-3 transition-colors sm:p-4">
                                <div className="text-muted-foreground flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                                    <span className="bg-seg-free size-1.5 shrink-0 rounded-[1px]" />
                                    <span className="truncate text-[0.6875rem] font-bold tracking-widest uppercase">
                                        空闲内存
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1.5 overflow-hidden">
                                    <span className="text-foreground truncate text-xl font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl">
                                        {formatKB(memFree)}
                                    </span>
                                    <span className="text-muted-foreground text-xs font-bold tabular-nums">
                                        ({freePct.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        </ActionTooltip>
                    </div>

                    <div className="border-border/30 text-muted-foreground flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 border-t pt-2 text-xs">
                        {[
                            ...segments.map((seg) => ({
                                label: seg.label,
                                value: seg.value,
                                pct: seg.pctOfTotal,
                                colorVar: seg.colorVar,
                            })),
                            {
                                label: '空闲物理',
                                value: memFree,
                                pct: freePct,
                                colorVar: 'var(--seg-free)',
                            },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <span
                                    className="size-2 rounded-[1px]"
                                    style={{ background: item.colorVar }}
                                />
                                <span className="text-foreground/90 font-bold">{item.label}:</span>
                                <span className="text-foreground font-bold tabular-nums">
                                    {formatKB(item.value)}
                                </span>
                                <span className="text-[0.6875rem] tabular-nums">
                                    ({item.pct.toFixed(1)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
