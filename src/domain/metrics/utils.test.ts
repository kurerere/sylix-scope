import { describe, it, expect } from 'vitest'

import {
    formatKB,
    calculateMemoryPercent,
    isCpuWarning,
    isMemWarning,
    getThemeColors,
    RingBuffer,
} from './utils'

describe('Metrics Domain Logic', () => {
    describe('formatKB', () => {
        it('should format 0 and negative numbers correctly', () => {
            expect(formatKB(0)).toBe('0 KB')
            expect(formatKB(-100)).toBe('0 KB')
        })

        it('should format bytes under 1MB as KB', () => {
            expect(formatKB(512)).toBe('512 KB')
        })

        it('should format bytes between 1MB and 1GB as MB', () => {
            expect(formatKB(1024)).toBe('1.0 MB')
            expect(formatKB(1536)).toBe('1.5 MB')
        })

        it('should format bytes over 1GB as GB', () => {
            expect(formatKB(1048576)).toBe('1.00 GB')
            expect(formatKB(1572864)).toBe('1.50 GB')
        })
    })

    describe('calculateMemoryPercent', () => {
        it('should handle zero total memory', () => {
            expect(calculateMemoryPercent(100, 0)).toBe(0)
        })

        it('should calculate correct percentage', () => {
            expect(calculateMemoryPercent(50, 100)).toBe(50)
            expect(calculateMemoryPercent(3, 4)).toBe(75)
        })
    })

    describe('isCpuWarning', () => {
        it('should trigger warnings at or above threshold', () => {
            expect(isCpuWarning(80, 80)).toBe(true)
            expect(isCpuWarning(85, 80)).toBe(true)
            expect(isCpuWarning(79, 80)).toBe(false)
        })
    })

    describe('isMemWarning', () => {
        it('should trigger warnings based on percentage', () => {
            expect(isMemWarning(80, 100, 80)).toBe(true)
            expect(isMemWarning(79, 100, 80)).toBe(false)
        })
    })

    describe('getThemeColors', () => {
        it('should return semantic chart colors', () => {
            const colors = getThemeColors()
            expect(colors.cpuStroke).toBe('var(--chart-cpu)')
            expect(colors.memStroke).toBe('var(--chart-mem)')
        })
    })

    describe('RingBuffer', () => {
        it('在双端队列未满时应当能正确计算累加和平均值', () => {
            const buffer = new RingBuffer(5)
            buffer.push(10)
            buffer.push(20)
            expect(buffer.getAverage()).toBe(15) // (10+20)/2 = 15
        })

        it('当数据溢出定长缓冲区容量时，应当丢弃最早的数据进行滑动覆盖', () => {
            const buffer = new RingBuffer(3)
            buffer.push(10)
            buffer.push(20)
            buffer.push(30)
            expect(buffer.getAverage()).toBe(20)

            buffer.push(40) // 10 被丢弃 -> sum = 90
            expect(buffer.getAverage()).toBe(30) // 90 / 3 = 30

            buffer.push(50) // 20 被丢弃 -> sum = 120
            expect(buffer.getAverage()).toBe(40) // 120 / 3 = 40
        })

        it('调用 clear 应当完全清空累加值并重置', () => {
            const buffer = new RingBuffer(3)
            buffer.push(10)
            buffer.push(20)
            buffer.clear()
            expect(buffer.getAverage()).toBe(0)
        })
    })
})
