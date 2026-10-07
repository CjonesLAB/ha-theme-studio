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


def test_visual_expert_rule_actions_have_accessible_names() -> None:
    """Icon-only expert-rule controls remain understandable without sight."""

    assert 'aria-label="${rule.enabled ? "Regel deaktivieren" : "Regel aktivieren"}"' in PANEL_SOURCE
    assert 'aria-label="Regel bearbeiten"' in PANEL_SOURCE
    assert 'aria-label="Regel duplizieren"' in PANEL_SOURCE
    assert 'aria-label="Regel löschen"' in PANEL_SOURCE


def test_active_design_is_announced_without_retired_dashboard_editor() -> None:
    """The loaded design remains visible after retiring direct card editing."""

    assert 'id="active-design-badge" class="active-design-badge" role="status" aria-live="polite"' in PANEL_SOURCE
    assert "_syncActiveDesignIndicator()" in PANEL_SOURCE
    assert "currentThemeIsThemeStudio" not in PANEL_SOURCE

    assert "Einzelne Karte direkt bearbeiten" not in PANEL_SOURCE
    assert 'id="expert-dashboard-editor-button"' not in PANEL_SOURCE
    assert "_openDashboardEditor()" not in PANEL_SOURCE


def test_advanced_rule_builder_is_collapsed_until_requested() -> None:
    """Rule management stays compact while advanced creation remains available."""

    assert 'id="expert-rule-create"' in PANEL_SOURCE
    assert 'aria-controls="expert-rule-builder"' in PANEL_SOURCE
    assert 'id="expert-rule-builder" class="expert-rule-builder" hidden' in PANEL_SOURCE
    assert "_setExpertRuleBuilderOpen(true)" in PANEL_SOURCE
    assert "_setExpertRuleBuilderOpen(false)" in PANEL_SOURCE
    assert "Die Kartenposition wird ausschließlich im Home-Assistant-Dashboard bearbeitet." in PANEL_SOURCE


def test_direct_card_mode_is_retired_without_deleting_legacy_rules() -> None:
    """Version 0.8.3 no longer exposes or restores the direct movement mode."""

    effects_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert "const DIRECT_CARD_EDITOR_ENABLED = false;" in effects_source
    assert "if (DIRECT_CARD_EDITOR_ENABLED) {\n      this._createDashboardToolbarButton();" in effects_source
    assert "if (DIRECT_CARD_EDITOR_ENABLED) {\n      document.addEventListener(" in effects_source
    assert "return DIRECT_CARD_EDITOR_ENABLED" in effects_source
    assert "window.sessionStorage.removeItem(DASHBOARD_EDITOR_STORAGE_KEY);" in effects_source
    assert "if (!DIRECT_CARD_EDITOR_ENABLED) {\n      this._stopDashboardEditor(false);" in effects_source

    assert 'id="expert-dashboard-editor-button"' not in PANEL_SOURCE
    assert "_openDashboardEditor()" not in PANEL_SOURCE
    assert '_expertRuleNumberField("offset-x"' not in PANEL_SOURCE
    assert '_expertRuleNumberField("offset-y"' not in PANEL_SOURCE


def test_legacy_position_rules_can_be_disabled_without_losing_style_values() -> None:
    """The transition control clears only X/Y offsets and keeps all other fields."""

    assert 'id="legacy-position-notice"' in PANEL_SOURCE
    assert 'id="legacy-position-disable"' in PANEL_SOURCE
    assert "_syncLegacyPositionNotice()" in PANEL_SOURCE
    assert "_disableLegacyPositionRules()" in PANEL_SOURCE
    assert "rule.offsetX = null;" in PANEL_SOURCE
    assert "rule.offsetY = null;" in PANEL_SOURCE
    assert "rule.width = null;" not in PANEL_SOURCE
    assert "rule.padding = null;" not in PANEL_SOURCE
    assert "offsetX: existingRule?.offsetX ?? null" in PANEL_SOURCE
    assert "offsetY: existingRule?.offsetY ?? null" in PANEL_SOURCE
    assert "name: `${rule.name} Kopie`.slice(0, 48),\n        offsetX: null,\n        offsetY: null," in PANEL_SOURCE


def test_css_example_library_is_searchable_safe_and_keyboard_accessible() -> None:
    """The library previews trusted snippets without silently applying them."""

    panel_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-panel.js"
    ).read_text(encoding="utf-8")

    insert_start = panel_source.index("  _insertCssLibraryExample(example, button) {")
    insert_end = panel_source.index("\n  _openImportPreview()", insert_start)
    insert_source = panel_source[insert_start:insert_end]

    assert "const CSS_LIBRARY_EXAMPLES = [" in panel_source
    assert 'id="css-library-overlay"' in panel_source
    assert 'aria-labelledby="css-library-title"' in panel_source
    assert 'id="css-library-search"' in panel_source
    assert 'id="css-library-category"' in panel_source
    assert 'data-css-library-action="copy"' in panel_source
    assert 'data-css-library-action="insert"' in panel_source
    assert "event.key === \"Escape\"" in panel_source
    assert "this.cssLibraryReturnFocus?.focus?.();" in panel_source
    assert 'support: "Offizielles Home-Assistant-Theme"' in panel_source
    assert 'insertable: false' in panel_source
    assert 'support: "Theme Studio getestet"' in panel_source
    assert panel_source.count("\n    id: \"") >= 32
    assert 'id: "full-width-card"' in panel_source
    assert 'id: "hide-entity-card"' in panel_source
    assert 'id: "pulse-card"' in panel_source
    assert 'id: "light-dark-modes"' in panel_source
    assert 'support: "Experimentell"' in panel_source
    assert 'this.settings.effects.expertCssEnabled = true;' in insert_source
    assert 'currentCss.includes(example.code.trim())' in insert_source
    assert "this._saveAndApplySettings" not in insert_source
    assert "Zum Aktivieren „Design anwenden“ wählen." in insert_source

