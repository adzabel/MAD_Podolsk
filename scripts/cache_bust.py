#!/usr/bin/env python3
"""Generate cache-busted static assets for deployment.

Copies files from ``docs`` into ``docs-build`` while appending a version
suffix to JS and CSS filenames and updating references in HTML and module
imports.
"""
from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    source_dir = project_root / "docs"
    build_dir = project_root / "docs-build"

    version = (os.environ.get("CACHE_BUSTER") or os.environ.get("GITHUB_SHA") or "").strip()
    if not version:
        version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    version = version[:12]

    if build_dir.exists():
        shutil.rmtree(build_dir)
    (build_dir / "js").mkdir(parents=True, exist_ok=True)
    (build_dir / "css").mkdir(parents=True, exist_ok=True)

    js_mapping = {
        path.name: f"{path.stem}.{version}{path.suffix}"
        for path in (source_dir / "js").glob("*.js")
    }
    css_mapping = {
        path.name: f"{path.stem}.{version}{path.suffix}"
        for path in (source_dir / "css").glob("*.css")
    }

    index_content = (source_dir / "index.html").read_text(encoding="utf-8")
    for original, versioned in css_mapping.items():
        index_content = index_content.replace(f"css/{original}", f"css/{versioned}")
    for original, versioned in js_mapping.items():
        index_content = index_content.replace(f"js/{original}", f"js/{versioned}")
    (build_dir / "index.html").write_text(index_content, encoding="utf-8")

    for original, versioned in css_mapping.items():
        content = (source_dir / "css" / original).read_text(encoding="utf-8")
        (build_dir / "css" / versioned).write_text(content, encoding="utf-8")

    for src_path in (source_dir / "js").glob("*.js"):
        content = src_path.read_text(encoding="utf-8")
        for original, versioned in js_mapping.items():
            content = content.replace(f"./{original}", f"./{versioned}")
        destination = build_dir / "js" / js_mapping[src_path.name]
        destination.write_text(content, encoding="utf-8")

    print(f"Created cache-busted assets in {build_dir} using version {version}")


if __name__ == "__main__":
    main()
