"""Tests for stored Theme Studio design profiles."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from inspect import unwrap
from types import SimpleNamespace
from typing import Any

import pytest
import voluptuous as vol

from custom_components.theme_studio import websocket
from custom_components.theme_studio.websocket import (
    MAX_PROFILES,
    default_settings,
    normalize_profile_name,
    normalize_saved_profiles,
)


class MemoryStore:
    """Small asynchronous in-memory replacement for Home Assistant Store."""

    def __init__(self, value: dict[str, Any] | None = None) -> None:
        self.value = deepcopy(value)

    async def async_load(self) -> dict[str, Any] | None:
        """Return the stored value."""

        return deepcopy(self.value)

    async def async_save(self, value: dict[str, Any]) -> None:
        """Persist a copy of the value."""

        self.value = deepcopy(value)


class ResultConnection:
    """Capture WebSocket results and errors."""

    def __init__(self) -> None:
        self.result: dict[str, Any] | None = None
        self.error: tuple[Any, ...] | None = None
        self.user = SimpleNamespace(is_admin=True)

    def send_result(self, _message_id: int, result: dict[str, Any]) -> None:
        """Capture a successful result."""

        self.result = result

    def send_error(self, *error: Any) -> None:
        """Capture an error response."""

        self.error = error


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


async def test_delete_profile_clears_dangling_active_profile_id(
    monkeypatch: Any,
) -> None:
    """Deleting the active profile must not leave a dead reference behind."""

    deleted_id = "a" * 32
    kept_id = "b" * 32
    profile_store = MemoryStore(
        {
            "profiles": [
                _profile(deleted_id, "Abend"),
                _profile(kept_id, "Morgen"),
            ]
        }
    )
    settings_store = MemoryStore(
        {
            **default_settings(),
            "active_profile_id": deleted_id,
            "theme_studio_active": True,
        }
    )
    connection = ResultConnection()

    monkeypatch.setattr(websocket, "get_profile_store", lambda _hass: profile_store)
    monkeypatch.setattr(websocket, "get_store", lambda _hass: settings_store)
    monkeypatch.setattr(
        websocket,
        "get_storage_lock",
        lambda _hass: asyncio.Lock(),
    )

    await unwrap(websocket.websocket_delete_profile)(
        object(),
        connection,  # type: ignore[arg-type]
        {"id": 1, "profile_id": deleted_id},
    )

    assert connection.error is None
    assert connection.result is not None
    assert [
        profile["id"] for profile in connection.result["profiles"]
    ] == [kept_id]
    assert settings_store.value is not None
    assert settings_store.value["active_profile_id"] == ""


async def test_delete_profile_keeps_unrelated_active_profile_id(
    monkeypatch: Any,
) -> None:
    """Deleting an inactive profile must not touch the active reference."""

    deleted_id = "a" * 32
    active_id = "b" * 32
    profile_store = MemoryStore(
        {
            "profiles": [
                _profile(deleted_id, "Abend"),
                _profile(active_id, "Morgen"),
            ]
        }
    )
    settings_store = MemoryStore(
        {
            **default_settings(),
            "active_profile_id": active_id,
            "theme_studio_active": True,
        }
    )
    connection = ResultConnection()

    monkeypatch.setattr(websocket, "get_profile_store", lambda _hass: profile_store)
    monkeypatch.setattr(websocket, "get_store", lambda _hass: settings_store)
    monkeypatch.setattr(
        websocket,
        "get_storage_lock",
        lambda _hass: asyncio.Lock(),
    )

    await unwrap(websocket.websocket_delete_profile)(
        object(),
        connection,  # type: ignore[arg-type]
        {"id": 1, "profile_id": deleted_id},
    )

    assert connection.error is None
    assert settings_store.value is not None
    assert settings_store.value["active_profile_id"] == active_id
