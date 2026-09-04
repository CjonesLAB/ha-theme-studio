"""Release contracts for local branding and complete HACS validation."""

from pathlib import Path
import struct

import pytest
import yaml


ROOT = Path(__file__).parents[1]


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
