import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Alert, AlertDescription, AlertTitle } from './alert'

describe('Alert Component', () => {
    it('renders default alert with title and description', () => {
        render(
            <Alert>
                <AlertTitle>提示标题</AlertTitle>
                <AlertDescription>提示内容</AlertDescription>
            </Alert>,
        )
        expect(screen.getByText('提示标题')).toBeInTheDocument()
        expect(screen.getByText('提示内容')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders destructive variant', () => {
        render(
            <Alert variant="destructive">
                <AlertDescription>危险</AlertDescription>
            </Alert>,
        )
        expect(screen.getByRole('alert').className).toContain('text-destructive')
    })
})
