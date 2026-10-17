import { useState, useEffect, useCallback } from 'react'

import { tauriBridge, McpStatusInfo, McpAuditLog } from '@/infrastructure/tauri/bridge'

export function useMcpServer() {
    const [status, setStatus] = useState<McpStatusInfo | null>(null)
    const [auditLogs, setAuditLogs] = useState<McpAuditLog[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchStatus = useCallback(async () => {
        try {
            const s = await tauriBridge.getMcpServerStatus()
            setStatus(s)
            setError(null)
        } catch (err: any) {
            setError(err?.message || String(err))
        }
    }, [])

    const startServer = useCallback(
        async (port?: number) => {
            setIsLoading(true)
            setError(null)
            try {
                await tauriBridge.restartMcpServer(port || 3001)
                await fetchStatus()
            } catch (err: any) {
                setError(err?.message || String(err))
                throw err
            } finally {
                setIsLoading(false)
            }
        },
        [fetchStatus],
    )

    const stopServer = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            await tauriBridge.stopMcpServer()
            await fetchStatus()
        } catch (err: any) {
            setError(err?.message || String(err))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [fetchStatus])

    const resetToken = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const newStatus = await tauriBridge.resetMcpToken()
            setStatus(newStatus)
            return newStatus
        } catch (err: any) {
            setError(err?.message || String(err))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const setAllowExecCommand = useCallback(async (allow: boolean) => {
        setIsLoading(true)
        setError(null)
        try {
            const newStatus = await tauriBridge.setMcpAllowExecCommand(allow)
            setStatus(newStatus)
            return newStatus
        } catch (err: any) {
            setError(err?.message || String(err))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const clearLogs = useCallback(() => {
        setAuditLogs([])
    }, [])

    useEffect(() => {
        let isMounted = true
        const poll = async () => {
            try {
                const s = await tauriBridge.getMcpServerStatus()
                if (isMounted) {
                    setStatus(s)
                    setError(null)
                }
            } catch (err: any) {
                if (isMounted) setError(err?.message || String(err))
            }
        }
        poll()
        const interval = setInterval(poll, 3000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [])

    useEffect(() => {
        return tauriBridge.onMcpAuditLog((log) => {
            setAuditLogs((prev) => [log, ...prev.slice(0, 49)])
        })
    }, [])

    return {
        status,
        auditLogs,
        isLoading,
        error,
        fetchStatus,
        startServer,
        restartServer: startServer,
        stopServer,
        resetToken,
        setAllowExecCommand,
        clearLogs,
    }
}
