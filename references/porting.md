# 把 path-kit 接进项目

> 文档类型：使用说明。适用范围：把 `assets/path-kit/` 搬进网页项目（单文件、原生、React/TS、Tailwind，以及接进已有的设计系统），以及用 kit 的零件拼 Path 没有的东西。核对基线：2026-11-15，path-kit 在内置浏览器里跑过 `demo.html` 和 `extend-demo.html` 的每个效果；组件改成零件实现后，和改之前的 kit 逐帧比过（展开、收回、选中、弹窗、回应、星标完全一致，只有「展开到一半就收」不再跳）；`inline_kit.py` 产出的单文件实测能用。

## 搬什么

- `path-kit.js`：ES 模块，零依赖，用 Web Animations API。整份用，不要挑着抄：函数之间共用 `motion`、`frames`、`dur` 这些工具，抄漏一个就会出怪问题。
- `path-kit.d.ts`：TypeScript 类型，和 `path-kit.js` 放在同一个目录即可。
- `path-kit.css`：变量和组件样式。接进已有设计系统时，只改 `:where(.pk-root)` 里的变量，组件规则不动。
- 不要搬 `demo.html`、`extend-demo.html` 里的占位图标和文字。那是演示用的，正式界面换成项目自己的图标和文案。

## 调数字和行为

不改 kit 源码，用这几种办法：

| 想改的 | 怎么改 |
| --- | --- |
| 整体幅度 | `setIntensity(0.4)`，管什么见 motion-spec 第 6 节 |
| 某个时长或数值 | 页面里改 `motion` 的字段，例如 `motion.clock.hideDelayMs = 1500`、`motion.menu.center.scrim = 0.4`；在创建组件之前改 |
| 只改某一个菜单 | `radialMenu(slot, { config: { arc: [-90, 0], radius: 100 } })` |
| 图标个数 | 直接给几个 `items`，间隔和半径自己算 |
| 角落版加号放右边 | 默认 `side: 'auto'` 会自己镜像；也可以写死 `side: 'right'` |
| 弹窗压暗、角色与桌面宽度 | `dropModal({ scrim: 0.4, role: 'alertdialog' })`；桌面表单弹窗设 CSS 变量 `--pk-modal-max: 460px` |
| 深色模式 | 独立项目在容器加 `data-pk-theme="dark"`（或 `"auto"` 跟随系统）；页面已经用 `.dark` 类切深色时（如 Tailwind），`.dark` 下的 `.pk-root` 会自动跟着切。两代皮肤都能切；深色的值是自定的，Path 没有深色模式 |
| 时钟用原生滚动条 | `timeScroller(el, { thumb: false })` |
| 菜单图标的路径 | `config` 里的 `far`、`near`、`openAt`（冲过头、回落的时刻）、`spin` / `spinAt`（边飞边转）、`closeFar` / `closeAt`（收回前往外退） |
| 类型色、筛选色 | 改 `--pk-type-*`、`--pk-filter-*` 变量；新类型照 essence.md 规则 12 选色相 |
| 网页对比度 | 容器上加 `data-pk-contrast="more"`：音乐、想法、照片青、日期、春、秋换成加深版，夏、冬改深色字（motion-spec 7.2） |

改过的数字在交付说明里列出来，写明是测的还是自己定的。

## 用零件拼新东西

Path 没有的东西（设置页、通知、上传、购物清单……）不要另写一套曲线，用 kit 的零件拼。先按 [essence.md](essence.md) 的「推一个新东西」定好每个状态变化用哪一级动作，再挑零件：

