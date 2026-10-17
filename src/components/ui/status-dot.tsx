import * as React from 'react'

import { cn } from '@/lib/utils'

type StatusTone = 'ok' | 'warn' | 'bad' | 'idle'

const toneClass: Record<StatusTone, string> = {
    ok: 'bg-sig-ok',
    warn: 'bg-sig-warn',
    bad: 'bg-sig-bad',
    idle: 'bg-muted-foreground/40',
}

function StatusDot({
    tone = 'idle',
    pulse = false,
    className,
    ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & { tone?: StatusTone; pulse?: boolean }) {
    return (
        <span
            data-slot="status-dot"
            aria-hidden
            className={cn(
                'inline-block size-1.5 shrink-0 rounded-[1px]',
                toneClass[tone],
                pulse && 'animate-pulse',
                className,
            )}
            {...props}
        />
    )
}

export { StatusDot }
export type { StatusTone }
