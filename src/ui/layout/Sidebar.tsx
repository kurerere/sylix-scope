import { TrendingUp, Network, Sliders, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

import { ActionTooltip } from '@/components/ui/tooltip'
import { tauriBridge, AppInfo } from '@/infrastructure/tauri/bridge'

const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Mac')

export function Sidebar({
    activeTab,
    setActiveTab,
}: {
    activeTab: 'monitor' | 'network' | 'settings' | 'history'
    setActiveTab: (tab: 'monitor' | 'network' | 'settings' | 'history') => void
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
        { id: 'settings' as const, label: '设置', icon: Sliders },
    ]

    return (
        <aside
            className={`bg-rail border-border relative z-20 flex w-12 shrink-0 flex-col justify-between border-r select-none sm:w-16 ${
                isCollapsed ? '' : 'lg:w-52'
            }`}>
            <div>
                <div
                    className={`border-border flex items-center border-b pb-6 transition-all duration-300 ${
                        isCollapsed
                            ? 'justify-center px-0'
                            : 'justify-center lg:justify-start lg:gap-2 lg:px-4'
                    } ${isMac ? 'pt-12' : 'pt-6'}`}
                    data-tauri-drag-region>
                    <img src="/icon.svg" alt="" draggable={false} className="size-8 shrink-0" />
                    {!isCollapsed && (
                        <span className="text-foreground hidden min-w-0 text-base font-bold whitespace-nowrap lg:block">
                            SylixScope
                        </span>
                    )}
                </div>

                <nav aria-label="主导航" className="mt-6 space-y-1 px-1.5 sm:px-2 lg:px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id
                        return (
                            <div key={item.id} className="relative">
                                <ActionTooltip
                                    content={item.label}
                                    side="right"
                                    sideOffset={12}
                                    disabled={!isCollapsed}>
                                    <button
                                        onClick={() => setActiveTab(item.id)}
                                        aria-label={item.label}
                                        aria-current={isActive ? 'page' : undefined}
                                        title={item.label}
                                        className={`flex w-full items-center justify-center rounded-sm border py-3 transition-colors ${
                                            isCollapsed ? '' : 'lg:justify-start lg:gap-3 lg:px-3'
                                        } ${
                                            isActive
                                                ? 'border-primary/25 bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent'
                                        }`}>
                                        <Icon className="size-4 shrink-0" />
                                        {!isCollapsed && (
                                            <span className="hidden text-sm font-medium whitespace-nowrap lg:block">
                                                {item.label}
                                            </span>
                                        )}
                                    </button>
                                </ActionTooltip>
                            </div>
                        )
                    })}
                </nav>
            </div>

            <div
                className={`border-border border-t py-4 transition-all duration-300 ${
                    isCollapsed ? 'flex justify-center px-0' : 'px-6'
                }`}>
                {isCollapsed ? (
                    <ActionTooltip
                        content={`版本: v${appInfo?.app_version || '1.0.0'} (构建: ${appInfo?.build_date || '未知'})`}
                        side="right"
                        sideOffset={12}>
                        <div className="flex items-center justify-center">
                            <span className="text-muted-foreground font-mono text-[0.625rem] font-bold">
                                v{appInfo?.app_version || '1.0.0'}
                            </span>
                        </div>
                    </ActionTooltip>
                ) : (
                    <div className="text-muted-foreground hidden flex-wrap gap-x-2 whitespace-nowrap lg:flex">
                        <span className="font-mono text-[0.6875rem] font-bold">
                            v{appInfo?.app_version || '1.0.0'}
                        </span>
                        <span className="font-mono text-[0.625rem] opacity-80">
                            Tauri v{appInfo?.tauri_version || '2.0'}
                        </span>
                    </div>
                )}
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
                    className="border-border bg-rail text-muted-foreground hover:text-foreground absolute right-2 bottom-14 z-30 hidden size-8 items-center justify-center rounded-sm border transition-colors lg:flex">
                    {isCollapsed ? (
                        <ChevronRight className="size-3.5 transition-transform duration-200" />
                    ) : (
                        <ChevronLeft className="size-3.5 transition-transform duration-200" />
                    )}
                </button>
            </ActionTooltip>
        </aside>
    )
}