| 想要的 | 零件 | 默认 |
| --- | --- | --- |
| 新东西从叫出它的按钮飞到自己的位置 | `flyFrom(el, 按钮)` | 冲过 6px、回落 3px，从 0.4 倍放大，300ms，不转 |
| 东西飞向它要去的地方（归档、回收站）并消失 | `flyTo(el, 目的地)` | 先往反方向退 8px，加速过去，缩到 0.3 倍淡掉，320ms |
| 任意直线飞行，自己定冲过头、自转 | `fly(el, { from, to, over, back, spin, … })` | 发布菜单的图标就是它 |
| 旁边的东西让位（插入、删除后挪位置） | `fly(el, { from: [dx, dy], to: [0, 0], ms: 250, easing: motion.ease.out, fill: 'none' })` | 不冲过头：让位的东西不是主角 |
| 面板从按钮那边长出来 / 收回去 | `growFrom(el, 按钮)` / `shrinkTo(el)` | 0.92 → 1，200ms / → 0.96，150ms |
| 新出现的小东西、状态切换 | `pop(el)`；已经在的东西鼓一下用 `pop(el, { from: 1 })` | 冲到 1.2 倍，250ms |
| 提示、标签淡入淡出 | `fadeIn(el, { from: [0, 8] })` / `fadeOut(el)` | 200ms / 300ms，从此刻的透明度接着走 |
| 要用户拿主意的确认 | `dropModal(…)`；只要动作不要弹窗外壳时用 `dropIn` / `fallOut` | 同 Path 的弹窗 |
| 转到某个角度 | `turnTo(el, 度数)` | 从此刻的角度接着转 |
| 拖动带阻尼 | `rubber(手指位移, { max })` | 越拖越沉，最多 `max` |
| 压印的图标、空状态、列表到底 | CSS `.pk-deboss`；加载用 `relayLoader` | 只在纸色底上看得出来 |
| 类型、状态的图标 | `glyphSvg('place')`，返回 SVG 字符串，颜色跟 `currentColor`；`glyphSvg(id, { label })` 带读屏名字 | 17 个原创实心剪影，细节镂空，白底彩字形、彩底白字形都能用 |
| 筛选块、类型标签 | `<span class="pk-chip" style="--pk-chip: var(--pk-filter-date)">${glyphSvg('calendar')}十一月</span>`；做成按钮就用 `<button class="pk-chip" aria-pressed>` | 30px 高，点击区 44px；`aria-pressed="false"` 时变成描边 |
| 私密 / 内圈 | `class="pk-private"`（锁、星标、「只给自己」变蓝） | 全站唯一的状态色 |

几个容易踩的地方：

- 幅度参数（`over`、`back`、`windup`、`spin`、`peak`、`dip`、`swing`、`tilt`）自动乘强度，不要自己再乘一次。
- 东西在滚动区或 `overflow: hidden` 的容器里，飞出去会被裁掉。在外层放一个替身（克隆一份、`position: absolute` 摆在同一个位置）去飞，飞完再显示原件、删掉替身。`extend-demo.html` 里的 `ghostOf` 就是这么做的。
- `fly`、`flyFrom`、`pop` 默认 `fill: 'both'`，动画结束后会一直压住元素的 `transform`。之后还要用 `style.transform` 拖动的元素（滑动归档的那一行），开始拖之前先取消它身上的动画，弹回以后也取消。
- `dropIn` / `fallOut` 不给 `inner` 时，摆动叠加在同一个元素上（`composite: 'add'`），需要 Chrome 112、Safari 16、Firefox 104 以上；给了 `inner` 就没有这个限制。
- 拖动类操作一定要配一个按钮做同样的事，键盘和读屏用户才用得了。

## 单文件（双击就能打开）

ES 模块用 `file://` 打开时 `import` 会被浏览器拦下，所以单文件要把 kit 内联进去。不要手抄，用脚本：

1. 照常写页面，引用 `path-kit.css` 和 `import { … } from './path-kit.js'`。路径写什么都行，脚本只认文件名。
2. 跑 `python scripts/inline_kit.py 页面.html`（原地改写）或加 `-o 输出.html`。
3. 脚本把 CSS 放进 `<style>`，把 kit 包进一个函数作用域，只放出你 import 的名字，`as` 改名也认。页面自己的变量和 kit 内部同名也不冲突。重复跑不会重复内联。
   - 所以没 import 的函数在页面里是不存在的。想让用户自己调强度或数字，就 import `setIntensity`、`motion`，并在页面里先写好那一行（如 `setIntensity(1); // 改成 0.4 更克制`），别只在说明里叫他「加一行」。
4. 输出 JSON 的 `warnings` 会列出还残留的本地文件引用（图片、别的脚本）。单文件里的图片用 SVG 或 `data:` URL。

## 假数据的时间

