"""Run behavioral save tests against the actual panel method."""
from pathlib import Path
import subprocess


def test_edits_survive_inflight_save() -> None:
    subprocess.run(
        ["node", str(Path(__file__).with_name("frontend-save-race.cjs"))],
        check=True, capture_output=True, text=True, timeout=20,
    )
