import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { CpuMetricCard } from './CpuMetricCard'

describe('CpuMetricCard Component', () => {
    const defaultProps = {
        cpuUsage: 45.5,
        warningCpu: 80,
        isSpiking: false,
        peakCpu: 60.2,
        avgCpu: 40.1,
        cpuCoresList: [
            { label: 'Core 0', key: 'cpu-0', usage: 22.5, originalUsage: 45 },
            { label: 'Core 1', key: 'cpu-1', usage: 23.0, originalUsage: 46 },
        ],
    }

    it('renders 正常 state when below warning threshold and not spiking', () => {
        render(<CpuMetricCard {...defaultProps} />)
        expect(screen.getByText('CPU 使用情况')).toBeInTheDocument()
        expect(screen.getByText('正常')).toBeInTheDocument()
        expect(screen.getByText('60.2%')).toBeInTheDocument()
        expect(screen.getByText('40.1%')).toBeInTheDocument()
        expect(screen.getByText('Core 0')).toBeInTheDocument()
        expect(screen.getByText('Core 1')).toBeInTheDocument()
    })

    it('renders 负载过高 state when exceeding warning threshold', () => {
        render(<CpuMetricCard {...defaultProps} cpuUsage={85.0} />)
        expect(screen.getByText('负载过高')).toBeInTheDocument()
    })

    it('renders 波动 state when isSpiking is true', () => {
        render(<CpuMetricCard {...defaultProps} isSpiking={true} />)
        expect(screen.getByText('波动')).toBeInTheDocument()
    })
})
