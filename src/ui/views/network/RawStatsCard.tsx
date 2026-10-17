import { Copy, Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NetStatistics } from '@/domain/network/types'

export interface RawStatsCardProps {
    stats: NetStatistics | null
    loading: boolean
    lastRefreshedAt: number | null
}

export function RawStatsCard({ stats, loading, lastRefreshedAt }: RawStatsCardProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        if (!stats || stats.raw_lines.length === 0) return
        try {
            await navigator.clipboard.writeText(stats.raw_lines.join('\n'))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // ignore clipboard failure
        }
    }

    const hasData = stats && stats.raw_lines.length > 0

    return (
        <Card className="relative p-5">
            {loading && hasData && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
                    <div className="border-border bg-popover flex items-center gap-2 rounded-sm border px-3.5 py-1.5">
                        <RefreshCw className="text-foreground size-3.5 animate-spin" />
                        <span className="text-foreground text-xs font-medium">
                            正在刷新原始统计...
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-foreground text-sm font-bold">原始统计</h3>
                    {hasData && (
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleCopy}
                            title="复制全部输出"
                            className="h-6 px-2 text-[0.6875rem]">
                            {copied ? (
                                <>
                                    <Check className="text-sig-ok mr-1 size-3" />
                                    <span className="text-sig-ok">已复制</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1 size-3" />
                                    <span>复制</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
                {lastRefreshedAt && (
                    <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                        采样时间: {new Date(lastRefreshedAt).toLocaleTimeString()}
                    </span>
                )}
            </div>

            {loading && !hasData ? (
                <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-3/4 rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-5/6 rounded-sm" />
                    <Skeleton className="h-4 w-2/3 rounded-sm" />
                </div>
            ) : hasData ? (
                <pre className="bg-secondary border-border text-foreground max-h-[600px] overflow-y-auto rounded-sm border p-4 font-mono text-[0.6875rem] leading-relaxed select-text">
                    {stats.raw_lines.join('\n')}
                </pre>
            ) : (
                <div className="text-muted-foreground py-8 text-center text-xs">
                    暂无原始统计数据
                </div>
            )}
        </Card>
    )
}
