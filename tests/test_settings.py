"""Tests for Theme Studio settings and portable profiles."""

from __future__ import annotations

from copy import deepcopy

import pytest
import voluptuous as vol

from custom_components.theme_studio.websocket import (
    DEFAULT_EFFECT_SETTINGS,
    DEFAULT_LIGHT_PROFILE,
    default_settings,
    normalize_recovery_state,
    normalize_settings,
    portable_import_settings,
    recovery_state_from_settings,
    sanitize_gallery_settings,
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


def test_effect_entities_allow_hyphenated_object_ids() -> None:
    """Home Assistant object IDs may contain hyphens (e.g. "sensor.temp-2")."""

    settings = default_settings()
    settings["effects"]["cardEffects"] = ["status-pulse", "energy-flow"]
    settings["effects"]["pulseEntities"] = ["light.living-room-lamp"]
    settings["effects"]["energyEntities"] = ["sensor.house-power-meter"]

    migrated = normalize_settings(settings)

    assert migrated["effects"]["pulseEntities"] == [
        "light.living-room-lamp"
    ]
    assert migrated["effects"]["energyEntities"] == [
        "sensor.house-power-meter"
    ]


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
