import { invoke } from '@tauri-apps/api/core'
import { listen, Event, UnlistenFn } from '@tauri-apps/api/event'

import { NetInterface, NetSocket, RouteEntry, NetStatistics } from '@/domain/network/types'
import { ProcessThread } from '@/domain/process/types'

export type { NetInterface, NetSocket, RouteEntry, NetStatistics }

import { ConnectionConfig } from '../storage/localStorage'

export interface RecordItem {
    id: number
    name: string
    start_time: number
    end_time: number | null
}

export interface MetricPoint {
    timestamp: number
    cpu_usage: number
    mem_total: number
    mem_used: number
    mem_free: number
    mem_kernel: number
    mem_app: number
    cpu_cores?: number[]
}

export interface ProcessMetricPoint {
    timestamp: number
    pid: number
    name: string
    cpu: number
    mem: number
    cmdline?: string
    execfile?: string
    threads?: ProcessThread[]
}

export interface ExportedRecordData {
    record: RecordItem
    metrics: MetricPoint[]
    processes: ProcessMetricPoint[]
}

export interface NetworkInterfaceIp {
    name: string
    ip: string
    is_default: boolean
}

export interface McpSessionInfo {
    session_id: string
    client_ip: string
    connected_at: number
    user_agent?: string | null
}

export interface McpStatusInfo {
    is_running: boolean
    port: number
    active_sessions: number
    sessions: McpSessionInfo[]
    server_url: string
    lan_ip?: string | null
    lan_ips?: NetworkInterfaceIp[]
    lan_server_url?: string | null
    streamable_url?: string
    lan_streamable_url?: string | null
    token: string
    allow_exec_command: boolean
}

export type McpServerStatus = McpStatusInfo

export type Unsubscribe = () => void

// 晚注销/早卸载竞态在此收敛：注销先于监听建立时，监听建立后立即注销
function subscribe<T>(event: string, callback: (payload: T) => void): Unsubscribe {
    let disposed = false
    let unlisten: UnlistenFn | null = null
    listen<T>(event, (e: Event<T>) => {
        if (!disposed) callback(e.payload)
    }).then((u) => {
        if (disposed) u()
        else unlisten = u
        return undefined
    })
    return () => {
        disposed = true
        unlisten?.()
    }
}

export interface McpAuditLog {
    id: string
    timestamp: number
    client_id: string
    tool_name: string
    params: any
    duration_ms: number
    success: boolean
    error?: string | null
}

export interface AppInfo {
    app_name: string
    app_version: string
    tauri_version: string
    build_date: string
    target?: string
}

export const tauriBridge = {
    async startMonitoring(config: ConnectionConfig): Promise<void> {
        await invoke('start_monitoring', {
            ip: config.ip,
            port: config.port,
            username: config.username,
            password: config.password,
        })
    },

    async stopMonitoring(): Promise<void> {
        await invoke('stop_monitoring')
    },

    async startRecording(name: string): Promise<number> {
        return await invoke<number>('start_recording', { name })
    },

    async stopRecording(): Promise<void> {
        await invoke('stop_recording')
    },

    async getRecords(): Promise<RecordItem[]> {
        return await invoke<RecordItem[]>('get_records')
    },

    async getRecordMetrics(id: number): Promise<MetricPoint[]> {
        return await invoke<MetricPoint[]>('get_record_metrics', { id })
    },

    async getRecordProcesses(id: number, timestamp: number): Promise<any[]> {
        return await invoke<any[]>('get_record_processes', { id, timestamp })
    },

    async deleteRecord(id: number): Promise<void> {
        await invoke('delete_record', { id })
    },

    async renameRecord(id: number, name: string): Promise<void> {
        await invoke('rename_record', { id, name })
    },

    async exportRecord(id: number): Promise<ExportedRecordData> {
        return await invoke<ExportedRecordData>('export_record', { id })
    },

    async selectSavePath(defaultName: string, initialDir: string | null): Promise<string | null> {
        return await invoke<string | null>('select_save_path', { defaultName, initialDir })
    },

    async saveSnapshotToFile(path: string, snapshot: any): Promise<void> {
        await invoke('save_snapshot_to_file', { path, snapshot })
    },

    async exportRecordToFile(id: number, path: string): Promise<void> {
        await invoke('export_record_to_file', { id, path })
    },

    onMonitorData(callback: (data: any) => void): Unsubscribe {
        return subscribe('monitor_data', callback)
    },

    onMonitorStatus(callback: (status: string) => void): Unsubscribe {
        return subscribe('monitor_status', callback)
    },

    onMonitorError(callback: (error: string) => void): Unsubscribe {
        return subscribe('monitor_error', callback)
    },

    async getMcpServerStatus(): Promise<McpStatusInfo> {
        return await invoke<McpStatusInfo>('get_mcp_server_status')
    },

    async restartMcpServer(port: number): Promise<void> {
        await invoke('restart_mcp_server', { port })
    },

    async resetMcpToken(): Promise<McpStatusInfo> {
        return await invoke<McpStatusInfo>('reset_mcp_token')
    },

    async setMcpAllowExecCommand(allow: boolean): Promise<McpStatusInfo> {
        return await invoke<McpStatusInfo>('set_mcp_allow_exec_command', { allow })
    },

    async stopMcpServer(): Promise<void> {
        await invoke('stop_mcp_server')
    },

    onMcpAuditLog(callback: (log: McpAuditLog) => void): Unsubscribe {
        return subscribe('mcp_audit_log', callback)
    },

    async rebootTarget(config?: ConnectionConfig, syncBefore: boolean = true): Promise<string> {
        return await invoke<string>('reboot_target', {
            ip: config?.ip,
            port: config?.port,
            username: config?.username,
            password: config?.password,
            syncBefore,
        })
    },

    async getDataDir(): Promise<string> {
        return await invoke<string>('get_app_data_dir')
    },

    async openDataDir(): Promise<void> {
        await invoke('open_data_dir')
    },

    async getAppInfo(): Promise<AppInfo> {
        try {
            return await invoke<AppInfo>('get_app_info')
        } catch {
            return {
                app_name: 'sylixos-monitor',
                app_version: '1.0.0',
                tauri_version: '2.0',
                build_date: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
                target: 'unknown',
            }
        }
    },

    async getNetworkInterfaces(): Promise<NetInterface[]> {
        return await invoke<NetInterface[]>('get_network_interfaces')
    },

    async getNetworkSockets(protocol?: string): Promise<NetSocket[]> {
        return await invoke<NetSocket[]>('get_network_sockets', { protocol })
    },

    async getNetworkRoutes(): Promise<RouteEntry[]> {
        return await invoke<RouteEntry[]>('get_network_routes')
    },

    async getNetworkStats(): Promise<NetStatistics> {
        return await invoke<NetStatistics>('get_network_stats')
    },
}
