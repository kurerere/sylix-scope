import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import { ProcessInfo } from '@/domain/process/types'

import { TelemetryBufferEngine, MonitorPayload } from './TelemetryBufferEngine'
import { SystemMetrics } from './types'

describe('TelemetryBufferEngine', () => {
    let engine: TelemetryBufferEngine

    const mockMetrics: SystemMetrics = {
        cpu_usage: 25.5,
        mem_total: 1024 * 1024,
        mem_used: 512 * 1024,
        mem_free: 512 * 1024,
        mem_kernel: 128 * 1024,
        mem_app: 384 * 1024,
        cpu_cores: [20.0, 31.0],
    }

    const mockProcesses: ProcessInfo[] = [
        {
            pid: 1,
            name: 'init',
            cpu: 1.2,
            mem: 1024,
            cmdline: '/sbin/init',
            execfile: '/sbin/init',
            threads: [{ name: 't1', tid: '1', tid_decimal: 1, cpu: 1.2 }],
        },
        {
            pid: 2,
            name: 'daemon',
            cpu: 24.3,
            mem: 4096,
            cmdline: null,
            execfile: null,
            threads: [],
        },
    ]

    beforeEach(() => {
        engine = new TelemetryBufferEngine(5)
    })

    it('initializes with default state', () => {
        const snapshot = engine.getSnapshot()
        expect(snapshot.metrics.cpu_usage).toBe(0)
        expect(snapshot.processes).toEqual([])
        expect(snapshot.prevProcessesMap.size).toBe(0)
        expect(snapshot.isPaused).toBe(false)
        expect(snapshot.selectedIndex).toBeNull()
        expect(engine.getChartData()).toEqual([])
    })

    it('updates current metrics and tracks prevProcessesMap on payload received', () => {
        const payload1: MonitorPayload = {
            metrics: mockMetrics,
            processes: mockProcesses,
        }
        engine.onPayloadReceived(payload1)

        let snapshot = engine.getSnapshot()
        expect(snapshot.metrics.cpu_usage).toBe(25.5)
        expect(snapshot.processes.length).toBe(2)
        expect(snapshot.prevProcessesMap.size).toBe(0)

        const payload2: MonitorPayload = {
            metrics: { ...mockMetrics, cpu_usage: 45.0 },
            processes: [
                {
                    pid: 1,
                    name: 'init',
                    cpu: 2.0,
                    mem: 1024,
                    cmdline: '/sbin/init',
                    execfile: '/sbin/init',
                },
                {
                    pid: 3,
                    name: 'worker',
                    cpu: 43.0,
                    mem: 2048,
                    cmdline: null,
                    execfile: null,
                },
            ],
        }
        engine.onPayloadReceived(payload2)

        snapshot = engine.getSnapshot()
        expect(snapshot.metrics.cpu_usage).toBe(45.0)
        expect(snapshot.processes.length).toBe(2)
        expect(snapshot.prevProcessesMap.size).toBe(2)
        expect(snapshot.prevProcessesMap.get(2)?.name).toBe('daemon')
    })

    it('advances tick and maintains chartData ring buffer limit', () => {
        engine.onPayloadReceived({
            metrics: mockMetrics,
            processes: mockProcesses,
        })

        const date1 = new Date(2026, 7, 15, 10, 0, 1)
        engine.tick(date1)
        expect(engine.getChartData().length).toBe(1)
        expect(engine.getChartData()[0].time).toBe('10:00:01')
        expect(engine.getChartData()[0].cpu).toBe(25.5)
        expect(engine.getChartData()[0].mem).toBe(50.0)

        const date2 = new Date(2026, 7, 15, 10, 0, 2)
        engine.tick(date2)
        const date3 = new Date(2026, 7, 15, 10, 0, 3)
        engine.tick(date3)
        const date4 = new Date(2026, 7, 15, 10, 0, 4)
        engine.tick(date4)
        const date5 = new Date(2026, 7, 15, 10, 0, 5)
        engine.tick(date5)
        expect(engine.getChartData().length).toBe(5)

        const date6 = new Date(2026, 7, 15, 10, 0, 6)
        engine.tick(date6)
        expect(engine.getChartData().length).toBe(5)
        expect(engine.getChartData()[0].time).toBe('10:00:02')
        expect(engine.getChartData()[4].time).toBe('10:00:06')
    })

    it('handles pause state and selective historical frame inspection', () => {
        engine.onPayloadReceived({
            metrics: { ...mockMetrics, cpu_usage: 10 },
            processes: [
                {
                    pid: 10,
                    name: 'proc10',
                    cpu: 10,
                    mem: 100,
                    cmdline: null,
                    execfile: null,
                },
            ],
        })
        engine.tick(new Date(2026, 7, 15, 10, 0, 1))

        engine.onPayloadReceived({
            metrics: { ...mockMetrics, cpu_usage: 90 },
            processes: [
                {
                    pid: 20,
                    name: 'proc20',
                    cpu: 90,
                    mem: 200,
                    cmdline: null,
                    execfile: null,
                },
            ],
        })
        engine.tick(new Date(2026, 7, 15, 10, 0, 2))

        engine.setPaused(true)
        expect(engine.getIsPaused()).toBe(true)

        engine.tick(new Date(2026, 7, 15, 10, 0, 3))
        expect(engine.getChartData().length).toBe(2)

        engine.setSelectedIndex(0)
        expect(engine.getSelectedIndex()).toBe(0)

        const snapshotFrame0 = engine.getSnapshot()
        expect(snapshotFrame0.metrics.cpu_usage).toBe(10)
        expect(snapshotFrame0.processes[0].name).toBe('proc10')

        engine.setSelectedIndex(1)
        const snapshotFrame1 = engine.getSnapshot()
        expect(snapshotFrame1.metrics.cpu_usage).toBe(90)
        expect(snapshotFrame1.processes[0].name).toBe('proc20')
        expect(snapshotFrame1.prevProcessesMap.get(10)?.name).toBe('proc10')

        engine.setPaused(false)
        expect(engine.getIsPaused()).toBe(false)
        expect(engine.getSelectedIndex()).toBeNull()
    })

    it('calculates analytics, peak values, and process summary correctly', () => {
        engine.onPayloadReceived({
            metrics: mockMetrics,
            processes: mockProcesses,
        })
        engine.tick(new Date(2026, 7, 15, 10, 0, 1))

        const snapshot = engine.getSnapshot()
        expect(snapshot.analytics.peakCpu).toBe(25.5)
        expect(snapshot.analytics.peakMemPercent).toBe(50.0)
        expect(snapshot.analytics.avgCpu).toBe(25.5)
        expect(snapshot.analytics.cpuCoresList.length).toBe(2)
        expect(snapshot.analytics.cpuCoresList[0].label).toBe('Core 0')
        expect(snapshot.analytics.processSummary.totalCount).toBe(2)
        expect(snapshot.analytics.processSummary.filteredCount).toBe(2)
        expect(snapshot.analytics.processSummary.totalThreads).toBe(2)
        expect(snapshot.analytics.processSummary.topCpuProc?.pid).toBe(2)
    })

    it('reconciles system cpu difference into kernel process and other thread', () => {
        engine.onPayloadReceived({
            metrics: { ...mockMetrics, cpu_usage: 22.0 },
            processes: [
                {
                    pid: 9,
                    name: 'ecsd-vsoa++',
                    cpu: 5.6,
                    mem: 14000,
                    cmdline: null,
                    execfile: null,
                },
                {
                    pid: 1,
                    name: 'sshd',
                    cpu: 0.0,
                    mem: 5000,
                    cmdline: null,
                    execfile: null,
                },
                {
                    pid: 0,
                    name: 'kernel',
                    cpu: 1.0,
                    mem: 0,
                    cmdline: null,
                    execfile: null,
                    threads: [{ name: 't_itimer', tid: '4', tid_decimal: 4, cpu: 1.0 }],
                },
            ],
        })

        const snapshot = engine.getSnapshot()
        expect(snapshot.processes.length).toBe(3)
        const kernelProc = snapshot.processes.find((p) => p.pid === 0)
        expect(kernelProc).toBeDefined()
        expect(kernelProc?.cpu).toBe(16.4) // 22.0 - 5.6 = 16.4

        const otherThread = kernelProc?.threads?.find((t) => t.name === 'other')
        expect(otherThread).toBeDefined()
        expect(otherThread?.cpu).toBe(15.4) // 16.4 - 1.0 = 15.4
    })

    describe('session lifecycle & subscription', () => {
        const payload: MonitorPayload = { metrics: mockMetrics, processes: mockProcesses }

        afterEach(() => {
            vi.useRealTimers()
        })

        it('notifies subscribers on payload and ticks only while session is running', () => {
            vi.useFakeTimers()
            const lifecycleEngine = new TelemetryBufferEngine(30)
            let notifications = 0
            const unsubscribe = lifecycleEngine.subscribe(() => {
                notifications += 1
            })

            lifecycleEngine.beginSession()
            lifecycleEngine.onPayloadReceived(payload)
            expect(notifications).toBe(2)

            vi.advanceTimersByTime(3000)
            expect(lifecycleEngine.getChartData()).toHaveLength(3)
            expect(notifications).toBe(2 + 3)

            lifecycleEngine.endSession()
            const stable = notifications
            vi.advanceTimersByTime(5000)
            expect(notifications).toBe(stable)

            unsubscribe()
        })

        it('paused session keeps the timer but skips ticks', () => {
            vi.useFakeTimers()
            const lifecycleEngine = new TelemetryBufferEngine(30)
            lifecycleEngine.beginSession()
            lifecycleEngine.onPayloadReceived(payload)
            lifecycleEngine.setPaused(true)

            vi.advanceTimersByTime(5000)
            expect(lifecycleEngine.getChartData()).toHaveLength(0)
            expect(lifecycleEngine.getIsPaused()).toBe(true)
        })

        it('beginSession clears previous data', () => {
            vi.useFakeTimers()
            const lifecycleEngine = new TelemetryBufferEngine(30)
            lifecycleEngine.beginSession()
            lifecycleEngine.onPayloadReceived(payload)
            vi.advanceTimersByTime(2000)
            expect(lifecycleEngine.getChartData().length).toBeGreaterThan(0)

            lifecycleEngine.beginSession()
            expect(lifecycleEngine.getChartData()).toHaveLength(0)
        })
    })
})