时间线、滚动时钟的假数据要相对现在生成，否则换一天打开「今天」「星期几」就错了。只用「几小时前、几天前」这种固定偏移也不够：零点刚过时「两小时前」已经是昨天，1 月初时「40 天前」已经是去年。要演示每一档日期写法，用下面这几个锚点，再在它们附近撒别的记录：

```js
const now = new Date();
const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 今天零点
const DAY = 864e5;
const anchors = {
  today: new Date(now - Math.min(2 * 3600e3, (now - today0) / 2)),   // 今天：最多两小时前，零点刚过也还在今天
  weekday: new Date(+today0 - 3 * DAY + 10 * 3600e3),                // 3 天前上午 10 点：显示星期几
  thisYear: new Date(now.getFullYear(), 0, 1, 9),                     // 今年 1 月 1 日：显示几月几日
  lastYear: new Date(now.getFullYear() - 1, 5, 15, 20),              // 去年 6 月 15 日：带年份
};
```

1 月 1 日到 7 日打开时，「今年、但一周以前」这一档本来就不存在（`thisYear` 会落进「星期几」）。交付说明里不要写「哪天打开四种写法都有」，要写清这个例外。

## 原生页面

```html
<link rel="stylesheet" href="path-kit.css">
<div class="pk-root" data-pk-skin="p4"> … </div>
<script type="module">
  import { radialMenu, timeScroller } from './path-kit.js';
  const menu = radialMenu(document.querySelector('#slot'), { variant: 'center', items, onSelect });
</script>
```

本地看 demo 要起一个静态服务，比如在 `assets/path-kit` 下跑 `python -m http.server`。

## React（19）/ TypeScript

每个工厂函数都返回 `{ destroy }`，在 effect 里建、在清理函数里拆。依赖变了就重建：

```tsx
import { radialMenu, type MenuItem } from './path-kit.js'; // 同目录放 path-kit.d.ts

function PostButton({ items, onSelect }: { items: MenuItem[]; onSelect: (it: MenuItem) => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const latest = useRef(onSelect);
  latest.current = onSelect;
  useEffect(() => {
    const api = radialMenu(slot.current!, {
      variant: 'center',
      items,
      host: document.getElementById('app-frame')!,
      onSelect: (it) => latest.current(it),
    });
    return () => api.destroy();
  }, [items]);
  return <div ref={slot} className="relative" />;
}
```

注意这几点：

- 回调用 ref 存，免得每次渲染都重建菜单。`items` 要稳定（`useMemo` 或放在组件外），否则每次渲染都会重建。
- 工厂函数会往 `slot` 里插 DOM。这个元素里不要再放 React 管的子节点，否则两边会抢节点。
- `reactionPicker`、`popToggle` 绑在已有按钮上。按钮由 React 渲染，effect 里拿 ref 绑上去即可。
- StrictMode 下 effect 会跑两次。`destroy` 会把插入的节点和挂在 document 上的监听全部拿掉，跑两次没问题；动画放到一半就卸载，kit 也会停手，不再回调 `onSelect` / `onPick`。
- 组件自己用零件起的动画（比如回应落到卡片上那一下 `pop`），把返回的 `Animation` 存起来，在清理函数里 `cancel()`。kit 只管它自己起的动画。
- `motion` 是模块级的对象，改了会影响整个应用；只想改一处就用组件参数（`config`、`scrim`）。
- Vue、Svelte 同理：挂载时建，卸载时 `destroy()`。

## Tailwind（4）

- 变量照旧写在 CSS 里。Tailwind 只用来排版容器（`relative`、`absolute`、`grid`），组件外观交给 `pk-*` 类。
- 想用 Tailwind 主题色时，把变量指过去，例如 `--pk-brand: var(--color-brand)`。不要在组件里写死色值。

## 层叠与定位

