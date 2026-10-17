import { InterfaceRate, NetInterface } from './types'

export function formatNetworkBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const val = bytes / Math.pow(1024, i)
    return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

export function formatNetworkSpeed(bytesPerSec: number): string {
    if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 B/s'
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(1024)), units.length - 1)
    const val = bytesPerSec / Math.pow(1024, i)
    return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

export function calculateInterfaceRates(
    prev: NetInterface[],
    curr: NetInterface[],
    deltaSecs: number,
): Map<string, InterfaceRate> {
    const rates = new Map<string, InterfaceRate>()
    if (deltaSecs <= 0) return rates

    const prevMap = new Map<string, NetInterface>()
    for (const iface of prev) {
        prevMap.set(iface.name, iface)
    }

    for (const curIface of curr) {
        const prevIface = prevMap.get(curIface.name)
        if (!prevIface) {
            rates.set(curIface.name, {
                rxBytesPerSec: 0,
                txBytesPerSec: 0,
                formattedRxRate: '0 B/s',
                formattedTxRate: '0 B/s',
            })
            continue
        }

        const rxDiff = Math.max(0, curIface.rx_bytes - prevIface.rx_bytes)
        const txDiff = Math.max(0, curIface.tx_bytes - prevIface.tx_bytes)

        const rxRate = rxDiff / deltaSecs
        const txRate = txDiff / deltaSecs

        rates.set(curIface.name, {
            rxBytesPerSec: rxRate,
            txBytesPerSec: txRate,
            formattedRxRate: formatNetworkSpeed(rxRate),
            formattedTxRate: formatNetworkSpeed(txRate),
        })
    }

    return rates
}
