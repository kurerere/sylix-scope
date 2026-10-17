import { memo } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { TableRow, TableCell } from '@/components/ui/table'
import { formatKB } from '@/domain/metrics/utils'
import { ProcessInfo } from '@/domain/process/types'

export const ProcessRow = memo(
    ({
        proc,
        isSelected,
        onClick,
    }: {
        proc: ProcessInfo
        isSelected: boolean
        onClick: () => void
        prevCpu: number | undefined
        prevMem: number | undefined
    }) => {
        return (
            <TableRow
                onClick={onClick}
                className={`border-border group hover:bg-secondary/40 cursor-pointer border-b transition-colors duration-150 select-none ${
                    isSelected ? 'bg-primary/[0.08] dark:bg-primary/[0.12]' : ''
                }`}>
                <TableCell className="text-muted-foreground relative px-6 py-3 font-mono font-bold">
                    <div className="flex items-center gap-2">
                        {isSelected && (
                            <span
                                className="bg-primary absolute top-1/2 left-2.5 size-1.5 -translate-y-1/2 rounded-[1px]"
                                aria-hidden="true"
                            />
                        )}
                        <span>{proc.pid}</span>
                    </div>
                </TableCell>
                <TableCell className="text-foreground group-hover:text-foreground px-6 py-3 font-semibold">
                    {proc.name}
                </TableCell>
                <TableCell className="text-chart-cpu px-6 py-3 text-right font-mono font-semibold tabular-nums">
                    {proc.cpu.toFixed(1)}%
                </TableCell>
                <TableCell className="text-chart-mem px-6 py-3 text-right font-mono font-semibold tabular-nums">
                    {formatKB(proc.mem)}
                </TableCell>
                <TableCell className="max-w-xs truncate px-6 py-3 font-mono">
                    {proc.cmdline !== null ? (
                        <span
                            className="text-muted-foreground text-[0.6875rem]"
                            title={proc.cmdline}>
                            {proc.cmdline || (
                                <span className="text-muted-foreground/60 italic">无参数</span>
                            )}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2 py-0.5">
                            <Skeleton className="bg-muted h-3 w-20" />
                            <span className="text-muted-foreground/60 animate-pulse text-[0.625rem] italic">
                                解析中...
                            </span>
                        </div>
                    )}
                </TableCell>
                <TableCell className="max-w-xs truncate px-6 py-3 font-mono">
                    {proc.execfile !== null ? (
                        <span
                            className="text-muted-foreground/80 text-[0.6875rem]"
                            title={proc.execfile}>
                            {proc.execfile || (
                                <span className="text-muted-foreground/60 italic">系统线程</span>
                            )}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2 py-0.5">
                            <Skeleton className="bg-muted h-3.5 w-24" />
                            <span className="text-muted-foreground/60 animate-pulse text-[0.625rem] italic">
                                解析中...
                            </span>
                        </div>
                    )}
                </TableCell>
            </TableRow>
        )
    },
)

ProcessRow.displayName = 'ProcessRow'
