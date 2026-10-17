import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    SheetContent,
} from './dialog'

describe('Dialog Primitives', () => {
    it('renders trigger to open dialog with header slots', async () => {
        render(
            <Dialog open={false} onOpenChange={vi.fn()}>
                <DialogTrigger>打开</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>标题</DialogTitle>
                        <DialogDescription>描述</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button>确定</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>,
        )
        expect(screen.getByText('打开')).toBeInTheDocument()
    })

    it('hides content when closed', () => {
        render(
            <Dialog open={false} onOpenChange={vi.fn()}>
                <DialogContent>
                    <DialogTitle>关闭态</DialogTitle>
                </DialogContent>
            </Dialog>,
        )
        expect(screen.queryByText('关闭态')).not.toBeInTheDocument()
    })

    it('renders sheet variant with content', () => {
        render(
            <Dialog open onOpenChange={vi.fn()}>
                <SheetContent>
                    <DialogTitle>抽屉标题</DialogTitle>
                </SheetContent>
            </Dialog>,
        )
        expect(screen.getByText('抽屉标题')).toBeInTheDocument()
    })

    it('hides close button when showCloseButton is false', () => {
        render(
            <Dialog open onOpenChange={vi.fn()}>
                <DialogContent showCloseButton={false}>
                    <DialogTitle>无关闭按钮</DialogTitle>
                </DialogContent>
            </Dialog>,
        )
        expect(screen.queryByRole('button', { name: '关闭' })).not.toBeInTheDocument()
    })

    it('renders DialogClose as trigger', () => {
        render(
            <Dialog open onOpenChange={vi.fn()}>
                <DialogContent>
                    <DialogTitle>带关闭</DialogTitle>
                    <DialogClose>点我关闭</DialogClose>
                </DialogContent>
            </Dialog>,
        )
        expect(screen.getByText('点我关闭')).toBeInTheDocument()
    })
})
