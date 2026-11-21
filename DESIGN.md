---
name: "Devin Desktop"
description: "模块化内嵌面板桌面设计体系，以柔和浅灰/深炭外壳托起多块圆角独立工作面板、四级精细投影与电光蓝功能点缀，面向高密度工程与多任务工作台。"
colors:
  accent-azure: "#317CFF"
  accent-azure-dark: "#4489FF"
  accent-azure-text-dark: "#49B0FF"
  accent-neutral: "#363636"
  accent-neutral-dark: "#F9F9F9"
  link-cerulean: "rgba(13, 133, 185, 0.85)"
  link-cerulean-strong: "#1E98CE"
  link-cyan-dark: "rgba(62, 184, 237, 0.85)"
  link-cyan-strong-dark: "#3EB8ED"
  status-green: "#00A558"
  status-green-bg: "rgba(62, 237, 155, 0.20)"
  status-green-dark: "#00EC7E"
  status-green-bg-dark: "rgba(0, 236, 126, 0.08)"
  status-red: "#F53B3A"
  status-red-bg: "rgba(245, 59, 58, 0.12)"
  status-orange: "#F58E3A"
  status-orange-bg: "rgba(245, 142, 58, 0.12)"
  status-orange-bg-dark: "rgba(245, 142, 58, 0.08)"
  status-purple: "#956CDE"
  status-purple-bg: "rgba(149, 108, 222, 0.12)"
  status-blue: "#337DF4"
  status-blue-bg: "rgba(51, 125, 244, 0.10)"
  wash-light: "#F8F8F8"
  page-light: "#FCFCFC"
  elevated-light: "#FFFFFF"
  elevated-wax-light: "rgba(255, 255, 255, 0.94)"
  text-primary-light: "#191919"
  text-strong-light: "#000000"
  text-secondary-light: "rgba(25, 25, 25, 0.56)"
  text-disabled-light: "rgba(25, 25, 25, 0.40)"
  border-primary-light: "rgba(0, 0, 0, 0.08)"
  border-secondary-light: "rgba(0, 0, 0, 0.06)"
  tint-tertiary-light: "rgba(0, 0, 0, 0.04)"
  tint-secondary-light: "rgba(0, 0, 0, 0.06)"
  tint-primary-light: "rgba(0, 0, 0, 0.08)"
  scrim-light: "rgba(0, 0, 0, 0.12)"
  wash-dark: "#191919"
  page-dark: "#141414"
  elevated-dark: "#1F1F1F"
  elevated-wax-dark: "rgba(31, 31, 31, 0.94)"
  text-primary-dark: "rgba(255, 255, 255, 0.90)"
  text-strong-dark: "#FFFFFF"
  text-secondary-dark: "rgba(255, 255, 255, 0.52)"
  text-disabled-dark: "rgba(255, 255, 255, 0.40)"
  border-primary-dark: "rgba(255, 255, 255, 0.08)"
  border-secondary-dark: "rgba(255, 255, 255, 0.04)"
  tint-tertiary-dark: "rgba(255, 255, 255, 0.03)"
  tint-secondary-dark: "rgba(255, 255, 255, 0.05)"
  tint-primary-dark: "rgba(255, 255, 255, 0.08)"
  scrim-dark: "rgba(0, 0, 0, 0.32)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.42
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: "-0.005em"
  prose:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0em"
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.36
    letterSpacing: "0em"
  code:
    fontFamily: "Devin Mono, SF Mono, Roboto Mono, ui-monospace, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
components:
  activity-icon-active:
    backgroundColor: "{colors.text-primary-light}"
    textColor: "{colors.elevated-light}"
    rounded: "{rounded.md}"
    width: "28px"
    height: "28px"
  button-primary:
    backgroundColor: "{colors.accent-azure}"
    textColor: "{colors.elevated-light}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "28px"
  button-neutral:
    backgroundColor: "{colors.accent-neutral}"
    textColor: "{colors.elevated-light}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    width: "28px"
    height: "28px"
  button-ghost-hover:
    backgroundColor: "{colors.tint-secondary-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
  tab-active:
    backgroundColor: "{colors.tint-primary-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "28px"
  session-item-active:
    backgroundColor: "{colors.tint-secondary-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  inset-panel:
    backgroundColor: "{colors.page-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.xl}"
  composer-card:
    backgroundColor: "{colors.elevated-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  composer-banner:
    backgroundColor: "{colors.wash-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.label}"
    padding: "8px 12px"
  dropdown-menu:
    backgroundColor: "{colors.elevated-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.xl}"
    padding: "4px"
  dropdown-item-active:
    backgroundColor: "{colors.tint-secondary-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  user-bubble:
    backgroundColor: "{colors.tint-secondary-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "7px 12px"
  kbd-cap:
    backgroundColor: "{colors.tint-tertiary-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "1px 5px"
