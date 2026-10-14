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


def test_space_command_has_no_grid_layer() -> None:
    """Space Command renders stars and light accents without a grid."""

    effects_source = _effects_source()
    panel_source = _panel_source()

    assert "this._drawGrid(context);" not in effects_source
    assert "_drawGrid(context)" not in effects_source
    assert "Sternenfeld, Raster und Lichtakzente" not in panel_source
    assert "rgba(80, 225, 255, 0.08) 24px" not in panel_source
    assert "rgba(80, 225, 255, 0.07) 64px" not in panel_source


def test_liquid_glass_has_a_safe_progressive_enhancement() -> None:
    """Liquid Glass uses native CSS support and restores original styles."""

    effects_source = _effects_source()
    panel_source = _panel_source()

    assert 'CSS.supports("backdrop-filter", "blur(1px)")' in effects_source
    assert 'CSS.supports("-webkit-backdrop-filter", "blur(1px)")' in effects_source
    assert "_restoreLiquidGlassCard(card)" in effects_source
    assert "this._syncLiquidGlassCards();" in effects_source
    assert "const GLASS_SCAN_INTERVAL = 3000;" in effects_source
    assert "now - this.glassLastScan < GLASS_SCAN_INTERVAL" in effects_source
    assert 'data-card-preset="glass"' in panel_source
    assert '"--preview-backdrop-filter"' in panel_source


def test_liquid_glass_hides_conflicting_material_controls() -> None:
    """Glass only presents the controls that remain relevant."""

    panel_source = _panel_source()

    assert "_applyLiquidGlassMaterial()" in panel_source
    assert '"card-opacity"' in panel_source
    assert '"glass-transparency"' in panel_source
    assert '"card-border-width"' in panel_source
    assert '"card-shadow"' in panel_source
    assert "borderRadius: 26" in panel_source
    assert "Math.max(8, Number(this.profile.glassBlur)" not in panel_source
    assert 'id="card-material-controls"' in panel_source
    assert 'getElementById("card-material-controls").hidden' in panel_source
    assert 'settingName === "glassTransparency"' in panel_source


def test_card_presets_are_no_code_and_contextual() -> None:
    """Three native presets expose only controls relevant to their style."""

    panel_source = _panel_source()

    for preset in ("standard", "glass", "technical"):
        assert f'data-card-preset="{preset}"' in panel_source

    assert 'data-card-preset="soft"' not in panel_source

    assert "_cardPresetValues(preset)" in panel_source
    assert "_applyCardPreset(selectedPreset)" in panel_source
    assert 'cardShape: "standard"' in panel_source
    assert 'cardShape: "tech-frame"' in panel_source
    assert "borderRadius: 26" in panel_source
    assert 'getElementById("glass-controls").hidden' in panel_source
    assert 'getElementById("tech-frame-controls").hidden' in panel_source
    assert 'getElementById("card-material-controls").hidden' in panel_source
    assert 'getElementById("effect-controls")' in panel_source
    assert 'getElementById("card-effect-controls")' in panel_source


def test_runtime_capabilities_gate_unsupported_visual_features() -> None:
    """Unsupported browser features fall back safely without mutating profiles."""

    panel_source = _panel_source()
    effects_source = _effects_source()

    assert "_detectRuntimeCapabilities()" in panel_source
    assert 'supports("backdrop-filter", "blur(1px)")' in panel_source
    assert '"clip-path",' in panel_source
    assert "homeAssistantVersion:" in panel_source
    assert "_cardPresetCompatibility(preset)" in panel_source
    assert "button.disabled = !compatibility.supported;" in panel_source
    assert 'id="card-compatibility-warning"' in panel_source
    assert "_previewCardStyle()" in panel_source
    assert '...this._cardPresetValues("standard")' in panel_source
    assert 'id="motion-compatibility-warning"' in panel_source
    assert 'typeof window.matchMedia === "function"' in panel_source
    assert "motionControl.disabled = reducedMotion;" in panel_source
    assert "this.liquidGlassSupported" in effects_source
    assert "this.techFrameSupported" in effects_source
    assert "requestedLiquidGlass && this.liquidGlassSupported" in effects_source
    assert 'requestedCardShape === "tech-frame" && !this.techFrameSupported' in effects_source


