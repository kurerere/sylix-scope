---
name: "SylixScope Design System"
description: "纯平工业指挥台设计规范：实色卡片、1px 边框、2px 半径、语义状态色与克制的工程绿数据色"
adr:
  - docs/adr/0005-flat-industrial-cockpit-visual-world.md
  - docs/adr/0006-memory-segments-render-true-proportions.md
colors:
  primary: "#0969da"
  primary-dark: "#2f81f7"
  background: "#f6f8fa"
  background-dark: "#0d1117"
  card: "#ffffff"
  card-dark: "#161b22"
  foreground: "#1f2328"
  foreground-dark: "#e6edf3"
  sig-ok: "#1a7f37"
  sig-warn: "#9a6700"
  sig-bad: "#cf222e"
  sig-ok-dark: "#3fb950"
  sig-warn-dark: "#d29922"
  sig-bad-dark: "#f85149"
typography:
  fontFamily: "Geist Variable, Noto Sans SC Variable, -apple-system, BlinkMacSystemFont, sans-serif"
  monoFamily: "Geist Mono Variable, Noto Sans SC Variable, ui-monospace, Consolas, monospace"
rounded:
  all: "2px"
---

# Design System: SylixScope

## 1. North Star

**纯平工业指挥台（Flat Industrial Cockpit）** —— 决策记录见 ADR 0005。

面向 SylixOS 嵌入式实时操作系统的监控驾驶舱。视觉语言的目标是"仪器"而非"应用"：实色表面、1px 边框、方正形状、高对比数据。界面的一切装饰必须为功能服务；不具备状态语义的颜色和动画一律不出现。

**关键特征：**

* **实色表面 + 1px 边框**：卡片、弹层、面板全部使用实色背景与单一 1px 边框表达层级，无毛玻璃、无光晕、无投影堆叠。
* **2px 全局半径**：所有圆角统一 2px（Tailwind 各级 radius token 全部钉死为 `--radius: 2px`）。圆形仅保留给仪表盘刻度等真正需要圆形的部件；状态点、徽章、进度条一律方正。
* **颜色有纪律**：颜色分为两组——**状态色**（`--sig-ok / --sig-warn / --sig-bad`，仅由真实状态触发）与**数据色**（`--chart-cpu / --chart-mem` 与内存分段 `--seg-*`），互不越界。没有"装饰性颜色"。
* **动效有语义**：仅保留告警呼吸（阈值越限）、录制涟漪（持续采集提示）、连接进行时指示三种功能性动效，全部支持 `prefers-reduced-motion` 降级。

## 2. Colors

浅色与深色双主题并列（ADR 0005），深色为工程环境的默认观感。所有色值定义于 `src/index.css` 的 `:root` / `.dark`，经 `@theme` 桥接为 Tailwind 工具类（如 `bg-sig-ok/10`、`text-chart-cpu`）。

### Neutral（GitHub 风格灰阶）

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--background` | `#f6f8fa` | `#0d1117` | 应用底色 |
| `--card` | `#ffffff` | `#161b22` | 卡片/弹层表面 |
| `--foreground` | `#1f2328` | `#e6edf3` | 主文本 |
| `--muted-foreground` | `#57606a` | `#8d96a0` | 次级文本（浅色模式满足 4.5:1） |
| `--border` | `#d0d7de` | `#30363d` | 唯一边框色 |

### 着色规则（Grafana 式阈值着色）

数据元素（曲线、进度条、仪表）默认使用数据色，**绿色不常驻数据元素**；越过阈值时
才切换状态色（≥70% 琥珀、≥90% 红）——颜色变化本身就是告警信号。状态徽章与
连接点保持语义绿（"健康=绿"的通用认知）。

### Status（状态色，仅由状态触发）

| Token | Light | Dark | 语义 |
|---|---|---|---|
| `--sig-ok` | `#1a7f37` | `#3fb950` | 正常 / 在线 / 成功 |
| `--sig-warn` | `#9a6700` | `#d29922` | 波动 / 暂停 / 降级 |
| `--sig-bad` | `#cf222e` | `#f85149` | 过载 / 错误 / 危险操作 |

### Data（数据色，仅用于数据呈现）

