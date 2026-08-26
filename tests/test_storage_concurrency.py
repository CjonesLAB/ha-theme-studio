"""Tests that concurrent Theme Studio storage writes cannot race."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from inspect import unwrap
from types import SimpleNamespace
from typing import Any

from custom_components.theme_studio import websocket


class InterleavingStore:
    """In-memory store that yields control between load and save.

    A real ``homeassistant.helpers.storage.Store`` awaits I/O between
    reading and writing its backing file, which is exactly the gap where
    two concurrent WebSocket commands can interleave and silently lose an
    update. Yielding here via ``asyncio.sleep(0)`` reproduces that gap so
    the test can prove ``get_storage_lock`` closes it.
    """

    def __init__(self, value: dict[str, Any] | None = None) -> None:
        self.value = deepcopy(value)

    async def async_load(self) -> dict[str, Any] | None:
        """Return the stored value after yielding to the event loop."""

        await asyncio.sleep(0)
        return deepcopy(self.value)

    async def async_save(self, value: dict[str, Any]) -> None:
        """Persist a copy of the value after yielding to the event loop."""

        await asyncio.sleep(0)
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


async def test_concurrent_profile_saves_do_not_lose_updates(
    monkeypatch: Any,
) -> None:
    """Two admins saving different profiles at once must both be kept."""

    profile_store = InterleavingStore({"profiles": []})
    monkeypatch.setattr(
        websocket,
        "get_profile_store",
        lambda _hass: profile_store,
    )

    hass = SimpleNamespace(data={})
    handler = unwrap(websocket.websocket_save_profile)

    await asyncio.gather(
        handler(
            hass,
            ResultConnection(),
            {
                "id": 1,
                "name": "Design A",
                "settings": websocket.default_settings(),
            },
        ),
        handler(
            hass,
            ResultConnection(),
            {
                "id": 2,
                "name": "Design B",
                "settings": websocket.default_settings(),
            },
        ),
    )

    assert profile_store.value is not None
    stored_names = {
        profile["name"] for profile in profile_store.value["profiles"]
    }
    assert stored_names == {"Design A", "Design B"}


async def test_concurrent_background_uploads_do_not_lose_updates(
    monkeypatch: Any,
) -> None:
    """Two concurrent background uploads must both keep their metadata.

    ``async_load_backgrounds``/``async_save_backgrounds`` and the disk write
    are stubbed out so the test exercises only the storage race that
    ``get_storage_lock`` protects against, without touching the real
    filesystem.
    """

    background_state: dict[str, Any] = {"backgrounds": []}

    async def fake_load_backgrounds(_hass):
        await asyncio.sleep(0)
        return deepcopy(background_state["backgrounds"]), []

    async def fake_save_backgrounds(_hass, backgrounds):
        await asyncio.sleep(0)
        background_state["backgrounds"] = deepcopy(backgrounds)

    monkeypatch.setattr(
        websocket,
        "async_load_backgrounds",
        fake_load_backgrounds,
    )
    monkeypatch.setattr(
        websocket,
        "async_save_backgrounds",
        fake_save_backgrounds,
    )
    monkeypatch.setattr(
        websocket,
        "decode_and_write_background",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        websocket,
        "background_results",
        lambda _directory, backgrounds: backgrounds,
    )

    async def fake_executor_job(func, *args):
        return func(*args)

    hass = SimpleNamespace(
        data={},
        config=SimpleNamespace(path=lambda *parts: "/".join(parts)),
        async_add_executor_job=fake_executor_job,
    )
    handler = unwrap(websocket.websocket_upload_background)

    await asyncio.gather(
        handler(
            hass,
            ResultConnection(),
            {
                "id": 1,
                "name": "Sonnenuntergang",
                "mime_type": "image/png",
                "content": "irrelevant",
            },
        ),
        handler(
            hass,
            ResultConnection(),
            {
                "id": 2,
                "name": "Sonnenaufgang",
                "mime_type": "image/png",
                "content": "irrelevant",
            },
        ),
    )

    stored_names = {
        item["name"] for item in background_state["backgrounds"]
    }
    assert stored_names == {"Sonnenuntergang", "Sonnenaufgang"}