def test_effect_module_replaces_a_stale_cached_instance() -> None:
    """Opening Theme Studio refreshes an outdated global effects module."""

    effects_source = _effects_source()
    panel_source = _panel_source()

    assert 'from "./theme-studio-effects.js?v=0.10.0-beta.22";' in panel_source
    assert 'const THEME_STUDIO_EFFECTS_VERSION = "0.10.0-beta.22";' in effects_source
    assert "current?.version === THEME_STUDIO_EFFECTS_VERSION" in effects_source
    assert "current._stopPolling?.();" in effects_source
    assert "current._readThemeSettings = () => {};" in effects_source


def test_effect_module_caches_style_reads_and_releases_global_listeners() -> None:
    """Polling reuses computed styles and hot replacement removes listeners."""

    effects_source = _effects_source()

    assert "this.themeComputedStyles = this._themeElements().map" in effects_source
    assert "this._readThemeSettingsFromComputedStyles();" in effects_source
    assert "this.themeComputedStyles = null;" in effects_source
    assert "this.resizeEventHandler = () => {" in effects_source
    assert "this._positionDashboardEditorHighlight();" in effects_source
    assert "this._unbindEvents();" in effects_source
    assert 'window.removeEventListener("resize", this.resizeEventHandler);' in effects_source
    assert "current._destroy();" in effects_source
    assert 'data-theme-studio-tech-frame-version' in effects_source
    assert "current._clearLiquidGlassCards?.();" in effects_source


def test_panel_disconnect_cancels_short_lived_ui_work() -> None:
    """Leaving the panel releases pending pulses and layout frames."""

    panel_source = _panel_source()

    assert "this._stopProfileSaveReminderPulse();" in panel_source
    assert "this._stopProfileSaveSuccess();" in panel_source
    assert "window.cancelAnimationFrame(this.stickyOffsetFrame);" in panel_source
    assert "window.cancelAnimationFrame(this.communitySliderFrame);" in panel_source


def test_liquid_glass_uses_fast_startup_sync() -> None:
    """Liquid Glass does not wait for the 1.2 second safety poll."""

    effects_source = _effects_source()

    assert "const STARTUP_SYNC_DELAYS = [" in effects_source
    assert "0, 40, 100, 180, 280, 400, 550, 750," in effects_source
    assert "2800, 3200," in effects_source
    assert "this.startupSyncTimeoutIds = new Set();" in effects_source
    assert "this._startStartupSync();" in effects_source
    assert "const EXPERT_CSS_STARTUP_SYNC_DELAYS = new Set([" in effects_source
    assert "EXPERT_CSS_STARTUP_SYNC_DELAYS.has(delay)" in effects_source
    assert "this._syncLiquidGlassCards(true);" in effects_source
    assert "this._stopStartupSync();" in effects_source
    assert "current._stopStartupSync?.();" in effects_source


