---
name: path-ui
description: >-
  Replicate the tactile UI and motion feel of Path (2010–2018) on the web and extend its
  principles to new surfaces (forms, settings, detail views, AI chat result cards) or review
  and rework existing UIs. Ships measured timings/colors, a zero-dependency JS/CSS kit with
  TS types, demos, and verification scripts. Use whenever the user mentions Path, 复刻 Path,
  Path 风格/动效/交互/思路, or asks for an arc-burst + menu, scrollbar clock, type-dot timeline,
  in-place emotion picker, swinging drop modals, AI 对话卡片, or tactile restrained micro-interactions.
  Skip when no UI/UX work is involved or another design language (e.g. native Apple Liquid Glass
  or Material) is explicitly requested.
license: MIT
metadata:
  author: rowline
  version: "0.5.0"
  short-description: Path-inspired tactile UI, motion kit, design system & review
---

# Path UI — 复刻质感交互，并按它的思路做新界面

把 **Path（2010–2018）**「平静纸面 + 克制而有重量的反馈 + 就地完成小事」的设计精华、实测节奏与配色、零依赖参考实现（`assets/path-kit/`）和自动核对脚本打成一套完整工作流。目标是让产出的界面不仅长得像，而且**动起来、用起来都像**，同时能推演出 Path 没做过的现代页面、表单、详情页与对话结果卡。

## 定位与核心原则

1. **平时是静的，动效只解释状态变化**：除了压印加载（`.pk-deboss` / `relayLoader`），不给静态界面加呼吸、漂浮或无限循环动画。
2. **热闹和品牌色只给一处**：第一级动效与品牌红只留给产品最核心的入口；不要把扇形弹出或掉落弹窗套到设置、筛选或每个普通按钮上。
3. **两代骨架不混用，参数可调不改源码**：Path 2（拟物、角标四分之一圆、0.5s、不压暗）与 Path 4（扁平、底栏居中 120° 弧、0.3s、压暗 60%）选定一套贯彻到底；需要调整节奏时用 `config` / `motion` / `setIntensity`，不手抄或硬改 kit。
4. **先跑后说，实测为准**：先用 demo 对照，交付前必须经过静态检查与真实浏览器测量；说明里写出的每个数字和能力都要能指到实测或代码。

## 意图识别与默认决策

先根据用户需求、附件和当前仓库代码判断以下六个维度。仅当关键维度缺失且会改变交付形态、又无法从上下文推断时，合并成一条简短问题向用户确认；其余直接按默认值推进并在交付时说明。

| 维度 | 选项 | 默认值与处理规则 |
| --- | --- | --- |
| 目标（Goal） | 新建（复刻/延伸） · 改已有界面 · 审已有界面 · 写规格表 | 「审界面」只输出问题清单，用户点头再改；需求不明确时默认新建网页原型 |
| 复刻 vs 延伸 | 复刻（发布菜单、时间线、时钟、情绪回应、弹窗、下拉刷新、星标、压印加载） · 延伸（表单、设置、列表、详情、AI 卡片等） | 同一页面常两者并存；凡 Path 没有的控件/布局一律按延伸六步推演，不强套原组件 |
| 代际（Era） | Path 4 扁平 · Path 2 拟物 | 默认 **Path 4**（网页 0.3s 更合适）；用户提及「拟物」「左下/右下角加号」时切 **Path 2** |
| 强度（Intensity） | 原样（`1`） · 克制（`0.3–0.5`） | 展示/复刻原型用 `1`；严肃工具、办公、已有设计系统接入默认 `0.4`（只压幅度，不压时长与位移） |
| 媒介（Medium） | 单文件 HTML · 原生工程 · React/TS · Tailwind · 设计文档/规格 | 未指定独立交付形式且需「双击打开」时用单文件 HTML（最后由 `inline_kit.py` 内联） |
| 设计系统约束 | 独立全站新建 · 接入已有设计系统 · 明确要求其他设计语言 | 接入已有系统时视觉听项目规范，kit 只供结构与动效（`intensity = 0.4`）；明确要求其他风格时本 skill 仅提供对比度、点击区、焦点与减少动效检查 |

## System Map 与按需阅读组合

**按需阅读（Progressive Disclosure）**：不要一次性全量读完所有 `references/`。先按任务确定最小阅读集：

