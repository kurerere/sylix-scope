import { RefreshCw } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { RouteEntry } from '@/domain/network/types'

export interface RoutesTableCardProps {
    routes: RouteEntry[]
    loading: boolean
}

export function RoutesTableCard({ routes, loading }: RoutesTableCardProps) {
    return (
        <Card className="relative p-5">
            {loading && routes.length > 0 && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
                    <div className="border-border bg-popover flex items-center gap-2 rounded-sm border px-3.5 py-1.5">
                        <RefreshCw className="text-foreground size-3.5 animate-spin" />
                        <span className="text-foreground text-xs font-medium">
                            正在更新路由表...
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground text-sm font-bold">路由表</h3>
            </div>

            <div className="overflow-x-auto">
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs font-semibold">
                                目标网络 (Destination)
                            </TableHead>
                            <TableHead className="text-xs font-semibold">网关 (Gateway)</TableHead>
                            <TableHead className="text-xs font-semibold">标志 (Flags)</TableHead>
                            <TableHead className="text-xs font-semibold">跃点 (Metric)</TableHead>
                            <TableHead className="text-xs font-semibold">接口 (Iface)</TableHead>
                            <TableHead className="text-xs font-semibold">引用计数</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && routes.length === 0
                            ? ['skel-route-1', 'skel-route-2', 'skel-route-3'].map((key) => (
                                  <TableRow key={key}>
                                      <TableCell colSpan={6} className="py-3">
                                          <Skeleton className="h-5 w-full rounded-sm" />
                                      </TableCell>
                                  </TableRow>
                              ))
                            : routes.map((rt) => (
                                  <TableRow
                                      key={`${rt.destination}-${rt.gateway}-${rt.iface}-${rt.flags}-${rt.metric}`}
                                      className="hover:bg-secondary/40">
                                      <TableCell className="text-foreground font-mono font-bold">
                                          {rt.destination}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground font-mono">
                                          {rt.gateway}
                                      </TableCell>
                                      <TableCell>
                                          <span className="bg-secondary text-foreground inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[0.625rem] font-bold">
                                              {rt.flags}
                                          </span>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground font-mono tabular-nums">
                                          {rt.metric}
                                      </TableCell>
                                      <TableCell className="text-foreground font-mono font-semibold">
                                          {rt.iface}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground font-mono tabular-nums">
                                          {rt.refcnt} / {rt.use_cnt}
                                      </TableCell>
                                  </TableRow>
                              ))}
                        {routes.length === 0 && !loading && (
                            <TableRow>
                                <TableCell className="text-muted-foreground py-8 text-center">
                                    暂无路由数据
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    )
}
