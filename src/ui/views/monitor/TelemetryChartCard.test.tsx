import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { TelemetryChartCard } from './TelemetryChartCard'

describe('TelemetryChartCard Component', () => {
    const defaultProps = {
        chartData: [],
        historySeconds: 30,
        setHistorySeconds: vi.fn(),
        isPaused: false,
        selectedPoint: null,
        setSelectedIndex: vi.fn(),
    }

    it('renders empty placeholder when chartData is empty', () => {
        render(<TelemetryChartCard {...defaultProps} />)
        expect(screen.getByText('资源曲线')).toBeInTheDocument()
        expect(screen.getByText('暂无监控数据')).toBeInTheDocument()
    })

    it('handles history seconds change buttons', () => {
        const setHistorySeconds = vi.fn()
        render(<TelemetryChartCard {...defaultProps} setHistorySeconds={setHistorySeconds} />)
        const btn60s = screen.getByRole('button', { name: '60s' })
        fireEvent.click(btn60s)
        expect(setHistorySeconds).toHaveBeenCalledWith(60)
    })

    it('renders locked snapshot badge when selectedPoint is present and allows clearing', () => {
        const setSelectedIndex = vi.fn()
        const selectedPoint = {
            time: '12:00:00',
            cpu: 50,
            mem: 60,
        }
        render(
            <TelemetryChartCard
                {...defaultProps}
                chartData={[selectedPoint]}
                selectedPoint={selectedPoint}
                setSelectedIndex={setSelectedIndex}
            />,
        )
        expect(screen.getByText('快照锁定: 12:00:00')).toBeInTheDocument()
        const clearBtn = screen.getByRole('button', { name: '清除锁定，返回实时最新' })
        fireEvent.click(clearBtn)
        expect(setSelectedIndex).toHaveBeenCalledWith(null)
    })

    it('renders chart without crash when chartData is provided', () => {
        const data = [
            { time: '12:00:00', cpu: 20, mem: 40 },
            { time: '12:00:01', cpu: 25, mem: 42 },
        ]
        const { container } = render(<TelemetryChartCard {...defaultProps} chartData={data} />)
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })
})
