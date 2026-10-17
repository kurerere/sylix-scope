import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ProcessInfo } from '@/domain/process/types'

import { useProcessTable } from './useProcessTable'

describe('useProcessTable', () => {
    const mockProcesses: ProcessInfo[] = [
        { pid: 10, name: 'system_server', cpu: 15.5, mem: 2048, cmdline: null, execfile: null },
        { pid: 2, name: 'init', cpu: 1.0, mem: 512, cmdline: null, execfile: null },
        { pid: 30, name: 'network_daemon', cpu: 5.2, mem: 4096, cmdline: null, execfile: null },
    ]

    it('filters processes by name and pid', () => {
        const { result } = renderHook(({ procs }) => useProcessTable(procs), {
            initialProps: { procs: mockProcesses },
        })

        expect(result.current.filteredProcesses.length).toBe(3)

        act(() => {
            result.current.setSearchTerm('server')
        })
        expect(result.current.filteredProcesses.length).toBe(1)
        expect(result.current.filteredProcesses[0].name).toBe('system_server')

        act(() => {
            result.current.setSearchTerm('2')
        })
        expect(result.current.filteredProcesses.length).toBe(1)
        expect(result.current.filteredProcesses[0].pid).toBe(2)
    })

    it('sorts processes by cpu, mem and pid', () => {
        const { result } = renderHook(() => useProcessTable(mockProcesses))

        act(() => {
            result.current.handleSort('cpu')
        })
        expect(result.current.sortField).toBe('cpu')
        expect(result.current.sortAsc).toBe(false)
        expect(result.current.filteredProcesses[0].cpu).toBe(15.5)

        act(() => {
            result.current.handleSort('cpu')
        })
        expect(result.current.sortAsc).toBe(true)
        expect(result.current.filteredProcesses[0].cpu).toBe(1.0)
    })

    it('tracks selected process across process updates', () => {
        const { result, rerender } = renderHook(({ procs }) => useProcessTable(procs), {
            initialProps: { procs: mockProcesses },
        })

        act(() => {
            result.current.setSelectedProcess(mockProcesses[0])
        })
        expect(result.current.selectedProcess?.pid).toBe(10)

        const updatedProcs: ProcessInfo[] = [
            { pid: 10, name: 'system_server', cpu: 22.0, mem: 2048, cmdline: null, execfile: null },
            { pid: 2, name: 'init', cpu: 1.0, mem: 512, cmdline: null, execfile: null },
        ]
        rerender({ procs: updatedProcs })

        expect(result.current.selectedProcess?.cpu).toBe(22.0)
    })

    it('correctly sorts processes by multiple fields', () => {
        const procs: ProcessInfo[] = [
            { pid: 10, name: 'system_server', cpu: 5.0, mem: 2048, cmdline: null, execfile: null },
            { pid: 0, name: 'kernel', cpu: 15.0, mem: 0, cmdline: null, execfile: null },
            { pid: 2, name: 'init', cpu: 20.0, mem: 512, cmdline: null, execfile: null },
        ]

        const { result } = renderHook(() => useProcessTable(procs))

        act(() => {
            result.current.handleSort('cpu')
        })
        expect(result.current.filteredProcesses[0].pid).toBe(2)
        expect(result.current.filteredProcesses[1].pid).toBe(0)
        expect(result.current.filteredProcesses[2].pid).toBe(10)
    })
})
