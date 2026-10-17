import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { InlineEditor } from './InlineEditor'

const setup = (props: Partial<Parameters<typeof InlineEditor>[0]> = {}) => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    render(
        <InlineEditor
            initialValue="rec-1"
            existingNames={['rec-1', 'rec-2']}
            onSave={onSave}
            onCancel={onCancel}
            {...props}
        />,
    )
    return { onSave, onCancel }
}

describe('InlineEditor Component', () => {
    it('renders an editable input with initial value', () => {
        setup()
        const input = screen.getByDisplayValue('rec-1')
        expect(input).toBeInTheDocument()
    })

    it('saves renamed value on Enter', async () => {
        const { onSave } = setup()
        const input = screen.getByDisplayValue('rec-1')
        fireEvent.change(input, { target: { value: 'new-name' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        await waitFor(() => expect(onSave).toHaveBeenCalledWith('new-name'))
    })

    it('cancels on Escape', () => {
        const { onCancel } = setup()
        const input = screen.getByDisplayValue('rec-1')
        fireEvent.keyDown(input, { key: 'Escape' })
        expect(onCancel).toHaveBeenCalled()
    })

    it('rejects duplicate names', async () => {
        const { onSave } = setup()
        const input = screen.getByDisplayValue('rec-1')
        fireEvent.change(input, { target: { value: 'rec-2' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        await waitFor(() => expect(screen.getByText(/已存在/)).toBeInTheDocument())
        expect(onSave).not.toHaveBeenCalled()
    })

    it('rejects empty names', async () => {
        const { onSave } = setup()
        const input = screen.getByDisplayValue('rec-1')
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        await waitFor(() => expect(screen.getByText(/不能为空/)).toBeInTheDocument())
        expect(onSave).not.toHaveBeenCalled()
    })
})
