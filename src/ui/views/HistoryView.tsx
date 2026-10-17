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
        <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
            <div className="border-border bg-card flex w-80 shrink-0 flex-col rounded-sm border p-4">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-foreground text-xs font-bold">录制历史</span>
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
                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
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
                            className={`group relative flex cursor-pointer flex-col rounded-sm border p-3.5 transition-colors duration-200 ${
                                selectedRecord?.id === rec.id
                                    ? 'border-primary/40 bg-primary/10 text-foreground'
                                    : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
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
                                <div className="flex items-center gap-1.5">
                                    <span
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            setEditingRecordId(`sidebar-${rec.id}`)
                                        }}
                                        className="max-w-[80%] truncate text-xs font-semibold"
                                        title="双击可重命名">
                                        {rec.name}
                                    </span>
                                </div>
                            )}
                            <span className="text-muted-foreground mt-1.5 font-mono text-[0.5625rem]">
                                {formatDate(rec.start_time)}
                            </span>
                            <div className="text-muted-foreground mt-2 flex items-center justify-between text-[0.625rem]">
                                <span>时长: {formatDuration(rec.start_time, rec.end_time)}</span>
                            </div>
                            {editingRecordId !== `sidebar-${rec.id}` && (
                                <div
                                    className={`absolute top-2.5 right-2.5 flex items-center transition-opacity duration-200 ${
                                        deletingId === rec.id
                                            ? 'opacity-100'
                                            : 'gap-1.5 opacity-0 group-hover:opacity-100'
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
                        <div className="text-muted-foreground py-12 text-center text-xs">
                            暂无录制历史
                        </div>
                    )}
                </div>
            </div>

            <div className="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-sm border p-6">
                {!selectedRecord ? (
                    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center">
                        <Clock className="text-muted-foreground/40 mb-3 size-10" />
                        <span className="text-muted-foreground text-xs font-semibold">
                            请在左侧列表中选择一次性能录制以载入回放
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex-1">
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
                                    <div className="group flex items-center gap-2">
                                        <h3 className="text-foreground max-w-[400px] truncate text-sm font-bold">
                                            {selectedRecord.name}
                                        </h3>
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
                                                className="text-muted-foreground/60 hover:text-primary cursor-pointer opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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

                        <div className="border-border bg-secondary/30 h-44 w-full shrink-0 rounded-sm border p-2.5">
                            <PlaybackChart
                                metrics={metrics}
                                playbackIndex={playbackIndex}
                                onSelectIndex={handleSelectIndex}
                            />
                        </div>

                        <div className="border-border bg-secondary/40 mt-4 flex shrink-0 items-center gap-4 rounded-sm border p-3 select-none">
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

                            <div className="flex flex-1 items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, metrics.length - 1)}
                                    value={playbackIndex}
                                    onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                                    aria-label="回放进度"
                                    className="bg-secondary accent-primary h-1 flex-1 cursor-pointer appearance-none rounded-sm"
                                />
                                <span className="text-muted-foreground shrink-0 font-mono text-xs font-semibold tabular-nums">
                                    {playbackIndex + 1} / {metrics.length} 秒
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-1 flex-col overflow-hidden">
                            <div className="mb-3 flex shrink-0 items-center justify-between">
                                <span className="text-foreground text-xs font-bold">
                                    进程快照 ({filteredProcesses.length} 个进程)
                                </span>
                                <div className="flex items-center gap-3">
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

                            <div className="border-border bg-secondary/10 flex-1 overflow-y-auto rounded-sm border">
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
