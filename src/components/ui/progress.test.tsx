import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Progress } from './progress'

describe('Progress Component', () => {
    it('renders with value and children label', () => {
        render(<Progress value={40}>采样中</Progress>)
        expect(screen.getByText('采样中')).toBeInTheDocument()
    })

    it('renders track slot', () => {
        const { container } = render(<Progress value={70} />)
        expect(container.querySelector('[data-slot="progress-track"]')).toBeInTheDocument()
        expect(container.querySelector('[data-slot="progress-indicator"]')).toBeInTheDocument()
    })
})
