import { describe, it, expect } from 'vitest'

import { buildClientSnippet, buildEndpointUrl } from './clientSnippet'

describe('buildEndpointUrl', () => {
    it('builds streamable http endpoint', () => {
        expect(buildEndpointUrl('streamable', '192.168.1.5', '3001', 'tok')).toBe(
            'http://192.168.1.5:3001/mcp',
        )
    })

    it('appends token as query param for sse', () => {
        expect(buildEndpointUrl('sse', '127.0.0.1', '3001', 'tok')).toBe(
            'http://127.0.0.1:3001/sse?token=tok',
        )
    })

    it('omits token param when token is empty', () => {
        expect(buildEndpointUrl('sse', '127.0.0.1', '3001', '')).toBe('http://127.0.0.1:3001/sse')
    })

    it('falls back to default host and port when blank', () => {
        expect(buildEndpointUrl('streamable', '', '', '')).toBe('http://127.0.0.1:3001/mcp')
    })
})

describe('buildClientSnippet', () => {
    it('streamable snippet carries Authorization header', () => {
        const snippet = JSON.parse(buildClientSnippet('streamable', '10.0.0.2', '8080', 'sk-1'))
        expect(snippet.mcpServers['sylixscope']).toEqual({
            url: 'http://10.0.0.2:8080/mcp',
            headers: { Authorization: 'Bearer sk-1' },
        })
    })

    it('sse snippet puts token in url only', () => {
        const snippet = JSON.parse(buildClientSnippet('sse', '10.0.0.2', '8080', 'sk-1'))
        expect(snippet.mcpServers['sylixscope']).toEqual({
            url: 'http://10.0.0.2:8080/sse?token=sk-1',
        })
    })

    it('produces stable pretty-printed json', () => {
        expect(buildClientSnippet('streamable', 'h', 'p', 't')).toBe(
            [
                '{',
                '  "mcpServers": {',
                '    "sylixscope": {',
                '      "url": "http://h:p/mcp",',
                '      "headers": {',
                '        "Authorization": "Bearer t"',
                '      }',
                '    }',
                '  }',
                '}',
            ].join('\n'),
        )
    })
})
