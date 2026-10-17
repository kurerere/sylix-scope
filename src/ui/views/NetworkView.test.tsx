import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useTelemetrySession } from '@/application/telemetry/TelemetrySessionContext'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { NetworkView } from './NetworkView'

vi.mock('@/application/telemetry/TelemetrySessionContext', () => ({
    useTelemetrySession: vi.fn(),
}))

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getNetworkInterfaces: vi.fn(),
        getNetworkSockets: vi.fn(),
        getNetworkRoutes: vi.fn(),
        getNetworkStats: vi.fn(),
    },
}))

describe('NetworkView Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useTelemetrySession).mockReturnValue({
            isMonitoring: true,
            isConnecting: false,
            isRebooting: false,
            isRecording: false,
            recordingSeconds: 0,
            ip: '192.168.1.100',
            port: 23,
            username: 'root',
            password: 'root',
            statusMessage: '正常运行',
            statusType: 'success',
            config: { ip: '192.168.1.100', port: 23, username: 'root', password: 'root' },
            historyList: [],
            deleteHistoryItem: vi.fn(),
            updateConfig: vi.fn(),
            startMonitoring: vi.fn(),
            stopMonitoring: vi.fn(),
            toggleRecording: vi.fn(),
            rebootTarget: vi.fn(),
        })

        vi.mocked(tauriBridge.getNetworkInterfaces).mockResolvedValue([
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
        ])

        vi.mocked(tauriBridge.getNetworkSockets).mockResolvedValue([
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
                local_addr: '192.168.1.100:23',
                remote_addr: '192.168.1.50:54321',
                status: 'ESTABLISHED',
                retrans: 0,
                rcv_wnd: 65535,
                snd_wnd: 65535,
            },
            {
                protocol: 'UDP',
                local_addr: '*:9001',
                remote_addr: '*:0',
                status: '-',
                retrans: 0,
                rcv_wnd: 0,
                snd_wnd: 0,
                raw_info: 'UDPLite: no',
            },
        ])

        vi.mocked(tauriBridge.getNetworkRoutes).mockResolvedValue([
            {
                destination: '0.0.0.0',
                gateway: '192.168.1.1',
                flags: 'UG',
                refcnt: 0,
                use_cnt: 0,
                metric: 1,
                iface: 'en1',
            },
        ])

        vi.mocked(tauriBridge.getNetworkStats).mockResolvedValue({
            ip: { 'Total packets': 1000 },
            icmp: {},
            tcp: {},
            udp: {},
            raw_lines: [],
        })
    })

    it('renders unmonitored state when isMonitoring is false', () => {
        vi.mocked(useTelemetrySession).mockReturnValue({
            isMonitoring: false,
            isConnecting: false,
            isRebooting: false,
            isRecording: false,
            recordingSeconds: 0,
            ip: '192.168.1.100',
            port: 23,
            username: 'root',
            password: 'root',
            statusMessage: '未连接',
            statusType: 'info',
            config: { ip: '192.168.1.100', port: 23, username: 'root', password: 'root' },
            historyList: [],
            deleteHistoryItem: vi.fn(),
            updateConfig: vi.fn(),
            startMonitoring: vi.fn(),
            stopMonitoring: vi.fn(),
            toggleRecording: vi.fn(),
            rebootTarget: vi.fn(),
        })

        render(<NetworkView />)
        expect(screen.getByText('未连接板卡')).toBeDefined()
    })

    it('renders network interfaces and summary cards when monitored', async () => {
        render(<NetworkView />)

        await act(async () => {
            await Promise.resolve()
        })

        expect(screen.getByText('网络接口状态与流量')).toBeDefined()
        expect(screen.getByText('en1')).toBeDefined()
        expect(screen.getByText('UBLEthG')).toBeDefined()

        // 验证自动刷新使用 SegmentedControl 预制组件而非下拉组件
        const refreshGroup = screen.getByRole('group', { name: '选择自动刷新频率' })
        expect(refreshGroup).toBeDefined()
        const manualOption = screen.getByRole('button', { name: '关闭自动刷新' })
        expect(manualOption.getAttribute('aria-pressed')).toBe('true')
        expect(screen.getByRole('button', { name: '每 3 秒刷新一次' })).toBeDefined()
        expect(screen.queryByRole('combobox')).toBeNull()
        expect(screen.queryByRole('select')).toBeNull()
    })

    it('switches sub-tabs when clicked', async () => {
        render(<NetworkView />)

        await act(async () => {
            await Promise.resolve()
        })

        const socketTabBtn = screen.getByText('套接字连接')
        await act(async () => {
            fireEvent.click(socketTabBtn)
        })

        expect(tauriBridge.getNetworkSockets).toHaveBeenCalled()
        expect(screen.getByText('*:23')).toBeDefined()
        expect(screen.getAllByText('LISTEN').length).toBeGreaterThanOrEqual(1)

        const routeTabBtn = screen.getByText('路由表')
        await act(async () => {
            fireEvent.click(routeTabBtn)
        })

        expect(tauriBridge.getNetworkRoutes).toHaveBeenCalled()
        expect(screen.getByText('0.0.0.0')).toBeDefined()
        expect(screen.getByText('192.168.1.1')).toBeDefined()

        const rawTabBtn = screen.getByText('原始统计')
        await act(async () => {
            fireEvent.click(rawTabBtn)
        })

        expect(tauriBridge.getNetworkStats).toHaveBeenCalled()
    })

    it('filters sockets between LISTEN and connected via segmented buttons', async () => {
        render(<NetworkView />)

        await act(async () => {
            await Promise.resolve()
        })

        const socketTabBtn = screen.getByText('套接字连接')
        await act(async () => {
            fireEvent.click(socketTabBtn)
        })

        expect(screen.getByText('*:23')).toBeDefined()
        expect(screen.getByText('192.168.1.100:23')).toBeDefined()
        expect(screen.getByText('*:9001')).toBeDefined()

        const listenBtn = screen.getByText('监听 (LISTEN)')
        await act(async () => {
            fireEvent.click(listenBtn)
        })
        expect(screen.getByText('*:23')).toBeDefined()
        expect(screen.getByText('*:9001')).toBeDefined()
        expect(screen.queryByText('192.168.1.100:23')).toBeNull()

        const connectedBtn = screen.getByText('连接')
        await act(async () => {
            fireEvent.click(connectedBtn)
        })
        expect(screen.queryByText('*:23')).toBeNull()
        expect(screen.queryByText('*:9001')).toBeNull()
        expect(screen.getByText('192.168.1.100:23')).toBeDefined()
    })

    it('navigates and filters sockets when clicking summary cards', async () => {
        render(<NetworkView />)

        await act(async () => {
            await Promise.resolve()
        })

        const estabCard = screen.getByText('活动连接 (ESTAB)').closest('button')
        expect(estabCard).not.toBeNull()
        await act(async () => {
            fireEvent.click(estabCard!)
        })

        expect(screen.queryByText('*:23')).toBeNull()
        expect(screen.queryByText('*:9001')).toBeNull()
        expect(screen.getByText('192.168.1.100:23')).toBeDefined()

        const listenCard = screen.getByText('监听服务 (LISTEN)').closest('button')
        expect(listenCard).not.toBeNull()
        await act(async () => {
            fireEvent.click(listenCard!)
        })

        expect(screen.getByText('*:23')).toBeDefined()
        expect(screen.getByText('*:9001')).toBeDefined()
        expect(screen.queryByText('192.168.1.100:23')).toBeNull()

        const udpCard = screen.getByText('UDP 端点').closest('button')
        expect(udpCard).not.toBeNull()
        await act(async () => {
            fireEvent.click(udpCard!)
        })

        expect(screen.getByText('*:9001')).toBeDefined()
        expect(screen.queryByText('*:23')).toBeNull()
        expect(screen.queryByText('192.168.1.100:23')).toBeNull()

        const ifaceCard = screen.getByText('个网卡').closest('button')
        expect(ifaceCard).not.toBeNull()
        await act(async () => {
            fireEvent.click(ifaceCard!)
        })

        expect(screen.getByText('网络接口状态与流量')).toBeDefined()
    })
})
