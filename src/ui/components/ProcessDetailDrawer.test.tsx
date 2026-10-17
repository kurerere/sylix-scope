import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProcessInfo } from '@/domain/process/types'

import { ProcessDetailDrawer } from './ProcessDetailDrawer'

const mockProcess: ProcessInfo = {
    pid: 123,
    name: 'test-service',
    cpu: 15.5,
    mem: 2048,
    cmdline: '/bin/test-service --daemon',
    execfile: '/bin/test-service',
    threads: [
        {
            name: 'th-worker',
            tid: '40000a1',
            tid_decimal: 67109025,
            cpu: 10.2,
        },
        {
            name: 'th-io',
            tid: '40000a2',
            tid_decimal: 67109026,
            cpu: 5.3,
        },
    ],
}

describe('ProcessDetailDrawer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders nothing when process is null', () => {
        const { container } = render(<ProcessDetailDrawer process={null} onClose={vi.fn()} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders process metadata, command line, executable path and thread list', () => {
        const onClose = vi.fn()
        render(<ProcessDetailDrawer process={mockProcess} onClose={onClose} />)

        expect(screen.getByText('进程分析：PID 123')).toBeDefined()
        expect(screen.getByText('test-service')).toBeDefined()
        expect(screen.getByText('15.5%')).toBeDefined()
        expect(screen.getByText('2.0 MB')).toBeDefined()
        expect(screen.getByText('/bin/test-service --daemon')).toBeDefined()
        expect(screen.getByText('/bin/test-service')).toBeDefined()

        expect(screen.getByText('线程列表 (2)')).toBeDefined()
        expect(screen.getByText('th-worker')).toBeDefined()
        expect(screen.getByText('40000a1')).toBeDefined()
        expect(screen.getByText('67109025')).toBeDefined()
        expect(screen.getByText('10.2%')).toBeDefined()
        expect(screen.getByText('th-io')).toBeDefined()
        expect(screen.getByText('40000a2')).toBeDefined()
        expect(screen.getByText('67109026')).toBeDefined()
        expect(screen.getByText('5.3%')).toBeDefined()
    })

    it('handles close button click, backdrop click, and Escape key', () => {
        const onClose = vi.fn()
        render(<ProcessDetailDrawer process={mockProcess} onClose={onClose} />)

        const closeBtn = screen.getByRole('button', { name: '关闭抽屉 (ESC)' })
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)

        const backdrop = document.querySelector('[data-slot="sheet-overlay"]')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalledTimes(2)

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(3)
    })

    it('handles copy parameters and copy path buttons', async () => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        })

        render(<ProcessDetailDrawer process={mockProcess} onClose={vi.fn()} />)

        const copyCmdBtn = screen.getByText('复制参数')
        fireEvent.click(copyCmdBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/bin/test-service --daemon')

        const copyPathBtn = screen.getByText('复制路径')
        fireEvent.click(copyPathBtn)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/bin/test-service')
    })

    it('sorts threads by TID ascending by default and supports sorting by CPU', () => {
        const processWithUnsortedThreads: ProcessInfo = {
            pid: 200,
            name: 'multi-thread-app',
            cpu: 25.0,
            mem: 1024,
            cmdline: null,
            execfile: null,
            threads: [
                { name: 'th-mid', tid: '40000a2', tid_decimal: 67109026, cpu: 20.0 },
                { name: 'th-high', tid: '40000a3', tid_decimal: 67109027, cpu: 5.0 },
                { name: 'th-low', tid: '40000a1', tid_decimal: 67109025, cpu: 15.0 },
            ],
        }

        render(<ProcessDetailDrawer process={processWithUnsortedThreads} onClose={vi.fn()} />)

        let rows = screen.getAllByRole('row')
        expect(rows[1].textContent).toContain('th-low')
        expect(rows[2].textContent).toContain('th-mid')
        expect(rows[3].textContent).toContain('th-high')

        const sortCpuBtn = screen.getByRole('button', { name: /按CPU/ })
        fireEvent.click(sortCpuBtn)

        rows = screen.getAllByRole('row')
        expect(rows[1].textContent).toContain('th-mid')
        expect(rows[2].textContent).toContain('th-low')
        expect(rows[3].textContent).toContain('th-high')

        fireEvent.click(sortCpuBtn)

        rows = screen.getAllByRole('row')
        expect(rows[1].textContent).toContain('th-high')
        expect(rows[2].textContent).toContain('th-low')
        expect(rows[3].textContent).toContain('th-mid')
    })
})
