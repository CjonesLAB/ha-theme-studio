"""Static performance contracts for the Theme Studio frontend."""

from __future__ import annotations

from pathlib import Path


PANEL_FILE = (
    Path(__file__).parents[1]
    / "custom_components"
    / "theme_studio"
    / "frontend"
    / "theme-studio-panel.js"
)


def _panel_source() -> str:
    """Return the complete frontend source."""

    return PANEL_FILE.read_text(encoding="utf-8")


def test_entity_picker_reuses_dom_collections() -> None:
    """Large entity lists are collected once instead of per interaction."""

    source = _panel_source()

    assert "const checkboxes = Array.from(" in source
    assert "const choices = Array.from(" in source
    assert "const selected = checkboxes.filter(" in source
    assert "choices.forEach((choice) =>" in source


def test_entity_search_coalesces_rapid_input() -> None:
    """Rapid search input produces at most one filter pass per frame."""

    source = _panel_source()

    assert "let pendingFilterFrame = 0;" in source
    assert "cancelAnimationFrame(pendingFilterFrame);" in source
    assert "pendingFilterFrame = requestAnimationFrame(() =>" in source
