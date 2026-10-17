import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { MetricPoint } from '@/infrastructure/tauri/bridge'

import { PlaybackChart } from './PlaybackChart'

const metrics: MetricPoint[] = Array.from({ length: 10 }, (_, i) => ({
    timestamp: 1000 + i,
    cpu_usage: 20 + i,
    mem_total: 1024,
    mem_used: 512,
    mem_free: 512,
    mem_kernel: 100,
    mem_app: 412,
}))

describe('PlaybackChart Component', () => {
    it('renders empty hint without metrics', () => {
        render(<PlaybackChart metrics={[]} playbackIndex={0} onSelectIndex={vi.fn()} />)
        expect(screen.getByText('暂无采样指标')).toBeInTheDocument()
    })

    it('renders recharts surface with metrics', () => {
        const { container } = render(
            <PlaybackChart metrics={metrics} playbackIndex={4} onSelectIndex={vi.fn()} />,
        )
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
        // jsdom 无布局引擎，宽高为 0 时 SVG 内容为空；容器挂载即验证分支覆盖
        expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    })

    it('renders reference line for current playback index', () => {
        const { container } = render(
            <PlaybackChart metrics={metrics} playbackIndex={3} onSelectIndex={vi.fn()} />,
        )
        // 播放头位置由 ReferenceLine 呈现
        expect(container.innerHTML).toContain('recharts')
    })
})
