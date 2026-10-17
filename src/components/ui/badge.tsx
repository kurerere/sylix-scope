import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[0.625rem] leading-none font-bold tracking-widest uppercase select-none',
    {
        variants: {
            tone: {
                neutral: 'border-border bg-secondary text-secondary-foreground',
                ok: 'border-sig-ok/40 bg-sig-ok/10 text-sig-ok',
                warn: 'border-sig-warn/40 bg-sig-warn/10 text-sig-warn',
                bad: 'border-sig-bad/40 bg-sig-bad/10 text-sig-bad',
            },
        },
        defaultVariants: {
            tone: 'neutral',
        },
    },
)

function Badge({
    className,
    tone,
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
    return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
