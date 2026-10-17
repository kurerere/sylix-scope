import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString()
        },
        clear: () => {
            store = {}
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
            return Object.keys(store).length
        },
    }
})()

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
})

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue({
        is_running: true,
        port: 3001,
        active_sessions: 0,
        server_url: 'http://127.0.0.1:3001/sse',
    }),
}))

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn().mockResolvedValue(() => {}),
    emit: vi.fn().mockResolvedValue(undefined),
}))



// recharts ResponsiveContainer 在 jsdom 下需要 ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
})
