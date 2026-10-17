import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { SegmentedControl } from './segmented-control'

describe('SegmentedControl Component', () => {
    const options = [
        { value: 0, label: '手动', title: '关闭自动刷新' },
        { value: 3, label: '3s', title: '每 3 秒刷新一次' },
        { value: 5, label: '5s', title: '每 5 秒刷新一次' },
    ]

    it('renders all options with correct active state', () => {
        const handleChange = vi.fn()
        render(
            <SegmentedControl
                value={3}
                onChange={handleChange}
                options={options}
                aria-label="自动刷新频率"
            />,
        )

        expect(screen.getByRole('group', { name: '自动刷新频率' })).toBeDefined()

        const option0 = screen.getByRole('button', { name: '关闭自动刷新' })
        const option3 = screen.getByRole('button', { name: '每 3 秒刷新一次' })
        const option5 = screen.getByRole('button', { name: '每 5 秒刷新一次' })

        expect(option0.getAttribute('aria-pressed')).toBe('false')
        expect(option3.getAttribute('aria-pressed')).toBe('true')
        expect(option5.getAttribute('aria-pressed')).toBe('false')
    })

    it('calls onChange with selected value when clicked', () => {
        const handleChange = vi.fn()
        render(<SegmentedControl value={0} onChange={handleChange} options={options} />)

        const option5 = screen.getByRole('button', { name: '每 5 秒刷新一次' })
        fireEvent.click(option5)

        expect(handleChange).toHaveBeenCalledWith(5)
    })

    it('does not call onChange when clicking currently active option', () => {
        const handleChange = vi.fn()
        render(<SegmentedControl value={3} onChange={handleChange} options={options} />)

        const option3 = screen.getByRole('button', { name: '每 3 秒刷新一次' })
        fireEvent.click(option3)

        expect(handleChange).not.toHaveBeenCalled()
    })

    it('disables all buttons when disabled prop is true', () => {
        const handleChange = vi.fn()
        render(
            <SegmentedControl
                value={0}
                onChange={handleChange}
                options={options}
                disabled={true}
            />,
        )

        const option3 = screen.getByRole('button', { name: '每 3 秒刷新一次' })
        expect(option3).toBeDisabled()

        fireEvent.click(option3)
        expect(handleChange).not.toHaveBeenCalled()
    })
})
