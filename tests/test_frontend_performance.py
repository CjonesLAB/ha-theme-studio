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
EFFECTS_FILE = (
    Path(__file__).parents[1]
    / "custom_components"
    / "theme_studio"
    / "frontend"
    / "theme-studio-effects.js"
)


def _panel_source() -> str:
    """Return the complete frontend source."""

    return PANEL_FILE.read_text(encoding="utf-8")


def _effects_source() -> str:
    """Return the complete dashboard-effects source."""

    return EFFECTS_FILE.read_text(encoding="utf-8")


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


def test_effect_polling_pauses_in_hidden_tabs() -> None:
    """Dashboard effects stop polling while the page is not visible."""

    source = _effects_source()

    assert 'document.addEventListener(\n      "visibilitychange"' in source
    assert "this._stopPolling();" in source
    assert "this._startPolling();" in source


def test_card_lookup_uses_a_timed_index() -> None:
    """Entity card lookup does not walk the entire DOM every cycle."""

    source = _effects_source()

    assert "const CARD_INDEX_TTL = 30000;" in source
    assert "this._ensureCardIndex();" in source
    assert "this.cardIndex.get(entityId)" in source
