#!/usr/bin/env python3
"""
Scan TypeScript/TSX imports and report where each file is used.

Highlights files imported from multiple routes — candidates for promotion
to src/components/ (global).

Usage:
    python scripts/check-file-usage.py
    python scripts/check-file-usage.py --promote   # only cross-route files
    python scripts/check-file-usage.py --file src/routes/company/[cik]/index.ts
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

IMPORT_RE = re.compile(
    r"""import\s+(?:type\s+)?(?:[\w*\s{},]+\s+from\s+)?['"]([^'"]+)['"]"""
)
REQUIRE_RE = re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""")
EXPORT_FROM_RE = re.compile(
    r"""export\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]"""
)

ROUTE_MAP = {
    "home": "/",
    "search": "/search",
    "company": "/company/[cik]",
}


def resolve_ts_path(import_path: str, from_file: Path) -> Path | None:
    """Resolve @/ alias and relative imports to a file under src/."""
    if import_path.startswith("@/"):
        candidate = SRC / import_path[2:]
    elif import_path.startswith("."):
        candidate = (from_file.parent / import_path).resolve()
    else:
        return None  # node_modules or bare specifier

    if candidate.is_file():
        return candidate

    for ext in (".tsx", ".ts", ".jsx", ".js"):
        if candidate.with_suffix(ext).is_file():
            return candidate.with_suffix(ext)

    if candidate.is_dir():
        for name in ("index.ts", "index.tsx"):
            index = candidate / name
            if index.is_file():
                return index

    return None


def owning_route(file_path: Path) -> str | None:
    """Return the route key for a file, or None for global/lib/app."""
    rel = file_path.relative_to(SRC).as_posix()

    if rel.startswith("components/"):
        return "global:components"
    if rel.startswith("lib/"):
        return "global:lib"
    if rel.startswith("app/"):
        return "global:app"

    if rel.startswith("routes/"):
        parts = rel.split("/")
        if len(parts) >= 2:
            route_name = parts[1]
            return ROUTE_MAP.get(route_name, f"routes/{route_name}")
        return "routes"

    return None


def collect_imports(file_path: Path) -> set[Path]:
    text = file_path.read_text(encoding="utf-8")
    raw: set[str] = set()
    for pattern in (IMPORT_RE, REQUIRE_RE, EXPORT_FROM_RE):
        raw.update(pattern.findall(text))

    resolved: set[Path] = set()
    for imp in raw:
        target = resolve_ts_path(imp, file_path)
        if target and target.is_relative_to(SRC):
            resolved.add(target)
    return resolved


def scan_sources() -> tuple[list[Path], dict[Path, set[Path]]]:
    files = sorted(SRC.rglob("*"))
    source_files = [
        f
        for f in files
        if f.suffix in {".ts", ".tsx"}
        and "node_modules" not in f.parts
    ]

    importers: dict[Path, set[Path]] = defaultdict(set)
    for source in source_files:
        for target in collect_imports(source):
            importers[target].add(source)

    return source_files, importers


def format_importers(importers: set[Path]) -> str:
    lines = []
    for imp in sorted(importers):
        rel = imp.relative_to(ROOT).as_posix()
        route = owning_route(imp)
        tag = f" [{route}]" if route else ""
        lines.append(f"    - {rel}{tag}")
    return "\n".join(lines)


def routes_using(file_path: Path, importers: set[Path]) -> set[str]:
    routes: set[str] = set()
    for imp in importers:
        route = owning_route(imp)
        if route:
            routes.add(route)
    return routes


def main() -> int:
    parser = argparse.ArgumentParser(description="Report file usage across routes.")
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Only show files imported from 2+ distinct routes (promotion candidates).",
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Show importers for a single file (path relative to repo root or src/).",
    )
    args = parser.parse_args()

    _, importers = scan_sources()

    if args.file:
        target = Path(args.file)
        if not target.is_absolute():
            if not str(target).startswith("src/"):
                target = SRC / target
            else:
                target = ROOT / target
        for ext in ("", ".tsx", ".ts"):
            candidate = Path(str(target) + ext) if ext else target
            if candidate.is_file():
                target = candidate
                break

        if not target.is_file():
            print(f"File not found: {args.file}", file=sys.stderr)
            return 1

        users = importers.get(target, set())
        print(f"{target.relative_to(ROOT).as_posix()}")
        print(f"  imported by {len(users)} file(s):")
        print(format_importers(users) if users else "    (none)")
        print(f"  routes: {', '.join(sorted(routes_using(target, users))) or '(none)'}")
        return 0

    entries = sorted(importers.items(), key=lambda kv: kv[0].as_posix())

    print("File usage report\n" + "=" * 60)

    promotion_candidates = 0
    for target, users in entries:
        user_routes = routes_using(target, users)
        is_cross_route = len(user_routes - {"global:app", "global:lib", "global:components"}) > 1

        if args.promote and not is_cross_route:
            continue

        rel = target.relative_to(ROOT).as_posix()
        owner = owning_route(target)
        print(f"\n{rel}")
        if owner:
            print(f"  owner: {owner}")
        print(f"  imported by {len(users)} file(s) from routes: {', '.join(sorted(user_routes)) or '(none)'}")
        if is_cross_route:
            promotion_candidates += 1
            print("  ⚠ PROMOTE to src/components/ — used across multiple routes")
        if users:
            print(format_importers(users))

    if args.promote:
        print(f"\n{'=' * 60}\n{promotion_candidates} promotion candidate(s)")
    else:
        unused = [
            f for f in SRC.rglob("*")
            if f.suffix in {".ts", ".tsx"}
            and f not in importers
            and f.name != "layout.tsx"
            and not f.name.endswith(".d.ts")
        ]
        if unused:
            print(f"\n{'=' * 60}\nPotentially unused ({len(unused)}):")
            for f in sorted(unused):
                print(f"  - {f.relative_to(ROOT).as_posix()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
