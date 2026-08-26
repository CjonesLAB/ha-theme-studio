"""Tests for the persistent Theme Studio recovery workflow."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from inspect import unwrap
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

from custom_components.theme_studio import websocket


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


async def test_save_creates_recovery_before_applying(
    monkeypatch: Any,
) -> None:
    """Applying changed settings persists the previous design first."""

    previous = websocket.default_settings()
    previous["dark"]["primaryColor"] = "#112233"
    current_store = MemoryStore(
        {
            **previous,
            "active_profile_id": "a" * 32,
            "theme_studio_active": True,
        }
    )
    recovery_store = MemoryStore()
    applied = websocket.default_settings()
    applied["dark"]["primaryColor"] = "#abcdef"
    connection = ResultConnection()
    apply_theme = AsyncMock()

    monkeypatch.setattr(websocket, "get_store", lambda _hass: current_store)
    monkeypatch.setattr(
        websocket,
        "get_recovery_store",
        lambda _hass: recovery_store,
    )
    monkeypatch.setattr(
        websocket,
        "async_generate_and_apply_theme",
        apply_theme,
    )
    monkeypatch.setattr(websocket, "async_load_profiles", AsyncMock(return_value=[]))
    monkeypatch.setattr(
        websocket,
        "get_storage_lock",
        lambda _hass: asyncio.Lock(),
    )

    await unwrap(websocket.websocket_save_settings)(
        object(),
        connection,  # type: ignore[arg-type]
        {
            "id": 1,
            "settings": applied,
            "previous_theme_studio_active": True,
        },
    )

    assert connection.error is None
    assert recovery_store.value is not None
    assert recovery_store.value["settings"] == previous
    assert recovery_store.value["active_profile_id"] == "a" * 32
    assert current_store.value is not None
    assert current_store.value["dark"]["primaryColor"] == "#abcdef"
    assert current_store.value["theme_studio_active"] is True
    apply_theme.assert_awaited_once()


async def test_restore_swaps_current_and_recovery(
    monkeypatch: Any,
) -> None:
    """Restoring keeps the replaced design as the next recovery point."""

    current = websocket.default_settings()
    current["dark"]["primaryColor"] = "#101010"
    previous = websocket.default_settings()
    previous["dark"]["primaryColor"] = "#eeeeee"
    current_store = MemoryStore(
        {
            **current,
            "active_profile_id": "c" * 32,
            "theme_studio_active": True,
        }
    )
    recovery_store = MemoryStore(
        {
            "settings": previous,
            "active_profile_id": "b" * 32,
            "theme_studio_active": True,
            "saved_at": "2026-08-14T07:00:00+00:00",
        }
    )
    connection = ResultConnection()
    apply_theme = AsyncMock()

    monkeypatch.setattr(websocket, "get_store", lambda _hass: current_store)
    monkeypatch.setattr(
        websocket,
        "get_recovery_store",
        lambda _hass: recovery_store,
    )
    monkeypatch.setattr(
        websocket,
        "async_generate_and_apply_theme",
        apply_theme,
    )
    monkeypatch.setattr(
        websocket,
        "get_storage_lock",
        lambda _hass: asyncio.Lock(),
    )

    await unwrap(websocket.websocket_restore_last_design)(
        object(),
        connection,  # type: ignore[arg-type]
        {
            "id": 2,
            "current_theme_studio_active": True,
        },
    )

    assert connection.error is None
    assert current_store.value is not None
    assert current_store.value["dark"]["primaryColor"] == "#eeeeee"
    assert current_store.value["active_profile_id"] == "b" * 32
    assert recovery_store.value is not None
    assert recovery_store.value["settings"] == current
    assert recovery_store.value["active_profile_id"] == "c" * 32
    assert connection.result is not None
    assert connection.result["recovery_available"] is True
    apply_theme.assert_awaited_once()
