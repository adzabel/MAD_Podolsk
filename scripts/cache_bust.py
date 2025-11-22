#!/usr/bin/env python3
"""Apply additional cache-busting for static assets.

This script is now tailored for the Vite build output in ``dist``.
It appends a version suffix to built JS and CSS filenames and updates
references in ``index.html`` and in JS imports so that users always
receive the latest version.
"""
from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    # For the Vite build we operate directly on ``dist``
    dist_dir = project_root / "dist"

    version = (os.environ.get("CACHE_BUSTER") or os.environ.get("GITHUB_SHA") or "").strip()
    if not version:
        version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    version = version[:12]

    if not dist_dir.exists():
        raise SystemExit(f"dist directory not found at {dist_dir!s}. Run the Vite build first.")

    assets_dir = dist_dir / "assets"
    if not assets_dir.exists():
        # Vite normally outputs assets into ``dist/assets``; bail out loudly if not.
        raise SystemExit(f"assets directory not found at {assets_dir!s}.")

    # Build mappings for all top-level JS/CSS files inside ``assets``
    js_mapping: dict[str, str] = {}
    css_mapping: dict[str, str] = {}

    for path in assets_dir.glob("*.js"):
        js_mapping[path.name] = f"{path.stem}.{version}{path.suffix}"

    for path in assets_dir.glob("*.css"):
        css_mapping[path.name] = f"{path.stem}.{version}{path.suffix}"

    # Update index.html references
    index_path = dist_dir / "index.html"
    index_content = index_path.read_text(encoding="utf-8")
    for original, versioned in css_mapping.items():
        index_content = index_content.replace(f"assets/{original}", f"assets/{versioned}")
    for original, versioned in js_mapping.items():
        index_content = index_content.replace(f"assets/{original}", f"assets/{versioned}")
    index_path.write_text(index_content, encoding="utf-8")

    # Rename CSS/JS files and update JS imports inside them.
    # We do this in two passes: first compute mappings, then mutate.
    for src_path in list(assets_dir.glob("*.css")) + list(assets_dir.glob("*.js")):
        original_name = src_path.name
        if original_name in css_mapping:
            new_name = css_mapping[original_name]
        elif original_name in js_mapping:
            new_name = js_mapping[original_name]
        else:
            continue

        content = src_path.read_text(encoding="utf-8")
        # Update relative imports like "./index-xxxxx.js" inside JS files
        for js_original, js_versioned in js_mapping.items():
            content = content.replace(f"./{js_original}", f"./{js_versioned}")

        target_path = src_path.with_name(new_name)
        target_path.write_text(content, encoding="utf-8")

        if target_path != src_path:
            src_path.unlink()

    print(f"Applied cache-busting to assets in {dist_dir} using version {version}")


if __name__ == "__main__":
    main()
