#!/usr/bin/env python3
"""
Find all i18n keys that start with "interface." in a Vue 3 project.

Scans src/ for .vue/.js/.ts/.jsx/.tsx/.json/.html/.md files, extracts keys like:
  interface.something
  interface.something.more

Deduplicates, sorts, and writes to:
  interface_keys.txt  (default)
From root:
  python scripts/find_interface_keys.py --src src --out interface_keys.txt
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import Iterable, Set


DEFAULT_EXTS = {
  ".vue", ".js", ".ts", ".jsx", ".tsx",
  ".json", ".html", ".md"
}

DEFAULT_SKIP_DIRS = {
  "node_modules", "dist", "build", ".git",
  ".quasar", ".vscode", ".idea", "coverage"
}


def iter_files(root: Path,
               exts: Set[str],
               skip_dirs: Set[str]) -> Iterable[Path]:
  for dirpath, dirnames, filenames in os.walk(root):
    # prune directories we do not want to visit
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]

    for name in filenames:
      p = Path(dirpath) / name
      if p.suffix.lower() in exts:
        yield p


def extract_interface_keys(text: str) -> Set[str]:
  """
  Match interface keys like:
    interface.foo
    interface.foo_bar
    interface.foo-bar
    interface.foo.bar
    interface.foo1.bar2
  Stops at first character that is not [A-Za-z0-9_.-]
  """
  pattern = re.compile(r"\binterface\.[A-Za-z0-9_.-]+")
  return set(pattern.findall(text))


def main() -> int:
  ap = argparse.ArgumentParser()
  ap.add_argument(
    "--src",
    default="src",
    help="Path to src directory (default: src)"
  )
  ap.add_argument(
    "--out",
    default="interface_keys.txt",
    help="Output file (default: interface_keys.txt)"
  )
  ap.add_argument(
    "--ext",
    action="append",
    help=("File extension to include (repeatable). "
          "Default includes .vue .js .ts .jsx .tsx .json .html .md")
  )
  ap.add_argument(
    "--skip",
    action="append",
    help=("Directory name to skip (repeatable). "
          "Default skips node_modules, dist, build, .git, .quasar, etc.")
  )
  args = ap.parse_args()

  src_dir = Path(args.src).resolve()
  if not src_dir.exists() or not src_dir.is_dir():
    raise SystemExit(f"src directory not found: {src_dir}")

  exts = set(e.lower() for e in (args.ext or [])) or set(DEFAULT_EXTS)
  # normalize extensions to start with "."
  exts = set(e if e.startswith(".") else "." + e for e in exts)

  skip_dirs = set(args.skip or []) or set(DEFAULT_SKIP_DIRS)

  found: Set[str] = set()
  scanned = 0

  for fp in iter_files(src_dir, exts, skip_dirs):
    scanned += 1
    try:
      text = fp.read_text(encoding="utf-8", errors="ignore")
    except Exception:
      continue

    found |= extract_interface_keys(text)

  keys = sorted(found, key=str.lower)

  out_path = Path(args.out).resolve()
  out_path.write_text("\n".join(keys) + ("\n" if keys else ""),
                      encoding="utf-8")

  print(f"Scanned files: {scanned}")
  print(f"Unique interface.* keys: {len(keys)}")
  print(f"Wrote: {out_path}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
