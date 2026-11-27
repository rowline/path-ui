#!/usr/bin/env python3
"""一键校验 path-ui Skill 的规范、文档链接、评测集、Demo 底线与打包产物。

用法：
    python3 scripts/validate_skill.py
"""

from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

import yaml

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_NAME = "path-ui"
ALLOWED_FRONTMATTER_KEYS = {"name", "description", "license", "allowed-tools", "metadata"}
FORBIDDEN_PACKAGE_PREFIXES = (
    "path-ui/evals/",
    "path-ui/vendor-skills/",
    "path-ui/.git/",
    "path-ui/.github/",
    "path-ui/docs/",
    "path-ui/dist/",
    "path-ui/README.md",
    "path-ui/CHANGELOG.md",
    "path-ui/.gitignore",
)
REQUIRED_PACKAGE_ENTRIES = (
    "path-ui/SKILL.md",
    "path-ui/LICENSE",
    "path-ui/agents/openai.yaml",
    "path-ui/assets/path-kit/path-kit.js",
    "path-ui/assets/path-kit/path-kit.css",
    "path-ui/assets/path-kit/path-kit.d.ts",
    "path-ui/scripts/check_prototype.py",
    "path-ui/scripts/inline_kit.py",
)

LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def check_skill_md() -> list[str]:
    """校验 SKILL.md 的 frontmatter、字段约束与未完成占位符。"""
    errors: list[str] = []
    skill_md = ROOT / "SKILL.md"
    if not skill_md.is_file():
        return ["缺少 SKILL.md"]

    content = skill_md.read_text(encoding="utf-8")
    if not content.startswith("---\n"):
        return ["SKILL.md 缺少 YAML frontmatter"]

    match = re.match(r"^---\n(.*?)\n---\n?", content, re.DOTALL)
    if not match:
        return ["SKILL.md frontmatter 格式不完整"]

    try:
        fm = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        return [f"SKILL.md YAML 解析失败: {exc}"]

    if not isinstance(fm, dict):
        return ["SKILL.md frontmatter 必须是映射"]

    unexpected = set(fm.keys()) - ALLOWED_FRONTMATTER_KEYS
    if unexpected:
        errors.append(f"SKILL.md frontmatter 存在非白名单键: {', '.join(sorted(unexpected))}")

    name = fm.get("name")
    if name != EXPECTED_NAME:
        errors.append(f"SKILL.md name 必须为 '{EXPECTED_NAME}'，当前为 {name!r}")

    desc = fm.get("description")
    if not isinstance(desc, str) or not desc.strip():
        errors.append("SKILL.md description 不能为空")
    else:
        desc_s = desc.strip()
        if len(desc_s) > 1024:
            errors.append(f"SKILL.md description 超过 1024 字符（当前 {len(desc_s)}）")
        if "<" in desc_s or ">" in desc_s:
            errors.append("SKILL.md description 不能包含 '<' 或 '>'")
        if desc_s.startswith("[TODO:"):
            errors.append("SKILL.md description 存在未完成 TODO 占位符")

    body = content[match.end() :]
    in_fence = False
    for idx, line in enumerate(body.splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if not in_fence and re.fullmatch(r"\s*\[TODO:[^\n]*\]\s*", line):
            errors.append(f"SKILL.md 正文第 {idx} 行存在未完成 TODO 占位符")

    return errors


def check_openai_yaml() -> list[str]:
    """校验 agents/openai.yaml 结构与字段约束。"""
    errors: list[str] = []
    cfg_path = ROOT / "agents" / "openai.yaml"
    if not cfg_path.is_file():
        return ["缺少 agents/openai.yaml"]

    try:
        data = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"agents/openai.yaml YAML 解析失败: {exc}"]

    if not isinstance(data, dict):
        return ["agents/openai.yaml 必须是 YAML 映射"]

    iface = data.get("interface")
    if not isinstance(iface, dict):
        errors.append("agents/openai.yaml 缺少 interface 段")
    else:
        display_name = iface.get("display_name")
        short_desc = iface.get("short_description")
        brand_color = iface.get("brand_color")
        default_prompt = iface.get("default_prompt")

        if not isinstance(display_name, str) or not display_name.strip():
            errors.append("interface.display_name 不能为空")
        if not isinstance(short_desc, str) or not (25 <= len(short_desc.strip()) <= 64):
            length = len(short_desc.strip()) if isinstance(short_desc, str) else 0
            errors.append(f"interface.short_description 长度需在 25–64 字符之间，当前为 {length}")
        if not isinstance(brand_color, str) or not re.fullmatch(r"#[0-9A-Fa-f]{6}", brand_color):
            errors.append(f"interface.brand_color 必须是 #RRGGBB 格式，当前为 {brand_color!r}")
        if not isinstance(default_prompt, str) or "$path-ui" not in default_prompt:
            errors.append("interface.default_prompt 必须包含 '$path-ui'")

        for icon_key in ("icon_small", "icon_large"):
            if icon_key in iface:
                target = (ROOT / str(iface[icon_key])).resolve()
                if not target.is_file():
                    errors.append(f"interface.{icon_key} 指向的文件不存在: {iface[icon_key]}")

    policy = data.get("policy")
    if not isinstance(policy, dict) or not isinstance(policy.get("allow_implicit_invocation"), bool):
        errors.append("agents/openai.yaml 缺少布尔值 policy.allow_implicit_invocation")

    return errors


