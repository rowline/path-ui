---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

家庭助手网页右上角有个铃铛，点开是家里的提醒列表（比如「周六外婆生日」「明早 8 点倒垃圾」）。想照 Path 的思路做这一块，Path 本身没有这个功能。要有：新提醒进来时的样子、把一条标成完成、没有提醒时的样子、加载中的样子。做个单文件 HTML demo，页面上留几个按钮，能模拟「来一条新提醒」和「重新加载」。