---

# Design System: Devin Desktop

## Overview

**Creative North Star: "The Modular Cockpit"**

Devin Desktop 是一套面向工程与多并行任务的 **Operate** 型桌面设计体系。它不像传统 IDE 那样用密密麻麻的直角分割线把界面切成生硬格子，也不像纯阅读软件那样压缩功能密度；而是通过一层柔和的外壳底色（Wash）托起多块**彼此留有呼吸槽隙的独立圆角工作面板（Inset Panels）**，让会话列表、主工作流与变更审阅区既边界分明又浑然一体。

整个体系在视觉上保持冷静克制的中性灰白/深炭基调，但在关键功能节点（如行动入口、变更计数、工作进行中脉冲）上给足清晰而锐利的语义信号——电光蓝承担焦点与可操作确认，翠绿标示代码净增，橙红标示运行预警与破坏性操作。所有规范均以技术栈无关的标准视觉参数表达，可直接落地到任意桌面或 Web 框架。

**Key Characteristics:**
- **四区模块化内嵌壳层**：顶部全局标签标题栏 + 最左侧极窄图标 Activity Bar + 多块并排独立圆角工作面板（`12px` 圆角、`4–6px` 外壳槽隙）。
- **浅亮深沉的表面反转规律**：浅色模式下外壳略深（`#F8F8F8`）、内嵌面板更亮（`#FCFCFC` / `#FFFFFF`）；深色模式下外壳为炭灰（`#191919`）、内嵌面板下沉为深曜石（`#141414`），而浮层菜单再抬升至 `#1F1F1F`。
- **四级精细投影 + 0.5px 细边（`L1–L4`）**：既有清晰的卡片浮起感，又避免脏暗的重阴影。
- **高密度工程可读性**：支持 UI 与代码双通道独立字号缩放、自带高对比无障碍主题、附带副标题说明的富选项下拉菜单与两段式变更横幅输入坞。

## Colors

色板采用无温差纯中性灰阶打底，以锐利的电光蓝（Accent Azure）作为主交互锚点，辅以清透的青蓝链接色和高辨识度代码/状态语义色。

### Primary
- **Accent Azure** (`#317CFF` 浅色填充与文字；深色填充 `#4489FF`、文字与边框 `#49B0FF`)：主确认按钮、焦点边框、关键行内操作链接（如 `View changes`）以及选中态高亮；柔和浅底分别为浅色 `rgba(49, 124, 255, 0.08)` / `rgba(21, 107, 255, 0.20)` 与深色 `rgba(68, 137, 255, 0.05)` / `rgba(21, 107, 255, 0.08)`。
- **Accent Neutral** (`#363636` 浅色配白字；`#F9F9F9` 深色配黑字)：中性强对比主控键（如运行停止键、侧栏激活图标底座），当界面需要强确认但不想引入蓝色视觉噪音时使用。

### Secondary
- **Link Cerulean / Cyan** (浅色 `rgba(13, 133, 185, 0.85)`、强态 `#1E98CE`；深色 `rgba(62, 184, 237, 0.85)`、强态 `#3EB8ED`)：文档与输出正文内的超链接及引用跳链，悬停浅底 `rgba(62, 184, 237, 0.08)`，与主交互蓝刻意错开色相。

### Tertiary
- **Status Green** (浅色 `#00A558`、浅底 `rgba(62, 237, 155, 0.20)`；深色 `#00EC7E`、浅底 `rgba(0, 236, 126, 0.08)`)：新增代码行统计（如 `+124`）、测试通过与成功状态。
- **Status Red / Destructive** (`#F53B3A` 文本与实心按钮，浅底 `rgba(245, 59, 58, 0.12)`；强警告 `#FF3B55`)：删除操作、失败态与报错提示。
- **Status Orange** (`#F58E3A` 文本，浅色底 `rgba(245, 142, 58, 0.12)` / 深色底 `rgba(245, 142, 58, 0.08)`；强态 `#FF773D`)：运行中边框提示、警告徽章与待关注提醒。
- **Status Purple & Blue**：紫罗兰 `#956CDE`（浅底 `12%`）用于特殊模式/标签；信息蓝 `#337DF4`（浅底 `10%`）用于常规状态徽章；辅助数据色包含黄（浅 `#A16207` / 深 `#FACC15`）、粉 `#EC4899`、青绿 `#14B8A6`。

