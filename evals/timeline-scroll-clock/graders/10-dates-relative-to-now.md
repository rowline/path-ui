---
type: llm
focus: trace
weight: 1
---

Fake record times are generated relative to the current time (from Date.now() / new Date() minus hours, days, months), not hard-coded calendar dates, so the today / weekday / date labels stay correct whatever day the file is opened.
