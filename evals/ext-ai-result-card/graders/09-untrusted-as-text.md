---
type: llm
focus: trace
weight: 1
---

Names and intros from places.json are never parsed as HTML (shown verbatim or with the tags stripped, either is fine): the <img onerror> payload creates no element or script effect (document.title stays unchanged), the <b> in an intro is not rendered as bold, and the place with no weather field and the very long name still render without breaking the card.