| 任务或媒介 | 先读的文档（只读所需章节） |
| --- | --- |
| 理解 Path 模式与 14 条规则、推新东西 | [references/essence.md](references/essence.md) |
| 独立项目做全站 UI（双主题、三层表面、表单/选择器、表格、弹窗、多页主角） | [references/design-system.md](references/design-system.md) |
| 审一个已有界面 / 交付前 15 条快速自查 / 核查七类实战陷阱 | [references/review-checklist.md](references/review-checklist.md) |
| 改一个已经在跑的界面 / 写工程师规格表 | [references/existing-ui.md](references/existing-ui.md) |
| AI 对话里的卡片与工作面（结果卡、选择卡、预览与安全底线） | [references/ai-views.md](references/ai-views.md) |
| 查精确时长、弹簧参数、颜色取色、零件默认值与测量方法 | [references/motion-spec.md](references/motion-spec.md) |
| 接进单文件 / 原生 / React+TS / Tailwind / 已有系统、假数据时间锚点 | [references/porting.md](references/porting.md) |
| 直观查看效果对照 | `assets/path-kit/demo.html`（复刻）、`assets/path-kit/extend-demo.html`（延伸） |

## 核心规则速查（Digest）

详细出处、反例与实测依据见 [references/essence.md](references/essence.md) 与 [references/motion-spec.md](references/motion-spec.md)。

- **1. 从哪来，回哪去**：面板从触发器长出、条目飞入列表、收起按原路退回（`flyFrom` / `flyTo` / `growFrom` / `shrinkTo`）。
- **2. 方向有含义，重力朝下**：前进/后退、开/关、加/减各成镜像方向；来者自上或自源头，去者向下摔出（`turnTo` / `dropIn` / `fallOut`）。
- **3. 有重量，但很短**：120–500ms（网页接近 300ms）；东西越大摆动与过冲越小；减少动态效果时替换为淡入淡出或直达终态。
- **4. 热闹和颜色只给一处**：核心入口独占 1 级动效与品牌色，其余按五级表降档。
- **5. 一类事一种动作，一种东西一个符号**：同类打断、出现、离场全站统一动效；同一种内容类型从入口到空状态用同一个色相和字形。
- **6. 平时是静的**：只响应用户操作、新内容到达或加载；等完即停，不用常驻循环晃动吸引注意。
- **7. 就地发生，不把人带走**：小事在触发控件旁原地完成；能撤销就不弹确认，仅不可逆破坏操作用 `dropModal(alertdialog)`。
- **8. 先回答「什么时候、谁看得到」**：交代相对时间（当天不写日期、周内写星期几、当年写几月几日、跨年带年份）与可见范围。
- **9. 跟手，门槛看得见**：拖动带阻尼（`rubber`），过阈值给可见变化（断开/弹出/变色），并保留按钮与键盘等效操作。
- **10. 没人注意的地方也做**：等待延迟 300–500ms 露面、至少留 500ms（`relayLoader` 默认 400ms/500ms）；空状态、到底、出错都配压印字形（`.pk-deboss`）与人话说明。
- **11. 底是中性的，颜色留给内容和意思**：暖纸底 `#F6F0EB`、白卡与暖深灰正文；颜色只给核心入口、内容类型和至多一个状态色（私密蓝 `--pk-private`）。
- **12. 一类东西一个颜色，按联想选，一路带着走**：色相有语义理由；压暗层上用白底彩字形，纸上用彩底白字形；图片/视频类自身有色时用近黑或中性色；图形对比度 ≥ 3:1、文字 ≥ 4.5:1（可开 `data-pk-contrast="more"`）。
- **13. 一套字形，换尺寸、换材质，不换形状**：24 网格、实心、圆头、细节镂空（复用 `glyphSvg(id)` 的 17 个原创剪影）；导航底栏用细线、当前项变实心。
- **14. 按下就有反应，每种状态都说得清**：60ms 内给按下反馈、松手执行、拖出取消；选中不只靠颜色；禁用可见并写明原因；忙碌态放进控件自身；焦点清晰、点击区 ≥ 44×44px。

### 动作分五级

| 级 | 动作特征 | Path 用处 | 延伸新东西用处 | path-kit 零件 |
| --- | --- | --- | --- | --- |
| 1 | 冲出 + 自转 + 压暗 | 加号发布菜单 | 全站唯一最核心入口 | `radialMenu`、`fly` |
| 2 | 掉进来 / 摔出去 | 登录、功能引导 | 必须停下拿主意：删除、清空、首次引导 | `dropModal`、`dropIn` / `fallOut` |
| 3 | 冒一下（1.15–1.35×） | 回应、星标、落位 | 新出现的小物件、开关/收藏切换 | `pop`、`popToggle` |
| 4 | 长出来 / 淡入（≤ 200ms） | 回应浮层、时钟标签 | 面板、菜单、选择器、就地提示 | `growFrom`、`fadeIn` / `fadeOut` |
| 5 | 不动 | 时间线、封面、正文 | 内容正文、导航结构、普通设置项 | — |

