import { useState, useCallback } from 'react'

import { tauriBridge } from '@/infrastructure/tauri/bridge'
import { ExportStep } from '@/ui/components/ExportProgressModal'

export interface UseHistoryExportOptions {
    delayMs?: number
}

export function useHistoryExport(options?: UseHistoryExportOptions) {
    const delayMs = options?.delayMs ?? 300
    const [isExporting, setIsExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)
    const [exportStepText, setExportStepText] = useState('')
    const [exportSteps, setExportSteps] = useState<ExportStep[]>([])
    const [exportError, setExportError] = useState<string | null>(null)

    const closeExportModal = useCallback(() => {
        setIsExporting(false)
        setExportProgress(0)
        setExportStepText('')
        setExportSteps([])
        setExportError(null)
    }, [])

    const exportRecord = useCallback(
        async (id: number, recordName: string) => {
            setIsExporting(true)
            setExportError(null)
            setExportProgress(10)
            setExportStepText('正在整理录像数据...')

            const steps: ExportStep[] = [
                { label: '整理录像数据', status: 'active' },
                { label: '选择保存路径', status: 'pending' },
                { label: '写入录像文件', status: 'pending' },
                { label: '导出完成', status: 'pending' },
            ]
            setExportSteps([...steps])

            try {
                if (delayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs))
                }

                steps[0].status = 'success'
                steps[1].status = 'active'
                setExportSteps([...steps])
                setExportProgress(40)
                setExportStepText('请选择保存路径...')

                const defaultName = `sylixscope-record-${recordName}-${Date.now()}.json`
                const lastDir = localStorage.getItem('last_export_dir')

                const savePath = await tauriBridge.selectSavePath(defaultName, lastDir)

                if (!savePath) {
                    setIsExporting(false)
                    return
                }

                steps[1].status = 'success'
                steps[2].status = 'active'
                setExportSteps([...steps])
                setExportProgress(70)
                setExportStepText('正在写入文件...')

                await tauriBridge.exportRecordToFile(id, savePath)

                const delimiter = savePath.includes('\\') ? '\\' : '/'
                const parts = savePath.split(delimiter)
                if (parts.length > 1) {
                    parts.pop()
                    const parentDir = parts.join(delimiter)
                    localStorage.setItem('last_export_dir', parentDir)
                }

                steps[2].status = 'success'
                steps[3].status = 'success'
                setExportSteps([...steps])
                setExportProgress(100)
                setExportStepText('导出成功！')

                const notifyTitle = '录像包导出成功'
                const notifyBody = `文件已保存至：${savePath}`

                if (
                    typeof window !== 'undefined' &&
                    !document.hasFocus() &&
                    'Notification' in window
                ) {
                    if (Notification.permission === 'granted') {
                        // eslint-disable-next-line no-new
                        new Notification(notifyTitle, { body: notifyBody })
                    } else if (Notification.permission !== 'denied') {
                        const permission = await Notification.requestPermission()
                        if (permission === 'granted') {
                            // eslint-disable-next-line no-new
                            new Notification(notifyTitle, { body: notifyBody })
                        }
                    }
                }
            } catch (e: any) {
                setExportError(e?.message || e?.toString() || '导出发生未知错误')
                const activeIdx = steps.findIndex((s) => s.status === 'active')
                if (activeIdx !== -1) {
                    steps[activeIdx].status = 'error'
                }
                setExportSteps([...steps])
            }
        },
        [delayMs],
    )

    return {
        isExporting,
        exportProgress,
        exportStepText,
        exportSteps,
        exportError,
        exportRecord,
        closeExportModal,
    }
}
