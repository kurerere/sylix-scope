import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NetInterface, NetSocket, RouteEntry, NetStatistics } from '@/domain/network/types'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { isListenSocket, isWildcardRemote, useNetworkDiagnostics } from './useNetworkDiagnostics'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getNetworkInterfaces: vi.fn(),
        getNetworkSockets: vi.fn(),
        getNetworkRoutes: vi.fn(),
        getNetworkStats: vi.fn(),
    },
}))

describe('useNetworkDiagnostics', () => {
    const mockInterfaces: NetInterface[] = [
        {
            name: 'en1',
            mtu: 1500,
            rx_bytes: 10240,
            rx_packets: 100,
            rx_errors: 0,
            rx_drops: 0,
            rx_overruns: 0,
            tx_bytes: 20480,
            tx_packets: 200,
            tx_errors: 0,
            tx_drops: 0,
            tx_overruns: 0,
            flags: 'UBLEthG',
        },
    ]

    const mockSockets: NetSocket[] = [
        {
            protocol: 'TCP',
            local_addr: '*:23',
            remote_addr: '*:*',
            status: 'LISTEN',
            retrans: 0,
            rcv_wnd: 65535,
            snd_wnd: 65535,
        },
        {
            protocol: 'TCP',
            local_addr: '192.168.2.37:23',
            remote_addr: '192.168.2.105:51234',
            status: 'ESTABLISHED',
            retrans: 0,
            rcv_wnd: 65535,
            snd_wnd: 65535,
        },
        {
            protocol: 'UDP',
            local_addr: '*:161',
            remote_addr: '*:*',
            status: '-',
            retrans: 0,
            rcv_wnd: 0,
            snd_wnd: 0,
        },
    ]

    const mockRoutes: RouteEntry[] = [
        {
            destination: '0.0.0.0',
            gateway: '192.168.1.1',
            flags: 'UG',
            refcnt: 0,
            use_cnt: 0,
            metric: 1,
            iface: 'en1',
        },
    ]

    const mockStats: NetStatistics = {
        ip: { 'Total packets': 1000 },
        icmp: {},
        tcp: { 'Active opens': 50 },
        udp: {},
        raw_lines: ['IP Statistics: Total packets: 1000'],
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(tauriBridge.getNetworkInterfaces).mockResolvedValue(mockInterfaces)
        vi.mocked(tauriBridge.getNetworkSockets).mockResolvedValue(mockSockets)
        vi.mocked(tauriBridge.getNetworkRoutes).mockResolvedValue(mockRoutes)
        vi.mocked(tauriBridge.getNetworkStats).mockResolvedValue(mockStats)
    })

    it('loads interfaces on initial mount if isMonitoring is true', async () => {
        const { result } = renderHook(() => useNetworkDiagnostics({ isMonitoring: true }))

        await act(async () => {
            await Promise.resolve()
        })

        expect(tauriBridge.getNetworkInterfaces).toHaveBeenCalledTimes(1)
        expect(result.current.interfaces).toEqual(mockInterfaces)
        expect(result.current.summary.totalInterfaces).toBe(1)
    })

    it('does not load data if isMonitoring is false', async () => {
        renderHook(() => useNetworkDiagnostics({ isMonitoring: false }))

        await act(async () => {
            await Promise.resolve()
        })

        expect(tauriBridge.getNetworkInterfaces).not.toHaveBeenCalled()
    })

    it('fetches sockets when activeSubTab changes to sockets', async () => {
        const { result } = renderHook(() => useNetworkDiagnostics({ isMonitoring: true }))

        await act(async () => {
            result.current.setActiveSubTab('sockets')
        })

        expect(tauriBridge.getNetworkSockets).toHaveBeenCalledWith(undefined)
        expect(result.current.sockets.length).toBe(3)
        // TCP (*:23) 和 UDP (*:161) 均为监听服务
        expect(result.current.summary.listenSocketsCount).toBe(2)
        expect(result.current.summary.connectedSocketsCount).toBe(1)
        expect(result.current.summary.establishedCount).toBe(1)
        expect(result.current.summary.udpCount).toBe(1)
    })

    it('filters sockets by socketTypeFilter (listen and connected) and search query', async () => {
        const { result } = renderHook(() => useNetworkDiagnostics({ isMonitoring: true }))

        await act(async () => {
            result.current.setActiveSubTab('sockets')
        })

        expect(result.current.socketTypeFilter).toBe('all')
        expect(result.current.sockets.length).toBe(3)
        expect(result.current.summary.connectedSocketsCount).toBe(1)
        expect(result.current.summary.listenSocketsCount).toBe(2)

        act(() => {
            result.current.setSocketTypeFilter('listen')
        })
        expect(result.current.sockets.length).toBe(2)
        expect(result.current.sockets.map((s) => s.local_addr)).toEqual(['*:23', '*:161'])
        expect(result.current.onlyListen).toBe(true)

        // 仅包含真正的已连接会话 (ESTABLISHED)，UDP 监听端点不会混入
        act(() => {
            result.current.setSocketTypeFilter('connected')
        })
        expect(result.current.sockets.length).toBe(1)
        expect(result.current.sockets[0].status).toBe('ESTABLISHED')
        expect(result.current.sockets[0].local_addr).toBe('192.168.2.37:23')
        expect(result.current.onlyListen).toBe(false)

        // 纯前端协议筛选时，顶部全局指标卡不随协议筛选跳变
        act(() => {
            result.current.setSocketTypeFilter('all')
            result.current.setSelectedProtocol('UDP')
        })
        expect(result.current.sockets.length).toBe(1)
        expect(result.current.sockets[0].protocol).toBe('UDP')
        expect(result.current.summary.totalSockets).toBe(3)
        expect(result.current.summary.listenSocketsCount).toBe(2)

        act(() => {
            result.current.setSelectedProtocol('ALL')
            result.current.setSocketTypeFilter('all')
            result.current.setSocketSearch('161')
        })
        expect(result.current.sockets.length).toBe(1)
        expect(result.current.sockets[0].protocol).toBe('UDP')
    })

    it('fetches routes when switching to routes tab', async () => {
        const { result } = renderHook(() => useNetworkDiagnostics({ isMonitoring: true }))

        await act(async () => {
            result.current.setActiveSubTab('routes')
        })

        expect(tauriBridge.getNetworkRoutes).toHaveBeenCalled()
        expect(result.current.routes).toEqual(mockRoutes)
    })
})

