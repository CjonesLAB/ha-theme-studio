"""Tests for Theme Studio settings and portable profiles."""

from __future__ import annotations

import base64
from copy import deepcopy

import pytest
import voluptuous as vol

from custom_components.theme_studio.websocket import (
    DEFAULT_DARK_PROFILE,
    DEFAULT_EFFECT_SETTINGS,
    DEFAULT_LIGHT_PROFILE,
    default_settings,
    normalize_profile,
    normalize_recovery_state,
    normalize_settings,
    portable_import_settings,
    recovery_state_from_settings,
    sanitize_gallery_settings,
    build_mode_values,
    build_expert_rules_css,
    build_theme_file,
    normalize_effects,
)


def test_recovery_state_preserves_profile_and_active_state() -> None:
    """A recovery point retains the applied profile and active state."""

    saved = default_settings()
    saved["active_profile_id"] = "a" * 32

    recovery = recovery_state_from_settings(
        saved,
        theme_studio_active=False,
    )

    assert recovery["settings"] == default_settings()
    assert recovery["active_profile_id"] == "a" * 32
    assert recovery["theme_studio_active"] is False
    assert recovery["saved_at"]


def test_normalize_recovery_rejects_corrupt_settings() -> None:
    """Corrupt persisted recovery data is ignored safely."""

    assert normalize_recovery_state({"settings": "invalid"}) is None
    assert normalize_recovery_state(None) is None


def test_normalize_settings_rejects_non_object() -> None:
    """Settings must always be represented by a JSON object."""

    with pytest.raises(vol.Invalid):
        normalize_settings("invalid")  # type: ignore[arg-type]


def test_portable_import_removes_local_content() -> None:
    """Portable profiles never retain local images, effects or entities."""

    settings = default_settings()
    settings["light"]["background"] = "image"
    settings["light"]["backgroundImage"] = (
        "/local/theme_studio/background_light.jpg"
    )
    settings["dark"]["backgroundImage"] = (
        "/local/theme_studio/background_dark.jpg"
    )
    settings["effects"]["cardEffects"] = ["status-pulse"]
    settings["effects"]["pulseEntities"] = ["light.living_room"]

    portable, notices = portable_import_settings(settings)

    assert portable["light"]["background"] == "color"
    assert portable["light"]["backgroundImage"] == ""
    assert portable["dark"]["backgroundImage"] == ""
    assert portable["effects"] == DEFAULT_EFFECT_SETTINGS
    assert any("Hintergrundbild-Pfad" in notice for notice in notices)
    assert any("Dashboard-Effekte" in notice for notice in notices)


def test_portable_import_discards_unknown_fields() -> None:
    """Unsupported fields cannot pass through a portable profile."""

    settings = default_settings()
    settings["unexpected"] = {"script": "not allowed"}
    settings["light"]["unknownColor"] = "#123456"

    portable, notices = portable_import_settings(settings)

    assert "unexpected" not in portable
    assert "unknownColor" not in portable["light"]
    assert any("Zusatzfelder" in notice for notice in notices)


def test_gallery_sanitization_does_not_modify_source() -> None:
    """Gallery sanitization removes paths without mutating API data."""

    source = default_settings()
    source["dark"]["background"] = "image"
    source["dark"]["backgroundImage"] = "/local/private.webp"
    original = deepcopy(source)

    sanitized = sanitize_gallery_settings(source)

    assert source == original
    assert sanitized["dark"]["background"] == "color"
    assert sanitized["dark"]["backgroundImage"] == ""


def test_legacy_single_mode_settings_are_migrated() -> None:
    """Settings from the original single-mode format remain usable."""

    legacy = {
        "primaryColor": "#123456",
        "backgroundColor": "#101820",
        "cardColor": "#202830",
    }

    migrated = normalize_settings(legacy)

    assert migrated["light"] == DEFAULT_LIGHT_PROFILE
    assert migrated["dark"]["primaryColor"] == "#123456"
    assert migrated["dark"]["backgroundColor"] == "#101820"
    assert migrated["dark"]["cardColor"] == "#202830"
    assert migrated["effects"] == DEFAULT_EFFECT_SETTINGS


def test_legacy_effect_fields_are_migrated_and_deduplicated() -> None:
    """Legacy singular effect fields become safe entity lists."""

    settings = default_settings()
    settings["effects"] = {
        "cardEffect": "energy-flow",
        "energyEntity": "sensor.house_power",
        "energyWarning": 500,
        "energyCritical": 200,
    }

    migrated = normalize_settings(settings)

    assert migrated["effects"]["cardEffects"] == ["energy-flow"]
    assert migrated["effects"]["energyEntities"] == [
        "sensor.house_power"
    ]
    assert migrated["effects"]["energyWarning"] == 500
    assert migrated["effects"]["energyCritical"] == 501


