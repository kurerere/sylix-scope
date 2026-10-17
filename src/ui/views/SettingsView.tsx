import {
    Sliders,
    Sun,
    Moon,
    Laptop,
    ShieldAlert,
    Database,
    FolderOpen,
    Copy,
    CheckCheck,
    Loader2,
    Info,
    Check,
} from 'lucide-react'
import { useState, useEffect } from 'react'

import { useTheme } from '@/application/theme/ThemeProvider'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { tauriBridge, AppInfo } from '@/infrastructure/tauri/bridge'

export function SettingsView({
    warningCpu,
    setWarningCpu,
    warningMem,
    setWarningMem,
}: {
    warningCpu: number
    setWarningCpu: (val: number) => void
    warningMem: number
    setWarningMem: (val: number) => void
}) {
    const { theme, setTheme, fontSize, setFontSize } = useTheme()

    const [dataDir, setDataDir] = useState<string>('')
    const [isLoadingDir, setIsLoadingDir] = useState<boolean>(true)
    const [isOpeningDir, setIsOpeningDir] = useState<boolean>(false)
    const [copied, setCopied] = useState<boolean>(false)
    const [openFeedback, setOpenFeedback] = useState<string | null>(null)

    const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
    const [isLoadingAppInfo, setIsLoadingAppInfo] = useState<boolean>(true)
    const [copiedAppInfo, setCopiedAppInfo] = useState<boolean>(false)

    useEffect(() => {
        let mounted = true
        const fetchDir = async () => {
            try {
                const dir = await tauriBridge.getDataDir()
                if (mounted) {
                    setDataDir(dir)
                    setIsLoadingDir(false)
                }
            } catch {
                if (mounted) {
                    setDataDir('')
                    setIsLoadingDir(false)
                }
            }
        }
        const fetchAppInfo = async () => {
            try {
                const info = await tauriBridge.getAppInfo()
                if (mounted) {
                    setAppInfo(info)
                    setIsLoadingAppInfo(false)
                }
            } catch {
                if (mounted) {
                    setIsLoadingAppInfo(false)
                }
            }
        }
        void fetchDir()
        void fetchAppInfo()
        return () => {
            mounted = false
        }
    }, [])

    const handleCopyAppInfo = async () => {
        if (!appInfo) return
        const text = [
            `应用名称: ${appInfo.app_name}`,
            `应用版本: v${appInfo.app_version}`,
            `构建日期: ${appInfo.build_date}`,
            `Tauri 引擎: v${appInfo.tauri_version}`,
            `目标平台: ${appInfo.target || 'unknown'}`,
        ].join('\n')
        try {
            await navigator.clipboard.writeText(text)
            setCopiedAppInfo(true)
            setTimeout(() => setCopiedAppInfo(false), 2000)
        } catch {
            // fallback
        }
    }

    const handleCopyPath = async () => {
        if (!dataDir) return
        try {
            await navigator.clipboard.writeText(dataDir)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback
        }
    }

    const handleOpenDir = async () => {
        if (isOpeningDir) return
        setIsOpeningDir(true)
        setOpenFeedback(null)
        try {
            await tauriBridge.openDataDir()
            setOpenFeedback('已在文件管理器中打开')
            setTimeout(() => setOpenFeedback(null), 3000)
        } catch (err) {
            setOpenFeedback(err instanceof Error ? err.message : '打开目录失败')
            setTimeout(() => setOpenFeedback(null), 4000)
        } finally {
            setIsOpeningDir(false)
        }
    }

    const themeOptions = [
        { value: 'light', icon: Sun, label: '浅色' },
        { value: 'dark', icon: Moon, label: '深色' },
        { value: 'system', icon: Laptop, label: '跟随系统' },
    ] as const

    const fontSizeOptions = [
        { value: 'compact', label: '紧凑', previewSize: 'text-[0.6875rem]' },
        { value: 'default', label: '默认', previewSize: 'text-xs' },
        { value: 'medium', label: '适中', previewSize: 'text-sm' },
        { value: 'large', label: '宽松', previewSize: 'text-base' },
    ] as const

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center gap-3.5">
                <div className="bg-primary/10 border-primary/30 text-primary flex size-10 items-center justify-center rounded-sm border">
                    <Sliders className="size-5" />
                </div>
                <div>
                    <h1 className="text-foreground text-sm font-bold tracking-widest uppercase">
                        设置
                    </h1>
                    <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                        告警阈值、外观与数据存储
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="flex flex-col justify-between p-6">
                    <div>
                        <CardHeader className="border-border/50 border-b p-0 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="text-sig-bad size-4" />
                                <CardTitle className="text-foreground text-xs font-bold tracking-widest uppercase">
                                    资源阈值配置
                                </CardTitle>
                            </div>
                            <CardDescription className="text-muted-foreground mt-0.5 text-[0.6875rem] font-medium">
                                资源占用超过水位线时触发告警
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-0 pt-5">
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between font-mono text-xs">
                                    <span className="text-foreground/80 font-bold">
                                        CPU 预警阈值
                                    </span>
                                    <span className="text-chart-cpu font-bold tabular-nums">
                                        {warningCpu}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="30"
                                    max="95"
                                    value={warningCpu}
                                    onChange={(e) => setWarningCpu(parseInt(e.target.value, 10))}
                                    className="accent-primary bg-secondary h-1 w-full cursor-pointer appearance-none rounded-sm"
                                    aria-label="CPU 预警阈值"
                                />
                                <p className="text-muted-foreground/80 text-[0.6875rem] leading-normal">
                                    总 CPU 使用率超过该水位线时，仪表面板显示过载告警。
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between font-mono text-xs">
                                    <span className="text-foreground/80 font-bold">
                                        内存预警阈值
                                    </span>
                                    <span className="text-chart-mem font-bold tabular-nums">
                                        {warningMem}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="30"
                                    max="95"
                                    value={warningMem}
                                    onChange={(e) => setWarningMem(parseInt(e.target.value, 10))}
                                    className="accent-primary bg-secondary h-1 w-full cursor-pointer appearance-none rounded-sm"
                                    aria-label="内存预警阈值"
                                />
                                <p className="text-muted-foreground/80 text-[0.6875rem] leading-normal">
                                    物理内存占比超过此值后，内存面板显示过载告警。
                                </p>
                            </div>
                        </CardContent>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between p-6">
                    <div>
                        <CardHeader className="border-border/50 border-b p-0 pb-4">
                            <div className="flex items-center gap-2">
                                <Database className="text-chart-mem size-4" />
                                <CardTitle className="text-foreground text-xs font-bold tracking-widest uppercase">
                                    数据存储目录
                                </CardTitle>
                            </div>
                            <CardDescription className="text-muted-foreground mt-0.5 text-[0.6875rem] font-medium">
                                录制数据与配置的本地存储位置
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-0 pt-5">
                            <div className="space-y-2">
                                <label className="text-foreground/80 block text-xs font-bold tracking-wider uppercase">
                                    存储路径
                                </label>

                                <div className="border-border bg-secondary/30 relative rounded-sm border p-3">
                                    <div className="text-foreground/90 flex min-h-[2.5rem] items-center pr-8 font-mono text-xs break-all select-text">
                                        {isLoadingDir ? (
                                            <span className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
                                                <Loader2 className="size-3.5 animate-spin" />
                                                <span>正在读取存储路径...</span>
                                            </span>
                                        ) : dataDir ? (
                                            dataDir
                                        ) : (
                                            <span className="text-muted-foreground text-[0.6875rem]">
                                                暂无存储目录信息
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCopyPath}
                                        disabled={!dataDir}
                                        title="复制完整路径"
                                        aria-label="复制完整路径"
                                        className="border-border/80 bg-background text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                                        {copied ? (
                                            <CheckCheck className="text-sig-ok size-3.5" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleOpenDir}
                                    disabled={isOpeningDir || !dataDir}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                                    {isOpeningDir ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <FolderOpen className="size-4" />
                                    )}
                                    <span>
                                        {isOpeningDir
                                            ? '正在打开...'
                                            : openFeedback || '打开数据目录'}
                                    </span>
                                </button>
                            </div>
                        </CardContent>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between p-6">
                    <div>
                        <CardHeader className="border-border/50 border-b p-0 pb-4">
                            <div className="flex items-center gap-2">
                                <Sun className="text-primary size-4" />
                                <CardTitle className="text-foreground text-xs font-bold tracking-widest uppercase">
                                    外观设置
                                </CardTitle>
                            </div>
                            <CardDescription className="text-muted-foreground mt-0.5 text-[0.6875rem] font-medium">
                                配色模式与基准字号
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 p-0 pt-5">
                            <div className="space-y-2.5">
                                <label className="text-foreground/80 block text-xs font-bold tracking-wider uppercase">
                                    配色模式
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {themeOptions.map((opt) => {
                                        const Icon = opt.icon
                                        const isActive = theme === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setTheme(opt.value)}
                                                aria-pressed={isActive}
                                                className={`relative flex flex-col items-center justify-center rounded-sm border p-2.5 text-center transition-colors select-none ${
                                                    isActive
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                                                }`}>
                                                <Icon
                                                    className={`mb-1.5 size-4 ${isActive ? 'text-primary' : ''}`}
                                                />
                                                <span className="block text-xs font-bold">
                                                    {opt.label}
                                                </span>
                                                {isActive && (
                                                    <div className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-3 items-center justify-center rounded-[1px]">
                                                        <Check className="size-2 stroke-[4]" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-foreground/80 block text-xs font-bold tracking-wider uppercase">
                                    界面字号
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {fontSizeOptions.map((opt) => {
                                        const isActive = fontSize === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFontSize(opt.value)}
                                                aria-pressed={isActive}
                                                className={`relative flex flex-col items-center justify-center rounded-sm border p-3 text-center transition-colors select-none ${
                                                    isActive
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                                                }`}>
                                                <span
                                                    className={`${opt.previewSize} text-primary mb-1.5 font-bold`}>
                                                    Aa
                                                </span>
                                                <span className="block text-xs font-bold">
                                                    {opt.label}
                                                </span>
                                                {isActive && (
                                                    <div className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-3 items-center justify-center rounded-[1px]">
                                                        <Check className="size-2 stroke-[4]" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-muted-foreground/80 text-[0.6875rem] leading-normal">
                                    调整基准字号（rem），全局文本随比例缩放。
                                </p>
                            </div>
                        </CardContent>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between p-6 md:col-span-2">
                    <div>
                        <CardHeader className="border-border/50 border-b p-0 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Info className="text-primary size-4" />
                                    <CardTitle className="text-foreground text-xs font-bold tracking-widest uppercase">
                                        关于软件
                                    </CardTitle>
                                </div>
                                {appInfo && (
                                    <button
                                        type="button"
                                        onClick={handleCopyAppInfo}
                                        title="复制版本信息"
                                        className="border-border/80 bg-background text-muted-foreground hover:text-foreground flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 text-[0.6875rem] font-medium transition-colors">
                                        {copiedAppInfo ? (
                                            <>
                                                <CheckCheck className="text-sig-ok size-3.5" />
                                                <span className="text-sig-ok">已复制</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-3.5" />
                                                <span>复制版本信息</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            <CardDescription className="text-muted-foreground mt-0.5 text-[0.6875rem] font-medium">
                                系统版本及运行环境信息
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 pt-5">
                            {isLoadingAppInfo ? (
                                <div className="text-muted-foreground flex items-center gap-1.5 py-4 text-xs">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>正在读取版本信息...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="border-border bg-secondary/30 rounded-sm border p-3">
                                        <span className="text-muted-foreground block text-[0.6875rem] font-bold uppercase">
                                            应用版本
                                        </span>
                                        <span className="text-foreground mt-1 block font-mono text-xs font-bold">
                                            v{appInfo?.app_version || '1.0.0'}
                                        </span>
                                    </div>
                                    <div className="border-border bg-secondary/30 rounded-sm border p-3">
                                        <span className="text-muted-foreground block text-[0.6875rem] font-bold uppercase">
                                            构建日期
                                        </span>
                                        <span className="text-foreground mt-1 block font-mono text-xs font-semibold tabular-nums">
                                            {appInfo?.build_date || '未知'}
                                        </span>
                                    </div>
                                    <div className="border-border bg-secondary/30 rounded-sm border p-3">
                                        <span className="text-muted-foreground block text-[0.6875rem] font-bold uppercase">
                                            Tauri 引擎
                                        </span>
                                        <span className="text-foreground mt-1 block font-mono text-xs font-semibold">
                                            v{appInfo?.tauri_version || '2.0'}
                                        </span>
                                    </div>
                                    <div className="border-border bg-secondary/30 rounded-sm border p-3">
                                        <span className="text-muted-foreground block text-[0.6875rem] font-bold uppercase">
                                            目标架构
                                        </span>
                                        <span className="text-foreground mt-1 block font-mono text-xs font-semibold">
                                            {appInfo?.target || 'unknown'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    )
}
