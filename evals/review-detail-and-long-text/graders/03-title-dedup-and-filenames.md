---
type: llm
focus: trace
weight: 1
---

It flags that the exact same 68-char two-sentence summary is repeated verbatim across the topbar breadcrumb (`.crumb-tail` with `white-space: nowrap`), main heading (`.detail-title`), and summary card, AND catches machine filenames (`20261124_171129_cam_living_01.mp4`, `file-998241.mp4`) exposed directly in `.video-card`, recommending first-sentence title extraction, max-width breadcrumb truncation, and deterministic fallback titles without raw machine filenames.
