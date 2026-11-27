# Changelog

All notable changes to `path-ui` are documented in this file.

## [0.5.0] - 2026-11-27

### Added
- 新增 [agents/openai.yaml](agents/openai.yaml)，补齐 Codex / OpenAI UI 元数据与隐式调用策略。
- 新增 [scripts/validate_skill.py](scripts/validate_skill.py) 一键校验脚本（`SKILL.md` frontmatter、元数据、内部相对链接、`evals/` 完整性、Demo 静态检查与 `.skill` 打包完整性）。
- 新增 [scripts/package_skill.py](scripts/package_skill.py) 确定性打包脚本，默认输出 `dist/path-ui.skill`（排除 `evals/`、`vendor-skills/`、`.git/` 与仓库元文件）。
- 新增 `.github/workflows/ci.yml` 与 `.github/workflows/release.yml`，支持 PR/Push 自动校验与 Tag 自动打包发布 GitHub Release。
- 新增 [.gitignore](.gitignore)、[CHANGELOG.md](CHANGELOG.md) 以及无头浏览器实拍的 Demo 预览截图（`docs/screenshots/`）。

### Changed
- 按标准 Agent Skill 规范（`agentskills.io` 与 `skill-creator`）重构 [SKILL.md](SKILL.md)：补充 `metadata`、负向触发边界、意图识别决策表、System Map、核心规则速查与六类分形态输出契约。
- 升级 [README.md](README.md)：加入版本/协议徽章、效果截图预览、多客户端安装指引（Claude Code / Antigravity / Codex / Cursor / `.skill` 包）与完整脚手架说明。

## [0.4.0] - 2026-11-27

### Added
- 补全 [references/design-system.md](references/design-system.md) 与 [references/review-checklist.md](references/review-checklist.md) 中的工程高频实战规范与七类审查陷阱（非原生选择器与弹窗 Top Layer、响应式按钮高度、高密度网格折叠、多分区列表默认展开上限、列表到二级详情连续性、标题首句防复读、长文本非对称双栏与吸顶控制）。
- 新增 4 组 `evals/` 评测用例：`ext-form-pickers`、`ext-long-transcript-detail`、`review-detail-and-long-text`、`review-ui-pitfalls`。

## [0.3.0] - 2026-11-18

### Added
- 吸收 `JUNERDD/Atd` 的 `generative-ui`（MIT）做法并按 Path 规则重写，新增 [references/ai-views.md](references/ai-views.md) 与 `extend-demo.html` 第三块「和助手说」对话结果卡。
- 新增评测用例 `ext-ai-result-card` 与 `review-ai-chat`。

### Changed
- 将 `references/` 与 `scripts/contrast.py` 中对来源的引用修正为上游地址，确保 `.skill` 安装包不指向未打包的 `vendor-skills/`。

## [0.2.0] - 2026-11-18

### Added
- 吸收 `JUNERDD/Atd` 的 `apple-design` 与 `high-fidelity-prototype`（MIT）做法并按 Path 规则改写：控件状态（规则 14）、减少动效换淡入淡出、加载节奏、能撤销就不确认、审改已有界面流程、对比度与点击区测量。
- 新增 `scripts/contrast.py`、`scripts/motion-probe.js` 以及 `review-existing-ui`、`change-existing-ui` 等评测用例；在 `vendor-skills/` 归档原版参考。

## [0.1.0] - 2026-11-15

### Added
- 首个版本：归纳 Path（2010–2018）设计取向、两代骨架、十个模式与推演规则；提供实测配色/动效取值表（[references/motion-spec.md](references/motion-spec.md)）、零依赖 `assets/path-kit/`（JS/CSS/TS 类型与双 Demo）及静态检查/单文件内联脚本。
