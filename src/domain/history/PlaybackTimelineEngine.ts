import { MetricPoint } from '@/infrastructure/tauri/bridge'

export class PlaybackTimelineEngine {
    private metrics: MetricPoint[] = []
    private isPlaying: boolean = false
    private currentIndex: number = 0
    private speed: number = 1

    loadMetrics(metrics: MetricPoint[]) {
        this.metrics = metrics
        this.currentIndex = 0
        this.isPlaying = false
    }

    getMetrics(): MetricPoint[] {
        return this.metrics
    }

    getIsPlaying(): boolean {
        return this.isPlaying
    }

    getIndex(): number {
        return this.currentIndex
    }

    getSpeed(): number {
        return this.speed
    }

    getIntervalMs(): number {
        return Math.max(10, Math.floor(1000 / this.speed))
    }

    play() {
        if (this.metrics.length === 0) return
        if (this.currentIndex >= this.metrics.length - 1) {
            this.currentIndex = 0
        }
        this.isPlaying = true
    }

    pause() {
        this.isPlaying = false
    }

    setIsPlaying(playing: boolean) {
        if (playing) {
            this.play()
        } else {
            this.pause()
        }
    }

    setSpeed(speed: number) {
        this.speed = speed > 0 ? speed : 1
    }

    seek(index: number) {
        if (this.metrics.length === 0) {
            this.currentIndex = 0
            return
        }
        this.currentIndex = Math.max(0, Math.min(index, this.metrics.length - 1))
    }

    tick(): boolean {
        if (this.metrics.length === 0) return false
        if (this.currentIndex >= this.metrics.length - 1) {
            this.isPlaying = false
            return false
        }
        this.currentIndex += 1
        if (this.currentIndex >= this.metrics.length - 1) {
            this.isPlaying = false
        }
        return true
    }

    getCurrentPoint(): MetricPoint | null {
        if (this.metrics.length === 0 || this.currentIndex >= this.metrics.length) {
            return null
        }
        return this.metrics[this.currentIndex]
    }

    getProgressPercent(): number {
        if (this.metrics.length <= 1) return 0
        return Math.round((this.currentIndex / (this.metrics.length - 1)) * 100)
    }

    getDuration(): number {
        if (this.metrics.length <= 1) return 0
        const first = this.metrics[0].timestamp
        const last = this.metrics[this.metrics.length - 1].timestamp
        return Math.max(0, Math.floor((last - first) / 1000))
    }

    reset() {
        this.metrics = []
        this.currentIndex = 0
        this.isPlaying = false
    }
}