def strip_inline_code(line: str) -> str:
    """移除行内反引号片段，避免误解析示例语法中的链接。"""
    return re.sub(r"`[^`]*`", "", line)


def check_markdown_links() -> list[str]:
    """检查 SKILL.md、README.md、CHANGELOG.md 与 references/*.md 内的本地相对链接。"""
    errors: list[str] = []
    md_files = [ROOT / "SKILL.md", ROOT / "README.md"]
    changelog = ROOT / "CHANGELOG.md"
    if changelog.is_file():
        md_files.append(changelog)
    md_files.extend(sorted((ROOT / "references").glob("*.md")))

    for md_file in md_files:
        if not md_file.is_file():
            errors.append(f"缺少文档: {md_file.relative_to(ROOT)}")
            continue
        in_fence = False
        fence_char = ""
        for lineno, raw_line in enumerate(md_file.read_text(encoding="utf-8").splitlines(), start=1):
            stripped = raw_line.lstrip()
            if stripped.startswith("```") or stripped.startswith("~~~"):
                marker = stripped[0]
                if not in_fence:
                    in_fence = True
                    fence_char = marker
                elif marker == fence_char:
                    in_fence = False
                continue
            if in_fence:
                continue

            cleaned = strip_inline_code(raw_line)
            for match in LINK_RE.finditer(cleaned):
                target_raw = match.group(1).strip().split()[0]
                if (
                    not target_raw
                    or target_raw.startswith("#")
                    or target_raw.startswith(("http://", "https://", "mailto:"))
                ):
                    continue
                rel_target = target_raw.split("#", 1)[0]
                if not rel_target:
                    continue
                resolved = (md_file.parent / rel_target).resolve()
                if not resolved.exists():
                    errors.append(
                        f"失效相对链接 {md_file.relative_to(ROOT)}:{lineno} -> {target_raw}"
                    )

    return errors


