---
type: llm
focus: trace
weight: 1
---

It spots that `.filmstrip` orders thumbnails backward (`第 5 张` → `第 1 张`) against the `2 / 5` counter and `‹ 上一张 / 下一张 ›` direction (plus using brand teal `#0E7C6B` outline on `.thumb.is-active` instead of neutral highlight), AND catches fixed `width: 560px` / `white-space: nowrap` `.action-bar` causing horizontal overflow on a `390px` viewport.
