import { fileURLToPath, URL } from 'node:url'
import babel from '@rolldown/plugin-babel'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// babel 转换会破坏 v8 覆盖率映射；React Compiler 只做记忆化，覆盖率运行时跳过
const isCoverageRun = process.env.npm_lifecycle_event?.includes('coverage')

export default defineConfig({
    plugins: [
        // babel 必须先于 react()：React Compiler 需要在 JSX 被转换前分析源码
        ...(isCoverageRun
            ? []
            : [babel({ plugins: [['babel-plugin-react-compiler', { target: '19' }]] })]),
        react(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: ['text', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.{test,spec}.{ts,tsx}',
                'src/main.tsx',
                'src/vite-env.d.ts',
                'src/domain/metrics/types.ts',
                'src/domain/process/types.ts',
                'src/domain/network/types.ts',
            ],
            // 渐进式门禁：锁定当前值防回退，后续逐文件提升至 95
            thresholds: {
                lines: 82,
                functions: 72,
                branches: 79,
                statements: 82,
            },
        },
    },
})
