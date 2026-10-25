"""Tests for the intentionally scoped release version helper."""

import subprocess
import sys
from pathlib import Path

from scripts import set_version

ROOT = Path(__file__).parents[1]


def test_release_version_helper_matches_repository() -> None:
    """The checked-in current-version references must agree with manifest.json."""

    result = subprocess.run(
        [sys.executable, "scripts/set_version.py", "--check"],
        cwd=ROOT,
        capture_output=True,
        check=False,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_historical_release_notes_are_not_rewritten() -> None:
    """A future version bump must preserve old release documentation."""

    assert all(
        "docs/releases" not in path.as_posix()
        for path in set_version.CURRENT_VERSION_FILES
    )
    sample = (
        "> Current version: **0.10.2**\n"
        + "\n" * 12
        + "### 0.10.2: historical milestone\n"
    )
    updated = set_version.replace_document_header(sample, "0.10.2", "0.10.3")
    assert "Current version: **0.10.3**" in updated
    assert "### 0.10.2: historical milestone" in updated


def test_version_validation_rejects_unsafe_values() -> None:
    """Only release-like values can be inserted into source files."""

    assert set_version.validate_version("0.10.3") == "0.10.3"
    try:
        set_version.validate_version("0.10.3\nmalicious")
    except ValueError:
        pass
    else:
        raise AssertionError("invalid version was accepted")
