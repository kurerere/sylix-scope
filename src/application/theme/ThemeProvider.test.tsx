import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { ThemeProvider, useTheme } from './ThemeProvider'

beforeEach(() => {
    document.documentElement.className = ''
    document.documentElement.style.fontSize = ''
    localStorage.clear()
})

const TestComponent = () => {
    const { theme, resolvedTheme, setTheme, fontSize, setFontSize } = useTheme()
    return (
        <div>
            <span data-testid="theme">{theme}</span>
            <span data-testid="resolved">{resolvedTheme}</span>
            <span data-testid="fontSize">{fontSize}</span>
            <button onClick={() => setTheme('light')} data-testid="btn-light">
                Light
            </button>
            <button onClick={() => setTheme('dark')} data-testid="btn-dark">
                Dark
            </button>
            <button onClick={() => setTheme('system')} data-testid="btn-system">
                System
            </button>
            <button onClick={() => setFontSize('compact')} data-testid="btn-compact">
                Compact
            </button>
            <button onClick={() => setFontSize('large')} data-testid="btn-large">
                Large
            </button>
        </div>
    )
}

describe('ThemeProvider', () => {
    it('should default to system theme and toggle class accordingly', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>,
        )
        expect(screen.getByTestId('theme').textContent).toBe('system')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should change theme state and classlist when setTheme is called', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>,
        )

        const btnLight = screen.getByTestId('btn-light')
        const btnDark = screen.getByTestId('btn-dark')

        act(() => {
            btnLight.click()
        })
        expect(screen.getByTestId('theme').textContent).toBe('light')
        expect(screen.getByTestId('resolved').textContent).toBe('light')
        expect(document.documentElement.classList.contains('dark')).toBe(false)
        expect(localStorage.getItem('sylixos-monitor-theme')).toBe('light')

        act(() => {
            btnDark.click()
        })
        expect(screen.getByTestId('theme').textContent).toBe('dark')
        expect(screen.getByTestId('resolved').textContent).toBe('dark')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(localStorage.getItem('sylixos-monitor-theme')).toBe('dark')
    })

    it('should default to default fontSize and change state when setFontSize is called', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>,
        )
        expect(screen.getByTestId('fontSize').textContent).toBe('default')
        expect(document.documentElement.style.fontSize).toBe('16px')

        const btnCompact = screen.getByTestId('btn-compact')
        const btnLarge = screen.getByTestId('btn-large')

        act(() => {
            btnCompact.click()
        })
        expect(screen.getByTestId('fontSize').textContent).toBe('compact')
        expect(document.documentElement.style.fontSize).toBe('14px')
        expect(localStorage.getItem('sylixos-monitor-font-size')).toBe('compact')

        act(() => {
            btnLarge.click()
        })
        expect(screen.getByTestId('fontSize').textContent).toBe('large')
        expect(document.documentElement.style.fontSize).toBe('20px')
        expect(localStorage.getItem('sylixos-monitor-font-size')).toBe('large')
    })
})
