import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { NetSocket } from '@/domain/network/types'

import { SocketsTableCard } from './SocketsTableCard'

const unixRow = (flag: number): NetSocket => ({
    protocol: 'UNIX',
    local_addr: '-',
    remote_addr: '-',
    status: 'estab',
    retrans: 0,
    rcv_wnd: 0,
    snd_wnd: 0,
    raw_info: `Type: stream, Flag: ${flag}, Path: -`,
})

// 复刻真实板卡 netstat 输出的形态：多条 UNIX 行字段几乎完全一致
const SOCKETS: NetSocket[] = [
    ...Array.from({ length: 12 }, () => unixRow(4002)),
    unixRow(2),
    {
        protocol: 'TCP',
        local_addr: '*:21',
        remote_addr: '*:*',
        status: 'listen',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
    },
    {
        protocol: 'TCP',
        local_addr: '*:22',
        remote_addr: '*:*',
        status: 'listen',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
    },
    {
        protocol: 'TCP',
        local_addr: '*:23',
        remote_addr: '*:*',
        status: 'listen',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
    },
    {
        protocol: 'TCP',
        local_addr: '*:3000',
        remote_addr: '*:*',
        status: 'listen',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
    },
    {
        protocol: 'TCP',
        local_addr: '192.168.1.186:23',
        remote_addr: '192.168.1.181:56907',
        status: 'estab',
        retrans: 0,
        rcv_wnd: 131070,
        snd_wnd: 65280,
    },
    {
        protocol: 'UDP',
        local_addr: '*:137',
        remote_addr: '*:0',
        status: '-',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
        raw_info: 'UDPLite: no',
    },
    {
        protocol: 'UDP',
        local_addr: '*:161',
        remote_addr: '*:0',
        status: '-',
        retrans: 0,
        rcv_wnd: 0,
        snd_wnd: 0,
        raw_info: 'UDPLite: no',
    },
]

const socketsFor = (filter: 'all' | 'listen' | 'connected') =>
    SOCKETS.filter((s) => {
        if (filter === 'listen') {
            return s.status === 'listen' || s.status === '-'
        }
        if (filter === 'connected') {
            return s.status.toLowerCase().includes('estab')
        }
        return true
    })

const renderCard = (socketTypeFilter: 'all' | 'listen' | 'connected') =>
    render(
        <SocketsTableCard
            sockets={socketsFor(socketTypeFilter)}
            loading={false}
            selectedProtocol="ALL"
            setSelectedProtocol={() => {}}
            socketTypeFilter={socketTypeFilter}
            setSocketTypeFilter={() => {}}
            socketSearch=""
            setSocketSearch={() => {}}
        />,
    )

const rerenderCard = (
    rerender: (ui: React.ReactElement) => void,
    socketTypeFilter: 'all' | 'listen' | 'connected',
) =>
    rerender(
        <SocketsTableCard
            sockets={socketsFor(socketTypeFilter)}
            loading={false}
            selectedProtocol="ALL"
            setSelectedProtocol={() => {}}
            socketTypeFilter={socketTypeFilter}
            setSocketTypeFilter={() => {}}
            socketSearch=""
            setSocketSearch={() => {}}
        />,
    )

const rowTexts = () =>
    within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent)

describe('SocketsTableCard', () => {
    it('renders the same row count as the sockets prop even when rows share identical keys', async () => {
        const { rerender } = renderCard('all')

        const table = screen.getByRole('table')
        expect(within(table).getAllByRole('row')).toHaveLength(SOCKETS.length + 1)

        rerenderCard(rerender, 'listen')

        expect(within(table).getAllByRole('row')).toHaveLength(7)
        expect(screen.queryAllByText('estab')).toHaveLength(0)
    })

    it('keeps row counts in sync across repeated filter switches with duplicate-key rows', () => {
        const { rerender } = renderCard('all')
        const bodyRowCount = () => rowTexts().length

        expect(bodyRowCount()).toBe(SOCKETS.length)

        rerenderCard(rerender, 'listen')
        expect(bodyRowCount()).toBe(6)
        expect(rowTexts().join('\n')).not.toContain('estab')

        rerenderCard(rerender, 'connected')
        expect(bodyRowCount()).toBe(14)
        expect(rowTexts().join('\n')).not.toContain('listen')

        rerenderCard(rerender, 'all')
        expect(bodyRowCount()).toBe(SOCKETS.length)

        rerenderCard(rerender, 'listen')
        expect(bodyRowCount()).toBe(6)
        expect(screen.queryAllByText('estab')).toHaveLength(0)
    })
})
