import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ExportProgressModal, ExportStep } from './ExportProgressModal'

describe('ExportProgressModal Component', () => {
    const steps: ExportStep[] = [
        { label: '整理快照数据', status: 'success' },
        { label: '选择保存路径', status: 'active' },
        { label: '写入快照文件', status: 'pending' },
    ]

    const defaultProps = {
        isOpen: true,
        progress: 40,
        stepText: '请选择保存路径...',
        steps,
        error: null,
        onClose: vi.fn(),
    }

    it('does not render when isOpen is false', () => {
        const { container } = render(<ExportProgressModal {...defaultProps} isOpen={false} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders exporting state correctly', () => {
        render(<ExportProgressModal {...defaultProps} />)
        expect(screen.getByText('正在导出快照')).toBeDefined()
        expect(screen.getByText('请选择保存路径...')).toBeDefined()
        expect(screen.getByText('整理快照数据')).toBeDefined()
        expect(screen.getByText('选择保存路径')).toBeDefined()
        expect(screen.getByText('写入快照文件')).toBeDefined()

        const button = screen.getByRole('button')
        expect(button).toBeDefined()
        expect(button.getAttribute('disabled')).not.toBeNull()
    })

    it('renders success state correctly', () => {
        render(<ExportProgressModal {...defaultProps} progress={100} stepText="导出成功！" />)
        expect(screen.getByText('导出完成')).toBeDefined()

        const button = screen.getByRole('button', { name: '确定' })
        expect(button).toBeDefined()
        expect(button.getAttribute('disabled')).toBeNull()
    })

    it('renders error state correctly', () => {
        render(<ExportProgressModal {...defaultProps} error="写入磁盘失败，空间不足" />)
        expect(screen.getByText('导出失败')).toBeDefined()
        expect(screen.getByText('写入磁盘失败，空间不足')).toBeDefined()

        const button = screen.getByRole('button', { name: '关闭' })
        expect(button).toBeDefined()
        expect(button.getAttribute('disabled')).toBeNull()
    })

    it('calls onClose when confirm button is clicked', () => {
        const onClose = vi.fn()
        render(<ExportProgressModal {...defaultProps} progress={100} onClose={onClose} />)

        const button = screen.getByRole('button', { name: '确定' })
        fireEvent.click(button)
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
