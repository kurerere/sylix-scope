import React from 'react'
import ReactDOM from 'react-dom/client'

import { ThemeProvider } from '@/application/theme/ThemeProvider'
// 字体经由 Vite CSS 管线打包（Tailwind 的 @import 不会解析 url() 资源）；
// CJK 与 mono 资产按 unicode-range 分块，运行时仅加载用到的字形区间
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/noto-sans-sc'

// oxlint-disable-next-line import/no-unassigned-import
import './index.css'

import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
)
