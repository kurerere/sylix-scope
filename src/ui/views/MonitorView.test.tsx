import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ThemeProvider } from '@/application/theme/ThemeProvider'
import { SystemMetrics } from '@/domain/metrics/types'
import { ProcessInfo } from '@/domain/process/types'

import { MonitorView } from './MonitorView'

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children, onClick, data }: any) => (
        <svg
            data-testid="mock-area-chart"
            onClick={() => {
                if (onClick && data && data.length > 0) {
                    onClick({
                        activeTooltipIndex: 0,
                        activePayload: [
                            {
                                payload: data[0],
                            },
                        ],
                    })
                }
            }}>
            {children}
        </svg>
    ),
    Area: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <g />,
    ReferenceLine: () => <g data-testid="mock-reference-line" />,
}))

const mockMetrics: SystemMetrics = {
    cpu_usage: 45.5,
    cpu_cores: [40, 50],
    mem_total: 1024 * 1024,
    mem_used: 512 * 1024,
    mem_free: 512 * 1024,
    mem_kernel: 256 * 1024,
    mem_app: 128 * 1024,
}

const mockProcesses: ProcessInfo[] = [
    {
        pid: 1,
        name: 'idle',
        cpu: 10.0,
        mem: 64 * 1024,
        cmdline: 'idle-cmd',
        execfile: '/sbin/idle',
    },
    {
        pid: 2,
        name: 'shell',
        cpu: 20.0,
        mem: 128 * 1024,
        cmdline: 'sh -c hello',
        execfile: '/bin/sh',
        threads: [
            {
                name: 'worker',
                tid: '40000a3',
                tid_decimal: 67109027,
                cpu: 12.5,
            },
        ],
    },
]

let mockSession = {
    isMonitoring: true,
    isConnecting: false,
    config: { ip: '192.168.1.187', port: 23, username: 'root', password: '' },
    statusMessage: '',
    statusType: 'info' as const,
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    updateConfig: vi.fn(),
    isRecording: false,
    recordingSeconds: 0,
    toggleRecording: vi.fn(),
    ip: '192.168.1.187',
    port: 23,
    username: 'root',
    password: '',
    historyList: [],
    deleteHistoryItem: vi.fn(),
}

let mockSnapshot = {
    metrics: mockMetrics,
    processes: mockProcesses,
    prevProcessesMap: new Map<number, ProcessInfo>(),
    analytics: {
        peakCpu: 45.5,
        peakMemPercent: 50.0,
        peakMemUsed: 512 * 1024,
        avgCpu: 45.5,
        avgMemPercent: 50.0,
        isSpiking: false,
        cpuCoresList: [
            { label: 'Core 0', key: 'cpu-core-item-0', usage: 20, originalUsage: 40 },
            { label: 'Core 1', key: 'cpu-core-item-1', usage: 25, originalUsage: 50 },
        ],
        processSummary: {
            totalCount: 2,
            filteredCount: 2,
            totalThreads: 2,
            totalRss: 192 * 1024,
            topCpuProc: mockProcesses[1],
        },
    },
    isPaused: false,
    selectedIndex: null as number | null,
}

let mockChart = {
    chartData: [] as any[],
    selectedIndex: null as number | null,
    setSelectedIndex: vi.fn((idx) => {
        mockChart.selectedIndex = idx
    }),
    isPaused: false,
    setIsPaused: vi.fn((val) => {
        mockChart.isPaused = val
    }),
    historySeconds: 30,
    setHistorySeconds: vi.fn(),
    clearChartData: vi.fn(),
}

let mockThresholds = {
    warningCpu: 90,
    setWarningCpu: vi.fn(),
    warningMem: 90,
    setWarningMem: vi.fn(),
}

vi.mock('@/application/telemetry/TelemetrySessionContext', () => ({
    useTelemetrySession: () => mockSession,
    useTelemetrySnapshot: () => mockSnapshot,
    useTelemetryChart: () => mockChart,
    useTelemetryThresholds: () => mockThresholds,
}))

