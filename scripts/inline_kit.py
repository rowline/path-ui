"""把 path-kit 内联进页面，得到双击就能打开的单文件 HTML。

为什么要它：ES 模块从 file:// 打开时 import 会被浏览器拦下，而手抄几百行 kit 容易抄错数字、也费 token。
先照常写页面：

    <link rel="stylesheet" href="path-kit.css">
    <script type="module">
      import { radialMenu, motion } from './path-kit.js';
      ...
    </script>

路径写什么都行，脚本只认文件名 path-kit.css / path-kit.js，内容一律取自本 skill 的 assets/path-kit/。
然后：

    python scripts/inline_kit.py page.html            # 原地改写
    python scripts/inline_kit.py page.html -o out.html

kit 包在一个函数作用域里，只把 import 的名字放出来，不会和页面自己的变量撞名。
已经内联过的页面再跑一遍不会重复内联。结果以 JSON 打到标准输出。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent / "assets" / "path-kit"

LINK_RE = re.compile(r"<link\b[^>]*\bhref\s*=\s*[\"'][^\"']*path-kit\.css[\"'][^>]*>", re.I)
IMPORT_RE = re.compile(
    r"""import\s*(\{[^}]*\}|\*\s*as\s+[A-Za-z_$][\w$]*)\s*from\s*["'][^"']*path-kit\.js["']\s*;?"""
)
EXPORT_RE = re.compile(r"^export\s+(?=(?:async\s+)?(?:const|let|function)\b)", re.M)
NAME_RE = re.compile(r"^export\s+(?:async\s+)?(?:const|let|function)\s+([A-Za-z_$][\w$]*)", re.M)
# 页面里还剩的相对路径引用（图片、别的脚本），单文件打开时会找不到
REF_RE = re.compile(r"""\b(?:src|href)\s*=\s*["'](?!https?:|data:|blob:|#|mailto:|tel:|javascript:)([^"']+)["']""", re.I)
OTHER_IMPORT_RE = re.compile(r"""\bimport\b[^;'"]*?from\s*["'](\.{1,2}/[^"']+)["']""")


def kit_js() -> tuple[str, list[str]]:
    src = (KIT / "path-kit.js").read_text(encoding="utf-8")
    names = NAME_RE.findall(src)
    body = EXPORT_RE.sub("", src).replace("</script", "<\\/script")
    return body, names


def binding(spec: str, names: list[str]) -> str:
    spec = spec.strip()
    if spec.startswith("*"):
        return "const " + spec.split()[-1]
    parts = [p.strip() for p in spec.strip("{}").split(",") if p.strip()]
    out = []
    for part in parts:
        m = re.fullmatch(r"([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?", part)
        if not m:
            raise ValueError(f"看不懂的 import 写法：{part}")
        name, alias = m.group(1), m.group(2)
        if name not in names:
            raise ValueError(f"path-kit.js 没有导出 {name}，可用的有：{', '.join(names)}")
        out.append(f"{name}: {alias}" if alias else name)
    return "const { " + ", ".join(out) + " }"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("page", type=Path)
    ap.add_argument("-o", "--output", type=Path, help="输出路径，默认原地改写")
    args = ap.parse_args()

    html = args.page.read_text(encoding="utf-8")
    body, names = kit_js()
    css = (KIT / "path-kit.css").read_text(encoding="utf-8")
    stamp = date.today().isoformat()
    result = {"output": str(args.output or args.page), "inlined_css": 0, "inlined_js": 0, "names": [], "warnings": []}

    def put_css(_m: re.Match) -> str:
        result["inlined_css"] += 1
        return f"<style>\n/* ---- path-kit.css（path-ui skill，内联于 {stamp}）---- */\n{css}\n/* ---- path-kit.css 结束 ---- */\n</style>"

    def put_js(m: re.Match) -> str:
        result["inlined_js"] += 1
        spec = m.group(1).strip()
        bind = binding(spec, names)
        if spec.startswith("*"):
            result["names"].append("*")
        else:
            result["names"] += [p.split(" as ")[0].strip() for p in spec.strip("{}").split(",") if p.strip()]
        exports = ", ".join(names)
        return (
            f"// ---- path-kit.js（path-ui skill，内联于 {stamp}；数字出处见 references/motion-spec.md）----\n"
            f"{bind} = (() => {{\n{body}\nreturn {{ {exports} }};\n}})();\n"
            "// ---- path-kit.js 结束 ----"
        )

    try:
        html = LINK_RE.sub(put_css, html)
        html = IMPORT_RE.sub(put_js, html)
    except ValueError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 2

    if not result["inlined_css"] and not result["inlined_js"]:
        result["warnings"].append("页面里没找到 path-kit.css 的 <link> 或 path-kit.js 的 import，没有改动（已经内联过就是这样）。")
    if result["inlined_js"] and "path-kit.css" not in html and not result["inlined_css"] and ".pk-" not in html:
        result["warnings"].append("用了 path-kit.js 但没引 path-kit.css，组件会没有样式。")
    for ref in sorted(set(REF_RE.findall(html))):
        result["warnings"].append(f"还引用了本地文件 {ref}，单文件打开时找不到，要么内联，要么换成 data: URL。")
    for ref in sorted(set(OTHER_IMPORT_RE.findall(html))):
        result["warnings"].append(f"还 import 了 {ref}，file:// 打开会被拦下。")

    out = args.output or args.page
    out.write_text(html, encoding="utf-8", newline="\n")
    result["bytes"] = len(html.encode("utf-8"))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