### Neutral
- **Surface Ladder（Light）**：外壳底色 Wash `#F8F8F8` → 内嵌工作面板 Page `#FCFCFC` → 悬浮卡片/菜单 Elevated `#FFFFFF`（毛玻璃蜡质感 Elevated Wax `rgba(255, 255, 255, 0.94)`）。
- **Surface Ladder（Dark）**：内嵌工作面板 Page `#141414` → 外壳底色 Wash `#191919` → 悬浮卡片/菜单 Elevated `#1F1F1F`（Elevated Wax `rgba(31, 31, 31, 0.94)`）。
- **Text Hierarchy**：浅色主文 `#191919`（极强 `#000000`）、次级 `rgba(25, 25, 25, 0.56)`、禁用 `rgba(25, 25, 25, 0.40)`；深色主文 `rgba(255, 255, 255, 0.90)`（极强 `#FFFFFF`）、次级 `rgba(255, 255, 255, 0.52)`、禁用 `rgba(255, 255, 255, 0.40)`。
- **Borders & Interactive Tints**：主边框 `rgba(0,0,0,0.08)` / 深色 `rgba(255,255,255,0.08)`；次边框 `0.06` / 深色 `0.04`。三档透明底色 Tint（Tertiary / Secondary / Primary）在浅色为 `4% / 6% / 8%` 黑，在深色为 `3% / 5% / 8%` 白。弹窗遮罩 Scrim 浅色 `12%` 黑 / 深色 `32%` 黑。
- **High-Contrast 无障碍档位**：浅色高对比将边框固化为实色 `#767676`、主蓝收深至 `#005FCC`、红收深至 `#B00020`、绿收深至 `#006B3C`；深色高对比将边框固化为 `#A6A6A6`、主蓝提亮至 `#78BFFF`、红 `#FF8A8A`、绿 `#7FF0B0`，所有键盘聚焦统一升级为 `2px` 实线主色外框。

### Named Rules
**The Inverted Well Rule.** 浅色模式下内嵌工作面板比外壳更亮（`#FCFCFC` 嵌于 `#F8F8F8`），深色模式下内嵌工作面板比外壳更深（`#141414` 嵌于 `#191919`），浮层菜单则在两种模式下永远占据最亮一档（`#FFFFFF` / `#1F1F1F`）。

**The Two-Tone Action Rule.** 常规中性主控（如停止运行、活动栏当前图标）使用无彩色 `Accent Neutral`（`#363636` / `#F9F9F9`），把电光蓝 `#317CFF` 留给明确需要跳转或提交的焦点动作。

**The Pure Neutral Wash Rule.** 除语义徽章、变更增量与焦点链接外，所有大面积中性底色保持零色相饱和（纯灰阶），让代码语法高亮与终端 ANSI 色彩自然成为画面的唯一色彩主角。

## Typography

**Display Font:** Inter（回退系统无衬线 + `PingFang SC` / `Microsoft YaHei` / `Noto Sans SC`）。
**Body Font:** Inter（同上，支持全局 `--text-scale` 缩放倍率）。
**Label/Mono Font:** Devin Mono（回退 `SF Mono`, `Roboto Mono`, `Consolas`, monospace；支持独立 `--text-scale-code` 缩放倍率）。

**Character:** 现代几何新哥特无衬线搭配紧致字距（`-0.005em` 至 `-0.015em`），在高密度多面板工作台中仍保持极佳的横向信息吞吐量与清晰度。

