import { describe, it, expect, beforeEach } from 'vitest'

import { storage } from './localStorage'

describe('Storage Infrastructure', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('should return default connection config when empty', () => {
        const config = storage.getConnectionConfig('192.168.1.1')
        expect(config.ip).toBe('192.168.1.1')
        expect(config.port).toBe(23)
        expect(config.username).toBe('root')
        expect(config.password).toBe('root')
    })

    it('should save and retrieve connection config', () => {
        storage.saveConnectionConfig({
            ip: '10.0.0.1',
            port: 8080,
            username: 'admin',
            password: 'secret_password',
        })

        const config = storage.getConnectionConfig()
        expect(config.ip).toBe('10.0.0.1')
        expect(config.port).toBe(8080)
        expect(config.username).toBe('admin')
        expect(config.password).toBe('secret_password')
    })

    it('should handle warning thresholds', () => {
        expect(storage.getWarningThresholds()).toEqual({ cpu: 80, mem: 85 })

        storage.saveWarningCpu(90)
        storage.saveWarningMem(95)

        expect(storage.getWarningThresholds()).toEqual({ cpu: 90, mem: 95 })
    })

    it('should manage connection history', () => {
        expect(storage.getConnectionHistory()).toEqual([])

        const config1 = { ip: '10.0.0.1', port: 23, username: 'root', password: '1' }
        const config2 = { ip: '10.0.0.2', port: 23, username: 'root', password: '2' }

        storage.addConnectionToHistory(config1)
        expect(storage.getConnectionHistory()).toEqual([config1])

        storage.addConnectionToHistory(config2)
        expect(storage.getConnectionHistory()).toEqual([config2, config1])

        storage.addConnectionToHistory(config1)
        expect(storage.getConnectionHistory()).toEqual([config1, config2])

        storage.removeConnectionFromHistory(config1)
        expect(storage.getConnectionHistory()).toEqual([config2])
    })

    it('should limit history size to 10 items', () => {
        for (let i = 1; i <= 12; i++) {
            storage.addConnectionToHistory({
                ip: `10.0.0.${i}`,
                port: 23,
                username: 'root',
                password: 'pwd',
            })
        }

        const history = storage.getConnectionHistory()
        expect(history.length).toBe(10)
        expect(history[0].ip).toBe('10.0.0.12')
        expect(history[9].ip).toBe('10.0.0.3')
    })
})
