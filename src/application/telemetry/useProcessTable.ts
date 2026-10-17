import { useState, useMemo, useCallback } from 'react'

import { ProcessInfo } from '@/domain/process/types'

export function useProcessTable(processes: ProcessInfo[]) {
    const [searchTerm, setSearchTerm] = useState('')
    const [sortField, setSortField] = useState<'pid' | 'cpu' | 'mem'>('pid')
    const [sortAsc, setSortAsc] = useState(false)
    const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null)
    const [copiedField, setCopiedField] = useState<'cmd' | 'exe' | null>(null)

    const handleSort = useCallback((field: 'pid' | 'cpu' | 'mem') => {
        setSortField((prevField) => {
            if (prevField === field) {
                setSortAsc((prevAsc) => !prevAsc)
                return prevField
            } else {
                setSortAsc(false)
                return field
            }
        })
    }, [])

    const handleCopy = useCallback((text: string, field: 'cmd' | 'exe') => {
        navigator.clipboard?.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }, [])

    const filteredProcesses = useMemo(() => {
        return processes
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.pid.toString().includes(searchTerm),
            )
            .sort((a, b) => {
                const valA = a[sortField]
                const valB = b[sortField]
                if (valA !== valB) {
                    return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1
                }
                return b.pid - a.pid
            })
    }, [processes, searchTerm, sortField, sortAsc])

    const updatedSelectedProcess = useMemo(() => {
        if (!selectedProcess) return null
        const found = processes.find((p) => p.pid === selectedProcess.pid)
        return found || selectedProcess
    }, [processes, selectedProcess])

    return {
        searchTerm,
        setSearchTerm,
        sortField,
        sortAsc,
        selectedProcess: updatedSelectedProcess,
        setSelectedProcess,
        copiedField,
        handleSort,
        handleCopy,
        filteredProcesses,
    }
}