### Hierarchy
- **Display** (`600`, `22px`, 行高 `32px`, 字距 `-0.015em`)：文档一级大标题（Markdown H1）。
- **Headline** (`600`, `19px`, 行高 `27px`；紧凑流 `17px / 26px`)：内容区主章节标题。
- **Title** (`600`, `14px`, 行高 `20px`, 字距 `-0.005em`)：面板小节标题（如 `Sessions`、`Modern Web Guidance`）。
- **Prose** (`400`, `14px`, 行高 `21px`)：正文段落与总结回复。
- **Body** (`400 / 500`, `13px`, 行高 `18px`, 字距 `-0.005em`)：列表项、会话标题、下拉选项主文案、输入区与按钮的全局核心字号。
- **Label** (`500`, `12px`, 行高 `16px`)：顶栏标签页、面板副标题、变更统计栏与工具栏操作文字。
- **Caption** (`400`, `11px`, 行高 `15px`)：相对时间（`6 hours ago`）、下拉菜单次要说明行、快捷键键帽。
- **Code** (`400`, `12px`, 行高 `18px`)：执行命令轨迹、行内代码片段、文件路径与差异代码行。

### Named Rules
**The Tight-Track Engineering Rule.** 标题与 `13px` 控件正文统一施加微负字距（`-0.005em` 至 `-0.015em`），压缩多栏并排时的横向松散感，同时保持等宽数字与命令输出对齐。

## Layout

采用**四区模块化内嵌工作台壳层（4-Zone Modular Inset Shell）**，所有独立面板坐落在同一层外框底色（Wash）之中：

- **顶部全局标题与标签栏（Top Titlebar，`38–40px` 高，Wash 底色）**：
  - 左侧：主视图下拉切换器（如 `Agents v`）+ 后退/前进箭头 + 侧栏折叠开关。
  - 中部：全局多标签栏——当前激活标签为圆角浅灰胶囊（`8px` 圆角、高 `28px`、`tint-primary` 底色，可带运行状态微图标），非激活标签无底色纯文本，尾部附 `+` 新建标签按钮。
  - 右侧：平台窗口控制按钮（Windows 居右最小化/最大化/关闭；macOS 左上预留交通灯安全区）。
- **最左垂直图标栏（Activity Bar，`36–40px` 宽，Wash 底色）**：
  - 顶部纵向排列高频主模式图标（`16px` 线性图标，每个按钮 `28×28px`，`6px` 圆角）；当前激活项以实心墨色圆角方块（Light `#191919` 白图标 / Dark `#EFEFEF` 黑图标）高亮，辨识度极高。
  - 底部固定辅助入口（帮助、快捷键、设置齿轮）与圆形彩色首字母用户头像（`24×24px`）。
- **多块并排内嵌圆角面板（Inset Panels，`12px` 圆角，`Page` 底色，面板间留 `4–6px` Wash 槽隙）**：
  - 每个独立面板自带 `1px` `border-secondary` 极淡边框与顶置内标题栏（高 `36–40px`，左放面板标题/上下文路径，右放展开、折叠、更多动作图标）。
  - **左面板（Sessions / 目录列表，`220–260px`）**：顶部 `+ New` 主行 + 按工作区/仓库分组的紧凑条目，每条支持双行结构（主标题 `13px` + 状态图标/相对时间 `11px` 静音色），子任务以缩进层级挂靠，当前选中项用 `8px` 圆角 `tint-secondary` 胶囊标示。
  - **中面板（主工作区，`flex: 1`）**：居中偏宽阅读流（左右留白 `24–32px`），底部悬浮两段式输入坞卡。
  - **右面板（Changes / 审查检查器，`240–300px`）**：支持面板内子标签（`Changes` + `+`）、面包屑过滤条（`Changes > All changes v` + 右侧 `1 file +124` 净增统计）与文件变更列表。
- **窄窗口降级**：窗口宽度 `< 1040px` 时自动折叠右侧审查面板为抽屉按钮；`< 760px` 时左侧会话面板收起，保留最左 Activity Bar 与居中主面板。

### Named Rules
**The Gapped Panel Rule.** 相邻工作面板之间永远保留 `4–6px` 的外壳底色槽隙与完整的四边 `12px` 圆角，不把多块面板焊死成直角十字分割线。

**The Dual-Chrome Hierarchy Rule.** 全局跨会话切换留在顶栏（标签页）和最左 Activity Bar，单面板内部的操作与面包屑严格收归在对应圆角面板的内标题栏中，两层导航不混放。

## Elevation & Depth

本体系采用**四级递进投影（`L1`–`L4`）+ 0.5px 精细发丝边 + 蜡质半透明浮层（Wax）**的混合深度模型：静态内嵌面板几乎贴平外壳（仅靠明度差与极细边分离），交互浮卡与菜单则拥有克制而立体的柔和阴影。

