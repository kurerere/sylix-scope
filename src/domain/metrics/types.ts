import { ProcessInfo } from '../process/types'

export interface SystemMetrics {
    cpu_usage: number
    mem_total: number
    mem_used: number
    mem_free: number
    mem_kernel: number
    mem_app: number
    cpu_cores?: number[]
}

export interface ChartDataPoint {
    time: string
    cpu: number
    mem: number
    processes?: ProcessInfo[]
    metrics?: SystemMetrics
}

export interface ThemeColors {
    cpuStroke: string
    cpuGrad: string
    memStroke: string
    memGrad: string
    dotCpu: string
    dotMem: string
}
