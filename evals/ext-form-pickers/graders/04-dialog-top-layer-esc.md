---
type: llm
focus: trace
weight: 1
---

When opened inside a `<dialog>.showModal()`, picker popovers render visibly above the dialog (e.g. mounted inside `trigger.closest('dialog')`) rather than hidden behind the Top Layer, and pressing `Escape` closes only the open picker popover and returns focus to its trigger without dismissing the outer `<dialog>`.
