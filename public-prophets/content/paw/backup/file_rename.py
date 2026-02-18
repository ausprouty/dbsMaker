#!/usr/bin/env python3

# cd ampp\htdocs\dbsMaker\public-prophets\content\paw
# python file_rename.py
import json
import re
from pathlib import Path

KEY_RE = re.compile(r"^[a-z0-9_]+$")

def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def main() -> None:
    folder = Path(__file__).resolve().parent / "core"

    if not folder.exists():
        raise SystemExit(f"Folder not found: {folder}")

    pages = []
    json_files = sorted([p for p in folder.glob("*.json") if p.name != "index.json"])

    for path in json_files:
        data = load_json(path)

        day = data.get("day")
        key = data.get("key")
        if day is None or key is None:
            raise SystemExit(f"Missing day/key in {path.name}")

        if not isinstance(day, int):
            raise SystemExit(f"'day' must be int in {path.name}")

        if not isinstance(key, str) or not KEY_RE.match(key):
            raise SystemExit(
                f"Bad key '{key}' in {path.name}. Use lowercase letters, digits, underscore."
            )

        new_name = f"{key}.json"
        new_path = folder / new_name

        # Rename if needed
        if path.name != new_name:
            if new_path.exists():
                # If it already exists but is literally the same file, skip.
                raise SystemExit(f"Cannot rename {path.name} -> {new_name}: target exists")
            path.rename(new_path)
            path = new_path

        title_en = None
        title = data.get("title")
        if isinstance(title, dict):
            title_en = title.get("en")

        pages.append(
            {
                "day": day,
                "key": key,
                "file": path.name,
                "title": {"en": title_en} if title_en else None,
                "version": data.get("version"),
                "updated_at": data.get("updated_at"),
            }
        )

    # Sort and clean
    pages.sort(key=lambda x: x["day"])
    for p in pages:
        if p["title"] is None:
            del p["title"]
        if p.get("version") is None:
            del p["version"]
        if p.get("updated_at") is None:
            del p["updated_at"]

    index = {
        "series": folder.name,
        "generated": True,
        "count": len(pages),
        "days": pages,
    }

    write_json(folder / "index.json", index)
    print(f"Renamed {len(json_files)} files and wrote {folder/'index.json'}")

if __name__ == "__main__":
    main()
