export interface NetInterface {
    name: string
    mtu: number
    rx_bytes: number
    rx_packets: number
    rx_errors: number
    rx_drops: number
    rx_overruns: number
    tx_bytes: number
    tx_packets: number
    tx_errors: number
    tx_drops: number
    tx_overruns: number
    flags: string
}

export interface InterfaceRate {
    rxBytesPerSec: number
    txBytesPerSec: number
    formattedRxRate: string
    formattedTxRate: string
}

export type SocketProtocol = 'ALL' | 'TCP' | 'UDP' | 'UNIX' | 'PACKET'

export interface NetSocket {
    protocol: string
    local_addr: string
    remote_addr: string
    status: string
    retrans: number
    rcv_wnd: number
    snd_wnd: number
    raw_info?: string | null
}

export interface RouteEntry {
    destination: string
    gateway: string
    flags: string
    refcnt: number
    use_cnt: number
    metric: number
    iface: string
}

export interface NetStatistics {
    ip: Record<string, number>
    icmp: Record<string, number>
    tcp: Record<string, number>
    udp: Record<string, number>
    raw_lines: string[]
}