def test_expert_css_reuses_the_bounded_material_scan() -> None:
    """Expert CSS adds no observer and is cleaned up during hot replacement."""

    effects_source = _effects_source()
    panel_source = _panel_source()

    assert "new MutationObserver(" not in effects_source
    assert '"--theme-studio-expert-css-b64"' in effects_source
    assert 'style.setAttribute("data-theme-studio-expert-css", "")' in effects_source
    assert "this._markExpertCard(element);" in effects_source
    assert '"data-theme-studio-entity"' in effects_source
    assert '"data-theme-studio-id"' in effects_source
    assert '"data-theme-studio-card-key"' in effects_source
    assert '"data-theme-studio-layout"' in effects_source
    assert "this._clearExpertCss();" in effects_source
    assert 'id="expert-css-enabled"' in panel_source
    assert 'id="expert-css"' in panel_source
    assert "this._expertCssError(" in panel_source
    assert 'id="expert-rule-target-type"' in panel_source
    assert 'id="expert-rule-entity"' in panel_source
    assert 'id="expert-rule-device"' in panel_source
    assert 'id="expert-rule-list"' in panel_source
    assert 'id="expert-dashboard-editor-button"' not in panel_source
    assert "_openDashboardEditor()" not in panel_source
    assert "const DIRECT_CARD_EDITOR_ENABLED = false;" in effects_source
    assert "_dashboardCardKey(card)" in effects_source
    assert 'targetType: "card"' in effects_source
    assert 'candidate.targetType === "card"' in effects_source
    assert '<option value="card">Direkt ausgewählte Karte</option>' in panel_source
    assert "_applyDashboardEditorPreview()" in effects_source
    assert "_saveDashboardEditorRule()" in effects_source
    assert "this._stopDashboardEditor(false);" in effects_source
    assert 'document.removeEventListener(\n      "click"' in effects_source
    assert 'window.removeEventListener(\n      "scroll"' in effects_source
    assert "_saveExpertRuleFromForm()" in panel_source
    assert "_handleExpertRuleAction(action, ruleId)" in panel_source
    assert 'data-rule-action="duplicate"' not in panel_source
    assert 'id="legacy-css-panel" class="expert-css-panel" hidden' in panel_source
    assert 'id="expert-rule-create"' not in panel_source


def test_staggered_tech_frame_cards_are_added_without_restyling_existing_cards() -> None:
    """Late dashboard cards are caught quickly without repeated full restyling."""

    effects_source = _effects_source()

    assert "if (!this.techFrameCards.has(element))" in effects_source
    assert "if (!this.glassCards.has(element))" in effects_source
    assert "new window.ResizeObserver((entries) =>" in effects_source
    assert "this.techFrameResizeObserver?.observe(card);" in effects_source
    assert "this.techFrameResizeObserver?.unobserve(card);" in effects_source
    assert "this.techFrameResizeObserver?.disconnect();" in effects_source


def test_liquid_glass_excludes_heading_cards() -> None:
    """Dashboard headings remain transparent instead of becoming glass pills."""

    effects_source = _effects_source()

    assert 'name === "hui-heading-card"' in effects_source
    assert 'name.endsWith("-heading-card")' in effects_source
    assert 'config?.type === "heading"' in effects_source
    assert "this._styleLiquidGlassHeading(element);" in effects_source
    assert 'heading.style.setProperty("background", "transparent", "important")' in effects_source
    assert 'heading.style.setProperty("box-shadow", "none", "important")' in effects_source
    assert "this._restoreLiquidGlassHeading(heading);" in effects_source


