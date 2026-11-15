---
name: path-ui
description: Replicate the UI and interaction feel of Path, the private social journal app (2010–2018), and extend its way of designing to things Path never had. Covers the arc-burst + button, scrollbar clock, type-dot timeline, in-place emotion picker, swinging drop modals, elastic pull-to-refresh and debossed loaders, plus rules distilled from them (where motion comes from, motion ranked by importance, stillness at rest, in-place feedback, one hue and one glyph per content type) for designing new things in Path's spirit. Ships measured timings and colors, a zero-dependency JS/CSS kit of motion parts and original glyphs with TS types, two demos, a single-file inliner, a checker and a motion probe. Use whenever the user mentions Path, 复刻 Path、Path 风格、Path 的效果/动效/交互/思路/感觉、像 Path 那样, or asks for a radial/fan-out + menu, a scrolling time indicator, a family/private timeline, emotion reactions, bouncy drop modals or similar crafted micro-interactions, even if Path isn't named.
license: MIT
---

# 复刻 Path 的效果，按 Path 的思路做新东西

Path（2010–2018，2015 年被 Kakao 收购）是一个只给 50～150 位亲近的人看的日记式社交软件，以动效和细节出名。这个 skill 放了三样东西：
- Path 的设计精华，以及从中归纳出的规则；
- 实测的节奏和颜色；
- 用零件拼成、可以直接跑的参考实现。

目标是做出来的东西「动起来像 Path」，不只是长得像，而且 Path 没做过的东西也能照它的思路做出来。

## 先读什么

| 想做的 | 读 |
| --- | --- |
| 弄懂 Path 为什么这样设计、有哪些模式 | [references/essence.md](references/essence.md) 前半 |
| 做 Path 没有的东西（设置页、通知、上传、清单……） | [references/essence.md](references/essence.md) 的「规则」「动作分五级」「推一个新东西」，再看 `assets/path-kit/extend-demo.html` |
| 独立项目用这套风格做**全站 UI**（变量、深色模式、字体、按钮 / 表单 / 表格、桌面端多页、扇形菜单的另一种展开方式）。已有设计系统的项目以项目自己的规范为准 | [references/design-system.md](references/design-system.md) |
| 配色和图标：底色、品牌色、类型色、状态色怎么分工，字形怎么画、怎么复用 | [references/essence.md](references/essence.md) 规则 11–13；实测色值在 [motion-spec.md](references/motion-spec.md) 第 7 节 |
| 要具体数字（时长、路径、角度、颜色、零件默认值），或想调强度、图标数、方向 | [references/motion-spec.md](references/motion-spec.md) |
| 把代码接进项目（单文件、原生、React/TS、Tailwind、已有设计系统的项目），或用零件拼新东西 | [references/porting.md](references/porting.md) |
| 直接看效果 | `assets/path-kit/demo.html`（Path 有的）、`assets/path-kit/extend-demo.html`（按规则推的） |

## 做法

1. **先定四件事。** 能问就问；用户要你直接出东西，就按默认值做，交付时写明你替他定了什么。
   - **复刻还是延伸**：用户要的东西 Path 有（发布按钮、时间线、滚动时钟、情绪回应、弹窗、下拉刷新、星标、加载），就照原样**复刻**。Path 没有的（设置页、通知、上传、购物清单、日程……），或者只说「要 Path 的感觉 / 思路」，就是**延伸**，按第 4 步推。一个页面里常常两样都有。
   - **哪一代**：
     - Path 2 拟物：加号在角落、四分之一圆、0.5 秒、错开 36ms、不压暗。
     - Path 4 扁平：加号在底栏正中、120° 弧、0.3 秒、压暗 60%。
     - 两代混用会哪代都不像。没说就用 Path 4，网页上 0.3 秒更合适。用户说了「拟物」「左下角 / 右下角的加号」就是 Path 2。
   - **强度**：原样（1）还是克制（0.3–0.5）。严肃、办公、工具类场景用克制。
     - 强度只压幅度（冲过头、自转、摆动、歪斜、放大），不压时长和位移。所以克制版照样从上面掉下来、照样摔出去，只是晃得轻。
     - 压暗深浅另用 `scrim` 参数调。
2. **先跑 demo，对着看。** 在 `assets/path-kit/` 下起静态服务：`python -m http.server 5181`。
   - `demo.html`：面板能切时代、强度、图标数、加号在哪边。
   - `extend-demo.html`：两个 Path 没有的东西（上传照片、滑动归档），每一步都标了按哪条规则推的。
   - 用户要看效果时先给 demo，不要只给文字描述。
