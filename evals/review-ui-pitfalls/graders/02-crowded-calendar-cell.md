---
type: llm
focus: trace
weight: 1
---

It catches the Nov 18 calendar cell (`[data-cell="2026-11-18"]`) rendering 18 events without a per-cell cap, blowing up the entire week row height, and recommends capping visible items per cell (e.g. 2–3 slots + "+N"/"还有 N 项" overflow) with full details shown in a scrollable preview or detail panel.