def check_evals() -> list[str]:
    """校验 evals/ 下每组评测用例的目录、case.yaml、prompt.md 与 graders/*.md。"""
    errors: list[str] = []
    evals_dir = ROOT / "evals"
    if not evals_dir.is_dir():
        return ["缺少 evals 目录"]

    cases = sorted(p for p in evals_dir.iterdir() if p.is_dir())
    if not cases:
        return ["evals 目录下没有任何评测用例"]

    for case_dir in cases:
        case_yaml = case_dir / "case.yaml"
        prompt_md = case_dir / "prompt.md"
        graders_dir = case_dir / "graders"

        if not case_yaml.is_file():
            errors.append(f"{case_dir.name}: 缺少 case.yaml")
        else:
            try:
                data = yaml.safe_load(case_yaml.read_text(encoding="utf-8"))
                if not isinstance(data, dict):
                    errors.append(f"{case_dir.name}/case.yaml 必须是 YAML 映射")
                else:
                    if not isinstance(data.get("name"), str) or not data["name"].strip():
                        errors.append(f"{case_dir.name}/case.yaml 缺少非空 name")
                    if (
                        not isinstance(data.get("expected_outcome"), str)
                        or not data["expected_outcome"].strip()
                    ):
                        errors.append(f"{case_dir.name}/case.yaml 缺少非空 expected_outcome")
            except yaml.YAMLError as exc:
                errors.append(f"{case_dir.name}/case.yaml 解析失败: {exc}")

        if not prompt_md.is_file() or not prompt_md.read_text(encoding="utf-8").strip():
            errors.append(f"{case_dir.name}: 缺少或空的 prompt.md")

        grader_files = sorted(graders_dir.glob("*.md")) if graders_dir.is_dir() else []
        if not grader_files:
            errors.append(f"{case_dir.name}: graders/ 缺少评分标准 .md 文件")

    return errors


def check_demos() -> list[str]:
    """运行 check_prototype.py 验证 demo.html 与 extend-demo.html 无 error。"""
    errors: list[str] = []
    demos = [
        ROOT / "assets" / "path-kit" / "demo.html",
        ROOT / "assets" / "path-kit" / "extend-demo.html",
    ]
    cmd = [sys.executable, str(ROOT / "scripts" / "check_prototype.py"), *(str(d) for d in demos)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode not in (0, 1):
        return [f"check_prototype.py 执行异常 (rc={proc.returncode}): {proc.stderr.strip()}"]
    try:
        report = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        return [f"check_prototype.py 输出不是合法 JSON: {exc}"]

    for item in report:
        errs = item.get("errors") or []
        if errs:
            errors.append(f"{Path(item['file']).name} 存在静态底线错误: {errs}")
    return errors


def check_package() -> list[str]:
    """验证 package_skill.py 产物结构完整且不含非分发目录。"""
    errors: list[str] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = Path(tmpdir) / "path-ui.skill"
        proc = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "package_skill.py"), "-o", str(out_file)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            return [f"package_skill.py 执行失败: {proc.stderr.strip()}"]
        if not out_file.is_file():
            return ["package_skill.py 未生成目标文件"]

        with zipfile.ZipFile(out_file, "r") as zf:
            names = set(zf.namelist())

        for req in REQUIRED_PACKAGE_ENTRIES:
            if req not in names:
                errors.append(f"安装包缺少必要条目: {req}")

        for name in sorted(names):
            if not name.startswith("path-ui/"):
                errors.append(f"安装包存在顶层目录越界条目: {name}")
            if name.startswith(FORBIDDEN_PACKAGE_PREFIXES):
                errors.append(f"安装包不应包含开发/归档条目: {name}")

    return errors


def main() -> int:
    checks = [
        ("SKILL.md frontmatter & 占位符", check_skill_md),
        ("agents/openai.yaml 元数据", check_openai_yaml),
        ("Markdown 相对链接完整性", check_markdown_links),
        ("evals/ 评测用例完整性", check_evals),
        ("Demo 静态底线检查", check_demos),
        ("path-ui.skill 打包完整性", check_package),
    ]

    all_errors: list[str] = []
    for label, fn in checks:
        errs = fn()
        status = "PASS" if not errs else "FAIL"
        print(f"[{status}] {label}")
        for err in errs:
            print(f"  - {err}")
            all_errors.append(err)

    if all_errors:
        print(f"\n校验失败，共 {len(all_errors)} 个问题。")
        return 1

    print("\n全部校验通过。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