3. **用 path-kit，不要手抄。**
   - 页面照常写 `import { … } from './path-kit.js'` 和 `<link href="path-kit.css">`。
   - 要单文件（「双击就能打开」）：写完再跑 `python scripts/inline_kit.py 页面.html`，它把 kit 原样内联进去。手抄几百行既费时间，也容易抄错数字。
   - 要调就用参数和 `motion` 对象，不改 kit 源码：
     - 图标几个都行，间隔和半径会自己算。
     - 角落版加号放右边会自动镜像（`side`）。
     - `config` 覆盖菜单的任意字段；`dropModal` 有 `scrim`、`role`；`timeScroller` 有 `thumb`。
     - 页面里改 `motion.clock.hideDelayMs = 1500` 这样的字段。
     - 改过的数字在交付时列出来，并说明是测的还是你定的。
   - 新东西用零件拼：`flyFrom`、`flyTo`、`fly`、`growFrom` / `shrinkTo`、`pop`、`fadeIn` / `fadeOut`、`dropIn` / `fallOut`、`turnTo`、`rubber`、`.pk-deboss`。不要另写一套弹簧和曲线。各零件的用法和坑见 porting.md「用零件拼新东西」。
   - 颜色和字形也用 kit 的：类型色 `--pk-type-*`、筛选色 `--pk-filter-*`、私密蓝 `--pk-private`；字形 `glyphSvg(id)`（17 个原创实心剪影）；筛选块 `.pk-chip`。要过网页对比度就在容器上加 `data-pk-contrast="more"`。
   - React / TypeScript 项目用 `path-kit.d.ts` 拿类型，接法见 porting.md。
4. **延伸时，按规则推，不要把 Path 的组件到处套。** 照 essence.md「推一个新东西」的六步做：
   1. 列出新东西所有的状态变化。
   2. 每个变化都问：谁叫出来的，放第几级，要不要打断用户。
   3. 用零件拼。
   4. 配颜色和字形：底是中性的，每种内容类型一个色相、一个字形，品牌色只给最核心的入口，状态色最多一个（规则 11–13）。
   5. 对一遍规则 5、6、10–13。
   6. 交付时分三类说。

   最容易犯的错有三个：
   - 把扇形弹出、掉落弹窗套到每个按钮上。热闹只给一处：第一级只给产品最核心的那一个入口，设置项、筛选、分享都不配。
   - 加循环动画显得「活泼」。
   - 每类事件各做一种动效。

   真用到扇形弹出菜单时，底线里的专利提醒照样适用。
5. **换成项目自己的东西。**
   - 表情、封面、文案用项目自己的；颜色通过 `--pk-*` 变量映射到项目的设计变量。
   - 图标用项目自己的，或者 kit 的原创字形 `glyphSvg`。要新画的照规则 13 画：24 网格、实心、圆头、细节镂空，和已有的字形放在一起看是一家人。
   - 界面上不写 Path 这个名字：页面标题、说明面板、按钮、读屏文字都算。「照 Path 4 的节奏」「按规则 1」这类来源说明，写在代码注释和交付说明里。
   - 假数据的时间相对现在生成，并覆盖要演示的每一种情况。
     - 写死日期的话，明天打开，「今天」「星期几」就全错了。
     - 只用固定偏移（「两小时前」「40 天前」）也不行：零点刚过或 1 月初会缺档。
     - 用 porting.md「假数据的时间」里的锚点。
   - 项目已经有自己的设计系统时：视觉以项目的规范为准，path-kit 只提供结构和动效，强度默认 0.4。具体见 porting.md 最后一节。
6. **核对，不靠想象。**
   - **静态检查**：每个产出的 HTML 都跑 `python scripts/check_prototype.py 页面.html`。
     - 它能查出：界面上的 Path 字样、引用 Path 素材、没处理减少动效、弹窗没处理 Esc、多余的循环动画、写死的日期、单文件里残留的本地引用。
     - 有 error 先改掉；warning 想一下，确实有理由就在交付时说明。
   - **浏览器里量动效**：把 `scripts/motion-probe.js` 注入页面，用 `PathProbe.scrub(…)` 定格取样，再拿 `PathProbe.peaks(…)` 给出的冲过头距离、自转、停稳时刻对照 motion-spec 的表。
     - 开和关都要量，并且在「打开到一半」时关一次。`startJump` 不为 0，就是动画开头跳了一下。
   - **浏览器里查五件事**：开「减少动态效果」后不转不弹；键盘能用（Esc、方向键、焦点回位）；点击区够 44px；控制台没有报错；彩底上的白字形够对比度（图形 3:1，字 4.5:1），不够就开 `data-pk-contrast="more"` 或改深色字。延伸出来的东西还要把每条状态变化都走一遍：成功、失败、空、撤销。
   - **没有可视的浏览器窗口时**（或不能用内置浏览器），命令行的无头 Chrome / Edge 也算。例如用 Playwright 连系统里的浏览器，用 `emulateMedia({ reducedMotion: 'reduce' })` 测减少动效。只有静态检查不能代替这一步。
   - **对照原版**：截图和 Path 录屏比。素材的在线地址见 essence.md 末尾「素材」；用 `scripts/frame-sheet.js` 在 web.archive.org 上拼帧。
