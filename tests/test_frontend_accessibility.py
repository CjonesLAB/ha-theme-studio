"""Accessibility contract tests for the Theme Studio frontend."""

from pathlib import Path


PANEL_SOURCE = (
    Path(__file__).parents[1]
    / "custom_components"
    / "theme_studio"
    / "frontend"
    / "theme-studio-panel.js"
).read_text(encoding="utf-8")


def test_frontend_exposes_accessible_states_and_status_messages() -> None:
    """Interactive state and feedback remain available to assistive tools."""

    assert 'aria-live="polite"' in PANEL_SOURCE
    assert 'aria-modal="true"' in PANEL_SOURCE
    assert 'aria-describedby="import-preview-subtitle"' in PANEL_SOURCE
    assert 'button.setAttribute("aria-pressed", String(active))' in PANEL_SOURCE
    assert ':focus-visible' in PANEL_SOURCE


def test_import_dialog_supports_keyboard_navigation() -> None:
    """The import confirmation dialog can be operated without a pointer."""

    assert '_handleImportPreviewKeydown(event)' in PANEL_SOURCE
    assert 'event.key === "Escape"' in PANEL_SOURCE
    assert 'event.key !== "Tab"' in PANEL_SOURCE
    assert 'returnFocus.focus()' in PANEL_SOURCE


def test_file_inputs_remain_keyboard_focusable() -> None:
    """Visually hidden upload fields must not use display none."""

    hidden_input_rule = PANEL_SOURCE.split(
        ".profile-import-label input,",
        maxsplit=1,
    )[1].split("}", maxsplit=1)[0]

    assert "position: absolute" in hidden_input_rule
    assert "display: none" not in hidden_input_rule

