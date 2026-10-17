import { Loader2, Check, X } from 'lucide-react'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'

import { Input } from '@/components/ui/input'
import { validateRecordName } from '@/domain/history/validation'

export const InlineEditor = ({
    initialValue,
    existingNames,
    onSave,
    onCancel,
    className,
    isSidebar = false,
}: {
    initialValue: string
    existingNames: string[]
    onSave: (val: string) => Promise<void>
    onCancel: () => void
    className?: string
    isSidebar?: boolean
}) => {
    const [name, setName] = useState(initialValue)
    const [prevInitialValue, setPrevInitialValue] = useState(initialValue)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const mountedTimeRef = useRef(0)

    if (prevInitialValue !== initialValue) {
        setPrevInitialValue(initialValue)
        setName(initialValue)
        setErrorMsg('')
    }

    useLayoutEffect(() => {
        mountedTimeRef.current = Date.now()
    }, [initialValue])

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        }, 50)
        return () => clearTimeout(timer)
    }, [initialValue])

    const handleSave = async () => {
        const trimmed = name.trim()
        if (trimmed === initialValue) {
            onCancel()
            return
        }

        const validationError = validateRecordName(trimmed, initialValue, existingNames)
        if (validationError) {
            setErrorMsg(validationError)
            inputRef.current?.focus()
            return
        }

        setIsSaving(true)
        setErrorMsg('')
        try {
            await onSave(trimmed)
        } catch {
            setErrorMsg('保存失败')
            inputRef.current?.focus()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col space-y-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-1.5">
                <Input
                    ref={inputRef}
                    autoFocus
                    disabled={isSaving}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        if (errorMsg) setErrorMsg('')
                    }}
                    onBlur={() => {
                        if (Date.now() - mountedTimeRef.current < 200) {
                            setTimeout(() => {
                                inputRef.current?.focus()
                                inputRef.current?.select()
                            }, 0)
                            return
                        }
                        if (!isSaving) {
                            handleSave()
                        }
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSave()
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault()
                            onCancel()
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`h-6.5 text-xs font-semibold ${isSidebar ? 'border-primary/50 bg-background/90' : 'bg-background'} ${
                        errorMsg
                            ? 'border-destructive focus-visible:ring-destructive'
                            : 'focus-visible:ring-primary'
                    } ${className || ''}`}
                    placeholder="输入新名称..."
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleSave()
                    }}
                    disabled={isSaving}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/10 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:outline-none disabled:opacity-50"
                    title="保存">
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onCancel()
                    }}
                    disabled={isSaving}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50"
                    title="取消">
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
            </div>
            {errorMsg && (
                <span className="text-destructive animate-in fade-in slide-in-from-top-1 px-1 text-[0.625rem] font-bold duration-150 select-none">
                    {errorMsg}
                </span>
            )}
        </div>
    )
}
