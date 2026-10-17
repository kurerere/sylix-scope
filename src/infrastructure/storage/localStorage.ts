export interface ConnectionConfig {
    ip: string
    port: number
    username: string
    password: string
}

export interface WarningThresholds {
    cpu: number
    mem: number
}

export const storage = {
    getConnectionConfig(defaultIp = '192.168.1.187'): ConnectionConfig {
        return {
            ip: localStorage.getItem('sylixos_ip') || defaultIp,
            port: parseInt(localStorage.getItem('sylixos_port') || '23', 10),
            username: localStorage.getItem('sylixos_user') || 'root',
            password: localStorage.getItem('sylixos_pass') || 'root',
        }
    },

    saveConnectionConfig(config: ConnectionConfig): void {
        localStorage.setItem('sylixos_ip', config.ip)
        localStorage.setItem('sylixos_port', config.port.toString())
        localStorage.setItem('sylixos_user', config.username)
        localStorage.setItem('sylixos_pass', config.password)
    },

    getWarningThresholds(): WarningThresholds {
        return {
            cpu: parseInt(localStorage.getItem('warning_cpu') || '80', 10),
            mem: parseInt(localStorage.getItem('warning_mem') || '85', 10),
        }
    },

    saveWarningCpu(value: number): void {
        localStorage.setItem('warning_cpu', value.toString())
    },

    saveWarningMem(value: number): void {
        localStorage.setItem('warning_mem', value.toString())
    },

    getConnectionHistory(): ConnectionConfig[] {
        try {
            const raw = localStorage.getItem('sylixos_connection_history')
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    },

    saveConnectionHistory(history: ConnectionConfig[]): void {
        localStorage.setItem('sylixos_connection_history', JSON.stringify(history))
    },

    addConnectionToHistory(config: ConnectionConfig): void {
        const history = this.getConnectionHistory()
        const filtered = history.filter(
            (item) =>
                !(
                    item.ip === config.ip &&
                    item.port === config.port &&
                    item.username === config.username &&
                    item.password === config.password
                ),
        )
        const newHistory = [config, ...filtered].slice(0, 10)
        this.saveConnectionHistory(newHistory)
    },

    removeConnectionFromHistory(config: ConnectionConfig): void {
        const history = this.getConnectionHistory()
        const newHistory = history.filter(
            (item) =>
                !(
                    item.ip === config.ip &&
                    item.port === config.port &&
                    item.username === config.username &&
                    item.password === config.password
                ),
        )
        this.saveConnectionHistory(newHistory)
    },
}