describe('MonitorView Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSession = {
            ...mockSession,
            isMonitoring: true,
            isConnecting: false,
            config: { ip: '192.168.1.187', port: 23, username: 'root', password: '' },
        }
        mockSnapshot = {
            metrics: mockMetrics,
            processes: mockProcesses,
            prevProcessesMap: new Map(),
            analytics: {
                peakCpu: 45.5,
                peakMemPercent: 50.0,
                peakMemUsed: 512 * 1024,
                avgCpu: 45.5,
                avgMemPercent: 50.0,
                isSpiking: false,
                cpuCoresList: [
                    { label: 'Core 0', key: 'cpu-core-item-0', usage: 20, originalUsage: 40 },
                    { label: 'Core 1', key: 'cpu-core-item-1', usage: 25, originalUsage: 50 },
                ],
                processSummary: {
                    totalCount: 2,
                    filteredCount: 2,
                    totalThreads: 2,
                    totalRss: 192 * 1024,
                    topCpuProc: mockProcesses[1],
                },
            },
            isPaused: false,
            selectedIndex: null,
        }
        mockChart = {
            ...mockChart,
            chartData: [],
            selectedIndex: null,
            isPaused: false,
        }
    })

    it('renders empty states when not monitoring', () => {
        mockSession.isMonitoring = false
        mockSnapshot.processes = []
        mockSnapshot.analytics.processSummary.totalCount = 0

        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByText('暂无监控数据')).toBeDefined()
        expect(screen.getByText('请连接设备并开启实时资源监控以捕获和分析活跃进程。')).toBeDefined()
        expect(screen.getByText('未连接板卡，点击顶部“开始连接”。')).toBeDefined()
    })

    it('renders metrics data and process list when monitoring', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByText('CPU 使用情况')).toBeDefined()
        expect(screen.getByText('内存状态与分配')).toBeDefined()
        expect(screen.getByText('idle')).toBeDefined()
        expect(screen.getByText('shell')).toBeDefined()
    })

    it('filters processes by search term', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        const searchInput = screen.getByPlaceholderText('搜索进程名、命令行或 PID...')
        fireEvent.change(searchInput, { target: { value: 'shell' } })

        expect(screen.queryByText('idle')).toBeNull()
        expect(screen.getByText('shell')).toBeDefined()
    })

    it('supports sorting columns on keyboard keydown event', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        const initialFirstRow = screen.getAllByRole('row')[1]
        expect(initialFirstRow.textContent).toContain('2')

        const pidHeader = screen.getByText('PID').closest('th')
        expect(pidHeader).not.toBeNull()

        if (pidHeader) {
            fireEvent.keyDown(pidHeader, { key: 'Enter', code: 'Enter' })
            const firstRowAfterToggle = screen.getAllByRole('row')[1]
            expect(firstRowAfterToggle.textContent).toContain('1')

            fireEvent.keyDown(pidHeader, { key: 'Enter', code: 'Enter' })
            const secondRowAfterToggle = screen.getAllByRole('row')[1]
            expect(secondRowAfterToggle.textContent).toContain('2')
        }
    })

    it('renders connecting state and config parameters correctly', () => {
        mockSession.isMonitoring = false
        mockSession.isConnecting = true
        mockSession.config.ip = '192.168.1.100'

        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByText('CONNECTING')).toBeDefined()
        expect(screen.getByText('正在连接板卡...')).toBeDefined()
    })

    it('supports selecting historical snapshot by clicking the chart when paused', () => {
        const historicalMetrics: SystemMetrics = {
            ...mockMetrics,
            cpu_usage: 95.0,
        }
        const historicalProcesses: ProcessInfo[] = [
            {
                pid: 99,
                name: 'spiker',
                cpu: 90.0,
                mem: 128 * 1024,
                cmdline: 'spiker-cmd',
                execfile: '/bin/spiker',
            },
        ]
        const chartData = [
            {
                time: '12:00:00',
                cpu: 95.0,
                mem: 50.0,
                metrics: historicalMetrics,
                processes: historicalProcesses,
            },
        ]

        mockChart.isPaused = true
        mockChart.chartData = chartData

        const { rerender } = render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        const chartSvg = screen.getByTestId('mock-area-chart')
        fireEvent.click(chartSvg)

        expect(mockChart.setSelectedIndex).toHaveBeenCalledWith(0)

        mockChart.selectedIndex = 0
        mockSnapshot.processes = historicalProcesses
        rerender(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByText('快照锁定: 12:00:00')).toBeDefined()
        expect(screen.getByText('spiker')).toBeDefined()
        expect(screen.queryByText('idle')).toBeNull()

        const resetBtn = screen.getByRole('button', { name: '清除锁定，返回实时最新' })
        fireEvent.click(resetBtn)

        expect(mockChart.setSelectedIndex).toHaveBeenCalledWith(null)
    })

    it('shows the selected process threads and CPU usage', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        fireEvent.click(screen.getByText('shell').closest('tr')!)

        expect(screen.getByText(/进程分析：PID 2/)).toBeDefined()
        expect(screen.getByText(/线程列表 \(1\)/)).toBeDefined()
        expect(screen.getByText('TID(D)')).toBeDefined()
        expect(screen.getByText('worker')).toBeDefined()
        expect(screen.getByText('12.5%')).toBeDefined()
    })

    it('renders process summary footer metrics correctly in monitoring mode', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByTestId('process-summary-footer')).toBeDefined()
        expect(screen.getByTestId('summary-process-count').textContent).toContain('2')
        expect(screen.getByTestId('summary-thread-count').textContent).toContain('2')
        expect(screen.getByTestId('summary-total-mem').textContent).toContain('192.0 MB')
    })

    it('updates process summary footer when filtering processes', () => {
        render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        const searchInput = screen.getByPlaceholderText('搜索进程名、命令行或 PID...')
        fireEvent.change(searchInput, { target: { value: 'shell' } })

        expect(screen.getByTestId('summary-process-count').textContent).toContain('1 / 2')
    })

    it('renders CPU core usage and scaled progress bar width correctly', () => {
        const { container } = render(
            <ThemeProvider>
                <MonitorView />
            </ThemeProvider>,
        )

        expect(screen.getByText('Core 0')).toBeDefined()
        expect(screen.getByText('Core 1')).toBeDefined()

        const coreGrid = container.querySelector('.grid.grid-cols-2')
        expect(coreGrid).not.toBeNull()
        expect(coreGrid?.textContent).toContain('20.0%')
        expect(coreGrid?.textContent).toContain('25.0%')

        const coreBars = container.querySelectorAll('.grid.grid-cols-2 .bg-secondary div')
        expect(coreBars.length).toBe(2)
        expect((coreBars[0] as HTMLElement).style.width).toBe('40%')
        expect((coreBars[1] as HTMLElement).style.width).toBe('50%')
    })
})
