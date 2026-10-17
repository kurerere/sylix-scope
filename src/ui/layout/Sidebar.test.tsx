import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { Sidebar } from './Sidebar'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getAppInfo: vi.fn(async () => ({
            app_name: 'sylixos-monitor',
            app_version: '1.0.0',
            tauri_version: '2.0.0',
            build_date: '2026-08-17 23:00:00 UTC',
            target: 'windows-x86_64',
        })),
    },
}))

describe('Sidebar Component', () => {
    const defaultProps = {
        activeTab: 'monitor' as const,
        setActiveTab: vi.fn(),
        isMonitoring: false,
        cpuWarning: false,
        memWarning: false,
    }

    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    it('renders sidebar in expanded state by default with version info', async () => {
        render(<Sidebar {...defaultProps} />)

        await act(async () => {
            await Promise.resolve()
        })

        expect(screen.getByText('实时监控', { selector: 'span' })).toBeDefined()
        expect(screen.getByText('SylixScope')).toBeDefined()
        expect(screen.getByRole('button', { name: '收起侧边栏' })).toBeDefined()
        expect(screen.getByText('v1.0.0')).toBeDefined()
        expect(screen.getByText('Tauri v2.0.0')).toBeDefined()
    })

    it('collapses the sidebar when clicking collapse button', () => {
        render(<Sidebar {...defaultProps} />)
        const collapseButton = screen.getByRole('button', { name: '收起侧边栏' })
        fireEvent.click(collapseButton)

        expect(screen.queryByText('实时监控', { selector: 'span' })).toBeNull()
        expect(screen.queryByText('SylixScope')).toBeNull()
        expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeDefined()

        expect(localStorage.getItem('sylixos_sidebar_collapsed')).toBe('true')
    })

    it('expands the sidebar when clicking expand button from collapsed state', () => {
        localStorage.setItem('sylixos_sidebar_collapsed', 'true')
        render(<Sidebar {...defaultProps} />)

        const expandButton = screen.getByRole('button', { name: '展开侧边栏' })
        fireEvent.click(expandButton)

        expect(screen.getByText('实时监控', { selector: 'span' })).toBeDefined()
        expect(screen.getByText('SylixScope')).toBeDefined()
        expect(screen.getByRole('button', { name: '收起侧边栏' })).toBeDefined()
        expect(localStorage.getItem('sylixos_sidebar_collapsed')).toBe('false')
    })

    it('restores collapsed state from localStorage on mount', () => {
        localStorage.setItem('sylixos_sidebar_collapsed', 'true')
        render(<Sidebar {...defaultProps} />)

        expect(screen.queryByText('实时监控', { selector: 'span' })).toBeNull()
        expect(screen.queryByText('SylixScope')).toBeNull()
        expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeDefined()
    })

    it('triggers setActiveTab callback when nav item is clicked', () => {
        render(<Sidebar {...defaultProps} />)
        const settingsButton = screen.getByText('设置')
        fireEvent.click(settingsButton)

        expect(defaultProps.setActiveTab).toHaveBeenCalledWith('settings')
    })
})