def test_tech_frame_is_selectable_restorable_and_excludes_headings() -> None:
    """Tech Frame changes normal cards without touching headings or overlays."""

    effects_source = _effects_source()
    panel_source = _panel_source()

    assert 'data-card-preset="technical"' in panel_source
    assert '<span class="effect-option-title">Tech Frame</span>' in panel_source
    assert 'id="tech-frame-controls"' in panel_source
    assert ".preview.tech-frame .preview-card::before" in panel_source
    assert "clip-path: none;" in panel_source
    assert "pointer-events: none;" in panel_source
    assert (
        ".preview.tech-frame .preview-card.preview-edit-target:focus-visible"
        in panel_source
    )
    assert ".preview.tech-frame .preview-edit-target:focus-visible" not in panel_source
    assert ".preview-tech-frame-outline polygon" in panel_source
    assert "stroke: var(--primary-color) !important;" in panel_source
    assert "calc(var(--preview-border-width) + 1px)" in panel_source
    assert ".preview.tech-frame .preview-card.energy-flow-demo" in panel_source
    assert "energy-flow-tech-preview" in panel_source
    assert "climate-aura-tech-preview" in panel_source
    assert "alert-focus-tech-preview" in panel_source
    assert 'card.classList.add("preview-context-selected");' in panel_source
    tech_effect_override = panel_source.split(
        ".preview.tech-frame .preview-card.status-pulse-demo,", 1
    )[1].split("}", 1)[0]
    assert "animation: none;" in tech_effect_override
    assert "outline: none;" in tech_effect_override
    preview_choice_method = panel_source.split(
        "_showPreviewCardChoices(card) {", 1
    )[1].split("_showPreviewBackgroundChoices", 1)[0]
    assert preview_choice_method.index(
        'card.classList.add("preview-context-selected");'
    ) < preview_choice_method.index('window.matchMedia("(max-width: 620px)")')
    assert 'data-preview-context="card"' in panel_source
    assert ".preview.tech-frame .preview-card::after" not in panel_source
    assert "ha-card[data-theme-studio-tech-frame]::after" not in effects_source
    assert "right: 18px;" not in effects_source
    assert "width: 38%;" not in effects_source
    tech_preview_surface = panel_source.split(
        ".preview.tech-frame .preview-card {", 1
    )[1].split("}", 1)[0]
    assert "background: transparent !important;" in tech_preview_surface
    assert "box-shadow: none !important;" in tech_preview_surface
    assert "backdrop-filter: none !important;" in tech_preview_surface
    assert "filter: none;" in tech_preview_surface
    assert 'card.style.setProperty("box-shadow", "none", "important")' in effects_source
    assert 'card.style.setProperty("backdrop-filter", "none", "important")' in effects_source
    assert '"--preview-tech-cut"' in panel_source
    assert '"--theme-studio-card-shape"' in effects_source
    assert "this._styleTechFrameCard(element);" in effects_source
    assert "this._restoreTechFrameCard(element);" in effects_source
    assert "this._clearTechFrameCards();" in effects_source
    assert "if (this._isHeadingCard(element))" in effects_source
    assert "if (this._isInsideOverlay(element))" in effects_source
    assert "const nextCardShape = nextLiquidGlass" in effects_source


def test_overlay_material_sync_is_event_driven_and_bounded() -> None:
    """Dialog styling avoids broad, persistent DOM observation."""

    source = _effects_source()

    assert '"hass-more-info"' in source
    assert '"show-dialog"' in source
    assert "new MutationObserver(" not in source
    assert "for (const delay of [0, 80])" in source
    assert "this._scheduleMaterialSync();" in source
    assert "this._syncLiquidGlassCards(true);" in source
    assert "current._stopDynamicSync?.();" in source


def test_tech_frame_overlay_reuses_one_outline_without_surface_clipping() -> None:
    """Repeated dialog opens neither stack outlines nor clip the dialog surface."""

    source = _effects_source()

    assert "if (!outline?.svg?.isConnected)" in source
    assert "if (!outline?.isConnected)" not in source
    assert 'duplicate !== outline.svg' in source
    assert '":scope > svg[data-theme-studio-tech-frame-outline]"' in source
    assert 'element.style.setProperty("clip-path", "none", "important")' in source
    assert 'element.style.setProperty("overflow", "visible", "important")' in source
    assert '[data-theme-studio-tech-frame-overlay]::before' in source
    assert 'clip-path: var(--theme-studio-tech-frame-shape);' in source
    assert 'element.style.setProperty("box-shadow", "none", "important")' in source


def test_header_uses_compact_accessible_mode_symbol() -> None:
    """The header shows a compact mode icon without losing its text label."""

    panel_source = _panel_source()

    assert 'class="design-mode-indicator"' in panel_source
    assert 'role="img"' in panel_source
    assert '>☾</span>' in panel_source
    assert 'this.activeMode === "light" ? "☀" : "☾"' in panel_source
    assert 'designModeLabel.setAttribute("aria-label", designModeText);' in panel_source
    assert "margin: 0 20px 12px;" in panel_source