## 标准工作流

1. **启动演示对照（需直观展示或校准手感时）**：
   在 `assets/path-kit/` 下执行 `python3 -m http.server 5181`，对照 `demo.html` 与 `extend-demo.html`（支持切换时代、主题、加深对比度、强度、图标数与位置）。
2. **复用 `path-kit`，禁止手抄**：
   - 页面正常引入 `path-kit.css` 与 `path-kit.js`（TypeScript 项目导入 `path-kit.d.ts`）。
   - 用 `config`、`dropModal({ scrim, role })`、`timeScroller({ thumb })`、`motion.*`、`setIntensity(k)` 与 `--pk-*` 变量调节；改过的数字在交付时列明出处。
   - 用零件拼新交互，不另写弹簧与缓动曲线（拼装细节与常见坑见 [references/porting.md](references/porting.md)）。
   - 用 `glyphSvg(id)` 与 `--pk-type-*` / `--pk-filter-*` / `.pk-chip`，勿自创不一致图标体系。
3. **延伸推演六步（当构建 Path 没有的功能时）**：
   列出全部状态变化 → 逐项问来源/方向/级别/是否打断 → 用 kit 零件拼装 → 按规则 11–13 配色配字形 → 对照规则 5、6、10–14 与 [references/design-system.md](references/design-system.md)（如非原生选择器、响应式按钮高度、高密度网格折叠等）→ 交付时按「照搬 / 按规则推 / 自定」三类拆开说明。
4. **替换项目资产与相对时间**：
   - 表情、封面、文案换成项目自身内容；颜色映射到 `--pk-*` 变量；界面与无障碍文本中**禁止出现 `Path` 字样**（来源只写代码注释与交付说明）。
   - 假数据时间一律使用相对当前时间的锚点（见 [references/porting.md](references/porting.md)「假数据的时间」），确保跨日/跨月演示依然成立。
5. **多维度核对（不靠目测或想象）**：
   - **静态检查**：对所有产出 HTML 运行 `python3 scripts/check_prototype.py <page.html>`，清零所有 `error`，合理解释保留的 `warning`。
   - **对比度检查**：对彩底文字/字形运行 `python3 scripts/contrast.py --on <hex>`（文本 ≥ 4.5:1，图形 ≥ 3:1）。
   - **浏览器实测**：注入 `scripts/motion-probe.js`，用 `PathProbe.scrub(...)` 与 `PathProbe.peaks(...)` 核对过冲、自转、停稳时刻及开关中断（`startJump === 0`）；用 `PathProbe.hitAreas()` 检查点击区 ≥ 44px；测试 `prefers-reduced-motion: reduce`（或 Playwright `emulateMedia({ reducedMotion: 'reduce' })`）、键盘（`Esc`、方向键、焦点回位）及控制台零报错。
   - **状态走查**：完整过一遍开、关、中途打断、按下拖出、成功、失败、空状态、加载、深色/高对比度及 [references/review-checklist.md](references/review-checklist.md) 中的 15 条快速自查与七类实战陷阱。

## 分形态输出契约（Output Contracts）

| 交付形态 | 必做处理与产物 | 必跑校验与交付说明要求 |
| --- | --- | --- |
| **单文件原型 HTML** | 正常引 `path-kit.css/js` 写完后，运行 `python3 scripts/inline_kit.py <page.html>` 内联（注意仅已 import 的符号才会进入单文件） | 跑 `check_prototype.py` + 浏览器实测；交付说明区分「照搬 Path / 按规则推 / 自定」，列出改动数字与未验证项 |
| **工程项目接入** | 按 [references/porting.md](references/porting.md) 接入；已有设计系统保持其视觉规范，强度默认 `0.4` | 跑项目自身的 `typecheck` / 构建与浏览器自检；避免覆盖项目已有样式优先级 |
| **审已有界面** | 先完整走查，**只输出按影响排序的问题清单**（严重问题在前），每条含位置证据与具体修复方案；获用户同意后再改代码 | 说明检查范围（静态源码 vs 实测浏览器/视口）；每条结论必须对应文件、行号或实测数据 |
| **改已有界面** | 先跑通原样并列出功能路径表（分清真实接口与模拟状态），仅修改目标区域，演示控件与产品控件分离（见 [references/existing-ui.md](references/existing-ui.md)） | 改后复测原功能路径表 + 新增/修改项自查；不破坏无关功能 |
| **AI 对话卡片与视图** | 按 [references/ai-views.md](references/ai-views.md) 判断是否出卡、区分「一眼」与「工作面」、数据进话出、控件就地收口、满/空/错/忙四态齐全 | 严守安全底线：卡内不要密码/密钥、不仿冒授权弹窗、外来内容纯文本转义防 XSS |
| **交付工程师规格表** | 按 [references/existing-ui.md](references/existing-ui.md) 第 4 节输出状态、零件、数值、边界与验证口径 | 标清实测值 vs 估测值 |

