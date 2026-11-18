---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

家里的助手在网页上和家人对话。想照 Path 的思路做它回话时给的结果卡：家人说「这周末带外婆出去走走，帮我挑个地方」，助手找到几个地方（附件 files/places.json，是从网上搜来的原样结果），在对话里给一张卡让家人挑，挑好以后助手去订。要做出：卡片怎么出现、挑选、订的过程、订好、订失败、一个都没找到。做成单文件 HTML demo，助手的回复用假的就行，页面上留几个按钮能模拟「订失败」和「没找到」。
