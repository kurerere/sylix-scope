import type { Page } from '@playwright/test'

import { BOARD_SOCKETS } from './fixtures/sockets'

interface StubInvoke {
    (cmd: string, args?: unknown): Promise<unknown>
}

// 在页面脚本运行前伪装 Tauri IPC：invoke 按命令名回放真实板卡数据，
// event 层只需注册/注销不再投递（被测页面不依赖遥测事件流）
export async function installTauriStub(page: Page) {
    await page.addInitScript((sockets) => {
        const callbacks: Record<number, unknown> = {}
        let nextCallbackId = 1
        const win = window as unknown as Record<string, any>

        win.__TAURI_INTERNALS__ = {
            transformCallback(callback: unknown) {
                const id = nextCallbackId
                nextCallbackId += 1
                callbacks[id] = callback
                return id
            },
            invoke: (cmd: string): Promise<unknown> => {
                switch (cmd) {
                    case 'start_monitoring':
                    case 'stop_monitoring':
                    case 'stop_recording':
                    case 'plugin:event|listen':
                    case 'plugin:event|unlisten':
                    case 'open_data_dir':
                        return Promise.resolve(null)
                    case 'get_network_interfaces':
                        return Promise.resolve([])
                    case 'get_network_sockets':
                        return Promise.resolve(sockets)
                    case 'get_network_routes':
                        return Promise.resolve([])
                    case 'get_network_stats':
                        return Promise.resolve({
                            ip: {},
                            icmp: {},
                            tcp: {},
                            udp: {},
                            raw_lines: [],
                        })
                    case 'get_mcp_server_status':
                        return Promise.resolve({
                            is_running: false,
                            port: 3001,
                            active_sessions: 0,
                            sessions: [],
                            server_url: 'http://127.0.0.1:3001/sse',
                            token: 'e2e-stub',
                            allow_exec_command: false,
                        })
                    case 'get_app_info':
                        return Promise.resolve({
                            app_name: 'sylix-scope',
                            app_version: '0.0.0-e2e',
                            tauri_version: '2',
                            build_date: 'e2e',
                        })
                    case 'get_app_data_dir':
                        return Promise.resolve('C:\\e2e-data')
                    default:
                        console.warn(`[e2e-stub] 未桩接的命令: ${cmd}`)
                        return Promise.resolve(null)
                }
            },
        }
        void callbacks
    }, BOARD_SOCKETS)
}