> **汇报纪律**：说明书与审查结论中提及的每一个数值、每一个「量过」「做了」「转义了」，都必须能指向一次真实执行输出或一行实际代码；未跑浏览器或未实测的项目，必须明确归入「未验证」，绝不虚报通过。

## 硬性底线

- **零品牌借用**：不使用 Path 的 Logo、字标、贴纸、照片、原图标；界面文字、`<title>`、`aria-label`、`alt`、`placeholder` 中不得出现 `Path` 字样。
- **发布菜单专利提示**：Path 的「从菜单图标沿路径弹出子图标」受美国专利 **US9448692B1**（Kakao 持有，预计 2034-07-16 到期）保护。原型与学习可用；**任何上线商用产品若使用该扇形/沿路径弹出菜单，必须明确提醒用户先做法律评估或改用非沿弧线展开方案**（见 [references/design-system.md](references/design-system.md)），绝不替用户下「不侵权」结论。
- **克制与可访问性**：不加装饰性循环动画；保留 `prefers-reduced-motion` 替代方案与键盘完整操作；所有拖动手势必须有可见等效按钮。

## 环境要求与目录结构

- **运行环境**：脚本使用 **Python 3.10+**（`check_prototype.py` / `inline_kit.py` / `contrast.py` / `package_skill.py` 仅依赖标准库；`validate_skill.py` 需要 `PyYAML`）；浏览器测量需要现代浏览器或无头 Chromium。

```text
path-ui/
├── SKILL.md                    Skill 入口与标准工作流
├── LICENSE                     MIT 许可证（不含原权利人商标/素材）
├── agents/
│   └── openai.yaml             Codex / OpenAI UI 元数据与调用策略
├── references/
│   ├── essence.md              七条取向、两代骨架、十个模式、十四条规则、动作五级
│   ├── design-system.md        独立项目全站规范：表面、字号、表单/选择器、表格、弹窗与多页验收
│   ├── review-checklist.md     15 条快速自查；审已有界面方法与七类实战陷阱
│   ├── existing-ui.md          改已有界面方法与交付规格表
│   ├── ai-views.md             AI 对话里的卡片与工作面设计规范
│   ├── motion-spec.md          实测/开源来源的时长、弹簧、颜色取值与测量方法
│   └── porting.md              单文件 / 原生 / React+TS / Tailwind / 已有系统接法与零件指南
├── assets/path-kit/
│   ├── path-kit.js             动作零件、交互组件、glyphSvg（17 个原创字形）与 motion 控制
│   ├── path-kit.d.ts           TypeScript 类型定义
│   ├── path-kit.css            双代皮肤、浅深主题、类型/筛选色、对比度增强与压印样式
│   ├── demo.html               Path 复刻交互演示面板
│   └── extend-demo.html        延伸示范：上传照片、滑动归档、AI 对话结果卡
└── scripts/
    ├── inline_kit.py           将 path-kit 内联进 HTML 生成双击可开的单文件
    ├── check_prototype.py      静态检查底线（品牌词、减少动效、Esc、循环动画、硬编码日期、本地引用）
    ├── contrast.py             WCAG 对比度计算与底色/字体配色校核
    ├── motion-probe.js         浏览器动画定格取样、峰值与点击区测量工具
    ├── frame-sheet.js          从 web.archive.org 拼帧辅助工具
    ├── validate_skill.py       Skill 规范、链接、evals、demo 底线与打包完整性一键校验
    └── package_skill.py        生成可分发安装包 path-ui.skill（不含 evals 与 vendor-skills）
```
