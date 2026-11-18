# vendor-skills

这里原样存档从 [JUNERDD/Atd](https://github.com/JUNERDD/Atd)（MIT 许可证，见同目录 [LICENSE](LICENSE)）收录的三份 UI 与原型相关 Skill，供后续参考与按需吸收，暂不改动外层 `path-ui` 的现有规范。

## 收录清单（同步自提交 `e9d0f21`）

| 目录 | 原仓库路径 | 说明 |
| --- | --- | --- |
| [`apple-design/`](apple-design/SKILL.md) | `.agents/skills/apple-design/` | Apple Liquid Glass（OS 26–27）完整界面设计体系，含 SwiftUI/AppKit 原生与 Web 复刻规范、交互状态反馈细则、自检清单、Web CSS/JS 组件套件（`assets/`）与对比度检查脚本（`scripts/contrast.py`） |
| [`high-fidelity-prototype/`](high-fidelity-prototype/SKILL.md) | `.agents/skills/high-fidelity-prototype/` | 高保真可交互原型构建规范：先建立原组件基线再改增量、能力入口到结果全链路守恒、媒介与模拟边界声明、统一场景状态机 |
| [`generative-ui/`](generative-ui/SKILL.md) | `apps/agent-service/product-skills/generative-ui/` | 对话内嵌交互视图规范：概览卡片（`widget`）+ 独立交互窗口（`window`）双表面分工、纯数据驱动更新（`show_ui` / `update_ui`）与安全沙箱约束 |
