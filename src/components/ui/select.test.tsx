import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from './select'

describe('Select Component', () => {
    it('renders trigger with role combobox and selected value', () => {
        render(
            <Select defaultValue="tcp">
                <SelectTrigger aria-label="协议">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                </SelectContent>
            </Select>,
        )
        expect(screen.getByRole('combobox', { name: '协议' })).toBeInTheDocument()
    })

    it('renders uncontrolled select with placeholder', () => {
        render(
            <Select>
                <SelectTrigger aria-label="协议">
                    <SelectValue placeholder="选择协议" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
            </Select>,
        )
        expect(screen.getByRole('combobox', { name: '协议' })).toBeInTheDocument()
    })

    it('renders small size trigger', () => {
        render(
            <Select>
                <SelectTrigger size="sm" aria-label="小尺寸" />
            </Select>,
        )
        expect(screen.getByRole('combobox', { name: '小尺寸' }).getAttribute('data-size')).toBe(
            'sm',
        )
    })
    it('renders expanded listbox with group, label, separator and scroll buttons', () => {
        render(
            <Select defaultOpen defaultValue="tcp">
                <SelectTrigger aria-label="协议">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>分组</SelectLabel>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectSeparator />
                        <SelectItem value="udp">UDP</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>,
        )
        expect(screen.getByText('分组')).toBeInTheDocument()
    })
})
