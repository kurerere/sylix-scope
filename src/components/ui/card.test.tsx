import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

describe('Card Primitives', () => {
    it('renders default card with all slots', () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>标题</CardTitle>
                    <CardDescription>描述</CardDescription>
                </CardHeader>
                <CardContent>内容</CardContent>
                <CardFooter>底部</CardFooter>
            </Card>,
        )
        expect(screen.getByText('标题')).toBeInTheDocument()
        expect(screen.getByText('描述')).toBeInTheDocument()
        expect(screen.getByText('内容')).toBeInTheDocument()
        expect(screen.getByText('底部')).toBeInTheDocument()
    })

    it('size=sm renders compact variant', () => {
        render(<Card size="sm" data-testid="card-sm" />)
        expect(screen.getByTestId('card-sm').getAttribute('data-size')).toBe('sm')
    })
})
