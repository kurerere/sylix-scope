import { describe, it, expect } from 'vitest'

describe('Testing Environment', () => {
    it('should perform basic math correctly', () => {
        expect(1 + 1).toBe(2)
    })

    it('should have access to DOM APIs in jsdom env', () => {
        const div = document.createElement('div')
        div.innerHTML = '<span>hello</span>'
        expect(div.querySelector('span')?.textContent).toBe('hello')
    })
})
