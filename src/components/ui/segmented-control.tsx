import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SegmentedControlOption<T extends string | number> {
    value: T
    label: React.ReactNode
    title?: string
}

export interface SegmentedControlProps<T extends string | number> {
    value: T
    onChange: (value: T) => void
    options: readonly SegmentedControlOption<T>[]
    size?: 'sm' | 'default'
    className?: string
    disabled?: boolean
    /** 排序切换等场景允许重复点击已选中项再次触发 onChange */
    allowReselect?: boolean
    'aria-label'?: string
}

export function SegmentedControl<T extends string | number>({
    value,
    onChange,
    options,
    size = 'sm',
    className,
    disabled = false,
    allowReselect = false,
    'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn(
                'border-border bg-muted inline-flex items-center rounded-lg border p-0.5',
                disabled && 'pointer-events-none opacity-50',
                className,
            )}>
            {options.map((option) => {
                const isActive = option.value === value
                const accessibleName =
                    option.title ?? (typeof option.label === 'string' ? option.label : undefined)
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="button"
                        aria-pressed={isActive}
                        aria-label={accessibleName}
                        title={option.title}
                        disabled={disabled}
                        onClick={() => {
                            const reselectAllowed = allowReselect || !isActive
                            if (reselectAllowed && !disabled) {
                                onChange(option.value)
                            }
                        }}
                        className={cn(
                            'focus-visible:ring-ring/50 flex cursor-pointer select-none items-center justify-center rounded-md font-medium transition-all duration-150 outline-none focus-visible:ring-2',
                            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-xs',
                            isActive
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                        )}>
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
