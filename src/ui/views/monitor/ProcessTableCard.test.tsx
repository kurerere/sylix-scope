import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ProcessTableCard } from './ProcessTableCard'

vi.mock('@/ui/components/ProcessDetailDrawer', () => ({
    ProcessDetailDrawer: vi.fn(({ process }: any) =>
        process ? <div data-testid="drawer">详情: {process.name}</div> : null,
    ),
}))
import { ProcessInfo } from '@/domain/process/types'

const procs: ProcessInfo[] = [
    {
        pid: 1,
        name: 'kernel',
        cpu: 4.2,
        mem: 195_000,
        cmdline: null,
        execfile: null,
        threads: [{ name: 'idle', tid: 'a1', tid_decimal: 1, cpu: 4.2 }],
    },
    {
        pid: 41,
        name: 'app_main',
        cpu: 23.6,
        mem: 152_000,
        cmdline: './app_main --v',
        execfile: '/bin/app_main',
        threads: [],
    },
    {
        pid: 99,
        name: 'worker',
        cpu: 1.0,
        mem: 8_000,
        cmdline: '',
        execfile: '',
        threads: [],
    },
]

const summary = {
    totalCount: 3,
    filteredCount: 3,
    totalThreads: 3,
    totalRss: 355_000,
    topCpuProc: procs[1],
}

const base = {
    isMonitoring: true,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    sortField: 'cpu' as const,
    sortAsc: false,
    handleSort: vi.fn(),
    filteredProcesses: procs,
    displayedProcesses: procs,
    displayedPrevProcessesMap: new Map(),
    selectedProcess: null,
    setSelectedProcess: vi.fn(),
    processSummary: summary,
}

describe('ProcessTableCard Component', () => {
    it('renders empty placeholder when not monitoring', () => {
        render(<ProcessTableCard {...base} isMonitoring={false} filteredProcesses={[]} />)
        expect(
            screen.getByText(
                (_, el) => (el?.textContent ?? '').includes('暂无进程数据') && el?.tagName === 'P',
            ),
        ).toBeInTheDocument()
    })

    it('renders process rows with summary footer', () => {
        render(<ProcessTableCard {...base} />)
        expect(screen.getByText('app_main')).toBeInTheDocument()
        expect(screen.getByTestId('process-summary-footer')).toBeInTheDocument()
        expect(screen.getByText('23.6%')).toBeInTheDocument()
    })

    it('shows no-match placeholder when search has no hits', () => {
        render(<ProcessTableCard {...base} filteredProcesses={[]} />)
        expect(
            screen.getByText(
                (_, el) =>
                    (el?.textContent ?? '').includes('未找到匹配的活跃进程') && el?.tagName === 'P',
            ),
        ).toBeInTheDocument()
    })

    it('requests row selection on click', () => {
        const setSelectedProcess = vi.fn()
        render(<ProcessTableCard {...base} setSelectedProcess={setSelectedProcess} />)

        fireEvent.click(screen.getByText('app_main'))
        expect(setSelectedProcess).toHaveBeenCalled()
    })

    it('triggers sort handler on header click', () => {
        const handleSort = vi.fn()
        render(<ProcessTableCard {...base} handleSort={handleSort} />)

        fireEvent.click(screen.getByText('CPU'))
        expect(handleSort).toHaveBeenCalledWith('cpu')
    })

    it('requests selection with the clicked process on row click', () => {
        const setSelectedProcess = vi.fn()
        render(<ProcessTableCard {...base} setSelectedProcess={setSelectedProcess} />)
        fireEvent.click(screen.getByText('app_main'))
        expect(setSelectedProcess).toHaveBeenCalledWith(
            expect.objectContaining({ pid: 41, name: 'app_main' }),
        )
    })

    it('shows search clear button when term present and clears it', () => {
        const setSearchTerm = vi.fn()
        render(<ProcessTableCard {...base} searchTerm="app" setSearchTerm={setSearchTerm} />)
        fireEvent.click(screen.getByRole('button', { name: '清除搜索' }))
        expect(setSearchTerm).toHaveBeenCalledWith('')
    })
})