### Shadow Vocabulary
- **L1 — Micro Lift** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)`；Dark `0.20`)：轻微抬升的小型按钮、开关圆钮与状态胶囊。
- **L2 / L2-Border — Floating Card & Composer** (`box-shadow: 0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)`；Dark `0.25` 基底)：底部悬浮输入坞卡、内嵌交互卡片与工具浮条。
- **L3 — Dropdown & Popover** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.06)`；Dark `rgba(0, 0, 0, 0.64)`)：带副标题的下拉筛选菜单、右键菜单与悬浮信息卡。
- **L4 / L4-Wax — Modal & Command Sheet** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`；Dark `0.50`，常配 `94%` 透明 `elevated-wax` 底色 + 背景轻微模糊)：模态对话框、命令面板与全屏抽屉。
- **Inner Bevel** (Light `box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.10)`；Dark `inset 0 -1px 1px rgba(255, 255, 255, 0.04)`)：凹陷槽或按压态微质感。

### Named Rules
**The Half-Pixel Rim Rule.** 浮起卡片（`L2-border`）和下拉菜单在浅色模式下用 `0.5px` 极细外轮廓叠轻投影代替粗边框，确保白色卡片叠在 `#FCFCFC` 画布上边缘依然利落不发糊。

## Shapes

几何体系基于 `8px` 核心基准进行加减派生，呈现圆润但干练的现代软件轮廓：

- **圆角阶梯**：键帽与微标 `4px` → 按钮、Activity Bar 图标块、小控件 `6px` → 标签页、列表选中项、下拉菜单项 `8px` → 内嵌大面板、悬浮输入坞、下拉菜单外框、用户气泡 `12px` → 大型模态框 `16px` → 圆形提交/停止按钮、头像与状态点 `9999px`。
- **两段式融合卡片**：当输入坞顶部挂载通知/变更横幅时，外层共享统一的 `12px` 圆角外框与 `L2-border` 阴影，内部仅用 `1px` `border-secondary` 水平细线切分上方浅灰横幅区（`#F8F8F8`）与下方纯白输入区（`#FFFFFF`），不拆成两张漂浮卡片。
- **图标风格**：全站使用 `14–16px` 细线单色图标（描边 `1.5px`），文件/语言图标采用 Seti 色系映射，高辨识度而不杂乱。

## Components

动效服务于实时工作反馈：骨架屏以 `50% ↔ 100%` 呼吸；后台运行中状态使用 `-200%` 流光扫字与脉冲圆点（`opacity 1 → 0.25`）；新出现的关注卡片以 `1px` 电光蓝边 + `14px` 淡蓝光晕短暂提示后自然淡出；运行中横幅外环支持 `4s` 柔和流转描边。

### Buttons
- **Character:** 紧凑低噪，靠层级而非体积抢眼。
- **Shape:** 常规按钮 `6px` 圆角、高度 `26–28px`、水平内边距 `10–12px`；图标按钮 `28×28px` 正方形；输入坞主提交/停止键为 `28×28px` 正圆形实心按钮。
- **Primary / Neutral / Ghost:** 主提交用 `Accent Azure`（`#317CFF`）白字；中性主控（如停止运行）用 `Accent Neutral`（`#363636` / `#F9F9F9`）；工具栏与面板内绝大多数辅助键采用 Ghost 态（常态无底，悬停 `tint-secondary`，激活 `tint-primary`）。
- **Hover / Focus:** 悬停 `120ms` 淡入灰底；键盘聚焦呈现电光蓝焦点环（高对比模式下强制 `2px` 实线外框）。

### Navigation & Activity Bar
- **Activity Bar:** 最左 `36–40px` 垂直图标带，当前主视图图标采用高对比实心墨色圆角方块（`28×28px`, `6px` 圆角），其余为次级色幽灵图标，底部固底设置与圆形头像。
- **Global Top Tabs:** 位于顶栏中部，激活标签高 `28px`、`8px` 圆角、`tint-primary` 浅灰底，标签内左置状态图标（运行中可带动态微粒）+ 单行截断标题，尾部 `+` 新建。
- **Grouped Session List:** 仓库/目录分组头部配小文件夹图标；会话行默认双行紧凑展示（标题 `13px` + 底部 `11px` 状态图标与相对时间），支持二级树缩进与工作脉冲指示。