def test_history_buttons_are_compact_and_visually_separate() -> None:
    """Undo and redo are two individual round controls."""

    panel_source = _panel_source()

    assert ".history-actions {\n          display: flex;" in panel_source
    assert "gap: 7px;\n          padding: 0;" in panel_source
    assert "flex: 0 0 36px;" in panel_source
    assert "width: 36px;\n          height: 36px;" in panel_source
    assert "border-radius: 50%;" in panel_source
    assert "background: var(--card-background-color, #ffffff);" in panel_source


def test_gallery_mode_menu_highlights_the_hovered_option() -> None:
    """The custom gallery menu does not retain native selected-option blue."""

    panel_source = _panel_source()

    assert 'id="gallery-mode-picker" class="gallery-mode-picker"' in panel_source
    assert 'class="gallery-mode-option selected"' in panel_source
    assert 'role="listbox"' in panel_source
    assert ".gallery-mode-option:hover," in panel_source
    assert "background: var(--primary-color);" in panel_source
    assert "from var(--primary-background-color, #101719)" in panel_source
    assert "backdrop-filter: none;\n          isolation: isolate;" in panel_source
    assert 'option.setAttribute("aria-selected", String(selected));' in panel_source
    assert 'event.key !== "Escape"' in panel_source
    assert '<select id="gallery-mode">' not in panel_source


def test_new_design_mode_uses_the_same_opaque_custom_menu() -> None:
    """New-profile mode selection matches the opaque gallery menu."""

    panel_source = _panel_source()

    assert 'id="new-design-mode" type="hidden" value="light"' in panel_source
    assert 'id="new-design-mode-picker" class="gallery-mode-picker"' in panel_source
    assert 'class="new-design-mode-option selected"' in panel_source
    assert 'data-new-design-mode="light"' in panel_source
    assert 'data-new-design-mode="dark"' in panel_source
    assert '.new-design-mode-option:hover,' in panel_source
    assert 'this._syncNewDesignModeControl();' in panel_source
    assert '<select id="new-design-mode">' not in panel_source


def test_profile_actions_and_preview_use_coordinated_sticky_offsets() -> None:
    """The action bar stays visible and the full preview remains below it."""

    panel_source = _panel_source()

    assert 'id="profile-sticky-actions" class="profile-sticky-actions"' in panel_source
    assert 'id="profile-edit-actions"' in panel_source
    assert '<p class="profile-hint">' in panel_source
    assert ".profile-sticky-actions {\n          position: sticky;" in panel_source
    assert ".preview-panel {\n          position: sticky;" in panel_source
    assert ".builder-controls {\n          position: sticky;" in panel_source
    assert "top: var(--theme-studio-preview-sticky-top, 82px);" in panel_source
    assert "overflow-y: auto;" in panel_source
    assert "scrollbar-gutter: stable;" in panel_source
    assert 'id="profile-actions-placeholder"' not in panel_source
    assert "profile-actions-floating" not in panel_source
    assert 'window.addEventListener("scroll", updateOffset' not in panel_source
    assert "_setupStickyOffsets" in panel_source
    assert '"--theme-studio-profile-sticky-top"' in panel_source
    assert '"--theme-studio-preview-sticky-top"' in panel_source
    assert "topbar.getBoundingClientRect().height\n      ) + 20" in panel_source
    assert "profileStickyTop + profileActions.getBoundingClientRect().height" in panel_source
    assert "this._stickyOffsetObserver.observe(profileActions);" in panel_source
    assert "padding: 18px 24px 30px;" in panel_source
    assert "padding: 12px 12px 24px;" in panel_source
    assert ".topbar::after {" in panel_source
    assert "padding: 10px 20px;" in panel_source
    assert "padding: 0 0 18px;" in panel_source
    assert ".profile-sticky-surface {" in panel_source
    assert 'class="profile-sticky-surface"' in panel_source
    assert "background: var(--card-background-color, #ffffff);" in panel_source
    assert ".profile-sticky-actions::after {" not in panel_source
    assert "0 18px 0 var(--primary-background-color" not in panel_source


