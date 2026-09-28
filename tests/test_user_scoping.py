"""Tests for per-user Theme Studio settings and generated themes."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from inspect import unwrap
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

from custom_components.theme_studio import websocket


class MemoryStore:
    """Asynchronous in-memory Home Assistant storage replacement."""

    def __init__(self, value: dict[str, Any] | None = None) -> None:
        self.value = deepcopy(value)

    async def async_load(self) -> dict[str, Any] | None:
        """Return a stored copy."""

        return deepcopy(self.value)

    async def async_save(self, value: dict[str, Any]) -> None:
        """Persist a copy."""

        self.value = deepcopy(value)


class ResultConnection:
    """Capture one WebSocket result for a regular Home Assistant user."""

    def __init__(self, user_id: str) -> None:
        self.user = SimpleNamespace(id=user_id, is_admin=False)
        self.result: dict[str, Any] | None = None
        self.error: tuple[Any, ...] | None = None

    def send_result(self, _message_id: int, result: dict[str, Any]) -> None:
        """Capture a successful response."""

        self.result = result

    def send_error(self, *error: Any) -> None:
        """Capture an error response."""

        self.error = error


def _state(color: str, *, active: bool = True) -> dict[str, Any]:
    settings = websocket.default_settings()
    settings["dark"]["primaryColor"] = color
    return {
        "settings": settings,
        "profiles": [],
        "active_profile_id": "",
        "theme_studio_active": active,
        "recovery": None,
    }


def test_private_theme_names_are_stable_and_do_not_expose_user_ids() -> None:
    """Generated theme names use a stable pseudonymous identifier."""

    first = websocket.theme_name_for_user("private-user-id")
    second = websocket.theme_name_for_user("private-user-id")
    other = websocket.theme_name_for_user("another-user-id")

    assert first == second
    assert first != other
    assert first.startswith("Theme Studio · ")
    assert "private-user-id" not in first


def test_theme_registry_keeps_active_users_separate() -> None:
    """Each active user receives an independent theme definition."""

    legacy = websocket.default_settings()
    registry = websocket.build_theme_registry(
        legacy,
        {
            "user-a": _state("#112233"),
            "user-b": _state("#abcdef"),
            "user-c": _state("#ff0000", active=False),
        },
    )

    assert "Theme Studio:" in registry
    assert f'{websocket.theme_name_for_user("user-a")}:' in registry
    assert f'{websocket.theme_name_for_user("user-b")}:' in registry
    assert f'{websocket.theme_name_for_user("user-c")}:' not in registry
    assert "user-a" not in registry
    assert "user-b" not in registry
    assert "user-c" not in registry
    assert 'primary-color: "#112233"' in registry
    assert 'primary-color: "#abcdef"' in registry


async def test_regular_user_save_does_not_change_another_user(
    monkeypatch: Any,
) -> None:
    """A non-admin can apply a design without overwriting another user."""

    user_store = MemoryStore(
        {"users": {"user-a": _state("#111111"), "user-b": _state("#222222")}}
    )
    connection = ResultConnection("user-a")
    applied = websocket.default_settings()
    applied["dark"]["primaryColor"] = "#abcdef"
    generator = AsyncMock(
        return_value=websocket.theme_name_for_user("user-a")
    )

    monkeypatch.setattr(websocket, "get_user_store", lambda _hass: user_store)
    monkeypatch.setattr(websocket, "get_storage_lock", lambda _hass: asyncio.Lock())
    monkeypatch.setattr(websocket, "async_generate_and_apply_theme", generator)

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
    assert connection.result is not None
    assert connection.result["theme"] == websocket.theme_name_for_user("user-a")
    assert user_store.value is not None
    users = user_store.value["users"]
    assert users["user-a"]["settings"]["dark"]["primaryColor"] == "#abcdef"
    assert users["user-b"]["settings"]["dark"]["primaryColor"] == "#222222"


async def test_first_user_access_migrates_legacy_data(
    monkeypatch: Any,
) -> None:
    """Existing 0.6.4 settings become the first private user state."""

    legacy = websocket.default_settings()
    legacy["dark"]["primaryColor"] = "#123456"
    user_store = MemoryStore()
    settings_store = MemoryStore(legacy)
    profile_store = MemoryStore({"profiles": []})
    recovery_store = MemoryStore()

    monkeypatch.setattr(websocket, "get_user_store", lambda _hass: user_store)
    monkeypatch.setattr(websocket, "get_store", lambda _hass: settings_store)
    monkeypatch.setattr(websocket, "get_profile_store", lambda _hass: profile_store)
    monkeypatch.setattr(websocket, "get_recovery_store", lambda _hass: recovery_store)

    state, migrated = await websocket.async_load_user_state(object(), "user-a")

    assert migrated is True
    assert state["settings"]["dark"]["primaryColor"] == "#123456"
    assert user_store.value is not None
    assert "user-a" in user_store.value["users"]