| Token | Light | Dark | 语义 |
|---|---|---|---|
| `--chart-cpu` | `#1447e6` | `#6c93f5` | CPU 曲线 / CPU 数值 |
| `--chart-mem` | `#1b7c83` | `#56d4dd` | 内存曲线 / 内存数值 |
| `--seg-kernel` | `#9a6700` | `#d29922` | 内存分段：内核/堆 |
| `--seg-app` | `#1447e6` | `#6c93f5` | 内存分段：应用占用 |
| `--seg-other` | `#1b7c83` | `#56d4dd` | 内存分段：其它缓冲 |
| `--seg-free` | `#57606a` | `#6e7681` | 内存分段：空闲 |

## 3. Typography

**字体全部自打包，任何平台不依赖系统字体**（跨平台渲染统一是硬性要求）：

| 角色 | 字体 | 覆盖 |
|---|---|---|
| 界面正文 / 标题 | `'Geist Variable'` | 拉丁字母、数字 |
| 中文伴生 | `'Noto Sans SC Variable'`（思源黑体） | 汉字（unicode-range 分块按需加载） |
| 数据 / 代码 | `'Geist Mono Variable'` | 数值、时间戳、IP、路径、命令 |

栈定义在 `index.css @theme` 的 `--font-sans` / `--font-mono` token 中，是唯一来源；禁止在组件里另写 `font-family`。`font-mono` 中的汉字回退到 Noto Sans SC，避免中文落在平台默认字体上。

* 数值一律 `font-mono` + `tabular-nums`，保证跳动数据不抖列宽；`tabular-nums` 已在 `body` 全局开启（Geist 已验证带 `tnum` 特性）。
* 微标签用 `text-xs` + `tracking-widest uppercase`，字重上限 `font-bold`；禁用 `font-black` 喊叫式排版。
* 字号只用 rem 系（`text-[0.625rem]` 起），保证字号缩放功能生效；禁止 px 字号。
* 字体经由 `main.tsx` JS 导入打包（Tailwind 的 `@import` 不解析 `url()` 资源）。

## 4. Elevation & Shape

* 层级只靠两个手段：**表面色差**（background → card → popover）与 **1px 边框**。唯一例外是浮层（弹窗/抽屉/toast）允许 `shadow-lg/shadow-2xl` 表达悬浮。
* 全部圆角 2px；`rounded-full` 仅允许出现在仪表盘 SVG 与录制指示等真正圆形部件中。
* 进度条、状态点、徽章、分割块一律 `rounded-sm` 或 `rounded-[1px]`。

## 5. Components

基础原语位于 `src/components/ui/`，视图严禁绕过组件库手写（项目规范见 `.agents/AGENTS.md`）。

* **Card**：实色 `bg-card` + `border-border`，2px 圆角，无投影。
* **Button**：2px 圆角；`destructive` 语义由 `--destructive` 驱动；危险操作（重启设备、停止录制）必须配 `ActionTooltip`。
* **Badge**：状态徽章，`tone: ok | warn | bad | neutral`，边框 + 10% 底色 + 状态色文字。
* **StatusDot**：方形状态点（`tone` + 可选 `pulse`），用于连接、会话、运行状态。
* **Dialog / Sheet**：一切弹窗与侧抽屉的唯一容器（Base UI Dialog 封装），自带 ESC 关闭、焦点管理与遮罩；进程/抽屉类用 `SheetContent`。
* **SegmentedControl**：一切"互斥小切换"（时间窗口、刷新频率、协议筛选、倍速）的唯一形态，禁止手写 tab。

## 6. Motion

| 动效 | 触发 | 实现 |
|---|---|---|
| 告警呼吸 | 阈值越限 | `.alert-glow-rose` / `.alert-glow-amber`（边框呼吸） |
| 录制提示 | 录制进行中 | `.animate-ripple-rose-*` / `.recording-active` |
| 连接进行时 | 连接中 | `animate-spin`（Loader）/ `animate-pulse`（在线点） |
| 浮层出入 | Dialog/Sheet 开合 | `data-open:` / `data-closed:` 过渡类 |

除此之外的动画（数值闪烁、扫光、悬浮位移、光晕脉冲）一律不存在。

## 7. Data Honesty

内存分段、速率、波形一律渲染真实值（ADR 0006）。小占比分段不在段内嵌文字，依赖图例读数；任何"视觉缩放"都是数据谎言，禁止重新引入。
