import { describe, it, expect } from 'vitest'

import { formatDate, formatDuration } from './formatters'

describe('History Formatters', () => {
    it('should format timestamps correctly', () => {
        // Unix timestamp for 2026-07-14 18:00:00 UTC (roughly depending on timezone, but let's test structure)
        const ts = 1784013600 // some timestamp
        const formatted = formatDate(ts)
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    it('should format duration correctly', () => {
        expect(formatDuration(1000, null)).toBe('录制中')
        expect(formatDuration(1000, 1045)).toBe('45 秒')
        expect(formatDuration(1000, 1120)).toBe('2 分 0 秒')
    })
})
