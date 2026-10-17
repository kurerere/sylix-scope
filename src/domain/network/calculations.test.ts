import { describe, it, expect } from 'vitest'

import { formatNetworkBytes, formatNetworkSpeed, calculateInterfaceRates } from './calculations'
import { NetInterface } from './types'

describe('network calculations', () => {
    describe('formatNetworkBytes', () => {
        it('handles zero and negative values', () => {
            expect(formatNetworkBytes(0)).toBe('0 B')
            expect(formatNetworkBytes(-100)).toBe('0 B')
        })

        it('formats bytes, KB, MB, GB properly', () => {
            expect(formatNetworkBytes(500)).toBe('500 B')
            expect(formatNetworkBytes(1024)).toBe('1.00 KB')
            expect(formatNetworkBytes(1048576)).toBe('1.00 MB')
            expect(formatNetworkBytes(1073741824 * 2.5)).toBe('2.50 GB')
        })
    })

    describe('formatNetworkSpeed', () => {
        it('handles zero and negative values', () => {
            expect(formatNetworkSpeed(0)).toBe('0 B/s')
            expect(formatNetworkSpeed(-50)).toBe('0 B/s')
        })

        it('formats rates correctly', () => {
            expect(formatNetworkSpeed(1024)).toBe('1.00 KB/s')
            expect(formatNetworkSpeed(1024 * 1024 * 3.2)).toBe('3.20 MB/s')
        })
    })

    describe('calculateInterfaceRates', () => {
        const prev: NetInterface[] = [
            {
                name: 'en1',
                mtu: 1500,
                rx_bytes: 1000,
                rx_packets: 10,
                rx_errors: 0,
                rx_drops: 0,
                rx_overruns: 0,
                tx_bytes: 2000,
                tx_packets: 20,
                tx_errors: 0,
                tx_drops: 0,
                tx_overruns: 0,
                flags: 'UP',
            },
        ]

        const curr: NetInterface[] = [
            {
                name: 'en1',
                mtu: 1500,
                rx_bytes: 3000, // +2000 bytes
                rx_packets: 20,
                rx_errors: 0,
                rx_drops: 0,
                rx_overruns: 0,
                tx_bytes: 6000, // +4000 bytes
                tx_packets: 40,
                tx_errors: 0,
                tx_drops: 0,
                tx_overruns: 0,
                flags: 'UP',
            },
            {
                name: 'en2',
                mtu: 1500,
                rx_bytes: 500,
                rx_packets: 5,
                rx_errors: 0,
                rx_drops: 0,
                rx_overruns: 0,
                tx_bytes: 500,
                tx_packets: 5,
                tx_errors: 0,
                tx_drops: 0,
                tx_overruns: 0,
                flags: 'UP',
            },
        ]

        it('calculates rx and tx speed accurately over deltaSecs', () => {
            const rates = calculateInterfaceRates(prev, curr, 2) // 2 seconds
            const en1Rate = rates.get('en1')
            expect(en1Rate).toBeDefined()
            expect(en1Rate?.rxBytesPerSec).toBe(1000) // 2000 / 2
            expect(en1Rate?.txBytesPerSec).toBe(2000) // 4000 / 2
            expect(en1Rate?.formattedRxRate).toBe('1000 B/s')

            const en2Rate = rates.get('en2')
            expect(en2Rate).toBeDefined()
            expect(en2Rate?.rxBytesPerSec).toBe(0)
        })

        it('returns empty map when deltaSecs is zero or negative', () => {
            const rates = calculateInterfaceRates(prev, curr, 0)
            expect(rates.size).toBe(0)
        })
    })
})