def test_expert_css_is_disabled_for_existing_profiles() -> None:
    """Existing saved designs gain an inert expert-mode default."""

    normalized = normalize_effects({"effect": "none"})

    assert normalized["expertCssEnabled"] is False
    assert normalized["expertCss"] == ""


def test_expert_css_is_base64_encoded_in_theme_file() -> None:
    """Multiline CSS reaches the frontend without breaking generated YAML."""

    settings = default_settings()
    css = (
        'ha-card[data-theme-studio-id="energy"] {\n'
        "  margin: 0 !important;\n"
        "}\n"
    )
    settings["effects"]["expertCssEnabled"] = True
    settings["effects"]["expertCss"] = css

    theme = build_theme_file(normalize_settings(settings))
    encoded = base64.b64encode(css.encode("utf-8")).decode("ascii")

    assert 'theme-studio-expert-css-enabled: "1"' in theme
    assert f'theme-studio-expert-css-b64: "{encoded}"' in theme
    assert css not in theme


@pytest.mark.parametrize(
    "css",
    [
        '@import "https://example.com/theme.css";',
        'ha-card { background: url("https://example.com/a.png"); }',
        "ha-card { background: url(data:image/png;base64,AAAA); }",
        "ha-card { width: expression(alert(1)); }",
    ],
)
def test_expert_css_rejects_remote_or_active_content(css: str) -> None:
    """Expert mode cannot load remote or executable CSS content."""

    effects = deepcopy(DEFAULT_EFFECT_SETTINGS)
    effects["expertCssEnabled"] = True
    effects["expertCss"] = css

    with pytest.raises(vol.Invalid):
        normalize_effects(effects)

    effects["expertRules"] = [_expert_rule(), _expert_rule(name="Duplicate")]

    with pytest.raises(vol.Invalid):
        normalize_effects(effects)


def _expert_rule(**changes: object) -> dict[str, object]:
    rule: dict[str, object] = {
        "id": "0123456789ab",
        "name": "Energy card",
        "enabled": True,
        "targetType": "entity",
        "target": "sensor.house_power",
        "device": "desktop",
        "margin": 0,
        "padding": 8,
        "gap": None,
        "width": 520,
        "minHeight": 120,
        "columns": 2,
        "offsetX": 0,
        "offsetY": -4,
        "opacity": 95,
        "fontSize": 14,
        "borderRadius": 6,
    }
    rule.update(changes)
    return rule


def test_visual_expert_rules_generate_scoped_responsive_css() -> None:
    """The visual editor produces card and layout-item rules without raw CSS."""

    effects = deepcopy(DEFAULT_EFFECT_SETTINGS)
    effects["expertCssEnabled"] = True
    effects["expertRules"] = [_expert_rule()]
    normalized = normalize_effects(effects)
    css = build_expert_rules_css(normalized["expertRules"])

    assert "@media (min-width: 1025px)" in css
    assert 'ha-card[data-theme-studio-entity~="sensor.house_power"]' in css
    assert "[data-theme-studio-card-container]" in css
    assert "grid-column: span 2 !important" in css
    assert "transform: translate(0px, -4px) !important" in css
    assert "opacity: 0.95 !important" in css
    assert "--state-card-primary-font-size: 14px !important" in css
    assert 'ha-card[data-theme-studio-entity~="sensor.house_power"] *' in css


def test_all_device_card_rules_are_mobile_safe() -> None:
    """Desktop geometry cannot push an all-device rule outside mobile view."""

    effects = deepcopy(DEFAULT_EFFECT_SETTINGS)
    effects["expertCssEnabled"] = True
    effects["expertRules"] = [
        _expert_rule(
            targetType="card",
            target="0123456789abcdef",
            device="all",
            width=720,
            columns=3,
            offsetX=-180,
            offsetY=12,
        )
    ]
    normalized = normalize_effects(effects)
    css = build_expert_rules_css(normalized["expertRules"])

    assert "width: min(720px, 100%, calc(100vw - 24px)) !important" in css
    assert "max-width: min(100%, calc(100vw - 24px)) !important" in css
    assert "box-sizing: border-box !important" in css
    assert "@media (max-width: 600px)" in css
    assert "grid-column: 1 / -1 !important" in css
    assert "justify-self: start !important" in css
    assert "transform: translate(0px, 12px) !important" in css


def test_visual_expert_rules_validate_target_and_unique_ids() -> None:
    """Malformed targets and duplicate visual-rule IDs are rejected."""

    effects = deepcopy(DEFAULT_EFFECT_SETTINGS)
    effects["expertRules"] = [_expert_rule(target="not-an-entity")]

    with pytest.raises(vol.Invalid):
        normalize_effects(effects)


