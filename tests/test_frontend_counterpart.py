"""Regression checks for native independent-design creation."""
import shutil
import subprocess
from pathlib import Path

import pytest


def test_counterpart():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required")
    subprocess.run([node, str(Path(__file__).with_name("frontend-counterpart.cjs"))], check=True)
