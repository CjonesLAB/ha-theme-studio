"""Regression checks for user-scoped appearance switching."""
from pathlib import Path
import shutil
import subprocess
import pytest


def test_appearance_behavior():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js required for frontend behavior test")
    subprocess.run([node, str(Path(__file__).with_name("frontend-appearance.cjs"))], check=True)
