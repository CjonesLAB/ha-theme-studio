"""Tests for stored Theme Studio design profiles."""

from __future__ import annotations

import pytest
import voluptuous as vol

from custom_components.theme_studio.websocket import (
    MAX_PROFILES,
    default_settings,
    normalize_profile_name,
    normalize_saved_profiles,
)


def _profile(profile_id: str, name: str) -> dict[str, object]:
    """Return one valid stored profile record."""

    return {
        "id": profile_id,
        "name": name,
        "created_at": "2026-08-18T10:00:00+00:00",
        "updated_at": "2026-08-18T11:00:00+00:00",
        "settings": default_settings(),
    }


def test_profile_name_is_compacted_and_validated() -> None:
    """Whitespace is normalized and invalid names are rejected."""

    assert normalize_profile_name("  Mein   Abend  ") == "Mein Abend"

    with pytest.raises(vol.Invalid):
        normalize_profile_name("   ")

    with pytest.raises(vol.Invalid):
        normalize_profile_name(123)


def test_saved_profiles_ignore_invalid_and_duplicate_records() -> None:
    """Broken records and duplicate identifiers cannot enter the UI."""

    duplicate_id = "a" * 32
    saved = {
        "profiles": [
            _profile("b" * 32, "Zulu"),
            "invalid",
            _profile(duplicate_id, "Abend"),
            _profile(duplicate_id, "Doppelt"),
            {
                "id": "not-an-id",
                "name": "Ungültig",
                "settings": default_settings(),
            },
        ]
    }

    profiles = normalize_saved_profiles(saved)

    assert [profile["name"] for profile in profiles] == ["Abend", "Zulu"]
    assert [profile["id"] for profile in profiles].count(duplicate_id) == 1


def test_saved_profiles_are_limited() -> None:
    """Corrupt storage cannot bypass the configured profile limit."""

    saved = {
        "profiles": [
            _profile(f"{index:032x}", f"Profil {index:02d}")
            for index in range(MAX_PROFILES + 5)
        ]
    }

    profiles = normalize_saved_profiles(saved)

    assert len(profiles) == MAX_PROFILES
    assert profiles == sorted(
        profiles,
        key=lambda profile: str(profile["name"]).casefold(),
    )
