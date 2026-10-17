export type ProtocolMode = 'streamable' | 'sse'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = '3001'

export function buildEndpointUrl(
    protocolMode: ProtocolMode,
    host: string,
    port: string,
    token: string,
): string {
    const baseHost = host || DEFAULT_HOST
    const portValue = port || DEFAULT_PORT
    if (protocolMode === 'streamable') {
        return `http://${baseHost}:${portValue}/mcp`
    }
    const tokenParam = token ? `?token=${token}` : ''
    return `http://${baseHost}:${portValue}/sse${tokenParam}`
}

export function buildClientSnippet(
    protocolMode: ProtocolMode,
    host: string,
    port: string,
    token: string,
): string {
    const url = buildEndpointUrl(protocolMode, host, port, token)
    if (protocolMode === 'streamable') {
        return JSON.stringify(
            {
                mcpServers: {
                    sylixscope: {
                        url,
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                },
            },
            null,
            2,
        )
    }
    return JSON.stringify(
        {
            mcpServers: {
                sylixscope: {
                    url,
                },
            },
        },
        null,
        2,
    )
}