describe('isWildcardRemote', () => {
    it.each([
        ['', true],
        ['-', true],
        ['*:*', true],
        ['*:0', true],
        ['0.0.0.0:0', true],
        ['*:23', false],
        ['192.168.2.105:63083', false],
    ])('isWildcardRemote(%j) === %j', (input, expected) => {
        expect(isWildcardRemote(input)).toBe(expected)
    })
})

const sock = (overrides: Partial<NetSocket>): NetSocket => ({
    protocol: 'TCP',
    local_addr: '*:23',
    remote_addr: '*:*',
    status: 'LISTEN',
    retrans: 0,
    rcv_wnd: 0,
    snd_wnd: 0,
    ...overrides,
})

describe('isListenSocket', () => {
    it.each([
        ['explicit LISTEN (uppercase)', sock({ status: 'LISTEN' }), true],
        ['explicit listen (lowercase)', sock({ status: 'listen' }), true],
        [
            'established TCP session',
            sock({ status: 'estab', remote_addr: '192.168.1.181:56907' }),
            false,
        ],
        [
            'UNIX estab with empty remote (SylixOS unnamed socket)',
            sock({ protocol: 'UNIX', local_addr: '-', remote_addr: '-', status: 'estab' }),
            false,
        ],
        ['UNIX listening socket', sock({ protocol: 'UNIX', status: 'listen' }), true],
        [
            'UNIX socket without status and empty remote',
            sock({ protocol: 'UNIX', local_addr: '-', remote_addr: '-', status: '-' }),
            true,
        ],
        [
            'UDP unbound endpoint',
            sock({ protocol: 'UDP', local_addr: '*:161', remote_addr: '*:0', status: '-' }),
            true,
        ],
    ])('%s -> %j', (_name, input, expected) => {
        expect(isListenSocket(input)).toBe(expected)
    })
})

describe('useNetworkDiagnostics with real board socket data', () => {
    // 复刻 SylixOS netstat 全量输出的解析形态（v1.0.11 用户报告场景）
    const boardSockets: NetSocket[] = [
        ...Array.from({ length: 14 }, (): NetSocket => ({
            protocol: 'UNIX',
            local_addr: '-',
            remote_addr: '-',
            status: 'estab',
            retrans: 0,
            rcv_wnd: 0,
            snd_wnd: 0,
            raw_info: 'Type: stream, Flag: 4002, Path: -',
        })),
        ...['*:21', '*:22', '*:23', '*:3000'].map((local_addr): NetSocket => ({
            protocol: 'TCP',
            local_addr,
            remote_addr: '*:*',
            status: 'listen',
            retrans: 0,
            rcv_wnd: 0,
            snd_wnd: 0,
        })),
        {
            protocol: 'TCP',
            local_addr: '192.168.1.186:23',
            remote_addr: '192.168.1.181:56907',
            status: 'estab',
            retrans: 0,
            rcv_wnd: 131070,
            snd_wnd: 65280,
        },
        ...['*:137', '*:161'].map((local_addr): NetSocket => ({
            protocol: 'UDP',
            local_addr,
            remote_addr: '*:0',
            status: '-',
            retrans: 0,
            rcv_wnd: 0,
            snd_wnd: 0,
            raw_info: 'UDPLite: no',
        })),
    ]

    beforeEach(() => {
        vi.mocked(tauriBridge.getNetworkSockets).mockResolvedValue(boardSockets)
    })

    it('separates listen and connected sessions exactly like the board does', async () => {
        const { result } = renderHook(() => useNetworkDiagnostics({ isMonitoring: true }))

        await act(async () => {
            result.current.setActiveSubTab('sockets')
        })

        expect(result.current.summary.totalSockets).toBe(21)
        expect(result.current.summary.listenSocketsCount).toBe(6)
        expect(result.current.summary.establishedCount).toBe(15)
        expect(result.current.summary.udpCount).toBe(2)

        act(() => {
            result.current.setSocketTypeFilter('listen')
        })
        expect(result.current.sockets).toHaveLength(6)
        expect(result.current.sockets.every((s) => !s.status.toLowerCase().includes('estab'))).toBe(
            true,
        )

        act(() => {
            result.current.setSelectedProtocol('TCP')
        })
        expect(result.current.sockets).toHaveLength(4)

        act(() => {
            result.current.setSelectedProtocol('ALL')
            result.current.setSocketTypeFilter('connected')
        })
        expect(result.current.sockets).toHaveLength(15)
        expect(
            result.current.sockets.every((s) => !s.status.toLowerCase().includes('listen')),
        ).toBe(true)
    })
})
