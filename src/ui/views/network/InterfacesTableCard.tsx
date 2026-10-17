import { RefreshCw } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { formatNetworkBytes } from '@/domain/network/calculations'
import { InterfaceRate, NetInterface } from '@/domain/network/types'

export interface InterfacesTableCardProps {
    interfaces: NetInterface[]
    interfaceRates: Map<string, InterfaceRate>
    loading: boolean
    lastRefreshedAt: number | null
}

export function InterfacesTableCard({
    interfaces,
    interfaceRates,
    loading,
    lastRefreshedAt,
}: InterfacesTableCardProps) {
    return (
        <Card className="relative p-5">
            {loading && interfaces.length > 0 && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
                    <div className="border-border bg-popover flex items-center gap-2 rounded-sm border px-3.5 py-1.5">
                        <RefreshCw className="text-foreground size-3.5 animate-spin" />
                        <span className="text-foreground text-xs font-medium">
                            正在更新网络接口...
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground text-sm font-bold">网络接口状态与流量</h3>
                {lastRefreshedAt && (
                    <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                        采样时间: {new Date(lastRefreshedAt).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="overflow-x-auto">
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs font-semibold">接口</TableHead>
                            <TableHead className="text-xs font-semibold">状态标志</TableHead>
                            <TableHead className="text-xs font-semibold">MTU</TableHead>
                            <TableHead className="text-xs font-semibold">下行速率 (RX)</TableHead>
                            <TableHead className="text-xs font-semibold">上行速率 (TX)</TableHead>
                            <TableHead className="text-xs font-semibold">累计接收</TableHead>
                            <TableHead className="text-xs font-semibold">累计发送</TableHead>
                            <TableHead className="text-xs font-semibold">错误 / 丢包</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && interfaces.length === 0
                            ? ['skel-iface-1', 'skel-iface-2', 'skel-iface-3'].map((key) => (
                                  <TableRow key={key}>
                                      <TableCell colSpan={8} className="py-3">
                                          <Skeleton className="h-5 w-full rounded-sm" />
                                      </TableCell>
                                  </TableRow>
                              ))
                            : interfaces.map((iface) => {
                                  const rate = interfaceRates.get(iface.name)
                                  const isUp = iface.flags.includes('U')
                                  const isLink = iface.flags.includes('L')
                                  const statusTone =
                                      isUp && isLink ? 'ok' : isUp ? 'warn' : ('bad' as const)
                                  return (
                                      <TableRow key={iface.name} className="hover:bg-secondary/40">
                                          <TableCell className="text-foreground font-mono font-bold">
                                              {iface.name}
                                          </TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-1.5">
                                                  <StatusDot
                                                      tone={statusTone}
                                                      title={
                                                          isUp && isLink
                                                              ? '接口正常启用且链路连通 (UP, LINK)'
                                                              : isUp
                                                                ? '接口已启用但链路未连通 (UP)'
                                                                : '接口已停用 (DOWN)'
                                                      }
                                                  />
                                                  <span className="text-muted-foreground font-mono text-[0.6875rem]">
                                                      {iface.flags}
                                                  </span>
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {iface.mtu}
                                          </TableCell>
                                          <TableCell className="text-chart-cpu font-mono font-medium tabular-nums">
                                              {rate ? rate.formattedRxRate : '-'}
                                          </TableCell>
                                          <TableCell className="text-chart-mem font-mono font-medium tabular-nums">
                                              {rate ? rate.formattedTxRate : '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {formatNetworkBytes(iface.rx_bytes)}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {formatNetworkBytes(iface.tx_bytes)}
                                          </TableCell>
                                          <TableCell>
                                              <span
                                                  className={
                                                      iface.rx_errors > 0 || iface.tx_errors > 0
                                                          ? 'text-sig-bad font-mono'
                                                          : 'text-muted-foreground font-mono'
                                                  }>
                                                  Err: {iface.rx_errors + iface.tx_errors}
                                              </span>
                                              <span className="text-border mx-1">/</span>
                                              <span
                                                  className={
                                                      iface.rx_drops > 0 || iface.tx_drops > 0
                                                          ? 'text-sig-warn font-mono'
                                                          : 'text-muted-foreground font-mono'
                                                  }>
                                                  Drp: {iface.rx_drops + iface.tx_drops}
                                              </span>
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                        {interfaces.length === 0 && !loading && (
                            <TableRow>
                                <TableCell className="text-muted-foreground py-8 text-center">
                                    暂无网络接口数据
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    )
}
