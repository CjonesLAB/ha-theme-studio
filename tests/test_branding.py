"""Release contracts for local branding and complete HACS validation."""

import json
from pathlib import Path
import re
import struct

import pytest
import yaml


ROOT = Path(__file__).parents[1]
RELEASE_VERSION = "0.6.3"


@pytest.mark.parametrize("filename,size", [("icon.png", 256), ("icon@2x.png", 512)])
def test_brand_icons_have_expected_png_dimensions(filename: str, size: int) -> None:
    """Keep both standard and high-resolution icons in the integration package."""
    data = (ROOT / "custom_components/theme_studio/brand" / filename).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert data[12:16] == b"IHDR"
    assert struct.unpack(">II", data[16:24]) == (size, size)


def test_hacs_validation_has_no_ignored_checks() -> None:
    """Catalog submissions require HACS validation without skipped checks."""
    workflow = yaml.safe_load(
        (ROOT / ".github/workflows/validate.yml").read_text(encoding="utf-8")
    )
    steps = workflow["jobs"]["validate-hacs"]["steps"]
    validations = [step for step in steps if step.get("uses", "").startswith("hacs/action@")]
    assert validations
    for step in validations:
        assert step["with"]["category"] == "integration"
        assert not step["with"].get("ignore")


def test_release_version_and_frontend_cache_are_consistent() -> None:
    """Keep release metadata, documentation, and frontend imports aligned."""

    integration = ROOT / "custom_components/theme_studio"
    manifest = json.loads((integration / "manifest.json").read_text(encoding="utf-8"))
    constants = (integration / "const.py").read_text(encoding="utf-8")
    panel = (integration / "frontend/theme-studio-panel.js").read_text(encoding="utf-8")
    effects = (integration / "frontend/theme-studio-effects.js").read_text(encoding="utf-8")

    assert manifest["version"] == RELEASE_VERSION
    assert re.search(rf'^VERSION = "{re.escape(RELEASE_VERSION)}"$', constants, re.MULTILINE)
    assert re.search(rf'^FRONTEND_REVISION = "{re.escape(RELEASE_VERSION)}"$', constants, re.MULTILINE)
    assert f'theme-studio-locales.js?v={RELEASE_VERSION}' in panel
    assert f'theme-studio-effects.js?v={RELEASE_VERSION}' in panel
    assert f'THEME_STUDIO_EFFECTS_VERSION = "{RELEASE_VERSION}"' in effects

    for readme in (
        ROOT / "README.md",
        ROOT / "docs/README.de.md",
        ROOT / "docs/README.fr.md",
        ROOT / "docs/README.es.md",
    ):
        content = readme.read_text(encoding="utf-8")
        assert RELEASE_VERSION in content
        assert f"theme-studio-effects.js?v={RELEASE_VERSION}" in content
        assert "fine-settings-cards-tech-frame-v063.png" in content
