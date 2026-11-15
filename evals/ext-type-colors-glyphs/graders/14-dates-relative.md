---
type: llm
focus: trace
weight: 1
---

Fake feed times are generated relative to when the page is opened (from Date.now() / new Date()), not hard-coded dates such as a fixed 「今天 11月15日」, so labels like 今天 / 星期几 stay correct on any day.
