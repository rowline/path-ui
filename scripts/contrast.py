#!/usr/bin/env python3
"""contrast.py：算颜色对比度（WCAG 2 相对亮度），量出来，不靠眼睛看（规则 12、14）。

用法：
  python scripts/contrast.py 前景色 背景色         两个颜色的对比度，以及够不够字（4.5）、大字（3）、图形（3）
  python scripts/contrast.py --on 底色             这个底上用白字还是深色字：两种的对比度和建议
  python scripts/contrast.py --kit [path-kit.css]  查 kit 的类型色（白字形 ≥ 3）和筛选色（字 ≥ 4.5），原样和加深版各一遍

颜色写 #RGB、#RRGGBB 或 rgb(r, g, b)。输出 JSON；--kit 有不达标的项时退出码为 1。
做法借自 JUNERDD/Atd 的 apple-design 的 contrast.py 思路（MIT），这里是另写的简化版。
"""
import json
import re
import sys
from pathlib import Path

DARK_INK = "#1F1A16"  # 深色字：kit 的暖深灰，比纯黑柔和


def parse(c: str) -> tuple[float, float, float]:
    c = c.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", c)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+).*\)", c)
    if m:
        return tuple(float(v) for v in m.groups())
    raise ValueError(f"看不懂的颜色：{c}")


def luminance(rgb) -> float:
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a: str, b: str) -> float:
    la, lb = sorted((luminance(parse(a)), luminance(parse(b))), reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


def verdict(r: float) -> dict:
    return {"ratio": r, "text": r >= 4.5, "large_text": r >= 3, "glyph": r >= 3}


def on(fill: str) -> dict:
    white, dark = ratio("#FFFFFF", fill), ratio(DARK_INK, fill)
    pick = "white" if white >= 4.5 or white >= dark else "dark"
    return {"fill": fill, "white": verdict(white), "dark_ink": {"color": DARK_INK, **verdict(dark)},
            "suggest": "白字" if pick == "white" else f"深色字 {DARK_INK}"}


def css_blocks(css: str) -> dict[str, dict[str, str]]:
    """把 CSS 里每个规则块的 --pk-* 变量读出来，按选择器归类。"""
    out: dict[str, dict[str, str]] = {}
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", re.sub(r"/\*.*?\*/", "", css, flags=re.S)):
        vars_ = dict(re.findall(r"(--pk-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b", body))
        if vars_:
            out.setdefault(" ".join(sel.split()), {}).update(vars_)
    return out


def kit(path: Path) -> tuple[dict, bool]:
    blocks = css_blocks(path.read_text(encoding="utf-8"))
    base = next((v for s, v in blocks.items() if s.startswith(":where([data-pk-skin])")), {})
    more = next((v for s, v in blocks.items() if 'data-pk-contrast="more"' in s), {})
    report, ok = {}, True
    for name, vars_ in (("原样", base), ("加深", {**base, **more})):
        rows = []
        for var, val in sorted(vars_.items()):
            if var.startswith("--pk-type-"):
                r = ratio("#FFFFFF", val)  # 彩底白字形（时间线小圆）
                rows.append({"var": var, "fill": val, "ink": "#FFFFFF", "ratio": r, "need": 3, "pass": r >= 3})
            elif var.startswith("--pk-filter-") and not var.endswith("-ink") and var != "--pk-filter-ink":
                ink = vars_.get(var + "-ink", vars_.get("--pk-filter-ink", "#FFFFFF"))
                r = ratio(ink, val)  # 筛选块上的字
                rows.append({"var": var, "fill": val, "ink": ink, "ratio": r, "need": 4.5, "pass": r >= 4.5})
        report[name] = rows
        if name == "加深":
            ok = all(row["pass"] for row in rows)
    return report, ok


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Windows 控制台默认不是 UTF-8，输出给别的程序读时会乱码
    if len(argv) >= 2 and argv[1] == "--kit":
        path = Path(argv[2]) if len(argv) > 2 else Path(__file__).resolve().parent.parent / "assets" / "path-kit" / "path-kit.css"
        report, ok = kit(path)
        print(json.dumps({"file": str(path), "加深版全部达标": ok, **report}, ensure_ascii=False, indent=2))
        return 0 if ok else 1
    if len(argv) == 3 and argv[1] == "--on":
        print(json.dumps(on(argv[2]), ensure_ascii=False, indent=2))
        return 0
    if len(argv) == 3:
        print(json.dumps({"fg": argv[1], "bg": argv[2], **verdict(ratio(argv[1], argv[2]))}, ensure_ascii=False, indent=2))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
