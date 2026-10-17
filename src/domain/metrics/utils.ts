import { ThemeColors } from './types'

export function formatKB(kb: number): string {
    if (kb <= 0) return '0 KB'
    if (kb < 1024) return `${kb.toFixed(0)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(2)} GB`
}

export function calculateMemoryPercent(used: number, total: number): number {
    if (total <= 0) return 0
    return (used / total) * 100
}

export function isCpuWarning(cpu: number, threshold: number): boolean {
    return cpu >= threshold
}

export function isMemWarning(used: number, total: number, threshold: number): boolean {
    const percent = calculateMemoryPercent(used, total)
    return percent >= threshold
}

export function getThemeColors(): ThemeColors {
    return {
        cpuStroke: 'var(--chart-cpu)',
        cpuGrad: 'url(#colorCpu)',
        memStroke: 'var(--chart-mem)',
        memGrad: 'url(#colorMem)',
        dotCpu: 'var(--chart-cpu)',
        dotMem: 'var(--chart-mem)',
    }
}

export class RingBuffer {
    private buffer: Float32Array
    private head: number = 0
    private size: number = 0
    private sum: number = 0
    private capacity: number

    constructor(capacity: number) {
        this.capacity = capacity
        this.buffer = new Float32Array(capacity)
    }

    push(val: number) {
        if (this.size === this.capacity) {
            // 缓冲区已满，减去被覆盖的头部旧值，加上新值
            this.sum -= this.buffer[this.head]
            this.buffer[this.head] = val
            this.sum += val
            this.head = (this.head + 1) % this.capacity
        } else {
            // 缓冲区未满，直接存入
            this.buffer[(this.head + this.size) % this.capacity] = val
            this.sum += val
            this.size++
        }
    }

    getAverage(): number {
        return this.size > 0 ? this.sum / this.size : 0
    }

    clear() {
        this.head = 0
        this.size = 0
        this.sum = 0
        this.buffer.fill(0)
    }
}
