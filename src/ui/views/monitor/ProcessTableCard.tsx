import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ActionTooltip } from '@/components/ui/tooltip'
import { formatKB } from '@/domain/metrics/utils'
import { ProcessInfo } from '@/domain/process/types'
import { ProcessDetailDrawer } from '@/ui/components/ProcessDetailDrawer'
import { ProcessRow } from '@/ui/components/ProcessRow'

export interface ProcessMetricsSummary {
    totalCount: number
    filteredCount: number
    totalThreads: number
    totalRss: number
    topCpuProc: ProcessInfo | null
}

interface ProcessTableCardProps {
    isMonitoring: boolean
    searchTerm: string
    setSearchTerm: (val: string) => void
    sortField: 'pid' | 'cpu' | 'mem'
    sortAsc: boolean
    handleSort: (field: 'pid' | 'cpu' | 'mem') => void
    filteredProcesses: ProcessInfo[]
    displayedProcesses: ProcessInfo[]
    displayedPrevProcessesMap: Map<number, ProcessInfo>
    selectedProcess: ProcessInfo | null
    setSelectedProcess: (proc: ProcessInfo | null) => void
    processSummary: ProcessMetricsSummary
}

export function ProcessTableCard({
    isMonitoring,
    searchTerm,
    setSearchTerm,
    sortField,
    sortAsc,
    handleSort,
    filteredProcesses,
    displayedProcesses,
    displayedPrevProcessesMap,
    selectedProcess,
    setSelectedProcess,
    processSummary,
}: ProcessTableCardProps) {
    return (
        <Card className="flex flex-col border p-6">
            <CardHeader className="flex flex-col justify-between gap-4 p-0 pb-6 md:flex-row md:items-center">
                <div className="space-y-1">
                    <CardTitle className="text-foreground text-sm font-semibold">
                        活跃进程列表
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs font-medium">
                        内核与应用进程的资源占用
                    </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                    <Input
                        type="text"
                        placeholder="搜索进程名、命令行或 PID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-border bg-secondary/60 text-foreground placeholder:text-muted-foreground/60 py-2.5 pr-8 pl-9 text-xs font-medium"
                    />
                    <Search className="text-muted-foreground/60 absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2" />
                    {searchTerm && (
                        <ActionTooltip content="清除搜索内容">
                            <button
                                onClick={() => setSearchTerm('')}
                                className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-primary absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded text-xs font-bold transition-all duration-200 focus-visible:ring-1 focus-visible:outline-none active:scale-95"
                                aria-label="清除搜索"
                                type="button">
                                ✕
                            </button>
                        </ActionTooltip>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
                <div className="border-border bg-secondary/30 flex flex-col overflow-hidden rounded-xl border">
                    {isMonitoring && displayedProcesses.length > 0 && (
                        <div
                            data-testid="process-summary-footer"
                            className="border-border/60 bg-secondary/40 text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5 font-mono text-xs select-none">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                <span data-testid="summary-process-count">
                                    进程：
                                    <strong className="text-foreground font-bold">
                                        {processSummary.filteredCount !== processSummary.totalCount
                                            ? `${processSummary.filteredCount} / ${processSummary.totalCount}`
                                            : processSummary.totalCount}
                                    </strong>
                                </span>
                                <span data-testid="summary-thread-count">
                                    线程：
                                    <strong className="text-foreground font-bold">
                                        {processSummary.totalThreads}
                                    </strong>
                                </span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span data-testid="summary-total-mem">
                                    进程内存：
                                    <strong className="text-chart-mem font-bold">
                                        {formatKB(processSummary.totalRss)}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="max-h-[560px] min-h-[380px] flex-1 overflow-x-auto overflow-y-auto">
                        <Table>
                            <TableHeader className="border-border bg-card sticky top-0 z-10 border-b select-none">
                                <TableRow className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                                    <TableHead
                                        onClick={() => handleSort('pid')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleSort('pid')
                                            }
                                        }}
                                        tabIndex={0}
                                        title="点击按 PID 排序"
                                        aria-label="按 PID 排序"
                                        className="hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-primary cursor-pointer px-6 py-3 transition-colors select-none focus-visible:ring-1 focus-visible:outline-none">
                                        <span className="flex items-center space-x-1.5">
                                            <span
                                                className={
                                                    sortField === 'pid'
                                                        ? 'text-foreground font-bold'
                                                        : ''
                                                }>
                                                PID
                                            </span>
                                            {sortField === 'pid' ? (
                                                sortAsc ? (
                                                    <ArrowUp className="text-primary h-3 w-3" />
                                                ) : (
                                                    <ArrowDown className="text-primary h-3 w-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                                            )}
                                        </span>
                                    </TableHead>
                                    <TableHead className="px-6 py-3">进程名称</TableHead>
                                    <TableHead
                                        onClick={() => handleSort('cpu')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleSort('cpu')
                                            }
                                        }}
                                        tabIndex={0}
                                        title="点击按 CPU 使用率排序"
                                        aria-label="按 CPU 使用率排序"
                                        className="hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-primary cursor-pointer px-6 py-3 text-right transition-colors select-none focus-visible:ring-1 focus-visible:outline-none">
                                        <span className="flex items-center justify-end space-x-1.5">
                                            <span
                                                className={
                                                    sortField === 'cpu'
                                                        ? 'text-foreground font-bold'
                                                        : ''
                                                }>
                                                CPU
                                            </span>
                                            {sortField === 'cpu' ? (
                                                sortAsc ? (
                                                    <ArrowUp className="text-primary h-3 w-3" />
                                                ) : (
                                                    <ArrowDown className="text-primary h-3 w-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                                            )}
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        onClick={() => handleSort('mem')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleSort('mem')
                                            }
                                        }}
                                        tabIndex={0}
                                        title="点击按内存占用排序"
                                        aria-label="按内存占用排序"
                                        className="hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-primary cursor-pointer px-6 py-3 text-right transition-colors select-none focus-visible:ring-1 focus-visible:outline-none">
                                        <span className="flex items-center justify-end space-x-1.5">
                                            <span
                                                className={
                                                    sortField === 'mem'
                                                        ? 'text-foreground font-bold'
                                                        : ''
                                                }>
                                                内存
                                            </span>
                                            {sortField === 'mem' ? (
                                                sortAsc ? (
                                                    <ArrowUp className="text-chart-mem size-3" />
                                                ) : (
                                                    <ArrowDown className="text-chart-mem size-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="size-3 opacity-30" />
                                            )}
                                        </span>
                                    </TableHead>
                                    <TableHead className="px-6 py-3">命令行参数</TableHead>
                                    <TableHead className="px-6 py-3">可执行文件路径</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs">
                                {filteredProcesses.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan={6}
                                            className="text-muted-foreground h-[320px] text-center select-none">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="bg-secondary border-border rounded-sm border p-3">
                                                    <Search className="text-muted-foreground/60 size-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-foreground text-xs font-bold">
                                                        {isMonitoring
                                                            ? '未找到匹配的活跃进程'
                                                            : '暂无进程数据'}
                                                    </p>
                                                    <p className="text-muted-foreground mx-auto max-w-[280px] text-[0.6875rem] leading-relaxed">
                                                        {isMonitoring
                                                            ? '没有找到符合搜索过滤条件的进程，请尝试更换关键词重新检索。'
                                                            : '请连接设备并开启实时资源监控以捕获和分析活跃进程。'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProcesses.map((proc) => {
                                        const isSelected = selectedProcess?.pid === proc.pid
                                        const prevProc = displayedPrevProcessesMap.get(proc.pid)
                                        return (
                                            <ProcessRow
                                                key={proc.pid}
                                                proc={proc}
                                                isSelected={isSelected}
                                                onClick={() => setSelectedProcess(proc)}
                                                prevCpu={prevProc?.cpu}
                                                prevMem={prevProc?.mem}
                                            />
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ProcessDetailDrawer
                    process={selectedProcess}
                    onClose={() => setSelectedProcess(null)}
                />
            </CardContent>
        </Card>
    )
}
