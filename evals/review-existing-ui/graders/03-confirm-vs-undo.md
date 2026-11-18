---
type: llm
focus: trace
weight: 1
---

It flags the confirm() dialog on deleting a single to-do as unnecessary for a reversible action and recommends deleting with an in-place undo instead (keeping a confirmation only for irreversible bulk actions, if any).
