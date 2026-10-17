import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type FontSize = 'compact' | 'default' | 'medium' | 'large'

interface ThemeContextType {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
    fontSize: FontSize
    setFontSize: (fontSize: FontSize) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'sylixos-monitor-theme'
const FONT_SIZE_KEY = 'sylixos-monitor-font-size'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
        return (saved as Theme) || 'system'
    })

    const [fontSize, setFontSizeState] = useState<FontSize>(() => {
        const saved = localStorage.getItem(FONT_SIZE_KEY)
        return (saved as FontSize) || 'default'
    })

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')

    const setTheme = React.useCallback((newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem(LOCAL_STORAGE_KEY, newTheme)
    }, [])

    const setFontSize = React.useCallback((newSize: FontSize) => {
        setFontSizeState(newSize)
        localStorage.setItem(FONT_SIZE_KEY, newSize)
    }, [])

    useEffect(() => {
        const root = window.document.documentElement

        const updateTheme = () => {
            let active: ResolvedTheme
            if (theme === 'system') {
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                active = systemDark ? 'dark' : 'light'
            } else {
                active = theme as ResolvedTheme
            }

            setResolvedTheme(active)

            if (active === 'dark') {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
        }

        updateTheme()

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            mediaQuery.addEventListener('change', updateTheme)
            return () => mediaQuery.removeEventListener('change', updateTheme)
        }
    }, [theme])

    useEffect(() => {
        const root = window.document.documentElement
        const sizeMap: Record<FontSize, string> = {
            compact: '14px',
            default: '16px',
            medium: '18px',
            large: '20px',
        }
        root.style.fontSize = sizeMap[fontSize]
    }, [fontSize])

    const contextValue = React.useMemo(
        () => ({ theme, resolvedTheme, setTheme, fontSize, setFontSize }),
        [theme, resolvedTheme, setTheme, fontSize, setFontSize],
    )

    return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
