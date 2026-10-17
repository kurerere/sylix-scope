import { RefreshCw, Search } from 'lucide-react'

import { SocketTypeFilter, isListenSocket } from '@/application/network/useNetworkDiagnostics'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { NetSocket, SocketProtocol } from '@/domain/network/types'

export interface SocketsTableCardProps {
    sockets: NetSocket[]
    loading: boolean
    selectedProtocol: SocketProtocol
    setSelectedProtocol: (proto: SocketProtocol) => void
    socketTypeFilter: SocketTypeFilter
    setSocketTypeFilter: (filter: SocketTypeFilter) => void
    socketSearch: string
    setSocketSearch: (query: string) => void
}

const PROTOCOL_OPTIONS = (['ALL', 'TCP', 'UDP', 'UNIX', 'PACKET'] as SocketProtocol[]).map(
    (proto) => ({
        value: proto,
        label: proto === 'ALL' ? '全部协议' : proto,
    }),
)

const TYPE_OPTIONS = (
    [
        { id: 'all', label: '全部' },
        { id: 'listen', label: '监听 (LISTEN)' },
        { id: 'connected', label: '连接' },
    ] as const
).map((item) => ({ value: item.id, label: item.label }))

export function SocketsTableCard({
    sockets,
    loading,
    selectedProtocol,
    setSelectedProtocol,
    socketTypeFilter,
    setSocketTypeFilter,
    socketSearch,
    setSocketSearch,
}: SocketsTableCardProps) {
    return (
        <Card className="relative p-5">
            {loading && sockets.length > 0 && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
                    <div className="border-border bg-popover flex items-center gap-2 rounded-sm border px-3.5 py-1.5">
                        <RefreshCw className="text-foreground size-3.5 animate-spin" />
                        <span className="text-foreground text-xs font-medium">
                            正在刷新套接字数据...
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <SegmentedControl
                    size="sm"
                    aria-label="协议筛选"
                    value={selectedProtocol}
                    onChange={(proto) => setSelectedProtocol(proto as SocketProtocol)}
                    options={PROTOCOL_OPTIONS}
                />

                <div className="flex flex-wrap items-center gap-3">
                    <SegmentedControl
                        size="sm"
                        aria-label="套接字类型筛选"
                        value={socketTypeFilter}
                        onChange={(filter) => setSocketTypeFilter(filter as SocketTypeFilter)}
                        options={TYPE_OPTIONS}
                    />

                    <div className="relative">
                        <Search
                            className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                            aria-hidden="true"
                        />
                        <Input
                            type="text"
                            value={socketSearch}
                            onChange={(e) => setSocketSearch(e.target.value)}
                            placeholder="搜索 IP / 端口 / 路径..."
                            aria-label="搜索套接字"
                            className="h-8 w-48 pr-3 pl-8 text-xs"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs font-semibold">协议</TableHead>
                            <TableHead className="text-xs font-semibold">本地端点</TableHead>
                            <TableHead className="text-xs font-semibold">远端端点</TableHead>
                            <TableHead className="text-xs font-semibold">状态</TableHead>
                            <TableHead className="text-xs font-semibold">重传</TableHead>
                            <TableHead className="text-xs font-semibold">接收窗口 (RCV)</TableHead>
                            <TableHead className="text-xs font-semibold">发送窗口 (SND)</TableHead>
                            <TableHead className="text-xs font-semibold">详情 / 备注</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && sockets.length === 0
                            ? ['skel-sock-1', 'skel-sock-2', 'skel-sock-3', 'skel-sock-4'].map(
                                  (key) => (
                                      <TableRow key={key}>
                                          <TableCell colSpan={8} className="py-3">
                                              <Skeleton className="h-5 w-full rounded-sm" />
                                          </TableCell>
                                      </TableRow>
                                  ),
                              )
                            : sockets.map((sock, index) => {
                                  const isListen = isListenSocket(sock)
                                  const isEstab = sock.status.toLowerCase().includes('estab')
                                  return (
                                      <TableRow
                                          // 板卡多条 UNIX 套接字字段完全一致，唯一标识只能来自行序
                                          // oxlint-disable-next-line react/no-array-index-key
                                          key={`${sock.protocol}-${sock.local_addr}-${sock.remote_addr}-${sock.status}-${sock.raw_info || ''}-${index}`}
                                          className="hover:bg-secondary/40">
                                          <TableCell>
                                              <span className="bg-secondary text-foreground inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[0.625rem] font-bold">
                                                  {sock.protocol}
                                              </span>
                                          </TableCell>
                                          <TableCell className="text-foreground font-mono font-medium">
                                              {sock.local_addr}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono">
                                              {sock.remote_addr}
                                          </TableCell>
                                          <TableCell>
                                              <span
                                                  className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.625rem] font-bold uppercase ${
                                                      isListen
                                                          ? 'bg-sig-ok/10 text-sig-ok'
                                                          : isEstab
                                                            ? 'bg-chart-cpu/10 text-chart-cpu'
                                                            : 'bg-muted text-muted-foreground'
                                                  }`}>
                                                  {sock.status === '-' && isListen
                                                      ? 'LISTEN'
                                                      : sock.status}
                                              </span>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {sock.retrans}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {sock.rcv_wnd > 0 ? sock.rcv_wnd : '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                                              {sock.snd_wnd > 0 ? sock.snd_wnd : '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground font-mono text-[0.6875rem]">
                                              {sock.raw_info || '-'}
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                        {sockets.length === 0 && !loading && (
                            <TableRow>
                                <TableCell className="text-muted-foreground py-8 text-center">
                                    {socketTypeFilter === 'listen'
                                        ? '未匹配到监听套接字'
                                        : socketTypeFilter === 'connected'
                                          ? '未匹配到连接套接字'
                                          : '未匹配到套接字'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    )
}
