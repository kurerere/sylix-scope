export function CircularGauge({
    value,
    label,
    tone = 'ok',
    size = 144,
}: {
    value: number
    label?: string
    tone?: 'ok' | 'warn' | 'bad'
    size?: number
}) {
    const scale = size / 144
    const radius = 52 * scale
    const strokeWidth = 7 * scale
    const center = size / 2
    const circumference = 2 * Math.PI * radius
    const clamped = Math.min(Math.max(value, 0), 100)
    const offset = circumference - (clamped / 100) * circumference
    const strokeColor =
        tone === 'bad' ? 'var(--sig-bad)' : tone === 'warn' ? 'var(--sig-warn)' : 'var(--chart-cpu)'

    return (
        <div
            style={{ width: size, height: size }}
            className="relative flex flex-col items-center justify-center select-none"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-label={label || `当前值 ${clamped.toFixed(1)}%`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className="stroke-secondary"
                    fill="none"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className="transition-all duration-500 ease-out"
                    stroke={strokeColor}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <div className="flex items-baseline font-mono">
                    <span
                        style={{ fontSize: `${36 * scale}px` }}
                        className="text-foreground font-bold tracking-tight tabular-nums">
                        {clamped.toFixed(1)}
                    </span>
                    <span
                        style={{ fontSize: `${14 * scale}px` }}
                        className="text-muted-foreground ml-0.5 font-bold">
                        %
                    </span>
                </div>
                {label && (
                    <span
                        style={{ fontSize: `${10 * scale}px` }}
                        className="text-muted-foreground mt-1 font-bold tracking-widest uppercase">
                        {label}
                    </span>
                )}
            </div>
        </div>
    )
}