def test_visual_expert_rule_can_target_one_dashboard_card_instance() -> None:
    """A generated card key scopes CSS to one selected dashboard card."""

    effects = deepcopy(DEFAULT_EFFECT_SETTINGS)
    effects["expertRules"] = [
        _expert_rule(
            targetType="card",
            target="0123456789abcdef",
            device="all",
        )
    ]
    normalized = normalize_effects(effects)
    css = build_expert_rules_css(normalized["expertRules"])

    selector = '[data-theme-studio-card-key="0123456789abcdef"]'
    assert f"ha-card{selector}" in css
    assert f"[data-theme-studio-card-container]{selector}" in css

    effects["expertRules"] = [
        _expert_rule(targetType="card", target="shared-entity")
    ]

    with pytest.raises(vol.Invalid):
        normalize_effects(effects)

def test_liquid_glass_defaults_keep_existing_designs_unchanged() -> None:
    """Older profiles gain disabled, safe Liquid Glass defaults."""

    legacy_profile = {
        key: value
        for key, value in DEFAULT_LIGHT_PROFILE.items()
        if not key.startswith("glass") and key != "liquidGlass"
    }
    settings = default_settings()
    settings["light"] = legacy_profile

    normalized = normalize_settings(settings)

    assert normalized["light"]["liquidGlass"] is False
    assert normalized["light"]["glassTransparency"] == 56
    assert normalized["light"]["glassBlur"] == 22
    assert normalized["light"]["glassSaturation"] == 145
    assert normalized["light"]["glassHighlight"] == 42


def test_liquid_glass_theme_values_include_material_controls() -> None:
    """The active mode publishes bounded material settings to the frontend."""

    profile = deepcopy(DEFAULT_LIGHT_PROFILE)
    profile["liquidGlass"] = True
    profile["glassTransparency"] = 70
    profile["glassBlur"] = 20
    profile["glassSaturation"] = 150
    profile["glassHighlight"] = 40

    values = build_mode_values(profile, "light")

    assert values["theme-studio-liquid-glass"] == "1"
    assert values["theme-studio-glass-blur"] == "20"
    assert values["theme-studio-glass-saturation"] == "150"
    assert values["theme-studio-glass-highlight"] == "40"
    assert values["theme-studio-overlay-background"] == "#ffffff"
    assert "inset 0 1px 0" in values["ha-card-box-shadow"]


def test_tech_frame_defaults_and_theme_values_are_backward_compatible() -> None:
    """Existing profiles stay standard while Tech Frame exports its controls."""

    legacy_profile = {
        key: value
        for key, value in DEFAULT_DARK_PROFILE.items()
        if not key.startswith("techFrame") and key != "cardShape"
    }
    normalized = normalize_profile(legacy_profile, DEFAULT_DARK_PROFILE)

    assert normalized["cardShape"] == "standard"
    assert normalized["techFrameCut"] == 18
    assert normalized["techFrameGlow"] == 35

    normalized.update(
        {
            "cardShape": "tech-frame",
            "techFrameCut": 24,
            "techFrameGlow": 48,
        }
    )
    values = build_mode_values(normalized, "dark")

    assert values["theme-studio-card-shape"] == "tech-frame"
    assert values["theme-studio-tech-frame-cut"] == "24"
    assert values["theme-studio-tech-frame-glow"] == "48"
    assert values["theme-studio-tech-frame-border-color"] == "#26b2b3"
    assert values["theme-studio-tech-frame-border-width"] == "0px"
    assert values["theme-studio-tech-frame-shadow"] == "28"


def test_liquid_glass_normalization_prevents_conflicting_card_settings() -> None:
    """Liquid Glass uses one coherent material instead of opaque card values."""

    profile = deepcopy(DEFAULT_DARK_PROFILE)
    profile.update(
        {
            "liquidGlass": True,
            "cardColor": "#ff0000",
            "cardOpacity": 100,
            "glassTransparency": 100,
            "cardBorderColor": "#00ff00",
            "cardBorderWidth": 6,
            "cardShadow": 50,
            "borderRadius": 5,
            "glassBlur": 0,
        }
    )

    settings = default_settings()
    settings["dark"] = profile
    normalized = normalize_settings(settings)["dark"]

    assert normalized["cardColor"] == "#253642"
    assert normalized["glassTransparency"] == 100
    assert normalized["cardOpacity"] == 0
    assert normalized["cardBorderColor"] == "#ffffff"
    assert normalized["cardBorderWidth"] == 1
    assert normalized["cardShadow"] == 24
    assert normalized["borderRadius"] == 5
    assert normalized["glassBlur"] == 0
    assert normalized["cardShape"] == "standard"
    assert build_mode_values(normalized, "dark")["ha-card-background"] == (
        "rgba(37, 54, 66, 0.00)"
    )
