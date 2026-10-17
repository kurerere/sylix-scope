import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { RawStatsCard } from './RawStatsCard'

describe('RawStatsCard Component', () => {
    const base = { loading: false, lastRefreshedAt: 1700000000 }

    it('renders raw lines with copy button when data present', () => {
        render(
            <RawStatsCard stats={{ raw_lines: ['line-1', 'line-2'], raw: '' } as any} {...base} />,
        )
        expect(screen.getByText('原始统计')).toBeInTheDocument()
        expect(screen.getByText(/line-1/)).toBeInTheDocument()
        expect(screen.getByTitle('复制全部输出')).toBeInTheDocument()
    })

    it('copies lines to clipboard on click', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.assign(navigator, { clipboard: { writeText } })

        render(<RawStatsCard stats={{ raw_lines: ['alpha'], raw: '' } as any} {...base} />)
        fireEvent.click(screen.getByTitle('复制全部输出'))
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('alpha'))
        expect(await screen.findByText('已复制')).toBeInTheDocument()
    })

    it('shows skeleton while loading without data', () => {
        const { container } = render(
            <RawStatsCard stats={null} loading={true} lastRefreshedAt={null} />,
        )
        expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    })

    it('shows empty hint when no data', () => {
        render(<RawStatsCard stats={null} loading={false} lastRefreshedAt={null} />)
        expect(screen.getByText('暂无原始统计数据')).toBeInTheDocument()
    })
})
