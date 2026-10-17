import { fileURLToPath, URL } from 'node:url'

import babel from '@rolldown/plugin-babel'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [
        // babel 必须先于 react()：React Compiler 需要在 JSX 被转换前分析源码
        babel({
            plugins: [['babel-plugin-react-compiler', { target: '19' }]],
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-compiler-runtime)[\\/]/ },
                        { name: 'charts', test: /node_modules[\\/](recharts|victory-vendor|d3-|internmap|decimal\.js)[\\/]/ },
                        { name: 'base-ui', test: /node_modules[\\/]@base-ui[\\/]/ },
                    ],
                },
            },
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // Prevent Vite from obscuring Rust errors
    clearScreen: false,
    // Tauri expects a fixed port and fails fast if unavailable
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: 'ws',
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // Ignore src-tauri to prevent watching backend Rust files
            ignored: ['**/src-tauri/**'],
        },
    },
}))
