// 真实板卡 netstat 全量回显的解析结果（SylixOS 192.168.1.186 抓取），
// 与 Rust 侧 test_parse_netstat_sockets_real_board_capture 同源
export interface StubSocket {
    protocol: string
    local_addr: string
    remote_addr: string
    status: string
    retrans: number
    rcv_wnd: number
    snd_wnd: number
    raw_info?: string
}

const unixRow = (flag: number): StubSocket => ({
    protocol: 'UNIX',
    local_addr: '-',
    remote_addr: '-',
    status: 'estab',
    retrans: 0,
    rcv_wnd: 0,
    snd_wnd: 0,
    raw_info: `Type: stream, Flag: ${flag}, Path: -`,
})

export const BOARD_SOCKETS: StubSocket[] = [
    ...Array.from({ length: 12 }, () => unixRow(4002)),
    unixRow(2),
    unixRow(2),
    ...(
        ['*:21', '*:22', '*:23', '*:3000'] as const
    ).map((local_addr) => ({
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

export const LISTEN_ROW_COUNT = 6
export const CONNECTED_ROW_COUNT = 15
