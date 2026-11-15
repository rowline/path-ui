# path-ui

A Claude skill for rebuilding the feel of **Path** (the private social journal app, 2010–2018) on the web — the + button whose icons burst out along an arc, the clock that rides the scrollbar, the type-dot timeline, the in-place emotion picker, drop-in modals — and for designing things Path never had in the same spirit. Timings and colours are measured from screen recordings; the kit is zero-dependency JS/CSS. The docs are written in Chinese.

一个 Claude skill：在网页上复刻 Path（2010–2018，只给亲近的人看的日记式社交软件）的界面和交互，并按它的思路做 Path 没有的东西。

## 里面有什么

- **设计精华和规则**（`references/essence.md`）：Path 的七条取向、两代骨架、十个模式；从模式里倒推出的十三条规则（动作从哪来、动作分五级、平时是静的、就地发生、跟手的门槛、每类内容一个色相和一个字形……），以及「推一个新东西」的步骤。
- **取值表**（`references/motion-spec.md`）：时长、路径、角度、颜色。每个数字都标了来源：录屏逐帧实测、开源复刻代码，或者估的。
- **path-kit**（`assets/path-kit/`）：零依赖的 JS/CSS，带 TypeScript 类型。
  - 动作零件：`fly`、`flyFrom`、`flyTo`、`growFrom`、`pop`、`dropIn` / `fallOut`、`turnTo`、`rubber` 等。
  - 组件：发布菜单、滚动时钟、情绪回应、掉落弹窗、封面头部、下拉刷新、星标、压印加载。
  - 17 个原创字形（`glyphSvg`），类型色、筛选色，深色主题和网页对比度版本。
- **两个 demo**：`demo.html`（Path 有的效果）、`extend-demo.html`（Path 没有的两个东西：上传照片、滑动归档）。
- **脚本**：把 kit 内联成双击能开的单文件、静态检查、在浏览器里定格量动效、在网页存档上把录屏拼成帧网格。
- **评测题**（`evals/`）：skill-creator 格式，复刻题和延伸题都有。

## 安装

把整个文件夹放到下面任一位置，文件夹名用 `path-ui`：

- 个人：`~/.claude/skills/path-ui/`
- 项目：`<项目>/.claude/skills/path-ui/`

也可以下载 Release 里的 `path-ui.skill` 安装包（不含 `evals/`）。

装好以后，提到 Path、「像 Path 那样的效果 / 思路」、扇形弹出的加号菜单、滚动时间标签、掉下来晃的弹窗这类需求时，Claude 会用上它。

## 看 demo

```bash
cd assets/path-kit
python -m http.server 5181
```

然后打开 `http://localhost:5181/demo.html` 和 `http://localhost:5181/extend-demo.html`。

## 先知道的几件事

- **不含 Path 的品牌资产。** 标志、贴纸、原图标都没有收；demo 里的图标和表情是原创的。复刻的是行为、节奏和结构。素材只在 `references/essence.md` 末尾列了地址，不附文件。
- **规则是归纳出来的**，不是 Path 官方写下的设计原则。
- **扇形弹出的发布菜单有有效专利**（US9448692B1，现由 Kakao 持有，预计 2034-07-16 到期）。做原型、学习没问题；要用在上线的商用产品里，先请法务评估。
- Path 是 Kakao 旗下已停止服务的产品，本项目和 Path、Kakao 没有关系。

## 许可证

MIT，见 [LICENSE](LICENSE)。许可证管的是这里的代码和文字；Path 的名字、商标和素材归原权利人，不在授权范围内。
