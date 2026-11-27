---
type: llm
focus: trace
weight: 1
---

It identifies the long-transcript anti-pattern in `.split-50` + `.transcript-scroll`: equal 50/50 split leaves the left summary side short while squeezing the 1840-char unparagraphed transcript into a nested `max-height: 420px; overflow-y: auto` scroll box, and `.player-card` is not sticky while reading long content. It recommends asymmetric main-reading + sticky side rail, sticky player, removing the inner fixed-height scroll trap, default folding with expand/collapse/top, search + visual paragraphing.
