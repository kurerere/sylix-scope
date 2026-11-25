---
name: "SylixScope Design System"
description: "面向板卡排障的遥测工作区。共用时间轴、语义刻线和清晰的表格层级。"
colors:
  primary: "#176675"
  primary-dark: "#a8e0e1"
  background: "#eef2ef"
  background-dark: "#1d2427"
  rail: "#e1ebe8"
  rail-dark: "#131e21"
  plot: "#f7faf8"
  plot-dark: "#192124"
  card: "#ffffff"
  card-dark: "#232d30"
  foreground: "#1a292c"
  foreground-dark: "#edf2ef"
  chart-cpu: "#0e6572"
  chart-cpu-dark: "#9adce2"
  chart-mem: "#654694"
  chart-mem-dark: "#d4beef"
  sig-ok: "#1a7f37"
  sig-warn: "#9a6700"
  sig-bad: "#cf222e"
  sig-ok-dark: "#ace0ab"
  sig-warn-dark: "#f5c683"
  sig-bad-dark: "#ffaaa2"
typography:
  heading:
    fontFamily: "Geist Variable, Noto Sans SC Variable, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
  body:
    fontFamily: "Geist Variable, Noto Sans SC Variable, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
  reading:
    fontFamily: "Geist Mono Variable, Noto Sans SC Variable, ui-monospace, Consolas, monospace"
    fontSize: "1.875rem"
rounded:
  all: "2px"
components:
  segmented-control:
    backgroundColor: "{colors.plot}"
    rounded: "{rounded.all}"
  navigation-active:
    textColor: "{colors.primary}"
    rounded: "{rounded.all}"
---

# Design System: SylixScope

## Overview

工程师从常驻页头确认板卡连接，再在共用时间轴上对照 CPU、内存与越阈采样，并在下方检查进程。深青导航、石墨工作面和实色图表底区分这三个层级。实色和边框延续 [ADR 0005](docs/adr/0005-flat-industrial-cockpit-visual-world.md)。

**关键特征：**

* **实色表面 + 1px 边框**：卡片、弹层、面板全部使用实色背景与单一 1px 边框表达层级，无毛玻璃、无光晕、无投影堆叠。
* **2px 全局半径**：所有圆角统一 2px（Tailwind 各级 radius token 全部钉死为 `--radius: 2px`）。圆形仅保留给仪表盘刻度等真正需要圆形的部件；状态点、徽章、进度条一律方正。
* **颜色有纪律**：颜色分为两组——**状态色**（`--sig-ok / --sig-warn / --sig-bad`，仅由真实状态触发）与**数据色**（`--chart-cpu / --chart-mem` 与内存分段 `--seg-*`），互不越界。没有"装饰性颜色"。
* **状态可读**：连接、暂停和录制显示文字，曲线同时用线型与颜色区分。录制工具条占有自己的底部空间。

## Colors

浅色与深色双主题并列（ADR 0005），深色为工程环境的默认观感。所有色值定义于 `src/index.css` 的 `:root` / `.dark`，经 `@theme` 桥接为 Tailwind 工具类（如 `bg-sig-ok/10`、`text-chart-cpu`）。

### 表面色

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--background` | `#eef2ef` | `#1d2427` | 应用底色 |
| `--rail` | `#e1ebe8` | `#131e21` | 导航和工具条 |
| `--plot` | `#f7faf8` | `#192124` | 图表和表格底 |
| `--card` | `#ffffff` | `#232d30` | 工作面板和弹层 |
| `--foreground` | `#1a292c` | `#edf2ef` | 主文本 |
| `--muted-foreground` | `#57606a` | `#b5c5c4` | 次级文本 |
| `--border` | `#bacbc7` | `#425356` | 分隔线 |

### 越阈标记

CPU 保持实线，内存保持虚线。任一资源达到对应设置阈值时，在该采样时间绘制一条琥珀刻线。图例显示时间窗口内符合条件的采样数，同一时刻只计一次。锁定的采样使用贯穿图表的虚线。

### Status（状态色，仅由状态触发）

| Token | Light | Dark | 语义 |
|---|---|---|---|
| `--sig-ok` | `#1a7f37` | `#ace0ab` | 正常 / 在线 / 成功 |
| `--sig-warn` | `#9a6700` | `#f5c683` | 越阈 / 波动 / 暂停 |
| `--sig-bad` | `#cf222e` | `#ffaaa2` | 过载 / 错误 / 危险操作 |

### Data（数据色，仅用于数据呈现）

| Token | Light | Dark | 语义 |
|---|---|---|---|
| `--chart-cpu` | `#0e6572` | `#9adce2` | CPU 曲线 / CPU 数值 |
| `--chart-mem` | `#654694` | `#d4beef` | 内存曲线 / 内存数值 |
| `--seg-kernel` | `#9a6700` | `#f5c683` | 内存分段：内核/堆 |
| `--seg-app` | `#0969da` | `#9adce2` | 内存分段：应用占用 |
| `--seg-other` | `#1b7c83` | `#d4beef` | 内存分段：其它缓冲 |
| `--seg-free` | `#57606a` | `#839598` | 内存分段：空闲 |

## Typography

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

## Layout

窄容器将读数移到图表上方，表格在自身容器内横向滚动。历史与设置切换为单列时，保留与桌面一致的阅读顺序。

## Elevation & Depth

* 层级只靠两个手段：**表面色差**（background → card → popover）与 **1px 边框**。唯一例外是浮层（弹窗/抽屉/toast）允许 `shadow-lg/shadow-2xl` 表达悬浮。

## Shapes

* 全部圆角 2px；`rounded-full` 仅允许出现在仪表盘 SVG 与录制指示等真正圆形部件中。
* 进度条、状态点、徽章、分割块一律 `rounded-sm` 或 `rounded-[1px]`。

## Components

基础原语位于 `src/components/ui/`。采样选择使用原生下拉控件，聚焦显示主题轮廓。

* **Card**：实色 `bg-card` + `border-border`，2px 圆角，无投影。
* **Button**：2px 圆角；`destructive` 语义由 `--destructive` 驱动；危险操作（重启设备、停止录制）必须配 `ActionTooltip`。
* **Badge**：状态徽章，`tone: ok | warn | bad | neutral`，边框 + 10% 底色 + 状态色文字。
* **StatusDot**：方形状态点（`tone` + 可选 `pulse`），用于连接、会话、运行状态。
* **Dialog / Sheet**：一切弹窗与侧抽屉的唯一容器（Base UI Dialog 封装），自带 ESC 关闭、焦点管理与遮罩；进程/抽屉类用 `SheetContent`。
* **SegmentedControl**：一切"互斥小切换"（时间窗口、刷新频率、协议筛选、倍速）的唯一形态，禁止手写 tab。

### Motion

| 动效 | 触发 | 实现 |
|---|---|---|
| 连接进行时 | 连接中 | `animate-spin`（Loader） |
| 浮层出入 | Dialog/Sheet 开合 | `data-open:` / `data-closed:` 过渡类 |

窗口遵循 `prefers-reduced-motion`。实时曲线直接更新采样，录制通过红色状态文字和经过时间提示。

## Do's and Don'ts

内存分段、速率和波形按原始值绘制。小占比分段通过图例显示读数，见 [ADR 0006](docs/adr/0006-memory-segments-render-true-proportions.md)。
