import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { NetStatistics } from '@/domain/network/types'

import { ProtocolStatsCard } from './ProtocolStatsCard'

const stats: NetStatistics = {
    ip: { forwarding: 1, default_ttl: 64 },
    tcp: { active_opens: 5 },
    udp: { in_datagrams: 12 },
    icmp: { in_msgs: 3 },
    raw_lines: [],
} as unknown as NetStatistics

describe('ProtocolStatsCard Component', () => {
    it('renders all four protocol sections with data', () => {
        render(<ProtocolStatsCard stats={stats} loading={false} />)

        expect(screen.getByText('IP 协议统计')).toBeInTheDocument()
        expect(screen.getByText('TCP 协议统计')).toBeInTheDocument()
        expect(screen.getByText('UDP 协议统计')).toBeInTheDocument()
        expect(screen.getByText('ICMP 协议统计')).toBeInTheDocument()
        expect(screen.getByText('forwarding')).toBeInTheDocument()
        expect(screen.getByText('active_opens')).toBeInTheDocument()
    })

    it('shows empty hint for a section without data', () => {
        const empty = { ...stats, tcp: undefined } as unknown as NetStatistics
        render(<ProtocolStatsCard stats={empty} loading={false} />)
        expect(screen.getByText('暂无 TCP 统计')).toBeInTheDocument()
    })

    it('shows skeleton while loading', () => {
        const { container } = render(<ProtocolStatsCard stats={null} loading={true} />)
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
})
