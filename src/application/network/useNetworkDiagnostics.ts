import { useCallback, useEffect, useRef, useState } from 'react'

import { calculateInterfaceRates } from '@/domain/network/calculations'
import {
    InterfaceRate,
    NetInterface,
    NetSocket,
    NetStatistics,
    RouteEntry,
    SocketProtocol,
} from '@/domain/network/types'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

export type NetworkSubTab = 'interfaces' | 'sockets' | 'routes' | 'stats' | 'raw'
export type SocketTypeFilter = 'all' | 'listen' | 'connected'

export const isWildcardRemote = (remoteAddr: string): boolean => {
    const trimmed = remoteAddr.trim()
    return (
        trimmed === '' ||
        trimmed === '-' ||
        trimmed === '*:*' ||
        trimmed === '*:0' ||
        trimmed.endsWith(':*') ||
        trimmed.endsWith(':0')
    )
}

export const isListenSocket = (sock: NetSocket): boolean => {
    const statusUpper = sock.status.toUpperCase()
    if (statusUpper.includes('LISTEN') || sock.status.toLowerCase() === 'listen') {
        return true
    }
    // 非 ESTAB / 非明确建立态，且远端为通配端点（如 UDP *:0, *:*, UNIX 监听等）
    if (!statusUpper.includes('ESTAB') && isWildcardRemote(sock.remote_addr)) {
        return true
    }
    return false
}

export interface UseNetworkDiagnosticsProps {
    isMonitoring: boolean
}

export function useNetworkDiagnostics({ isMonitoring }: UseNetworkDiagnosticsProps) {
    const [activeSubTab, setActiveSubTab] = useState<NetworkSubTab>('interfaces')
    const [selectedProtocol, setSelectedProtocol] = useState<SocketProtocol>('ALL')
    const [socketSearch, setSocketSearch] = useState('')
    const [socketTypeFilter, setSocketTypeFilter] = useState<SocketTypeFilter>('all')

    // 自动刷新配置：0 表示关闭，其它代表秒数
    const [refreshIntervalSecs, setRefreshIntervalSecs] = useState<number>(0)

    const [interfaces, setInterfaces] = useState<NetInterface[]>([])
    const [interfaceRates, setInterfaceRates] = useState<Map<string, InterfaceRate>>(new Map())
    const [sockets, setSockets] = useState<NetSocket[]>([])
    const [routes, setRoutes] = useState<RouteEntry[]>([])
    const [stats, setStats] = useState<NetStatistics | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)

    // 保存上一帧网卡数据和时间戳用于精确计算速率
    const prevInterfacesRef = useRef<{ list: NetInterface[]; time: number } | null>(null)

    const fetchCurrentTabData = useCallback(
        async (targetTab?: NetworkSubTab) => {
            if (!isMonitoring) {
                return
            }

            const tab = targetTab ?? activeSubTab
            await Promise.resolve()
            setLoading(true)
            setError(null)

            try {
                const now = Date.now()
                switch (tab) {
                    case 'interfaces': {
                        const data = await tauriBridge.getNetworkInterfaces()
                        setInterfaces(data)

                        if (prevInterfacesRef.current) {
                            const deltaSecs = Math.max(
                                0.5,
                                (now - prevInterfacesRef.current.time) / 1000,
                            )
                            const rates = calculateInterfaceRates(
                                prevInterfacesRef.current.list,
                                data,
                                deltaSecs,
                            )
                            setInterfaceRates(rates)
                        }
                        prevInterfacesRef.current = { list: data, time: now }
                        break
                    }
                    case 'sockets': {
                        // 总是拉取全量套接字，使得顶部全局指标卡不因协议切换而跳变，协议过滤在前端内存执行
                        const data = await tauriBridge.getNetworkSockets(undefined)
                        setSockets(data)
                        break
                    }
                    case 'routes': {
                        const data = await tauriBridge.getNetworkRoutes()
                        setRoutes(data)
                        break
                    }
                    case 'stats':
                    case 'raw': {
                        const data = await tauriBridge.getNetworkStats()
                        setStats(data)
                        break
                    }
                }
                setLastRefreshedAt(now)
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                setError(msg)
            } finally {
                setLoading(false)
            }
        },
        [isMonitoring, activeSubTab],
    )

    // 切换子 Tab 时按需自动拉取一次
    useEffect(() => {
        if (isMonitoring) {
            void fetchCurrentTabData(activeSubTab)
        }
    }, [activeSubTab, isMonitoring, fetchCurrentTabData])

    useEffect(() => {
        if (!isMonitoring || refreshIntervalSecs <= 0) {
            return
        }

        const timer = setInterval(() => {
            void fetchCurrentTabData(activeSubTab)
        }, refreshIntervalSecs * 1000)

        return () => clearInterval(timer)
    }, [isMonitoring, refreshIntervalSecs, activeSubTab, fetchCurrentTabData])

    const filteredSockets = sockets.filter((sock) => {
        if (selectedProtocol !== 'ALL') {
            if (sock.protocol.toUpperCase() !== selectedProtocol.toUpperCase()) {
                return false
            }
        }

        if (socketTypeFilter === 'listen' && !isListenSocket(sock)) {
            return false
        }
        if (socketTypeFilter === 'connected' && isListenSocket(sock)) {
            return false
        }

        if (!socketSearch.trim()) {
            return true
        }

        const query = socketSearch.toLowerCase().trim()
        return (
            sock.local_addr.toLowerCase().includes(query) ||
            sock.remote_addr.toLowerCase().includes(query) ||
            sock.status.toLowerCase().includes(query) ||
            sock.protocol.toLowerCase().includes(query) ||
            (sock.raw_info && sock.raw_info.toLowerCase().includes(query))
        )
    })

    const totalInterfaces = interfaces.length
    const totalSockets = sockets.length
    const listenSocketsCount = sockets.filter(isListenSocket).length
    const connectedSocketsCount = sockets.filter((s) => !isListenSocket(s)).length
    const establishedCount = sockets.filter((s) => s.status.toLowerCase().includes('estab')).length
    const udpCount = sockets.filter((s) => s.protocol.toUpperCase() === 'UDP').length

    return {
        activeSubTab,
        setActiveSubTab,
        selectedProtocol,
        setSelectedProtocol,
        socketSearch,
        setSocketSearch,
        socketTypeFilter,
        setSocketTypeFilter,
        onlyListen: socketTypeFilter === 'listen',
        setOnlyListen: (val: boolean) => setSocketTypeFilter(val ? 'listen' : 'all'),
        refreshIntervalSecs,
        setRefreshIntervalSecs,
        interfaces,
        interfaceRates,
        sockets: filteredSockets,
        routes,
        stats,
        loading,
        error,
        lastRefreshedAt,
        fetchCurrentTabData,
        summary: {
            totalInterfaces,
            totalSockets,
            listenSocketsCount,
            connectedSocketsCount,
            establishedCount,
            udpCount,
        },
    }
}