7. **交付时说清楚，说的都要做到。**
   - 复刻了哪几块、哪一代、什么强度、替用户定了什么、改了哪些默认数字。
   - 延伸的部分分三类写：
     - 照搬 Path 的：哪个模式。
     - 按规则推的：哪一条。
     - 规则推不出来、你自己定的。
   - 规则是归纳出来的，不要说成「Path 官方就是这么做的」。
   - 哪些数字是估的，哪些没在真实浏览器或设备上看过。没开浏览器就直说「只做了静态检查」。
   - 交付说明里写的每一项能力（键盘、减少动效、点外面收回、焦点回到哪……）都要在代码里找得到，最好是跑过的。kit 的行为照 porting.md 的原话说，别往大了说。发出去前对一遍。
   - 说明里让用户自己改的地方（强度、某个数字、换成原生滚动条），页面里要已经留好入口，照着改就能生效。单文件里只有 import 过的名字存在：叫用户「加一行 setIntensity」之前，先确认它被 import 了。
   - 跟时间有关的说法（例如「四种日期写法都看得到」）要在任何一天打开都成立；不成立就写明例外。

## 底线

- **不用 Path 的品牌资产，界面上也不写 Path 的名字。** 标志、字标、贴纸画、照片、原图标都不用；demo 里的图标和表情也是原创的简笔画。要复刻的是行为、节奏和结构，这些可以照做；外观素材必须自己画。
- **发布按钮有有效专利。** Path 的「从菜单图标沿路径弹出子图标来发内容」有美国专利 US9448692B1，现由 Kakao 持有，预计 2034-07-16 到期。
  - 做原型、学习没有问题。
  - 用户要把这个菜单用在上线的商用产品里时，要明确提醒他先请法务评估，或者换一种展开方式（例如不沿弧线弹出）。
  - 延伸时推出了扇形弹出菜单，也要提醒。
  - 不要替用户下「不侵权」的结论。
- **动效只在状态变化时出现。** 不要为了「像 Path」给静态内容加循环动画。Path 平时是静的，压印加载是唯一的循环动画。
- **减少动效和键盘可用性不能省。** path-kit 已经处理好了，移植时别丢。延伸出来的拖动手势，要配一个按钮能做同样的事。

## 目录

```
path-ui/
├── SKILL.md
├── references/
│   ├── essence.md          设计精华：七条取向、两代骨架、十个模式；十三条规则（含颜色和字形）、动作分五级、推一个新东西；不要照搬的
│   ├── design-system.md    独立项目的全站规范：双主题与三层表面、字号、按钮/表单/列表/表格/弹窗、多页主角与验收（取值多为自定）
│   ├── motion-spec.md      时长、路径、角度、颜色，每个数字标了来源；强度、图标数、方向的规则；零件的默认值
│   └── porting.md          单文件 / 原生 / React+TS / Tailwind / 已有设计系统的接法；用零件拼新东西
├── assets/path-kit/
│   ├── path-kit.js         零件：fly、flyFrom、flyTo、growFrom、shrinkTo、pop、fadeIn、fadeOut、dropIn、fallOut、turnTo、rubber
│   │                       组件：radialMenu、timeScroller、reactionPicker、popIn、dropModal、pagerDots、coverHeader、
│   │                       pullToRefresh、popToggle、relayLoader；setIntensity、motion
│   │                       字形：glyphSvg、GLYPHS（17 个原创实心剪影）
│   ├── path-kit.d.ts       上面这些的 TypeScript 类型
│   ├── path-kit.css        变量（p4 / p2 皮肤、浅/深主题、类型色、筛选色、私密蓝、加深版）、组件样式、.pk-chip 筛选块、.pk-deboss 压印
│   ├── demo.html           手机大小的家庭时间线，Path 有的效果都能点；面板能切深色、加深色，列着类型色和字形
│   └── extend-demo.html    Path 没有的两个东西：上传照片、滑动归档，每一步标了规则
└── scripts/
    ├── inline_kit.py       把 path-kit 内联进页面，得到双击能开的单文件
    ├── check_prototype.py  静态检查底线：品牌字样、减少动效、Esc、循环动画、写死的日期、本地引用
    ├── motion-probe.js     在浏览器里定格取样动画，量冲过头、自转、停稳时刻、开头有没有跳
    └── frame-sheet.js      在 web.archive.org 上把 Path 录屏拼成帧网格，用来量动效和取色
```
