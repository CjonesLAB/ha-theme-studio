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


def test_active_design_is_announced_and_dashboard_editor_is_in_cards_section() -> None:
    """The loaded design is visible and direct editing belongs to card settings."""

    assert 'id="active-design-badge" class="active-design-badge" role="status" aria-live="polite"' in PANEL_SOURCE
    assert "_syncActiveDesignIndicator()" in PANEL_SOURCE
    assert "currentThemeIsThemeStudio" not in PANEL_SOURCE

    cards_section = PANEL_SOURCE.index("<summary>Karten</summary>")
    editor_launch = PANEL_SOURCE.index(
        "<strong>Einzelne Karte direkt bearbeiten</strong>",
        cards_section,
    )
    navigation_section = PANEL_SOURCE.index(
        "<summary>Navigation</summary>",
        editor_launch,
    )
    expert_section = PANEL_SOURCE.index(
        "Expertenmodus: eigenes Dashboard-CSS",
        navigation_section,
    )
    assert cards_section < editor_launch < navigation_section < expert_section


def test_advanced_rule_builder_is_collapsed_until_requested() -> None:
    """Rule management stays compact while advanced creation remains available."""

    assert 'id="expert-rule-create"' in PANEL_SOURCE
    assert 'aria-controls="expert-rule-builder"' in PANEL_SOURCE
    assert 'id="expert-rule-builder" class="expert-rule-builder" hidden' in PANEL_SOURCE
    assert "_setExpertRuleBuilderOpen(true)" in PANEL_SOURCE
    assert "_setExpertRuleBuilderOpen(false)" in PANEL_SOURCE
    assert "Kartenspezifische Regeln erstellst du am einfachsten" in PANEL_SOURCE


def test_dashboard_header_exposes_direct_card_mode() -> None:
    """The active Theme Studio dashboard offers a compact direct-editor shortcut."""

    effects_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert 'data-theme-studio-dashboard-toolbar' in effects_source
    assert 'aria-label="Kartenmodus starten"' in effects_source
    assert '<span class="icon" aria-hidden="true">✥</span>' in effects_source
    assert "right: 211px;" in effects_source
    assert "top: 3px;" in effects_source
    assert "_mountDashboardToolbarButton()" not in effects_source
    assert 'toolbar.insertBefore(host, firstAction);' not in effects_source
    assert '<span class="label">Kartenmodus</span>' not in effects_source
    assert "this._startDashboardEditor();" in effects_source
    assert "this.dashboardToolbarHost?.remove();" in effects_source
    assert "&& this._isDashboardPath()" in effects_source
    assert "&& this.dashboardToolbarExpertModeEnabled" in effects_source
    assert "this.dashboardToolbarExpertModeEnabled = requestedExpertCssEnabled;" in effects_source
    assert 'panel.component_name === "lovelace"' in effects_source
    assert "hass?.panels || {}" in effects_source
    assert 'path.startsWith("/dashboard-")' in effects_source


def test_dashboard_editor_panel_and_selected_card_are_draggable() -> None:
    """Pointer and keyboard controls can uncover cards and move the selection."""

    effects_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert 'class="card-move"' in effects_source
    assert 'aria-label="Karte frei verschieben"' in effects_source
    assert "_startDashboardEditorPanelDrag(event)" in effects_source
    assert "_moveDashboardEditorPanel(event)" in effects_source
    assert "_startDashboardEditorCardDrag(event)" in effects_source
    assert "_moveDashboardEditorCard(event)" in effects_source
    assert "_nudgeDashboardEditorCard(event)" in effects_source
    assert "setPointerCapture?.(event.pointerId)" in effects_source
    assert "event.shiftKey ? 10 : 1" in effects_source
    assert 'class="card-position-control" role="group" aria-label="Kartenposition"' in effects_source
    assert 'data-card-nudge="0,-1"' in effects_source
    assert 'data-card-nudge="-1,0"' in effects_source
    assert 'data-card-nudge="1,0"' in effects_source
    assert 'data-card-nudge="0,1"' in effects_source
    assert "_nudgeDashboardEditorCardBy(" in effects_source
    assert '<input data-field="offsetX" type="hidden">' in effects_source
    assert '<input data-field="offsetY" type="hidden">' in effects_source
    assert '_dashboardEditorNumberField("offsetX"' not in effects_source
    assert '_dashboardEditorNumberField("offsetY"' not in effects_source
    assert 'rule.width === null ? "revert"' not in effects_source
    assert 'placement.push(`width: ${rule.width}px !important;`);' in effects_source


def test_dashboard_editor_uses_stable_values_and_can_reset_one_card() -> None:
    """The compact card editor changes only touched values and supports reset."""

    effects_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert '_dashboardEditorNumberField("margin"' not in effects_source
    assert 'class="reset"' in effects_source
    assert "_resetDashboardEditorCard()" in effects_source
    assert "_dashboardEditorMeasuredValues()" in effects_source
    assert "this.dashboardEditorDirtyFields.has(field)" in effects_source
    assert 'margin: null,' in effects_source
    assert "--state-card-primary-font-size" in effects_source
    assert "Karte wurde auf ihre ursprüngliche Darstellung zurückgesetzt." in effects_source


def test_dashboard_editor_supports_ctrl_multi_selection() -> None:
    """Ctrl-click batches changes while keeping one rule per selected card."""

    effects_source = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert "event.ctrlKey || event.metaKey" in effects_source
    assert "_toggleDashboardEditorCard(card)" in effects_source
    assert "this.dashboardEditorSelectedCards.flatMap" in effects_source
    assert 'detailsOutput.textContent = "STRG + Klick fügt Karten hinzu oder entfernt sie"' in effects_source
    assert 'targetType: "card"' in effects_source
    assert 'savedRuleIds.set(entry.cardKey, savedRule.id)' in effects_source
    assert 'button.textContent = this.dashboardEditorSelectedCards.length > 1' in effects_source
    assert '"Auswahl zurücksetzen"' in effects_source

