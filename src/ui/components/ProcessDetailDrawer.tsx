import {
    Terminal,
    Copy,
    Check,
    X,
    Cpu,
    HardDrive,
    Layers,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { SegmentedControl } from '@/components/ui/segmented-control'
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

interface ProcessDetailDrawerProps {
    process: ProcessInfo | null
    onClose: () => void
}

function CopyFieldButton({
    label,
    copied,
    onCopy,
}: {
    label: string
    copied: boolean
    onCopy: () => void
}) {
    return (
        <ActionTooltip content={label}>
            <button
                type="button"
                onClick={onCopy}
                aria-label={label}
                className="text-chart-cpu hover:text-chart-cpu/80 flex cursor-pointer items-center gap-1 rounded-sm text-[0.6875rem] font-bold transition-colors">
                {copied ? (
                    <>
                        <Check className="text-sig-ok size-3" />
                        <span className="text-sig-ok">已复制</span>
                    </>
                ) : (
                    <>
                        <Copy className="size-3" />
                        <span>{label}</span>
                    </>
                )}
            </button>
        </ActionTooltip>
    )
}

export function ProcessDetailDrawer({ process, onClose }: ProcessDetailDrawerProps) {
    const [copiedField, setCopiedField] = useState<'cmd' | 'exe' | null>(null)
    const [sortField, setSortField] = useState<'tid' | 'cpu'>('tid')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    const handleCopy = useCallback((text: string, field: 'cmd' | 'exe') => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }, [])

    const handleSort = useCallback(
        (field: 'tid' | 'cpu') => {
            if (sortField === field) {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            } else {
                setSortField(field)
                setSortOrder(field === 'cpu' ? 'desc' : 'asc')
            }
        },
        [sortField],
    )

    const sortedThreads = useMemo(() => {
        if (!process?.threads) return []
        return [...process.threads].sort((a, b) => {
            if (sortField === 'cpu') {
                const diff = a.cpu - b.cpu
                return sortOrder === 'asc' ? diff : -diff
            } else {
                const valA = a.tid_decimal ?? (a.tid ? parseInt(a.tid, 16) : 0)
                const valB = b.tid_decimal ?? (b.tid ? parseInt(b.tid, 16) : 0)
                const diff = valA - valB
                return sortOrder === 'asc' ? diff : -diff
            }
        })
    }, [process, sortField, sortOrder])

    return (
        <Dialog open={Boolean(process)} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-xl">
                {process && (
                    <>
                        <div className="border-border flex shrink-0 items-center justify-between border-b px-1 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-primary/10 rounded-sm p-2">
                                    <Terminal className="text-primary size-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-foreground text-sm font-bold tracking-tight">
                                        进程分析：PID {process.pid}
                                    </h3>
                                    <p className="text-muted-foreground font-mono text-xs">
                                        {process.name}
                                    </p>
                                </div>
                            </div>
                            <ActionTooltip content="关闭抽屉 (ESC)">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onClose}
                                    aria-label="关闭抽屉 (ESC)"
                                    className="text-muted-foreground hover:text-foreground">
                                    <X className="size-4" />
                                </Button>
                            </ActionTooltip>
                        </div>

                        <div className="border-border/60 bg-secondary/30 grid shrink-0 grid-cols-2 gap-3 rounded-sm border p-3">
                            <div className="border-border/60 bg-background/60 flex items-center gap-2.5 rounded-sm border p-2.5">
                                <Cpu className="text-chart-cpu size-4" />
                                <div>
                                    <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
                                        CPU 占用
                                    </span>
                                    <p className="text-foreground text-chart-cpu font-mono text-xs font-bold">
                                        {process.cpu.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            <div className="border-border/60 bg-background/60 flex items-center gap-2.5 rounded-sm border p-2.5">
                                <HardDrive className="text-chart-mem size-4" />
                                <div>
                                    <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
                                        物理内存
                                    </span>
                                    <p className="text-foreground text-chart-mem font-mono text-xs font-bold">
                                        {formatKB(process.mem)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-5 px-1">
                            <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-[0.6875rem] font-bold tracking-wider">
                                        命令行启动参数 (CMDLINE)
                                    </span>
                                    <CopyFieldButton
                                        label="复制参数"
                                        copied={copiedField === 'cmd'}
                                        onCopy={() => handleCopy(process.cmdline || '', 'cmd')}
                                    />
                                </div>
                                <div className="border-border/50 bg-secondary/40 text-foreground block min-h-10 rounded-sm border p-3 text-xs leading-relaxed break-all">
                                    {process.cmdline || (
                                        <span className="text-muted-foreground italic">
                                            空参数，可能是系统级守护内核线程
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-[0.6875rem] font-bold tracking-wider">
                                        可执行文件路径 (EXECFILE)
                                    </span>
                                    <CopyFieldButton
                                        label="复制路径"
                                        copied={copiedField === 'exe'}
                                        onCopy={() => handleCopy(process.execfile || '', 'exe')}
                                    />
                                </div>
                                <div className="border-border/50 bg-secondary/40 text-foreground block min-h-10 rounded-sm border p-3 text-xs leading-relaxed break-all">
                                    {process.execfile || (
                                        <span className="text-muted-foreground italic">
                                            无物理路径，属于常驻内存核心调度线程
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="text-chart-cpu size-3.5" />
                                        <h4 className="text-foreground text-xs font-bold tracking-wider">
                                            线程列表 ({process.threads?.length || 0})
                                        </h4>
                                    </div>
                                    <SegmentedControl
                                        size="sm"
                                        aria-label="线程排序方式"
                                        allowReselect
                                        value={sortField}
                                        onChange={(field) => handleSort(field as 'tid' | 'cpu')}
                                        options={[
                                            {
                                                value: 'tid',
                                                label: (
                                                    <span className="flex items-center gap-1">
                                                        <span>按TID</span>
                                                        {sortField === 'tid' &&
                                                            (sortOrder === 'asc' ? (
                                                                <ArrowUp className="text-chart-cpu size-2.5" />
                                                            ) : (
                                                                <ArrowDown className="text-chart-cpu size-2.5" />
                                                            ))}
                                                    </span>
                                                ),
                                            },
                                            {
                                                value: 'cpu',
                                                label: (
                                                    <span className="flex items-center gap-1">
                                                        <span>按CPU</span>
                                                        {sortField === 'cpu' &&
                                                            (sortOrder === 'asc' ? (
                                                                <ArrowUp className="text-chart-cpu size-2.5" />
                                                            ) : (
                                                                <ArrowDown className="text-chart-cpu size-2.5" />
                                                            ))}
                                                    </span>
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="border-border/50 bg-secondary/10 overflow-hidden rounded-sm border">
                                    <Table>
                                        <TableHeader className="border-border/50 bg-secondary/30">
                                            <TableRow className="text-muted-foreground text-[0.6875rem]">
                                                <TableHead className="py-2.5">NAME</TableHead>
                                                <TableHead
                                                    className="hover:text-foreground cursor-pointer py-2.5 transition-colors select-none"
                                                    aria-label="点击按 TID 排序"
                                                    onClick={() => handleSort('tid')}>
                                                    <div className="flex items-center gap-1">
                                                        <span>TID</span>
                                                        {sortField === 'tid' ? (
                                                            sortOrder === 'asc' ? (
                                                                <ArrowUp className="text-chart-cpu size-3" />
                                                            ) : (
                                                                <ArrowDown className="text-chart-cpu size-3" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="size-3 opacity-30" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="py-2.5">TID(D)</TableHead>
                                                <TableHead
                                                    className="hover:text-foreground cursor-pointer py-2.5 text-right transition-colors select-none"
                                                    aria-label="点击按 CPU 占用排序"
                                                    onClick={() => handleSort('cpu')}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>CPU</span>
                                                        {sortField === 'cpu' ? (
                                                            sortOrder === 'asc' ? (
                                                                <ArrowUp className="text-chart-cpu size-3" />
                                                            ) : (
                                                                <ArrowDown className="text-chart-cpu size-3" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="size-3 opacity-30" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="font-mono text-xs">
                                            {sortedThreads.map((thread) => (
                                                <TableRow
                                                    key={thread.tid}
                                                    className="border-border/40 hover:bg-secondary/20">
                                                    <TableCell className="text-foreground py-2 font-medium">
                                                        {thread.name}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground py-2">
                                                        {thread.tid}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground py-2">
                                                        {thread.tid_decimal}
                                                    </TableCell>
                                                    <TableCell className="text-chart-cpu py-2 text-right font-bold">
                                                        {thread.cpu.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {!sortedThreads.length && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={4}
                                                        className="text-muted-foreground py-6 text-center text-xs">
                                                        当前快照没有线程数据
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Dialog>
    )
}
