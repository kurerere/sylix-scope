import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ThemeProvider } from '@/application/theme/ThemeProvider'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { HistoryView } from './HistoryView'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getRecords: vi.fn(async () => [{ id: 1, name: 'rec-1', start_time: 1000, end_time: 2000 }]),
        getRecordMetrics: vi.fn(async () => []),
        getRecordProcesses: vi.fn(async () => []),
        deleteRecord: vi.fn(async () => {}),
        renameRecord: vi.fn(async () => {}),
    },
}))

describe('HistoryView Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    it('should show InlineEditor when edit button is clicked', async () => {
        render(
            <ThemeProvider>
                <HistoryView />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(screen.getByText('rec-1')).toBeDefined()

        const editButton = screen.getByTitle('重命名')
        expect(editButton).toBeDefined()

        await act(async () => {
            fireEvent.click(editButton)
        })

        await act(async () => {
            vi.runAllTimers()
        })

        const input = screen.getByDisplayValue('rec-1')
        expect(input).toBeDefined()

        // 避免点击编辑触发父级卡片选中的指标加载
        expect(tauriBridge.getRecordMetrics).not.toHaveBeenCalled()
    })

    it('should only show one InlineEditor when editing selected record', async () => {
        render(
            <ThemeProvider>
                <HistoryView />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const recordCard = screen.getByText('rec-1')
        await act(async () => {
            fireEvent.click(recordCard)
        })

        expect(tauriBridge.getRecordMetrics).toHaveBeenCalledWith(1)

        const renameButtons = screen.getAllByRole('button', { name: '重命名' })
        expect(renameButtons.length).toBe(2) // 侧边栏与详情头部各有一个重命名入口

        await act(async () => {
            fireEvent.click(renameButtons[0])
        })

        await act(async () => {
            vi.runAllTimers()
        })

        const inputs = screen.getAllByDisplayValue('rec-1')
        expect(inputs.length).toBe(1)
    })

    it('should show process details and thread table when clicking process row', async () => {
        vi.mocked(tauriBridge.getRecordMetrics).mockResolvedValueOnce([
            {
                timestamp: 1000,
                cpu_usage: 15,
                mem_total: 100,
                mem_used: 20,
                mem_free: 80,
                mem_kernel: 5,
                mem_app: 15,
            },
        ])
        vi.mocked(tauriBridge.getRecordProcesses).mockResolvedValueOnce([
            {
                pid: 42,
                name: 'worker-daemon',
                cpu: 12.0,
                mem: 2048,
                cmdline: '/bin/worker --daemon',
                execfile: '/bin/worker',
                threads: [
                    {
                        name: 'worker-th0',
                        tid: '40000a1',
                        tid_decimal: 67109025,
                        cpu: 8.5,
                    },
                ],
            },
        ])

        render(
            <ThemeProvider>
                <HistoryView />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const recordCard = screen.getByText('rec-1')
        await act(async () => {
            fireEvent.click(recordCard)
        })

        await act(async () => {
            await Promise.resolve()
        })

        expect(screen.getByText('worker-daemon')).toBeDefined()

        const procRow = screen.getByText('worker-daemon').closest('tr')!
        await act(async () => {
            fireEvent.click(procRow)
        })

        expect(screen.getByText(/进程分析：PID 42/)).toBeDefined()
        expect(screen.getAllByText('/bin/worker --daemon').length).toBe(2)
        expect(screen.getAllByText('/bin/worker').length).toBe(2)
        expect(screen.getByText('worker-th0')).toBeDefined()
        expect(screen.getByText('40000a1')).toBeDefined()
        expect(screen.getByText('67109025')).toBeDefined()
        expect(screen.getByText('8.5%')).toBeDefined()

        const closeBtn = screen.getByRole('button', { name: '关闭抽屉 (ESC)' })
        await act(async () => {
            fireEvent.click(closeBtn)
        })

        expect(screen.queryByText(/进程分析：PID 42/)).toBeNull()
    })
})
