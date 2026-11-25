import { Clock, RefreshCw, Pencil, X, Download } from 'lucide-react'
import { useState } from 'react'

import { useHistoryExport } from '@/application/history/useHistoryExport'
import { useHistoryPlayback } from '@/application/history/useHistoryPlayback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatDate, formatDuration } from '@/domain/history/formatters'
import { formatKB } from '@/domain/metrics/utils'
import { ExportProgressModal } from '@/ui/components/ExportProgressModal'
import { InlineEditor } from '@/ui/components/InlineEditor'
import { PlaybackChart } from '@/ui/components/PlaybackChart'
import { ProcessDetailDrawer } from '@/ui/components/ProcessDetailDrawer'

const SPEED_OPTIONS = [1, 2, 5, 10].map((speed) => ({
    value: speed,
    label: `${speed}x`,
    title: `切换至 ${speed}x 回放倍速`,
}))

const PROC_SORT_OPTIONS = [
    { value: 'cpu', label: '按CPU', title: '按 CPU 占用排序' },
    { value: 'mem', label: '按内存', title: '按内存占用排序' },
] as const

export function HistoryView() {
    const {
        isExporting,
        exportProgress,
        exportStepText,
        exportSteps,
        exportError,
        exportRecord,
        closeExportModal,
    } = useHistoryExport()
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const {
        records,
        selectedRecord,
        metrics,
        editingRecordId,
        setEditingRecordId,
        isPlaying,
        setIsPlaying,
        playbackIndex,
        setPlaybackIndex,
        playbackSpeed,
        setPlaybackSpeed,
        procSearch,
        setProcSearch,
        procSortField,
        setProcSortField,
        isRefreshing,
        loadRecords,
        handleSelectRecord,
        handleDeleteRecord,
        handleRenameRecord,
        handleSelectIndex,
        filteredProcesses,
        selectedProcess,
        setSelectedProcess,
    } = useHistoryPlayback()

    return (
        <div className="grid min-h-full content-start gap-4 xl:grid-cols-[minmax(15rem,1fr)_minmax(0,3fr)] xl:items-stretch">
            <div className="bg-card flex min-w-0 flex-col rounded-sm border">
                <div className="bg-rail flex items-center justify-between gap-2 border-b px-4 py-3">
                    <h2 className="text-foreground text-base font-semibold">录制历史</h2>
                    <ActionTooltip content="刷新录制历史列表">
                        <Button
                            onClick={() => loadRecords(false)}
                            disabled={isRefreshing}
                            variant="ghost"
                            size="sm"
                            aria-label="刷新录制历史列表"
                            className="text-muted-foreground hover:text-foreground flex h-7 cursor-pointer items-center gap-1 text-[0.625rem]">
                            <RefreshCw className={`size-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                    </ActionTooltip>
                </div>
                <div className="max-h-72 divide-y overflow-y-auto xl:max-h-[70dvh]">
                    {records.map((rec) => (
                        <div
                            key={rec.id}
                            onClick={() => {
                                if (
                                    editingRecordId === `sidebar-${rec.id}` ||
                                    editingRecordId === `detail-${rec.id}`
                                )
                                    return
                                handleSelectRecord(rec)
                            }}
                            className={`group relative flex cursor-pointer flex-col px-4 py-3 transition-colors ${
                                selectedRecord?.id === rec.id
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`}>
                            {editingRecordId === `sidebar-${rec.id}` ? (
                                <InlineEditor
                                    key={`edit-${rec.id}`}
                                    initialValue={rec.name}
                                    existingNames={records.map((r) => r.name)}
                                    onSave={(val) => handleRenameRecord(rec.id, val)}
                                    onCancel={() =>
                                        setEditingRecordId((prev) =>
                                            prev === `sidebar-${rec.id}` ? null : prev,
                                        )
                                    }
                                    isSidebar={true}
                                    className="border-border bg-background text-foreground h-6 w-[70%] rounded-sm px-2 py-0.5 font-sans text-xs"
                                />
                            ) : (
                                <div className="flex min-w-0 items-center gap-1.5 pr-20">
                                    <button
                                        type="button"
                                        aria-current={
                                            selectedRecord?.id === rec.id ? 'true' : undefined
                                        }
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            setEditingRecordId(`sidebar-${rec.id}`)
                                        }}
                                        className="truncate text-left text-sm font-semibold"
                                        title="双击可重命名">
                                        {rec.name}
                                    </button>
                                </div>
                            )}
                            <span className="text-muted-foreground mt-1.5 font-mono text-xs">
                                {formatDate(rec.start_time)}
                            </span>
                            <div className="text-muted-foreground mt-2 flex items-center justify-between text-[0.625rem]">
                                <span>时长: {formatDuration(rec.start_time, rec.end_time)}</span>
                            </div>
                            {editingRecordId !== `sidebar-${rec.id}` && (
                                <div
                                    className={`absolute top-2.5 right-2.5 flex items-center transition-opacity duration-200 ${
                                        deletingId === rec.id ? 'opacity-100' : 'gap-1.5'
                                    }`}>
                                    {deletingId === rec.id ? (
                                        <div className="border-sig-bad/30 bg-sig-bad/10 text-sig-bad animate-in fade-in flex items-center gap-1 rounded-sm border p-0.5 text-[0.5625rem] font-bold duration-200">
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteRecord(rec.id)
                                                    setDeletingId(null)
                                                }}
                                                className="bg-sig-bad hover:bg-sig-bad/85 rounded-sm px-2 py-0.5 text-white transition-colors">
                                                确定
                                            </button>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDeletingId(null)
                                                }}
                                                className="text-muted-foreground hover:text-foreground rounded-sm px-2 py-0.5 transition-colors">
                                                取消
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    exportRecord(rec.id, rec.name)
                                                }}
                                                className="text-muted-foreground/60 hover:text-primary"
                                                title="导出快照"
                                                aria-label="导出快照">
                                                <Download className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingRecordId(`sidebar-${rec.id}`)
                                                }}
                                                className="text-muted-foreground/60 hover:text-primary"
                                                title="重命名"
                                                aria-label="重命名">
                                                <Pencil className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDeletingId(rec.id)
                                                }}
                                                className="text-muted-foreground/60 hover:text-sig-bad"
                                                title="删除"
                                                aria-label="删除">
                                                <X className="size-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {records.length === 0 && (
                        <div className="text-muted-foreground px-4 py-8 text-sm">暂无录制历史</div>
                    )}
                </div>
            </div>

            <div className="bg-card flex min-w-0 flex-col rounded-sm border p-4 sm:p-5">
                {!selectedRecord ? (
                    <div className="bg-plot text-muted-foreground flex min-h-64 flex-1 flex-col items-center justify-center gap-2 rounded-sm border p-5 text-center">
                        <Clock className="size-6" aria-hidden="true" />
                        <h2 className="text-foreground text-base font-semibold">录制回放</h2>
                        <p className="text-sm">
                            从录制历史中选择一条记录，查看资源曲线与进程快照。
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                {editingRecordId === `detail-${selectedRecord.id}` ? (
                                    <InlineEditor
                                        key={`edit-${selectedRecord.id}`}
                                        initialValue={selectedRecord.name}
                                        existingNames={records.map((r) => r.name)}
                                        onSave={(val) => handleRenameRecord(selectedRecord.id, val)}
                                        onCancel={() =>
                                            setEditingRecordId((prev) =>
                                                prev === `detail-${selectedRecord.id}`
                                                    ? null
                                                    : prev,
                                            )
                                        }
                                        isSidebar={false}
                                        className="border-border bg-background text-foreground h-7 w-60 rounded-sm px-2 font-sans text-xs"
                                    />
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-foreground max-w-full truncate text-base font-semibold">
                                            {selectedRecord.name}
                                        </h2>
                                        <ActionTooltip content="重命名录制">
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingRecordId(
                                                        `detail-${selectedRecord.id}`,
                                                    )
                                                }}
                                                className="text-muted-foreground hover:text-primary"
                                                aria-label="重命名">
                                                <Pencil className="size-3.5" />
                                            </button>
                                        </ActionTooltip>
                                        <ActionTooltip content="导出录制数据为 JSON 文件">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                aria-label="导出数据"
                                                className="flex h-7 cursor-pointer items-center gap-1 text-[0.625rem] font-semibold"
                                                onClick={() =>
                                                    exportRecord(
                                                        selectedRecord.id,
                                                        selectedRecord.name,
                                                    )
                                                }>
                                                <Download className="size-3" />
                                                导出数据
                                            </Button>
                                        </ActionTooltip>
                                    </div>
                                )}
                                <p className="text-muted-foreground mt-1.5 font-mono text-[0.625rem]">
                                    数据范围: {formatDate(selectedRecord.start_time)} ~{' '}
                                    {selectedRecord.end_time
                                        ? formatDate(selectedRecord.end_time)
                                        : '录制中'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-plot h-48 w-full shrink-0 rounded-sm border p-2.5 sm:h-60">
                            <PlaybackChart
                                metrics={metrics}
                                playbackIndex={playbackIndex}
                                onSelectIndex={handleSelectIndex}
                            />
                        </div>

                        <div className="bg-rail mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-sm border p-3 select-none">
                            <ActionTooltip content={isPlaying ? '暂停回放' : '播放回放'}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label={isPlaying ? '暂停回放' : '播放回放'}
                                    className="h-8 w-16 cursor-pointer text-xs font-semibold"
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    disabled={metrics.length === 0}>
                                    {isPlaying ? '暂停' : '播放'}
                                </Button>
                            </ActionTooltip>

                            <div className="flex shrink-0 items-center gap-1.5">
                                <span className="text-muted-foreground text-xs font-semibold uppercase">
                                    倍速:
                                </span>
                                <SegmentedControl
                                    size="sm"
                                    aria-label="回放倍速"
                                    value={playbackSpeed}
                                    onChange={(speed) => setPlaybackSpeed(Number(speed))}
                                    options={SPEED_OPTIONS}
                                />
                            </div>

                            <div className="flex min-w-40 flex-1 flex-wrap items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, metrics.length - 1)}
                                    value={playbackIndex}
                                    onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                                    aria-label="回放进度"
                                    className="accent-primary min-w-16 flex-1"
                                />
                                <span className="text-muted-foreground shrink-0 font-mono text-xs font-semibold tabular-nums">
                                    {playbackIndex + 1} / {metrics.length} 秒
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-1 flex-col overflow-hidden">
                            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
                                <span className="text-foreground text-xs font-bold">
                                    进程快照 ({filteredProcesses.length} 个进程)
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        placeholder="搜索进程..."
                                        value={procSearch}
                                        onChange={(e) => setProcSearch(e.target.value)}
                                        aria-label="搜索进程"
                                        className="h-7 w-40 px-3 text-xs"
                                    />
                                    <SegmentedControl
                                        size="sm"
                                        aria-label="进程快照排序"
                                        allowReselect
                                        value={procSortField}
                                        onChange={(field) =>
                                            setProcSortField(field as 'cpu' | 'mem')
                                        }
                                        options={PROC_SORT_OPTIONS}
                                    />
                                </div>
                            </div>

                            <div className="bg-plot min-h-32 flex-1 overflow-auto rounded-sm border">
                                <Table>
                                    <TableHeader className="border-border bg-card sticky top-0 z-10 border-b">
                                        <TableRow className="text-muted-foreground text-xs font-bold uppercase">
                                            <TableHead className="w-16 px-4 py-2">PID</TableHead>
                                            <TableHead className="px-4 py-2">名称</TableHead>
                                            <TableHead className="w-20 px-4 py-2 text-right">
                                                CPU
                                            </TableHead>
                                            <TableHead className="w-24 px-4 py-2 text-right">
                                                内存
                                            </TableHead>
                                            <TableHead className="px-4 py-2">可执行路径</TableHead>
                                            <TableHead className="px-4 py-2">命令行参数</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="font-mono text-xs">
                                        {filteredProcesses.map((p) => {
                                            const isSelected = selectedProcess?.pid === p.pid
                                            return (
                                                <TableRow
                                                    key={p.pid}
                                                    onClick={() =>
                                                        setSelectedProcess(isSelected ? null : p)
                                                    }
                                                    className={`border-border cursor-pointer border-b transition-colors select-none ${
                                                        isSelected
                                                            ? 'bg-primary/10 text-foreground'
                                                            : 'text-foreground hover:bg-secondary/40'
                                                    }`}>
                                                    <TableCell className="text-muted-foreground px-4 py-1.5 font-bold">
                                                        {p.pid}
                                                    </TableCell>
                                                    <TableCell className="text-foreground px-4 py-1.5 font-semibold">
                                                        {p.name}
                                                    </TableCell>
                                                    <TableCell className="text-chart-cpu px-4 py-1.5 text-right font-bold tabular-nums">
                                                        {p.cpu.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell className="text-chart-mem px-4 py-1.5 text-right font-bold tabular-nums">
                                                        {formatKB(p.mem)}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-muted-foreground/80 max-w-xs truncate px-4 py-1.5"
                                                        title={p.execfile || ''}>
                                                        {p.execfile || '-'}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-muted-foreground/80 max-w-xs truncate px-4 py-1.5"
                                                        title={p.cmdline || ''}>
                                                        {p.cmdline || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {filteredProcesses.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="text-muted-foreground py-8 text-center text-xs">
                                                    无进程快照
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <ProcessDetailDrawer
                                process={selectedProcess}
                                onClose={() => setSelectedProcess(null)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <ExportProgressModal
                isOpen={isExporting}
                progress={exportProgress}
                stepText={exportStepText}
                steps={exportSteps}
                error={exportError}
                onClose={closeExportModal}
            />
        </div>
    )
}
