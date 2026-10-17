import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ThemeProvider } from '@/application/theme/ThemeProvider'
import { tauriBridge } from '@/infrastructure/tauri/bridge'

import { SettingsView } from './SettingsView'

vi.mock('@/infrastructure/tauri/bridge', () => ({
    tauriBridge: {
        getDataDir: vi.fn(
            async () => '/Users/test/Library/Application Support/io.github.kurerere.sylixscope',
        ),
        openDataDir: vi.fn(async () => {}),
        getAppInfo: vi.fn(async () => ({
            app_name: 'sylixos-monitor',
            app_version: '1.0.0',
            tauri_version: '2.0.0',
            build_date: '2026-08-17 23:00:00 UTC',
            target: 'windows-x86_64',
        })),
    },
}))

describe('SettingsView Component', () => {
    const mockSetWarningCpu = vi.fn()
    const mockSetWarningMem = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        })
    })

    it('renders all configuration cards correctly including about card', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        expect(screen.getByText('资源阈值配置')).toBeDefined()
        expect(screen.getByText('数据存储目录')).toBeDefined()
        expect(screen.getByText('外观设置')).toBeDefined()
        expect(screen.getByText('界面字号')).toBeDefined()
        expect(screen.getByText('关于软件')).toBeDefined()
    })

    it('loads and displays app info and copies to clipboard', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(tauriBridge.getAppInfo).toHaveBeenCalledTimes(1)
        expect(screen.getByText('v1.0.0')).toBeDefined()
        expect(screen.getByText('2026-08-17 23:00:00 UTC')).toBeDefined()
        expect(screen.getByText('v2.0.0')).toBeDefined()
        expect(screen.getByText('windows-x86_64')).toBeDefined()

        const copyAppInfoBtn = screen.getByTitle('复制版本信息')
        await act(async () => {
            fireEvent.click(copyAppInfoBtn)
        })

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('应用版本: v1.0.0'),
        )

        await act(async () => {
            vi.advanceTimersByTime(2100)
        })
    })

    it('loads and displays app data directory path', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(tauriBridge.getDataDir).toHaveBeenCalledTimes(1)
        expect(
            screen.getByText(
                '/Users/test/Library/Application Support/io.github.kurerere.sylixscope',
            ),
        ).toBeDefined()
    })

    it('copies data directory path to clipboard when copy button is clicked', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const copyButton = screen.getByTitle('复制完整路径')
        await act(async () => {
            fireEvent.click(copyButton)
        })

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            '/Users/test/Library/Application Support/io.github.kurerere.sylixscope',
        )

        await act(async () => {
            vi.advanceTimersByTime(2100)
        })
    })

    it('calls openDataDir and shows feedback when open button is clicked', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const openButton = screen.getByRole('button', { name: /打开数据目录/ })
        await act(async () => {
            fireEvent.click(openButton)
        })

        expect(tauriBridge.openDataDir).toHaveBeenCalledTimes(1)
        expect(screen.getByText('已在文件管理器中打开')).toBeDefined()

        await act(async () => {
            vi.advanceTimersByTime(3100)
        })

        expect(screen.getByRole('button', { name: /打开数据目录/ })).toBeDefined()
    })

    it('shows error feedback when openDataDir fails', async () => {
        vi.mocked(tauriBridge.openDataDir).mockRejectedValueOnce(new Error('打开系统目录失败'))

        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const openButton = screen.getByRole('button', { name: /打开数据目录/ })
        await act(async () => {
            fireEvent.click(openButton)
        })

        expect(screen.getByText('打开系统目录失败')).toBeDefined()
    })

    it('updates thresholds and themes when controls are interacted with', async () => {
        render(
            <ThemeProvider>
                <SettingsView
                    warningCpu={80}
                    setWarningCpu={mockSetWarningCpu}
                    warningMem={85}
                    setWarningMem={mockSetWarningMem}
                />
            </ThemeProvider>,
        )

        await act(async () => {
            await Promise.resolve()
        })

        const sliders = screen.getAllByRole('slider')
        await act(async () => {
            fireEvent.change(sliders[0], { target: { value: '75' } })
        })
        expect(mockSetWarningCpu).toHaveBeenCalledWith(75)

        await act(async () => {
            fireEvent.change(sliders[1], { target: { value: '90' } })
        })
        expect(mockSetWarningMem).toHaveBeenCalledWith(90)
    })
})
