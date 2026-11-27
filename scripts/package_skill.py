#!/usr/bin/env python3
"""打包 path-ui 运行时文件为标准的 path-ui.skill 安装包（ZIP 格式）。

默认输出到 dist/path-ui.skill，顶层目录固定为 path-ui/，排除评测、归档源码与仓库元文件：
- 包含：SKILL.md、LICENSE、agents/openai.yaml、references/、assets/path-kit/、scripts/
- 排除：.git/、.github/、evals/、vendor-skills/、docs/、dist/、README.md、CHANGELOG.md、.gitignore、__pycache__/
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SKILL_NAME = "path-ui"

INCLUDE_FILES = [
    "SKILL.md",
    "LICENSE",
    "agents/openai.yaml",
]

INCLUDE_DIRS = [
    "references",
    "assets/path-kit",
    "scripts",
]

SKIP_NAMES = {"__pycache__", ".DS_Store"}
SKIP_SUFFIXES = {".pyc", ".pyo", ".skill"}


def collect_runtime_files(root: Path = ROOT) -> list[Path]:
    """收集所有应当打入 path-ui.skill 的运行时文件路径（相对于 root）。"""
    files: list[Path] = []
    for rel in INCLUDE_FILES:
        path = root / rel
        if not path.is_file():
            raise FileNotFoundError(f"缺少必要文件: {rel}")
        files.append(Path(rel))

    for rel_dir in INCLUDE_DIRS:
        base = root / rel_dir
        if not base.is_dir():
            raise FileNotFoundError(f"缺少必要目录: {rel_dir}")
        for item in sorted(base.rglob("*")):
            if not item.is_file():
                continue
            rel = item.relative_to(root)
            if any(part in SKIP_NAMES for part in rel.parts):
                continue
            if item.suffix in SKIP_SUFFIXES:
                continue
            files.append(rel)

    # 去重并保持稳定排序
    return sorted(set(files), key=lambda p: p.as_posix())


def package_skill(output_path: Path, root: Path = ROOT) -> dict[str, object]:
    """生成确定性的 .skill zip 包并返回校验摘要。"""
    files = collect_runtime_files(root)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for rel in files:
            src = root / rel
            arcname = f"{SKILL_NAME}/{rel.as_posix()}"
            info = zipfile.ZipInfo(arcname, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            mode = 0o755 if (src.stat().st_mode & 0o111) else 0o644
            info.external_attr = (0o100000 | mode) << 16
            zf.writestr(info, src.read_bytes())

    data = output_path.read_bytes()
    return {
        "output": str(output_path),
        "files": len(files),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="将 path-ui 打包为可分发安装包 (.skill)")
    parser.add_argument(
        "-o",
        "--output",
        default=str(ROOT / "dist" / f"{SKILL_NAME}.skill"),
        help="输出路径（默认 dist/path-ui.skill）",
    )
    args = parser.parse_args()
    result = package_skill(Path(args.output).resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
