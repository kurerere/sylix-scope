import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { StatusDot } from './status-dot'

describe('StatusDot Component', () => {
    it('applies semantic tone color class', () => {
        render(<StatusDot tone="ok" data-testid="dot" />)
        const dot = screen.getByTestId('dot')
        expect(dot.className).toContain('bg-sig-ok')
    })

    it('applies pulse animation only when requested', () => {
        const { rerender } = render(<StatusDot tone="ok" pulse data-testid="dot" />)
        expect(screen.getByTestId('dot').className).toContain('animate-pulse')

        rerender(
            <div data-testid="wrap">
                <StatusDot tone="ok" data-testid="dot" />
            </div>,
        )
        expect(screen.getByTestId('dot').className).not.toContain('animate-pulse')
    })

    it('defaults to idle tone', () => {
        render(<StatusDot data-testid="dot" />)
        expect(screen.getByTestId('dot').className).toContain('bg-muted-foreground/40')
    })
})