### Cards / Containers & Dropdowns
- **Inset Panels:** `12px` 圆角、`#FCFCFC` / `#141414` 底色、`1px` `border-secondary` 细边，外围统一 `4–6px` Wash 槽隙。
- **Rich-Description Dropdown Menu:** `12px` 圆角、`4px` 内边距、`L3` 投影、`1px` `border-primary`；每个选项高 `auto`（内边距 `6px 10px`、`8px` 圆角），包含 `13px` 主标签 + 下方 `11.5px` 次级说明行（如筛选范围解释），选中项右侧显示对勾，分组操作底部用 `1px` 细线隔开。

### Inputs / Fields
- **Style:** 独立输入框高 `32px`、`8px` 圆角、`1px` `border-primary`；行内快捷键提示嵌入文本中，使用 `4px` 圆角 `tint-tertiary` 浅底 + `1px` 细边键帽（如 `Ctrl ↵`）。
- **Focus:** 外层聚焦边切为 `border-accent-primary`（`#317CFF` / `#49B0FF`）；复合输入坞内部文本域抑制原生焦点框，由整个 `12px` 卡片统一承接焦点态。

### Signature Patterns
- **Two-Tier Docked Composer Card:** 外框 `12px` 圆角 + `L2-border` 投影；顶部可选融合式变更提示条（`Wash` 浅灰底，左置编辑图标 + `1 file changed` + 绿色 `+124`，右置 `Quick review`、`View changes` 电光蓝链接与 `×` 关闭）；下方纯白主输入区含占位提示（内嵌 `Ctrl ↵` 键帽）与底部单行控制条（左置 `+`、模板、权限状态、仓库标签；右置模型档位、环形进度、语音键与 `28px` 实心圆形停止/发送按钮）。
- **Collapsible Execution Trace Timeline:** 折叠态单行 `12.5px` 静音色摘要（`> Worked for 4s`）；展开态为 `v Working for 34s`，左侧绘 `1px` `border-primary` 垂直导轨，内部按时间顺序列出单行截断的等宽命令输出、子步骤耗时（右对齐静音 `4.06s >`）与嵌套 `Thoughts >`，末尾衔接动态三点图腾 + 进行中动词（`Investigating`）。
- **User Message Pill:** 右对齐轻气泡，底色 `tint-secondary`、`12px` 圆角、内边距 `7px 12px`，自然承接行内高亮命令标识，不占用整行宽度。

## Do's and Don'ts

### Do:
- **Do** 让每块工作面板保持完整 `12px` 圆角并在面板间保留 `4–6px` 外壳底色槽隙，维持清晰的模块化呼吸感。
- **Do** 在深色模式下遵循「外壳 `#191919` → 内嵌工作面板 `#141414` → 浮层 `#1F1F1F`」的反差层次，避免整屏糊成同一块黑灰。
- **Do** 在复杂筛选或模式切换的下拉菜单中为选项提供简短次级说明行，帮助用户无需猜测即可判断作用域。
- **Do** 当底部输入坞需要展示状态或变更提示时，将其融合在输入卡顶部浅灰横幅内，共用同一个 `12px` 外框与 `L2-border` 阴影。
- **Do** 为所有代码增量（`+124`）、耗时（`4.06s`）和时间戳保持紧凑单行排版，并在高对比模式下自动切换为实色边框与 `2px` 焦点框。

### Don't:
- **Don't** 把多块面板之间的圆角与外壳槽隙改成贴边直角分割线——那会丢失 Devin Desktop 最核心的模块化壳层辨识度。
- **Don't** 把主交互电光蓝 `#317CFF` 铺满侧栏选中项或面板标题栏；侧栏与菜单选中一律使用 `6%–8%` 中性透明灰（`tint-secondary` / `tint-primary`）。
- **Don't** 在单条面板内叠加多层 `L3`/`L4` 重投影卡片；内嵌面板本身是低对比度承载面，阴影只给输入坞、下拉菜单与模态浮层。
- **Don't** 在执行过程时间线里为每一条命令套独立方框，保持左侧单一 `1px` 细竖导轨与静音等宽文本流。
- **Don't** 在设计规范中硬编码特定框架工具类名，确保所有颜色、圆角、阴影与布局数值可直接转译到任意桌面或 Web 技术栈。
