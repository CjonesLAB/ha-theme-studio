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


def test_profile_save_reminder_respects_reduced_motion() -> None:
    """Unsaved profile changes get a visible, motion-safe reminder."""

    assert "#profile-save-button.profile-save-reminder:not(:disabled)" in PANEL_SOURCE
    assert "@keyframes profile-save-reminder" in PANEL_SOURCE
    assert "@media (prefers-reduced-motion: reduce)" in PANEL_SOURCE
    assert 'saveButton.dataset.profileNeedsSave = String(needsSave)' in PANEL_SOURCE
    assert 'saveButton.classList.add("profile-save-reminder")' in PANEL_SOURCE
    assert '"Änderungen im Profil speichern"' in PANEL_SOURCE


def test_profile_save_success_pulses_once() -> None:
    """A completed profile save receives one green confirmation pulse."""

    assert "#profile-save-button.profile-save-success:not(:disabled)" in PANEL_SOURCE
    assert "@keyframes profile-save-success" in PANEL_SOURCE
    assert "animation: profile-save-success 680ms ease-in-out 1" in PANEL_SOURCE
    assert "0 0 0 5px #43a047" in PANEL_SOURCE
    assert "this._showProfileSaveSuccess();" in PANEL_SOURCE