def test_native_card_design_reuses_home_assistant_preview() -> None:
    """The card design tab must not add a second synthetic preview card."""

    effects_source = _effects_source()

    assert 'class="tsd-preview"' not in effects_source
    assert 'class="tsd-preview-wrap"' not in effects_source
    assert "_findNativeCardDesignPreview(state)" in effects_source
    assert "_visitComposedElements" in effects_source
    assert 'name.includes("dialog-edit-card")' in effects_source
    assert "assignedElements?.({ flatten: true })" in effects_source
    assert 'element.localName === "ha-card"' in effects_source
    assert "this._syncNativeCardDesignPreview(state);" in effects_source
    assert 'class="tsd-save"' in effects_source
    assert "nativeCardDesignSaveHandler" not in effects_source
    assert 'key !== "theme_studio_id"' in effects_source
    assert "_parseLocalCardDesignStyles" in effects_source
    assert "this.localCardDesignStyles = new Map();" in effects_source
    assert 'getPropertyValue("--theme-studio-local-card-design")' not in effects_source
    assert 'getPropertyValue("--theme-studio-local-card-style")' not in effects_source
    assert "Theme-Studio-Design speichern &amp; anwenden" in effects_source
    assert ".tsd-actions{position:sticky" in effects_source
    assert "Speichern“ unten rechts gehört nur zum Karteninhalt" in effects_source
    assert 'data-value="inherit"><strong>Globales Design</strong>' not in effects_source
    assert 'data-value="inherit"><strong>Ohne Muster</strong>' in effects_source
    assert 'style: "standard"' in effects_source
    assert "_styleLocalTechFrameOutline(element)" in effects_source
    assert "_syncTechFrameOutline(card, 18, 2)" in effects_source
    assert 'set("border", "0")' in effects_source
    assert "calc(100% - 48px) 0,calc(100% - 36px) 10px" in effects_source
    assert "26px 100%,12px calc(100% - 10px)" in effects_source
    assert "&& !node.contains?.(tabGroup)" in effects_source


def test_native_card_design_image_uses_native_file_label() -> None:
    """The user click must directly activate the browser's file picker."""

    effects_source = _effects_source()

    assert '<label class="tsd-upload-button">Eigenes Bild auswählen' in effects_source
    assert 'class="tsd-file-input" type="file"' in effects_source
    assert 'addEventListener("click", () => fileInput.click())' not in effects_source
    assert 'fileInput.addEventListener("change"' in effects_source


def test_native_card_design_uses_material_background_choices() -> None:
    """The obsolete dot and grid buttons are replaced by a texture gallery."""

    effects_source = _effects_source()

    assert 'data-value="dots"><strong>Punkte</strong>' not in effects_source
    assert 'data-value="grid"><strong>Raster</strong>' not in effects_source
    assert 'data-value="carbon"><strong>Carbon</strong>' not in effects_source
    assert 'data-value="metal"><strong>Metall</strong>' not in effects_source
    assert 'data-value="texture"><strong>Texturgalerie</strong>' in effects_source
    assert "export const CARD_TEXTURE_LIBRARY = [" in effects_source
    assert 'id: "carbon", label: "Carbon"' in effects_source
    assert 'id: "metal", label: "Metall"' in effects_source
    assert 'id: "wood", label: "Holz"' in effects_source
    assert 'id: "abstract", label: "Abstrakt"' in effects_source
    assert effects_source.count('.webp"]') == 40
    assert "_nativeCardTextureGalleryMarkup" in effects_source
    assert "_openNativeCardTextureGallery" in effects_source
    assert "_syncNativeCardTextureGallery" in effects_source
    assert 'loading="lazy" decoding="async"' in effects_source
    assert 'class="tsd-texture-apply" disabled>Anwenden</button>' in effects_source
    assert "state.pendingTexturePath = button.dataset.texturePath" in effects_source
    assert 'state.draft.backgroundImage = state.pendingTexturePath' in effects_source


