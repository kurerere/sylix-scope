import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Dialog(props: DialogPrimitive.Root.Props) {
    return <DialogPrimitive.Root {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: DialogPrimitive.Close.Props) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

const overlayClass = cn(
    'fixed inset-0 z-50 bg-black/60',
    'data-open:animate-in data-open:fade-in-0',
    'data-closed:animate-out data-closed:fade-out-0',
)

function DialogCloseButton() {
    return (
        <DialogPrimitive.Close
            aria-label="关闭"
            title="关闭"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-3 right-3 rounded-sm p-1 transition-colors outline-none focus-visible:ring-2">
            <X className="size-4" />
        </DialogPrimitive.Close>
    )
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={overlayClass} />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    'bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border p-6 shadow-lg outline-none',
                    'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
                    'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                    className,
                )}
                {...props}>
                {children}
                {showCloseButton && <DialogCloseButton />}
            </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
    )
}

function SheetContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop data-slot="sheet-overlay" className={overlayClass} />
            <DialogPrimitive.Popup
                data-slot="sheet-content"
                className={cn(
                    'bg-popover text-popover-foreground fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border p-6 shadow-lg outline-none',
                    'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right-4',
                    'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-in-from-right-4',
                    className,
                )}
                {...props}>
                {children}
                {showCloseButton && <DialogCloseButton />}
            </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-header"
            className={cn('flex flex-col gap-1.5', className)}
            {...props}
        />
    )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn('text-foreground text-base leading-none font-semibold', className)}
            {...props}
        />
    )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn('text-muted-foreground text-xs leading-relaxed', className)}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogTrigger,
    DialogClose,
    DialogContent,
    SheetContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
