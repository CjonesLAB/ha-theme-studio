"""Tests for privacy-preserving Theme Studio diagnostics."""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

from custom_components.theme_studio.diagnostics import (
    _UNAVAILABLE,
    build_diagnostics,
)
from custom_components.theme_studio.websocket import default_settings


def _hass() -> Any:
    """Return a minimal Home Assistant-like object."""

    return SimpleNamespace(
        data={"theme_studio": {"websocket_registered": True}}
    )


def _entry() -> Any:
    """Return a minimal config entry-like object."""

    return SimpleNamespace(version=1, minor_version=1)


def test_diagnostics_contain_counts_but_no_private_values() -> None:
    """Diagnostics report health without leaking stored user content."""

    settings = default_settings()
    settings["dark"]["primaryColor"] = "#123456"
    settings["dark"]["backgroundImage"] = (
        "/local/theme_studio/image_" + "c" * 32 + ".jpg"
    )
    settings["effects"]["energyEntities"] = ["sensor.private_power"]
    settings["effects"]["alertEntities"] = ["binary_sensor.private_alarm"]
    settings["active_profile_id"] = "a" * 32
    settings["theme_studio_active"] = True
    profiles = {
        "profiles": [
            {
                "id": "a" * 32,
                "name": "Private evening profile",
                "created_at": "2026-08-22T10:00:00+00:00",
                "updated_at": "2026-08-22T10:00:00+00:00",
                "settings": settings,
            }
        ]
    }
    backgrounds = {
        "backgrounds": [
            {
                "id": "b" * 32,
                "name": "Private holiday photo",
                "filename": "image_" + "c" * 32 + ".jpg",
                "created_at": "2026-08-22T10:00:00+00:00",
            }
        ]
    }
    recovery = {
        "settings": settings,
        "active_profile_id": "a" * 32,
        "theme_studio_active": True,
        "saved_at": "2026-08-22T10:00:00+00:00",
    }

    diagnostics = build_diagnostics(
        hass=_hass(),
        entry=_entry(),
        settings=settings,
        profiles=profiles,
        backgrounds=backgrounds,
        recovery=recovery,
    )
    serialized = json.dumps(diagnostics)

    assert diagnostics["storage"]["settings"]["status"] == "valid"
    assert diagnostics["storage"]["settings"]["entity_assignment_count"] == 2
    assert diagnostics["storage"]["profiles"]["valid_count"] == 1
    assert diagnostics["storage"]["backgrounds"]["valid_count"] == 1
    assert diagnostics["storage"]["recovery"]["available"] is True
    assert "#123456" not in serialized
    assert "sensor.private_power" not in serialized
    assert "binary_sensor.private_alarm" not in serialized
    assert "Private evening profile" not in serialized
    assert "Private holiday photo" not in serialized
    assert "image_" + "c" * 32 + ".jpg" not in serialized
    assert "a" * 32 not in serialized


def test_diagnostics_report_invalid_and_unavailable_storage() -> None:
    """Broken storage is reported without exposing raw values or errors."""

    diagnostics = build_diagnostics(
        hass=_hass(),
        entry=_entry(),
        settings="must-not-appear",
        profiles={"profiles": ["private-profile-data"]},
        backgrounds=_UNAVAILABLE,
        recovery={"settings": "private-recovery-data"},
    )
    serialized = json.dumps(diagnostics)

    assert diagnostics["storage"]["settings"]["status"] == "invalid"
    assert diagnostics["storage"]["profiles"]["invalid_count"] == 1
    assert diagnostics["storage"]["backgrounds"]["status"] == "unavailable"
    assert diagnostics["storage"]["recovery"]["status"] == "invalid"
    assert "must-not-appear" not in serialized
    assert "private-profile-data" not in serialized
    assert "private-recovery-data" not in serialized