def test_dashboard_background_reuses_texture_gallery_without_changing_cards() -> None:
    """Bundled textures can be selected independently as dashboard backgrounds."""

    panel_source = _panel_source()

    assert 'data-background="texture"' in panel_source
    assert "_backgroundTextureGalleryMarkup" in panel_source
    assert "_openBackgroundTextureGallery" in panel_source
    assert "_applyBackgroundTexture" in panel_source
    assert 'this.profile.background = "texture"' in panel_source
    assert 'class="background-texture-apply" disabled>Anwenden</button>' in panel_source
    assert "Karten bleiben unverändert" in panel_source
    assert '"--preview-background-size",\n      "cover"' in panel_source
    assert '"--preview-background-repeat",\n      "no-repeat"' in panel_source
    assert "/theme_studio_files/background-textures/" in panel_source
    assert "/theme_studio_files/background-texture-thumbnails/" in panel_source
    assert 'pendingBackgroundTexturePath.split("?", 1)[0]' in panel_source


def test_bundled_card_textures_are_complete_and_lightweight() -> None:
    """Four ten-item galleries stay small enough for the editor bundle."""

    texture_dir = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "textures"
    )
    textures = sorted(texture_dir.glob("*.webp"))

    assert len(textures) == 40
    assert sum(path.stat().st_size for path in textures) < 1_200_000
    for category in ("carbon", "metal", "wood", "abstract"):
        assert len(list(texture_dir.glob(f"{category}-*.webp"))) == 10


def test_dashboard_textures_use_high_resolution_assets() -> None:
    """Dashboard materials remain practical despite their 4K resolution."""

    texture_dir = (
        Path(__file__).parents[1]
        / "custom_components"
        / "theme_studio"
        / "frontend"
        / "background-textures"
    )
    textures = sorted(texture_dir.glob("*.webp"))

    assert len(textures) == 40
    assert sum(path.stat().st_size for path in textures) < 30_000_000
    for path in textures:
        header = path.read_bytes()[:32]
        frame_start = header.index(b"\x9d\x01\x2a") + 3
        width = int.from_bytes(
            header[frame_start:frame_start + 2], "little"
        ) & 0x3FFF
        height = int.from_bytes(
            header[frame_start + 2:frame_start + 4], "little"
        ) & 0x3FFF
        assert (width, height) == (3840, 2160)
    for category in ("carbon", "metal", "wood", "abstract"):
        assert len(list(texture_dir.glob(f"{category}-*.webp"))) == 10

    thumbnail_dir = texture_dir.parent / "background-texture-thumbnails"
    thumbnails = sorted(thumbnail_dir.glob("*.webp"))
    assert len(thumbnails) == 40
    assert sum(path.stat().st_size for path in thumbnails) < 1_500_000


def test_local_card_design_badge_is_limited_to_dashboard_edit_mode() -> None:
    """Saved card overrides are recognizable while editing, not in normal use."""

    effects_source = _effects_source()

    assert "const dashboardEditMode = this._isHomeAssistantDashboardEditMode();" in effects_source
    assert "if (dashboardEditMode)" in effects_source
    assert 'data-theme-studio-card-design-badge' in effects_source
    assert 'icon.setAttribute("icon", "mdi:palette-swatch")' in effects_source
    assert "Individuell mit Theme Studio gestaltet" in effects_source
    assert "Individually styled with Theme Studio" in effects_source
    assert "Personnalisée avec Theme Studio" in effects_source
    assert "Personalizada con Theme Studio" in effects_source
    assert "pointerEvents: \"none\"" in effects_source
    assert "_clearLocalCardDesignBadges();" in effects_source
    assert "DIRECT_CARD_EDITOR_ENABLED || NATIVE_CARD_DESIGN_EDITOR_ENABLED" in effects_source
    assert "for (const delay of [80, 240, 600])" in effects_source
    assert "this._syncLiquidGlassCards(true);" in effects_source


