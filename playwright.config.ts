import { defineConfig } from '@playwright/test'

// 复用 vite dev server：本地调试时沿用已启动的 1420 端口，CI 中自动拉起
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    fullyParallel: true,
    use: {
        baseURL: 'http://localhost:1420',
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:1420',
        reuseExistingServer: true,
        timeout: 120_000,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
