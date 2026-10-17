import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent, ActionTooltip } from './tooltip'

describe('Tooltip Component', () => {
    it('renders tooltip trigger and displays content on focus or hover', async () => {
        render(
            <TooltipProvider delay={0}>
                <Tooltip>
                    <TooltipTrigger render={<button>触发按钮</button>} />
                    <TooltipContent>浮层说明</TooltipContent>
                </Tooltip>
            </TooltipProvider>,
        )

        const trigger = screen.getByText('触发按钮')
        expect(trigger).toBeInTheDocument()

        fireEvent.focus(trigger)
        expect(await screen.findByText('浮层说明')).toBeInTheDocument()
    })

    it('renders ActionTooltip convenience component', async () => {
        render(
            <TooltipProvider delay={0}>
                <ActionTooltip content="便捷提示">
                    <button>快捷操作</button>
                </ActionTooltip>
            </TooltipProvider>,
        )

        const trigger = screen.getByText('快捷操作')
        expect(trigger).toBeInTheDocument()

        fireEvent.focus(trigger)
        expect(await screen.findByText('便捷提示')).toBeInTheDocument()
    })
})
