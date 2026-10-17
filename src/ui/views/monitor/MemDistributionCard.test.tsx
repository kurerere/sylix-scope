import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { MemDistributionCard } from './MemDistributionCard'

describe('MemDistributionCard Component', () => {
    const defaultProps = {
        metrics: {
            cpu_usage: 30,
            mem_total: 1048576,
            mem_used: 524288,
            mem_free: 524288,
            mem_kernel: 131072,
            mem_app: 393216,
        },
        memWarning: false,
        peakMemPercent: 55.0,
        avgMemPercent: 48.0,
        peakMemUsed: 600000,
    }

    it('renders memory breakdown details correctly', () => {
        render(<MemDistributionCard {...defaultProps} />)
        expect(screen.getByText('内存状态与分配')).toBeInTheDocument()
        expect(screen.getAllByText('正常').length).toBeGreaterThan(0)
        expect(screen.getByText('物理内存总量:')).toBeInTheDocument()
        expect(screen.getByText('55.0%')).toBeInTheDocument()
        expect(screen.getByText('48.0%')).toBeInTheDocument()
    })

    it('renders 内存不足 state when memWarning is true', () => {
        render(<MemDistributionCard {...defaultProps} memWarning={true} />)
        expect(screen.getByText('内存不足')).toBeInTheDocument()
    })

    it('renders correctly when app memory ratio is very small', () => {
        const smallAppProps = {
            ...defaultProps,
            metrics: {
                cpu_usage: 15,
                mem_total: 507904,
                mem_used: 38400,
                mem_free: 469504,
                mem_kernel: 30822,
                mem_app: 7578,
            },
        }
        render(<MemDistributionCard {...smallAppProps} />)
        expect(screen.getAllByText(/应用占用/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/7.4 MB/).length).toBeGreaterThan(0)
    })

    it('renders other buffer section when other memory exists', () => {
        const withBufferProps = {
            ...defaultProps,
            metrics: {
                cpu_usage: 20,
                mem_total: 1048576,
                mem_used: 600000,
                mem_free: 448576,
                mem_kernel: 200000,
                mem_app: 300000,
            },
        }
        render(<MemDistributionCard {...withBufferProps} />)
        expect(screen.getAllByText(/其它缓冲/).length).toBeGreaterThan(0)
    })
})
