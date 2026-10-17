import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from './table'

describe('Table Primitives', () => {
    it('renders a full table skeleton', () => {
        render(
            <Table>
                <TableCaption>进程表</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>PID</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>41</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>合计</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>,
        )

        expect(screen.getByText('PID')).toBeInTheDocument()
        expect(screen.getByText('41')).toBeInTheDocument()
        expect(screen.getByText('合计')).toBeInTheDocument()
        expect(screen.getByText('进程表')).toBeInTheDocument()
    })
})
