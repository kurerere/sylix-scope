import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Badge } from './badge'

describe('Badge Component', () => {
    it('renders label with default neutral tone', () => {
        render(<Badge>稳定</Badge>)
        const badge = screen.getByText('稳定')
        expect(badge.className).toContain('bg-secondary')
        expect(badge.getAttribute('data-slot')).toBe('badge')
    })

    it('applies semantic tone classes', () => {
        render(<Badge tone="bad">过载</Badge>)
        expect(screen.getByText('过载').className).toContain('text-sig-bad')
    })
})