- 发布按钮的压暗层（`host`）和加号要在同一个层叠上下文里。加号的祖先元素不要设 `z-index`，也不要设 `transform` 或 `filter`，否则展开时加号会被自己的压暗层盖住。底栏只设 `position`，不设 `z-index`。
- 图标会冲到「终点半径 + 冲出量 + 半个图标」那么远，加号离容器边缘太近就会出界。照原样的个数：居中版 5 个，上方留约 160px；角落版 6 个，上方和朝里那一侧各留约 200px。图标更多时半径会变大，用 `motion-probe` 量一下。
- `timeScroller` 的 `host` 必须是 `position: relative`，并且包住滚动元素。
  - `thumb: true`（默认）：自己画一根细滑块，能拖，鼠标移到滚动区最右 16px（整条高度都算）会露出来。kit 会给滚动元素加 `pk-scroll-hidebar` 类，把原生滚动条藏起来。手机大小的框、触屏为主时用它。
  - `thumb: false`：保留原生滚动条，标签贴在它左边。桌面网页、用鼠标的场景用它更稳。
  - 页面自己不要再写 `scrollbar-width: none` 之类的隐藏规则：那样切到 `thumb: false` 也看不到滚动条。
  - 滚动容器没有 `tabindex` 时，kit 会补 `tabindex="0"`，好让键盘能滚。
- `coverHeader` 依赖 `.pk-cover` 的 `position: sticky`。它的直接滚动祖先必须就是传进来的 `scrollEl`。

## 可用性

kit 已经做好的，移植时别丢：

- 所有点击区至少 44px（`--pk-item`、`.pk-moment-react`、`.pk-star-btn` 都是 44）。图标多时菜单会自己撑大半径，不让点击区叠在一起。
- 键盘：
  - 加号：Enter/空格展开，← → 按屏幕从左到右走，Home / End 到两头，Esc 收回。点菜单外面任何地方都会收回（角落版没有压暗，也一样）。收回后焦点回到加号，只有一个例外：用户是点到另一个能聚焦的东西上收回的，焦点就留在那里，不抢回来。
  - 弹窗：Esc 关闭，Tab 只在卡片里循环，关闭后焦点回到原处。挂在 `document.body` 上时，背后的页面不跟着滚。删除确认这类用 `role: 'alertdialog'`。
  - 情绪回应：← → 在表情间走，Esc 关闭，选完或关掉后焦点回到按钮；页面一滚就收起，免得浮层和按钮错位。
- 系统开了「减少动态效果」时，所有动画自动降到 120ms 以内，不转、不冲过头。
- 时钟标签是 `aria-hidden`，读屏用户靠每条记录自己的时间。时间请写在记录的文字里（例如 `<time datetime="…">`），不能只靠钟。

## 接进已有的设计系统

项目已经有自己的视觉规范（颜色、字体、层次、圆角、对话框）时，以项目为准，path-kit 只提供结构和动效：

- **写一张桥接表。** 在项目样式和 `path-kit.css` 之后引入一个小 CSS 文件，在容器上（例如 `.pk-root.my-app`）把 `--pk-*` 指到项目的变量：纸面和卡片（`--pk-paper`、`--pk-card`、`--pk-wash`）、字色（`--pk-ink`、`--pk-ink-2`）、分隔线（`--pk-rule`）、品牌和主按钮（`--pk-brand`）、类型色（`--pk-type-*`）、圆角（`--pk-radius`、`--pk-radius-pop`、`--pk-radius-btn`）、影子（`--pk-shadow-*`）。深色模式下项目变量自己会切，桥接表不用另写一份。
- **项目规定了「深色只给一处」这类规矩时**，时钟标签和回应浮层别用 Path 原版的近黑：把 `--pk-tag`、`--pk-react-bg` 指到卡片色，`--pk-on-tag`、`--pk-on-tag-2` 指到正文字色和次要字色，`--pk-shadow-tag`、`--pk-shadow-pop` 用项目卡片的影子。
- **项目已经有对话框组件时**，继续用它，不引入第二套实现。想要掉落 / 摔出的手感，就给现有对话框的内容加 `dropIn` / `fallOut`；压暗跟着项目自己的遮罩走，不用 0.72。
- **强度默认 `setIntensity(0.4)`。** 已有产品通常比 Path 安静，克制版更容易融进去。
- **先出样稿、等用户点头，再写代码。** 写完在浅色、深色下各截一次屏，跑项目自己的对比度检查。
- 文件按项目的目录规矩放：`path-kit.js` 和 `path-kit.d.ts` 放共享库目录，CSS 放样式目录，框架包装（React 组件等）放组件目录。
