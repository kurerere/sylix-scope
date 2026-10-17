import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

function TooltipProvider({ delay = 200, ...props }: TooltipPrimitive.Provider.Props) {
    return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
    return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps extends TooltipPrimitive.Popup.Props {
    sideOffset?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
}

function TooltipContent({
    className,
    sideOffset = 6,
    side = 'top',
    align = 'center',
    children,
    ...props
}: TooltipContentProps) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                sideOffset={sideOffset}
                side={side}
                align={align}
                className="z-[9999]">
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cn(
                        'pointer-events-none z-[9999] overflow-hidden rounded-md px-2.5 py-1 text-xs font-medium shadow-xl transition-all select-none whitespace-nowrap',
                        'bg-zinc-900 text-zinc-50 border border-zinc-800/90',
                        'dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200/90 dark:shadow-black/40',
                        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                        className,
                    )}
                    {...props}>
                    {children}
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    )
}

interface ActionTooltipProps {
    content: React.ReactNode
    children: React.ReactElement
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    disabled?: boolean
}

function ActionTooltip({
    content,
    children,
    side = 'top',
    align = 'center',
    sideOffset = 6,
    disabled = false,
}: ActionTooltipProps) {
    if (disabled || !content) {
        return children
    }

    return (
        <Tooltip>
            <TooltipTrigger render={children} />
            <TooltipContent side={side} align={align} sideOffset={sideOffset}>
                {content}
            </TooltipContent>
        </Tooltip>
    )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, ActionTooltip }
