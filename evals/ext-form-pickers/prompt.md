---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

在家庭管理台里，点击「+ 新安排」会打开一个弹窗（用原生 `<dialog>`），里面要配置「负责成员」（单选下拉）和「执行时间」（日期与时间选择）。不要用浏览器自带的 `<select>` 或 `<input type="datetime-local">`，请按 Path 的思路和设计系统规范做成通用可复用的选择组件，写进一个同时适配桌面与 390px 手机的单文件 HTML。
