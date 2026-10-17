import { describe, it, expect, beforeEach } from 'vitest'

import { MetricPoint } from '@/infrastructure/tauri/bridge'

import { PlaybackTimelineEngine } from './PlaybackTimelineEngine'

describe('PlaybackTimelineEngine', () => {
    let engine: PlaybackTimelineEngine

    const mockMetrics: MetricPoint[] = [
        {
            timestamp: 1000,
            cpu_usage: 10,
            cpu_cores: [10],
            mem_used: 100,
            mem_free: 900,
            mem_total: 1000,
            mem_kernel: 20,
            mem_app: 80,
        },
        {
            timestamp: 2000,
            cpu_usage: 20,
            cpu_cores: [20],
            mem_used: 200,
            mem_free: 800,
            mem_total: 1000,
            mem_kernel: 30,
            mem_app: 170,
        },
        {
            timestamp: 3000,
            cpu_usage: 30,
            cpu_cores: [30],
            mem_used: 300,
            mem_free: 700,
            mem_total: 1000,
            mem_kernel: 40,
            mem_app: 260,
        },
    ]

    beforeEach(() => {
        engine = new PlaybackTimelineEngine()
    })

    it('initializes with default values', () => {
        expect(engine.getMetrics()).toEqual([])
        expect(engine.getIsPlaying()).toBe(false)
        expect(engine.getIndex()).toBe(0)
        expect(engine.getSpeed()).toBe(1)
        expect(engine.getCurrentPoint()).toBeNull()
        expect(engine.getProgressPercent()).toBe(0)
        expect(engine.getDuration()).toBe(0)
    })

    it('loads metrics and resets index', () => {
        engine.loadMetrics(mockMetrics)
        expect(engine.getMetrics().length).toBe(3)
        expect(engine.getIndex()).toBe(0)
        expect(engine.getCurrentPoint()?.timestamp).toBe(1000)
        expect(engine.getDuration()).toBe(2)
    })

    it('advances index on tick and stops at the end', () => {
        engine.loadMetrics(mockMetrics)
        engine.play()
        expect(engine.getIsPlaying()).toBe(true)

        const advanced1 = engine.tick()
        expect(advanced1).toBe(true)
        expect(engine.getIndex()).toBe(1)
        expect(engine.getCurrentPoint()?.timestamp).toBe(2000)
        expect(engine.getIsPlaying()).toBe(true)

        const advanced2 = engine.tick()
        expect(advanced2).toBe(true)
        expect(engine.getIndex()).toBe(2)
        expect(engine.getCurrentPoint()?.timestamp).toBe(3000)
        expect(engine.getIsPlaying()).toBe(false)

        const advanced3 = engine.tick()
        expect(advanced3).toBe(false)
        expect(engine.getIndex()).toBe(2)
        expect(engine.getIsPlaying()).toBe(false)
    })

    it('supports seeking to specific index and clamps bounds', () => {
        engine.loadMetrics(mockMetrics)
        engine.seek(1)
        expect(engine.getIndex()).toBe(1)
        expect(engine.getCurrentPoint()?.timestamp).toBe(2000)
        expect(engine.getProgressPercent()).toBe(50)

        engine.seek(10)
        expect(engine.getIndex()).toBe(2)

        engine.seek(-5)
        expect(engine.getIndex()).toBe(0)
    })

    it('manages playback speed', () => {
        engine.setSpeed(2)
        expect(engine.getSpeed()).toBe(2)
        expect(engine.getIntervalMs()).toBe(500)

        engine.setSpeed(5)
        expect(engine.getSpeed()).toBe(5)
        expect(engine.getIntervalMs()).toBe(200)

        engine.setSpeed(-1)
        expect(engine.getSpeed()).toBe(1)
    })

    it('calculates progress percentage correctly', () => {
        engine.loadMetrics(mockMetrics)
        expect(engine.getProgressPercent()).toBe(0)

        engine.seek(1)
        expect(engine.getProgressPercent()).toBe(50)

        engine.seek(2)
        expect(engine.getProgressPercent()).toBe(100)
    })

    it('clears state on reset', () => {
        engine.loadMetrics(mockMetrics)
        engine.seek(2)
        engine.reset()
        expect(engine.getMetrics()).toEqual([])
        expect(engine.getIndex()).toBe(0)
        expect(engine.getCurrentPoint()).toBeNull()
    })
})
