---
type: llm
focus: trace
weight: 1
---

It flags both the mixed control radii across toolbar and dialog (`10px` vs `9999px` pill vs `8px` `.legacy-btn`/`.kind-btn`) and `.kind-btn` clipping its two-line text because of the fixed `height: 28px; overflow: hidden`.
