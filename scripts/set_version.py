"""Keep Theme Studio release metadata and cache revisions in sync."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$")

DOCUMENTATION_VERSION_FILES = (
    Path("README.md"),
    Path("docs/README.de.md"),
    Path("docs/README.es.md"),
    Path("docs/README.fr.md"),
    Path("docs/guides/BENUTZERHANDBUCH.de.md"),
    Path("docs/guides/GUIA_USUARIO.es.md"),
    Path("docs/guides/GUIDE_UTILISATEUR.fr.md"),
    Path("docs/guides/USER_GUIDE.en.md"),
)
SOURCE_VERSION_FILES = (
    Path("custom_components/theme_studio/const.py"),
    Path("custom_components/theme_studio/frontend/theme-studio-panel.js"),
    Path("custom_components/theme_studio/frontend/theme-studio-effects.js"),
    Path("custom_components/theme_studio/frontend/theme-studio-clock-card.js"),
    Path("tests/test_branding.py"),
    Path("tests/test_frontend_performance.py"),
    Path("tests/test_settings.py"),
)
CURRENT_VERSION_FILES = DOCUMENTATION_VERSION_FILES + SOURCE_VERSION_FILES


def manifest_version() -> str:
    """Return the version currently declared in the integration manifest."""

    manifest = json.loads(
        (ROOT / "custom_components/theme_studio/manifest.json").read_text(
            encoding="utf-8"
        )
    )
    return str(manifest["version"])


def validate_version(version: str) -> str:
    """Reject malformed versions before touching any release file."""

    if not VERSION_PATTERN.fullmatch(version):
        raise ValueError(f"Ungültige Version: {version}")
    return version


def replace_document_header(source: str, old: str, new: str) -> str:
    """Change only the current-version header, never historical release text."""

    lines = source.splitlines(keepends=True)
    lines[:12] = [line.replace(old, new) for line in lines[:12]]
    return "".join(lines)


def changed_files(old: str, new: str, *, write: bool) -> list[Path]:
    """Replace the current release version in deliberately scoped files."""

    changed: list[Path] = []
    for relative_path in CURRENT_VERSION_FILES:
        path = ROOT / relative_path
        source = path.read_text(encoding="utf-8")
        if relative_path in DOCUMENTATION_VERSION_FILES:
            updated = replace_document_header(source, old, new)
        else:
            updated = source.replace(old, new)
        if source == updated:
            continue
        changed.append(relative_path)
        if write:
            path.write_text(updated, encoding="utf-8", newline="\n")

    manifest_path = ROOT / "custom_components/theme_studio/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("version") != new:
        changed.append(manifest_path.relative_to(ROOT))
        if write:
            manifest["version"] = new
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
                newline="\n",
            )
    return changed


def inconsistent_files(expected: str) -> list[Path]:
    """Find current-version files that do not match the manifest."""

    inconsistent: list[Path] = []
    for relative_path in CURRENT_VERSION_FILES:
        source = (ROOT / relative_path).read_text(encoding="utf-8")
        if relative_path in DOCUMENTATION_VERSION_FILES:
            source = "".join(source.splitlines(keepends=True)[:12])
        if expected not in source:
            inconsistent.append(relative_path)
    return inconsistent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version", nargs="?", help="Neue Version, z. B. 0.10.3")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Nur prüfen, ob alle aktuellen Versionsstellen zusammenpassen.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Geplante Änderungen anzeigen, aber nicht schreiben.",
    )
    args = parser.parse_args()

    current = validate_version(manifest_version())
    if args.check:
        inconsistent = inconsistent_files(current)
        if inconsistent:
            for path in inconsistent:
                print(f"abweichend: {path}")
            return 1
        print(f"Alle aktuellen Versionsstellen verwenden {current}.")
        return 0

    if not args.version:
        parser.error("version fehlt (oder --check verwenden)")
    target = validate_version(args.version)
    changed = changed_files(current, target, write=not args.dry_run)
    action = "würde ändern" if args.dry_run else "geändert"
    for path in changed:
        print(f"{action}: {path}")
    if not changed:
        print(f"Keine Änderung nötig; Version ist bereits {target}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