def test_liquid_glass_excludes_overlay_dialogs() -> None:
    """More-info dialogs retain Home Assistant's native presentation."""

    effects_source = _effects_source()
    overlay_card_block = effects_source.split(
        "if (this._isInsideOverlay(element)) {",
        maxsplit=1,
    )[1].split(
        "if (this._isHeadingCard(element)) {",
        maxsplit=1,
    )[0]

    assert 'name === "ha-more-info-dialog"' in effects_source
    assert 'element?.getAttribute?.("aria-modal") === "true"' in effects_source
    assert "this._isInsideOverlay(element)" in effects_source
    assert "this._restoreLiquidGlassCard(element);" in overlay_card_block
    assert "this._restoreLiquidGlassHeading(element);" in overlay_card_block
    assert "this._restoreTechFrameCard(element);" in overlay_card_block
    assert "return;" in overlay_card_block
    assert "if (this.liquidGlass)" not in overlay_card_block
    assert "this._styleOverlayScrim(element);" not in effects_source
    assert "this._styleOverlaySurface(element);" in effects_source
    assert "this._styleTechFrameOverlaySurface(element);" not in effects_source
    assert '"background-color",\n        this.overlayBackground' in effects_source


def test_config_area_excludes_all_special_effects() -> None:
    """Home Assistant settings stay opaque and free of dashboard effects."""

    effects_source = _effects_source()

    assert 'path === "/config" || path.startsWith("/config/")' in effects_source
    assert "reduceMotion || effectsExcludedForConfig" in effects_source
    assert "const nextLiquidGlass = effectsExcludedForConfig" in effects_source
    assert '"--ha-card-background": this.overlayBackground' in effects_source
    assert '"--ha-card-box-shadow": "none"' in effects_source
    assert "this._restoreConfigSurface();" in effects_source


def test_global_card_texture_keeps_local_card_designs_and_overlays_separate() -> None:
    """Global textures target normal cards while local overrides keep priority."""

    panel_source = _panel_source()
    effects_source = _effects_source()

    assert "Globale Kartentextur" in panel_source
    assert "Individuelle Kartendesigns behalten ihre eigene Gestaltung." in panel_source
    assert 'id="card-texture-clear"' in panel_source
    assert '"--theme-studio-card-background-image"' in effects_source
    assert 'data-theme-studio-global-card-texture' in effects_source
    assert 'if (localCardStyle) {' in effects_source
    assert 'element.removeAttribute("data-theme-studio-global-card-texture")' in effects_source
    assert 'var(--theme-studio-card-background-image, none)' in effects_source
    assert 'var(--theme-studio-card-texture-opacity, 1)' in effects_source
    assert 'var(--theme-studio-card-texture-darkening, 0)' in effects_source
    assert '"Karten abdunkeln"' in panel_source


def test_clock_is_a_native_dashboard_card_without_fixed_overlay() -> None:
    """The clock participates in Lovelace layout and needs no third-party card."""

    root = Path(__file__).parents[1]
    source = (
        root
        / "custom_components/theme_studio/frontend/theme-studio-clock-card.js"
    ).read_text(encoding="utf-8")

    assert 'customElements.define("theme-studio-clock-card"' in source
    assert 'customElements.define("theme-studio-clock-card-editor"' in source
    assert 'type: "theme-studio-clock-card"' in source
    assert 'name: "Theme Studio Uhr"' in source
    assert "static getConfigElement()" in source
    assert "static getStubConfig()" in source
    assert "getGridOptions()" in source
    assert 'clock_type: "analog"' in source
    assert 'clock_type === "analog"' in source
    assert 'value="digital"' in source
    assert "position: fixed" not in source
    assert "window.clearInterval(this._timer);" in source
