import { describe, it, expect } from 'vitest'

import { validateRecordName } from './validation'

describe('History Domain Validation', () => {
    it('should validate empty or white space names', () => {
        expect(validateRecordName('', 'orig', [])).toBe('名称不能为空')
        expect(validateRecordName('   ', 'orig', [])).toBe('名称不能为空')
    })

    it('should validate max length', () => {
        const longName = 'a'.repeat(51)
        expect(validateRecordName(longName, 'orig', [])).toBe('名称不能超过 50 个字符')

        const okName = 'a'.repeat(50)
        expect(validateRecordName(okName, 'orig', [])).toBe('')
    })

    it('should validate filesystem reserved characters', () => {
        const invalidChars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']
        for (const char of invalidChars) {
            expect(validateRecordName(`name${char}test`, 'orig', [])).toBe(
                '不能包含 \\ / : * ? " < > |',
            )
        }
    })

    it('should validate duplicate names except the initial value', () => {
        const existing = ['rec-1', 'rec-2']
        expect(validateRecordName('rec-1', 'rec-2', existing)).toBe('名称已存在')
        expect(validateRecordName('rec-1', 'rec-1', existing)).toBe('')
        expect(validateRecordName('rec-3', 'rec-1', existing)).toBe('')
    })
})
