"""静态检查一个复刻 Path 效果的 HTML 页面，看它有没有踩这个 skill 的底线。

    python scripts/check_prototype.py page.html [more.html ...]

只读不改。查的是能从源码看出来的几条：
- brand-text    界面上（文字、title、aria-label、alt、placeholder、脚本里拼出来的字符串）出现了 Path 这个名字
- brand-asset   引用了 Path 官网 / 原图的地址
- reduced-motion 有动画却没处理「减少动态效果」
- escape        有弹窗或菜单却没处理 Esc
- loop          除了加载指示，还有无限循环的动画
- fixed-dates   假数据的日期写死了，过一天「今天 / 星期几」就对不上
- local-files   引用了本地文件或相对路径模块，单文件双击打不开
动效节奏对不对、焦点回不回位，要在浏览器里看（scripts/motion-probe.js）。
结果是 JSON：errors 是要改的，warnings 是要想一下的。有 error 时退出码为 1。
"""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

BRAND = re.compile(r"(?<![A-Za-z])Path(?![A-Za-z]|2D)")
BRAND_ASSET = re.compile(r"path\.com|assets\.path\.|path[-_]?logo", re.I)
UI_ATTRS = {"title", "aria-label", "alt", "placeholder", "value", "aria-description"}
DATE_LIT = re.compile(r"""new Date\(\s*20\d\d\s*,|["'`]20\d\d-\d\d-\d\d|data-time\s*=\s*["']20\d\d-""")
RELATIVE_DATE = re.compile(r"Date\.now\(\)|new Date\(\s*\)|getTime\(\)\s*-")
LOCAL_REF = re.compile(r"""\b(?:src|href)\s*=\s*["'](?!https?:|data:|blob:|#|mailto:|tel:|javascript:)([^"']+)["']""", re.I)
LOCAL_IMPORT = re.compile(r"""\bimport\b[^;'"]*?from\s*["'](\.{0,2}/[^"']+)["']""")
LOOP = re.compile(r"\binfinite\b|iterations\s*:\s*Infinity")


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip: str | None = None
        self.text_hits: list[tuple[int, str]] = []
        self.scripts: list[tuple[int, str]] = []
        self.styles: list[str] = []
        self.tags: set[str] = set()
        self.roles: set[str] = set()

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag)
        if tag in ("script", "style"):
            self.skip = tag
        for k, v in attrs:
            if k == "role" and v:
                self.roles.add(v)
            if k in UI_ATTRS and v and BRAND.search(v):
                self.text_hits.append((self.getpos()[0], f'{tag}[{k}="{v[:60]}"]'))

    def handle_endtag(self, tag):
        if tag == self.skip:
            self.skip = None

    def handle_data(self, data):
        line = self.getpos()[0]
        if self.skip == "script":
            self.scripts.append((line, data))
        elif self.skip == "style":
            self.styles.append(data)
        elif BRAND.search(data):
            self.text_hits.append((line, data.strip()[:80]))


def js_strings(src: str) -> list[tuple[int, str]]:
    """去掉注释，取出字符串和模板字符串（粗略分词，够查文案用）。"""
    out, i, n, line = [], 0, len(src), 0
    while i < n:
        c = src[i]
        if c == "\n":
            line += 1
        if src.startswith("//", i):
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            line += src.count("\n", i, j)
            i = j
            continue
        if c in "'\"`":
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            out.append((line, src[i + 1 : j]))
            line += src.count("\n", i, j)
            i = j + 1
            continue
        i += 1
    return out


def strip_css_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def check(path: Path) -> dict:
    html = path.read_text(encoding="utf-8")
    page = Page()
    page.feed(html)
    errors: list[dict] = []
    warnings: list[dict] = []

    hits = list(page.text_hits)
    for base, src in page.scripts:
        for ln, s in js_strings(src):
            if BRAND.search(s) and not s.lstrip().startswith(("./", "../")):
                hits.append((base + ln, s.strip()[:80]))
    for ln, snippet in hits:
        errors.append({"rule": "brand-text", "line": ln, "detail": snippet,
                       "why": "界面上不写 Path 的名字（标题、说明、按钮、读屏文字都算）；要说明来源写在代码注释或交付说明里。"})

    for m in BRAND_ASSET.finditer(html):
        ln = html.count("\n", 0, m.start()) + 1
        errors.append({"rule": "brand-asset", "line": ln, "detail": m.group(0), "why": "不引用 Path 的官网、原图和标志。"})

    code = "\n".join(s for _, s in page.scripts)
    css = strip_css_comments("\n".join(page.styles))
    animates = ".animate(" in code or "@keyframes" in css or re.search(r"\btransition\s*:", css)
    if animates and "prefers-reduced-motion" not in html:
        errors.append({"rule": "reduced-motion", "why": "有动画但没处理 prefers-reduced-motion：开了「减少动态效果」应不转、不弹、不晃。"})

    popup = page.roles & {"dialog", "alertdialog", "menu"} or "dialog" in page.tags or "aria-modal" in html or "'dialog'" in code or "'menu'" in code
    if popup and "Escape" not in html:
        warnings.append({"rule": "escape", "why": "有弹窗或菜单，但源码里没出现 Escape：要能用 Esc 关。"})

    loops = [ln for ln in strip_css_comments(html).splitlines() if LOOP.search(ln) and not re.search(r"pk-relay|pk-pulse|load|spin|busy", ln, re.I)]
    if loops:
        warnings.append({"rule": "loop", "detail": loops[0].strip()[:80],
                         "why": "Path 平时是静的，循环动画只给加载指示。别的东西别一直动。"})

    fixed = DATE_LIT.findall(html)
    if len(fixed) >= 3 and not RELATIVE_DATE.search(code):
        warnings.append({"rule": "fixed-dates", "detail": f"{len(fixed)} 处，例如 {fixed[0]}",
                         "why": "假数据的时间最好相对现在生成（今天、几天前、几个月前、去年），否则换一天打开，日期行和「今天」就不对了。"})
    elif len(fixed) >= 3:
        warnings.append({"rule": "fixed-dates", "detail": f"{len(fixed)} 处写死的日期",
                         "why": "确认这些是故意写死的；要演示日期规则，相对现在生成更稳。"})

    refs = sorted(set(LOCAL_REF.findall(html)) | set(LOCAL_IMPORT.findall(code)))
    if refs:
        warnings.append({"rule": "local-files", "detail": ", ".join(refs[:5]),
                         "why": "引用了本地文件或相对路径模块，双击打开会缺东西。要单文件就跑 scripts/inline_kit.py。"})

    return {"file": str(path), "ok": not errors, "errors": errors, "warnings": warnings}


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    reports = [check(Path(p)) for p in argv]
    print(json.dumps(reports if len(reports) > 1 else reports[0], ensure_ascii=False, indent=2))
    return 0 if all(r["ok"] for r in reports) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
