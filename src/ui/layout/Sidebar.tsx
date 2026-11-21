import { TrendingUp, Network, Sliders, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

import { ActionTooltip } from '@/components/ui/tooltip'
import { tauriBridge, AppInfo } from '@/infrastructure/tauri/bridge'

export function Sidebar({
    activeTab,
    setActiveTab,
}: {
    activeTab: 'monitor' | 'network' | 'settings' | 'history'
    setActiveTab: (tab: 'monitor' | 'network' | 'settings' | 'history') => void
    isMonitoring?: boolean
    cpuWarning?: boolean
    memWarning?: boolean
}) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sylixos_sidebar_collapsed') === 'true'
        }
        return false
    })
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

    useEffect(() => {
        let mounted = true
        const fetchInfo = async () => {
            try {
                const info = await tauriBridge.getAppInfo()
                if (mounted) {
                    setAppInfo(info)
                }
            } catch {
                // fallback
            }
        }
        void fetchInfo()
        return () => {
            mounted = false
        }
    }, [])

    const navItems = [
        { id: 'monitor' as const, label: '实时监控', icon: TrendingUp },
        { id: 'network' as const, label: '网络看板', icon: Network },
        { id: 'history' as const, label: '历史记录', icon: Clock },
    ]

    const settingsItem = { id: 'settings' as const, label: '设置', icon: Sliders }

    const renderNavButton = (item: { id: typeof activeTab; label: string; icon: typeof TrendingUp }) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
            <ActionTooltip
                key={item.id}
                content={item.label}
                side="right"
                sideOffset={12}
                disabled={!isCollapsed}>
                <button
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    className={`flex w-full cursor-pointer items-center rounded-lg transition-colors duration-150 ${
                        isCollapsed ? 'justify-center' : 'gap-2.5 px-2.5 py-1.5'
                    } ${
                        isActive
                            ? 'bg-tint-surface-active text-ink'
                            : 'text-text-secondary hover:bg-tint-surface-hover hover:text-ink'
                    }`}>
                    <span
                        className={`flex items-center justify-center rounded-md transition-colors duration-150 ${
                            isCollapsed ? 'size-7' : 'size-6'
                        } ${isActive && isCollapsed ? 'bg-ink text-page' : ''}`}>
                        <Icon className={isCollapsed ? 'size-4' : 'size-3.5'} />
                    </span>
                    {!isCollapsed && (
                        <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                    )}
                </button>
            </ActionTooltip>
        )
    }

    return (
        <aside
            className={`relative z-20 flex shrink-0 flex-col justify-between transition-all duration-300 ease-in-out select-none ${
                isCollapsed ? 'w-10' : 'w-56'
            }`}>
            <div>
                <div
                    className={`flex items-center transition-all duration-300 ${
                        isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2.5'
                    }`}>
                    <img
                        src="/icon.svg"
                        alt=""
                        draggable={false}
                        className={isCollapsed ? 'size-6 shrink-0' : 'size-5 shrink-0'}
                    />
                    {!isCollapsed && (
                        <h1 className="text-ink min-w-0 text-[13px] font-semibold whitespace-nowrap">
                            SylixScope
                        </h1>
                    )}
                </div>

                <nav
                    className={`mt-2 space-y-0.5 transition-all duration-300 ${
                        isCollapsed ? 'flex flex-col items-center gap-1 px-1' : 'px-1.5'
                    }`}>
                    {navItems.map(renderNavButton)}
                </nav>
            </div>

            <div className={isCollapsed ? 'flex flex-col items-center gap-1 px-1 pb-1.5' : 'px-1.5 pb-1.5'}>
                {renderNavButton(settingsItem)}
                <div
                    className={`flex items-center whitespace-nowrap ${
                        isCollapsed ? 'justify-center pt-1' : 'justify-between px-2.5 pt-2'
                    }`}>
                    {isCollapsed ? (
                        <ActionTooltip
                            content={`版本: v${appInfo?.app_version || '1.0.0'} (构建: ${appInfo?.build_date || '未知'})`}
                            side="right"
                            sideOffset={12}>
                            <span className="text-text-quaternary font-mono text-[0.625rem]">
                                v{appInfo?.app_version || '1.0.0'}
                            </span>
                        </ActionTooltip>
                    ) : (
                        <>
                            <span className="text-text-quaternary font-mono text-[0.6875rem]">
                                v{appInfo?.app_version || '1.0.0'}
                            </span>
                            <span className="text-text-quaternary font-mono text-[0.625rem]">
                                Tauri v{appInfo?.tauri_version || '2.0'}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <ActionTooltip
                content={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
                side="right"
                sideOffset={8}>
                <button
                    onClick={() => {
                        const nextCollapsed = !isCollapsed
                        setIsCollapsed(nextCollapsed)
                        localStorage.setItem('sylixos_sidebar_collapsed', String(nextCollapsed))
                    }}
                    aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
                    className="border-border bg-elevated text-text-tertiary hover:text-ink absolute top-1/2 -right-2.5 z-30 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border shadow-l1 transition-colors duration-150">
                    {isCollapsed ? (
                        <ChevronRight className="size-3 transition-transform duration-200" />
                    ) : (
                        <ChevronLeft className="size-3 transition-transform duration-200" />
                    )}
                </button>
            </ActionTooltip>
        </aside>
    )
}
