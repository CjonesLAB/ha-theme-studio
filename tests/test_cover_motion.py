"""Tests for server-side timed cover motion safety."""

from __future__ import annotations

import asyncio
import inspect
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
import voluptuous as vol
from homeassistant.components.cover import CoverEntityFeature

from custom_components.theme_studio import cover_motion
from custom_components.theme_studio.const import DOMAIN
from custom_components.theme_studio.cover_motion import (
    DATA_COVER_MOTION_MANAGER,
    CoverMotionManager,
    websocket_cover_position_get,
    websocket_cover_position_set,
    websocket_cover_subscribe_position,
)


class MemoryStore:
    """Small in-memory replacement for Home Assistant storage."""

    def __init__(self, initial: dict | None = None) -> None:
        self.data = initial
        self.saved: list[dict] = []

    async def async_load(self) -> dict | None:
        return self.data

    async def async_save(self, value: dict) -> None:
        self.data = value
        self.saved.append(value)


class FakeServices:
    """Record cover service calls."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict]] = []
        self.fail_stop = False
        self.fail_stop_attempts = 0
        self.fail_move = False
        self.move_callback = None
        self.stop_callback = None
        self.blocked_services: dict[tuple[str, str], asyncio.Event] = {}

    async def async_call(
        self,
        domain: str,
        service: str,
        data: dict,
        **_kwargs,
    ) -> None:
        self.calls.append((domain, service, data))
        entity_id = data.get("entity_id", "")
        if gate := self.blocked_services.get((service, entity_id)):
            await gate.wait()
        if service in {"open_cover", "close_cover"} and self.move_callback is not None:
            self.move_callback()
        if service in {"open_cover", "close_cover"} and self.fail_move:
            raise RuntimeError("move failed")
        if service == "stop_cover" and self.stop_callback is not None:
            self.stop_callback()
        if service == "stop_cover" and (
            self.fail_stop or self.fail_stop_attempts > 0
        ):
            if self.fail_stop_attempts > 0:
                self.fail_stop_attempts -= 1
            raise RuntimeError("stop failed")


class FakeHass:
    """Provide the Home Assistant methods used by the motion manager."""

    def __init__(self) -> None:
        self.services = FakeServices()
        self.bus = FakeBus()
        self.background_tasks: list[asyncio.Task] = []
        self.states = FakeStates()
        self.data: dict = {}

    def async_create_background_task(
        self,
        coroutine,
        _name: str,
        eager_start: bool = True,
    ) -> asyncio.Task:
        del eager_start
        task = asyncio.create_task(coroutine)
        self.background_tasks.append(task)
        return task

    def async_create_task(
        self,
        coroutine,
        _name: str,
        eager_start: bool = True,
    ) -> asyncio.Task:
        del eager_start
        return asyncio.create_task(coroutine)


class FakeState:
    """Minimal Home Assistant cover state."""

    def __init__(self, supported_features: int) -> None:
        self.attributes = {"supported_features": supported_features}


class FakeStateValue:
    """Minimal state-change payload used by wall-button monitoring tests."""

    def __init__(self, state: str) -> None:
        self.state = state
        self.attributes = {}


class FakeBus:
    """Record events sent to other open dashboards."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []
        self.listeners: dict[str, list] = {}

    def async_fire(self, event_type: str, event_data: dict) -> None:
        self.events.append((event_type, event_data))
        for listener in tuple(self.listeners.get(event_type, [])):
            listener(SimpleNamespace(data=event_data))

    def async_listen(self, event_type: str, listener):
        self.listeners.setdefault(event_type, []).append(listener)

        def unsubscribe() -> None:
            self.listeners[event_type].remove(listener)

        return unsubscribe


class FakeStates:
    """Return controllable cover states for manager validation."""

    def __init__(self) -> None:
        self.entities = {
            "cover.terrace": FakeState(
                int(
                    CoverEntityFeature.OPEN
                    | CoverEntityFeature.CLOSE
                    | CoverEntityFeature.STOP
                )
            )
        }

    def get(self, entity_id: str) -> FakeState | None:
        return self.entities.get(entity_id)


async def test_timed_move_stops_once_after_duration() -> None:
    """A direct move command gets exactly one server-side stop."""

    hass = FakeHass()
    store = MemoryStore()
    sleep = AsyncMock()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=sleep,
    )
    result = await manager.async_start(
        "cover.terrace",
        "opening",
        9.6,
        fallback_position=0,
    )
    for _ in range(5):
        await asyncio.sleep(0)
    task = hass.background_tasks[-1]
    assert task.done(), task.get_stack()
    await task

    assert hass.services.calls == [
        ("cover", "open_cover", {"entity_id": "cover.terrace"}),
        ("cover", "stop_cover", {"entity_id": "cover.terrace"}),
    ]
    sleep.assert_awaited_once_with(9.6)
    assert result == {"duration": 9.6, "position": 0.0, "moved": True}
    assert store.data == {"active": {}, "positions": {"cover.terrace": 100.0}}
    assert hass.bus.events == [
        (
            "theme_studio_cover_position_changed",
            {
                "entity_id": "cover.terrace",
                "position": 0.0,
                "direction": "opening",
                "moving": True,
                "elapsed": 0.0,
            },
        ),
        (
            "theme_studio_cover_position_changed",
            {
                "entity_id": "cover.terrace",
                "position": 100.0,
                "motion_stopped": True,
            },
        )
    ]


async def test_manual_stop_cancels_pending_timer_without_second_stop() -> None:
    """The user's Stop action cancels the pending automatic stop."""

    hass = FakeHass()
    store = MemoryStore()
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
    )

    now = [20.0]
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start(
        "cover.terrace",
        "closing",
        12.0,
        fallback_position=100,
    )
    now[0] = 23.0
    position = await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert hass.services.calls == [
        ("cover", "close_cover", {"entity_id": "cover.terrace"}),
        ("cover", "stop_cover", {"entity_id": "cover.terrace"}),
    ]
    assert position == 75.0
    assert store.data == {"active": {}, "positions": {"cover.terrace": 75.0}}
    assert hass.bus.events == [
        (
            "theme_studio_cover_position_changed",
            {
                "entity_id": "cover.terrace",
                "position": 100.0,
                "direction": "closing",
                "moving": True,
                "elapsed": 0.0,
            },
        ),
        (
            "theme_studio_cover_position_changed",
            {
                "entity_id": "cover.terrace",
                "position": 75.0,
                "motion_stopped": True,
            },
        )
    ]


async def test_external_wall_motion_gets_a_server_side_safety_stop() -> None:
    """A wall-button movement is observed without sending a second move pulse."""

    hass = FakeHass()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 40.0}})
    sleep = AsyncMock()
    manager = CoverMotionManager(hass, store=store, sleep=sleep)
    await manager.async_setup()

    result = await manager.async_observe_external(
        "cover.terrace",
        "opening",
        10.0,
        fallback_position=40.0,
    )
    for _ in range(10):
        await asyncio.sleep(0)
    await hass.background_tasks[-1]

    assert result == {"duration": 6.0, "position": 40.0, "moved": True}
    assert hass.services.calls == [
        ("cover", "stop_cover", {"entity_id": "cover.terrace"})
    ]
    assert store.data == {"active": {}, "positions": {"cover.terrace": 100.0}}


async def test_stop_without_registered_motion_uses_live_visual_fallback() -> None:
    """Stopping an external ride never restores a stale stored endpoint."""

    hass = FakeHass()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 100.0}})
    manager = CoverMotionManager(hass, store=store)
    await manager.async_setup()

    position = await manager.async_stop(
        "cover.terrace",
        fallback_position=43.0,
    )

    assert position == 43.0
    assert store.data == {"active": {}, "positions": {"cover.terrace": 43.0}}
    assert hass.services.calls == [
        ("cover", "stop_cover", {"entity_id": "cover.terrace"})
    ]


async def test_second_wall_press_finishes_external_motion_without_extra_stop() -> None:
    """A wall-button stop cancels the timer and keeps the reached position."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [10.0]
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 40.0}})
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )
    await manager.async_setup()
    await manager.async_observe_external(
        "cover.terrace",
        "opening",
        10.0,
        fallback_position=40.0,
    )

    now[0] = 12.0
    position = await manager.async_observe_external_stop(
        "cover.terrace",
        fallback_position=60.0,
    )
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert position == 60.0
    assert hass.services.calls == []
    assert store.data == {"active": {}, "positions": {"cover.terrace": 60.0}}


async def test_configured_wall_motion_is_protected_without_an_open_dashboard() -> None:
    """Stored travel times let Home Assistant stop a wall-started ride itself."""

    hass = FakeHass()
    sleep = AsyncMock()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 0.0}})
    manager = CoverMotionManager(hass, store=store, sleep=sleep)
    await manager.async_setup()
    await manager.async_configure_external_monitoring(
        "cover.terrace",
        opening_time=10.0,
        closing_time=12.0,
        enabled=True,
    )

    hass.bus.async_fire(
        "state_changed",
        {
            "entity_id": "cover.terrace",
            "old_state": FakeStateValue("stopped"),
            "new_state": FakeStateValue("opening"),
        },
    )
    for _ in range(20):
        await asyncio.sleep(0)
        if hass.background_tasks and hass.background_tasks[-1].done():
            break
    await hass.background_tasks[-1]

    assert hass.services.calls == [
        ("cover", "stop_cover", {"entity_id": "cover.terrace"})
    ]
    assert store.data["positions"] == {"cover.terrace": 100.0}
    assert store.data["travel_times"] == {
        "cover.terrace": {"opening": 10.0, "closing": 12.0}
    }


async def test_repeated_same_wall_signal_does_not_fake_a_two_button_stop() -> None:
    """A repeated direction update cannot safely impersonate the opposite button."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [10.0]
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 20.0}})
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )
    await manager.async_setup()
    await manager.async_configure_external_monitoring(
        "cover.terrace",
        opening_time=10.0,
        closing_time=12.0,
        enabled=True,
    )
    await manager.async_observe_external(
        "cover.terrace",
        "opening",
        10.0,
        fallback_position=20.0,
    )

    now[0] = 12.0
    hass.bus.async_fire(
        "state_changed",
        {
            "entity_id": "cover.terrace",
            "old_state": FakeStateValue("opening"),
            "new_state": FakeStateValue("opening"),
        },
    )
    for _ in range(20):
        await asyncio.sleep(0)
        if hass.services.calls:
            break
    assert hass.services.calls == []
    snapshot = manager.position_snapshot("cover.terrace")
    assert snapshot["moving"] is True
    assert snapshot["direction"] == "opening"
    for task in hass.background_tasks:
        if not task.done():
            task.cancel()
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_setup_stops_motion_remembered_before_restart() -> None:
    """Restart recovery waits for entities, then stops and drops stale position."""

    hass = FakeHass()
    store = MemoryStore(
        {
            "active": {
                "cover.terrace": {
                    "direction": "opening",
                    "duration": 9.6,
                }
            },
            "positions": {"cover.terrace": 45.0},
        }
    )
    manager = CoverMotionManager(hass, store=store)

    await manager.async_setup()
    assert hass.services.calls == []
    assert store.data["active"]
    assert manager.position_snapshot("cover.terrace") == {
        "entity_id": "cover.terrace",
        "position": None,
        "moving": False,
        "motion_stopped": True,
        "stop_failed": False,
        "initial": True,
    }

    await manager.async_recover()

    assert hass.services.calls == [
        ("cover", "stop_cover", {"entity_id": "cover.terrace"})
    ]
    assert store.data == {"active": {}, "positions": {}}


async def test_restart_recovery_retries_when_missing_entity_appears(monkeypatch) -> None:
    """A cover missing during startup is stopped as soon as it appears."""

    hass = FakeHass()
    hass.states.entities.pop("cover.terrace")
    store = MemoryStore(
        {
            "active": {"cover.terrace": {"direction": "closing"}},
            "positions": {"cover.terrace": 70.0},
        }
    )
    manager = CoverMotionManager(hass, store=store)
    retry = {}

    def capture_state_listener(_hass, entity_ids, listener):
        retry["entities"] = entity_ids
        retry["listener"] = listener
        return Mock()

    monkeypatch.setattr(
        cover_motion,
        "async_track_state_change_event",
        capture_state_listener,
    )

    await manager.async_setup()
    await manager.async_recover()

    assert hass.services.calls == []
    assert store.data["active"] == {
        "cover.terrace": {
            "direction": "closing",
            "recovery_pending": True,
        }
    }
    assert store.data["positions"] == {"cover.terrace": 70.0}

    hass.states.entities["cover.terrace"] = FakeState(
        int(CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE | CoverEntityFeature.STOP)
    )
    retry["listener"](SimpleNamespace())
    for _ in range(5):
        await asyncio.sleep(0)

    assert retry["entities"] == {"cover.terrace"}
    assert [call[1] for call in hass.services.calls] == ["stop_cover"]
    assert store.data == {"active": {}, "positions": {}}


async def test_failed_stop_remains_recorded_without_automatic_retry() -> None:
    """A failed stop is retained for recovery but not retried in a loop."""

    hass = FakeHass()
    hass.services.fail_stop = True
    store = MemoryStore()
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        30.0,
        fallback_position=0,
    )
    with pytest.raises(RuntimeError, match="stop failed"):
        await manager.async_stop("cover.terrace")

    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
    ]
    assert "cover.terrace" in store.data["active"]
    assert not hass.background_tasks[-1].done()
    hass.services.fail_stop = False
    await manager.async_shutdown()
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_learning_ride_stops_and_returns_measured_duration() -> None:
    """Finishing a learning ride stops first and returns its duration."""

    hass = FakeHass()
    store = MemoryStore()
    never = asyncio.Event()
    now = [100.0]
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start_learning("cover.terrace", "opening")
    now[0] = 109.64
    result = await manager.async_finish_learning("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert result == {"duration": 9.6, "position": 100.0}
    assert hass.services.calls == [
        ("cover", "open_cover", {"entity_id": "cover.terrace"}),
        ("cover", "stop_cover", {"entity_id": "cover.terrace"}),
    ]
    assert store.data == {"active": {}, "positions": {"cover.terrace": 100.0}}
    assert hass.bus.events[-1] == (
        "theme_studio_cover_position_changed",
        {
            "entity_id": "cover.terrace",
            "position": 100.0,
            "motion_stopped": True,
        },
    )


async def test_learning_duration_excludes_stop_service_latency() -> None:
    """The measured ride ends when Stop is requested, not when it returns."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [100.0]
    hass.services.stop_callback = lambda: now.__setitem__(0, 110.6)
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start_learning("cover.terrace", "opening")
    now[0] = 109.6
    result = await manager.async_finish_learning("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert result == {"duration": 9.6, "position": 100.0}


async def test_learning_duration_starts_after_move_service_returns() -> None:
    """Move-service latency is not counted as physical learning travel."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [100.0]
    hass.services.move_callback = lambda: now.__setitem__(0, 102.0)
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start_learning("cover.terrace", "opening")
    now[0] = 109.6
    result = await manager.async_finish_learning("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert result == {"duration": 7.6, "position": 100.0}


async def test_learning_ride_has_server_side_safety_stop() -> None:
    """An unfinished learning ride is stopped by the backend timeout."""

    hass = FakeHass()
    store = MemoryStore()
    sleep = AsyncMock()
    manager = CoverMotionManager(hass, store=store, sleep=sleep)

    await manager.async_start_learning("cover.terrace", "closing")
    for _ in range(5):
        await asyncio.sleep(0)
    await hass.background_tasks[-1]

    assert hass.services.calls == [
        ("cover", "close_cover", {"entity_id": "cover.terrace"}),
        ("cover", "stop_cover", {"entity_id": "cover.terrace"}),
    ]
    sleep.assert_awaited_once_with(60.0)
    assert store.data == {"active": {}, "positions": {}}
    assert hass.bus.events[-1] == (
        "theme_studio_cover_position_changed",
        {
            "entity_id": "cover.terrace",
            "position": None,
            "motion_stopped": True,
        },
    )
async def test_learning_finish_handles_expired_timer_without_key_error() -> None:
    """A timer race reports an expired ride instead of indexing stale state."""

    hass = FakeHass()
    manager = CoverMotionManager(hass, store=MemoryStore())
    manager._learning_started["cover.terrace"] = 10.0

    with pytest.raises(vol.Invalid, match="No learning ride is active"):
        await manager.async_finish_learning("cover.terrace")

    assert hass.services.calls == []


async def test_timed_move_rejects_cover_without_stop_support() -> None:
    """A timed move never starts when Home Assistant cannot stop the cover."""

    hass = FakeHass()
    hass.states.entities["cover.terrace"] = FakeState(
        int(CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE)
    )
    manager = CoverMotionManager(hass, store=MemoryStore())

    with pytest.raises(vol.Invalid, match="does not support Stop"):
        await manager.async_start(
            "cover.terrace",
            "opening",
            9.6,
            fallback_position=0,
        )

    assert hass.services.calls == []


async def test_timed_move_rejects_excessive_client_duration() -> None:
    """A manipulated client cannot keep a motor active beyond the safety limit."""

    hass = FakeHass()
    manager = CoverMotionManager(hass, store=MemoryStore())

    with pytest.raises(vol.Invalid, match="between 0.1 and 600"):
        await manager.async_start(
            "cover.terrace",
            "opening",
            600.1,
            fallback_position=0,
        )

    assert hass.services.calls == []


async def test_timed_move_rejects_missing_cover_entity() -> None:
    """A stale or invented cover ID cannot trigger a timed movement."""

    hass = FakeHass()
    manager = CoverMotionManager(hass, store=MemoryStore())

    with pytest.raises(vol.Invalid, match="does not exist"):
        await manager.async_start(
            "cover.missing",
            "opening",
            9.6,
            fallback_position=0,
        )

    assert hass.services.calls == []


async def test_server_position_overrides_stale_browser_fallback() -> None:
    """A persisted position is the shared source for later partial travel."""

    hass = FakeHass()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 25.0}})
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
    )
    await manager.async_setup()

    result = await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=90,
    )
    await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert result == {"duration": 15.0, "position": 25.0, "moved": True}


async def test_position_can_be_resynchronized_without_moving_motor() -> None:
    """Marking an endpoint stores it but never calls a cover service."""

    hass = FakeHass()
    store = MemoryStore()
    manager = CoverMotionManager(hass, store=store)

    position = await manager.async_set_position("cover.terrace", 100)

    assert position == 100.0
    assert await manager.async_get_position("cover.terrace") == 100.0
    assert hass.services.calls == []
    assert store.data == {"active": {}, "positions": {"cover.terrace": 100.0}}
    assert hass.bus.events == [
        (
            "theme_studio_cover_position_changed",
            {"entity_id": "cover.terrace", "position": 100.0},
        )
    ]


async def test_position_sync_rejects_missing_cover_entity() -> None:
    """An estimate cannot be stored for an entity that does not exist."""

    hass = FakeHass()
    manager = CoverMotionManager(hass, store=MemoryStore())

    with pytest.raises(vol.Invalid, match="does not exist"):
        await manager.async_set_position("cover.missing", 50)


async def test_position_websockets_return_specific_error_codes() -> None:
    """Invalid position requests return stable card-facing WebSocket errors."""

    manager = SimpleNamespace(
        async_get_position=AsyncMock(side_effect=vol.Invalid("bad get")),
        async_set_position=AsyncMock(side_effect=vol.Invalid("bad set")),
    )
    hass = FakeHass()
    hass.data[DOMAIN] = {DATA_COVER_MOTION_MANAGER: manager}
    connection = SimpleNamespace(
        user=SimpleNamespace(
            id="user",
            permissions=SimpleNamespace(check_entity=lambda *_args: True),
        ),
        errors=[],
        results=[],
    )
    connection.send_error = lambda msg_id, code, message: connection.errors.append(
        (msg_id, code, message)
    )
    connection.send_result = lambda msg_id, result=None: connection.results.append(
        (msg_id, result)
    )

    await websocket_cover_position_get.__wrapped__(
        hass,
        connection,
        {"id": 51, "entity_id": "cover.terrace"},
    )
    await websocket_cover_position_set.__wrapped__(
        hass,
        connection,
        {"id": 52, "entity_id": "cover.terrace", "position": 50},
    )

    assert connection.errors == [
        (51, "cover_position_get_failed", "bad get"),
        (52, "cover_position_set_failed", "bad set"),
    ]
    assert connection.results == []


async def test_position_subscription_works_for_non_admin_with_read_access() -> None:
    """A restricted dashboard user can receive updates for an allowed cover."""

    hass = FakeHass()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore({"active": {}, "positions": {"cover.terrace": 37.0}}),
    )
    await manager.async_setup()
    hass.data[DOMAIN] = {DATA_COVER_MOTION_MANAGER: manager}

    class Permissions:
        def check_entity(self, entity_id: str, policy: str) -> bool:
            return entity_id == "cover.terrace" and policy == "read"

    connection = SimpleNamespace(
        user=SimpleNamespace(
            id="restricted-user",
            is_admin=False,
            permissions=Permissions(),
        ),
        subscriptions={},
        results=[],
        events=[],
        errors=[],
    )
    connection.send_result = lambda msg_id, result=None: connection.results.append(
        (msg_id, result)
    )
    connection.send_event = lambda msg_id, event=None: connection.events.append(
        (msg_id, event)
    )
    connection.send_error = lambda msg_id, code, message: connection.errors.append(
        (msg_id, code, message)
    )

    websocket_cover_subscribe_position(
        hass,
        connection,
        {
            "id": 41,
            "type": "theme_studio/cover/subscribe_position",
            "entity_id": "cover.terrace",
        },
    )
    hass.bus.async_fire(
        "theme_studio_cover_position_changed",
        {"entity_id": "cover.terrace", "position": 44.0},
    )

    assert connection.results == [(41, None)]
    assert connection.events == [
        (
            41,
            {
                "entity_id": "cover.terrace",
                "position": 37.0,
                "initial": True,
            },
        ),
        (41, {"entity_id": "cover.terrace", "position": 44.0})
    ]
    assert connection.errors == []
    assert hass.services.calls == []


async def test_position_subscription_reports_active_motion_without_wall_clock() -> None:
    """A reconnect receives a server-timed snapshot without browser clock math."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [10.0]
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )
    hass.data[DOMAIN] = {DATA_COVER_MOTION_MANAGER: manager}
    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )
    now[0] = 14.5

    class Permissions:
        def check_entity(self, entity_id: str, policy: str) -> bool:
            return entity_id == "cover.terrace" and policy == "read"

    connection = SimpleNamespace(
        user=SimpleNamespace(id="user", permissions=Permissions()),
        subscriptions={},
        results=[],
        events=[],
        errors=[],
    )
    connection.send_result = lambda msg_id, result=None: connection.results.append(
        (msg_id, result)
    )
    connection.send_event = lambda msg_id, event=None: connection.events.append(
        (msg_id, event)
    )
    connection.send_error = lambda msg_id, code, message: connection.errors.append(
        (msg_id, code, message)
    )

    websocket_cover_subscribe_position(
        hass,
        connection,
        {
            "id": 42,
            "type": "theme_studio/cover/subscribe_position",
            "entity_id": "cover.terrace",
        },
    )

    assert connection.events == [
        (
            42,
            {
                "entity_id": "cover.terrace",
                "position": 0.0,
                "direction": "opening",
                "moving": True,
                "elapsed": 4.5,
                "initial": True,
            },
        )
    ]
    assert hass.services.calls == [
        ("cover", "open_cover", {"entity_id": "cover.terrace"})
    ]

    await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_move_at_target_is_a_noop() -> None:
    """An already reached endpoint never receives another motor pulse."""

    hass = FakeHass()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": 100.0}})
    manager = CoverMotionManager(hass, store=store)
    await manager.async_setup()

    result = await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )

    assert result == {"duration": 0.0, "position": 100.0, "moved": False}
    assert hass.services.calls == []
    assert hass.background_tasks == []


async def test_reversing_direction_uses_position_reached_before_stop() -> None:
    """A reverse command starts from the current estimate, not the old start."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [10.0]
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )
    now[0] = 15.0
    result = await manager.async_start(
        "cover.terrace",
        "closing",
        20.0,
        fallback_position=0,
    )

    assert result == {"duration": 5.0, "position": 25.0, "moved": True}
    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
        "close_cover",
    ]
    await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_position_get_reports_progress_during_active_motion() -> None:
    """The fallback position endpoint returns the live server estimate."""

    hass = FakeHass()
    never = asyncio.Event()
    now = [30.0]
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        clock=lambda: now[0],
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )
    now[0] = 35.0

    assert await manager.async_get_position("cover.terrace") == 25.0
    await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_position_set_is_rejected_during_active_motion() -> None:
    """A manual estimate cannot be overwritten by the running timer."""

    hass = FakeHass()
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
    )
    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )

    with pytest.raises(vol.Invalid, match="while the cover is moving"):
        await manager.async_set_position("cover.terrace", 60)

    await manager.async_stop("cover.terrace")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_safety_stop_retries_twice_then_finishes_motion() -> None:
    """A temporary stop failure gets bounded safety retries."""

    hass = FakeHass()
    hass.services.fail_stop_attempts = 2
    store = MemoryStore()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=AsyncMock(),
        retry_sleep=AsyncMock(),
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        10.0,
        fallback_position=0,
    )
    for _ in range(10):
        await asyncio.sleep(0)
    await hass.background_tasks[-1]

    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
        "stop_cover",
        "stop_cover",
    ]
    assert store.data == {"active": {}, "positions": {"cover.terrace": 100.0}}


async def test_failed_automatic_stop_freezes_dashboards_but_keeps_recovery() -> None:
    """A final Stop failure remains recoverable and ends remote animation."""

    hass = FakeHass()
    hass.services.fail_stop = True
    store = MemoryStore()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=AsyncMock(),
        retry_sleep=AsyncMock(),
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        10.0,
        fallback_position=0,
    )
    for _ in range(10):
        await asyncio.sleep(0)
    await hass.background_tasks[-1]

    assert "cover.terrace" in store.data["active"]
    assert hass.bus.events[-1] == (
        "theme_studio_cover_position_changed",
        {
            "entity_id": "cover.terrace",
            "position": None,
            "motion_stopped": True,
            "stop_failed": True,
        },
    )
    assert manager.position_snapshot("cover.terrace") == {
        "entity_id": "cover.terrace",
        "position": None,
        "moving": False,
        "motion_stopped": True,
        "stop_failed": True,
        "initial": True,
    }


async def test_stop_is_sent_immediately_while_move_command_is_pending() -> None:
    """Emergency Stop does not wait for a blocking Move service call."""

    hass = FakeHass()
    gate = asyncio.Event()
    hass.services.blocked_services[("open_cover", "cover.terrace")] = gate
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
    )

    start_task = asyncio.create_task(
        manager.async_start(
            "cover.terrace",
            "opening",
            20.0,
            fallback_position=0,
        )
    )
    for _ in range(3):
        await asyncio.sleep(0)
    stop_task = asyncio.create_task(manager.async_stop("cover.terrace"))
    for _ in range(3):
        await asyncio.sleep(0)

    calls_while_move_pending = [call[1] for call in hass.services.calls]
    stop_still_pending = not stop_task.done()
    gate.set()
    await start_task
    await stop_task
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert calls_while_move_pending == ["open_cover", "stop_cover"]
    assert stop_still_pending
    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
        "stop_cover",
    ]
    assert "cover.terrace" not in manager._active
    assert "cover.terrace" not in manager._tasks


async def test_move_failure_rolls_back_timer_and_position() -> None:
    """A rejected Move command cannot leave a phantom active ride behind."""

    hass = FakeHass()
    hass.services.fail_move = True
    store = MemoryStore()
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=store,
        sleep=lambda _duration: never.wait(),
    )

    with pytest.raises(RuntimeError, match="move failed"):
        await manager.async_start(
            "cover.terrace",
            "opening",
            20.0,
            fallback_position=25,
        )
    stored_after_failure = store.data
    active_after_failure = dict(manager._active)
    task_after_failure = manager._tasks.get("cover.terrace")
    event_after_failure = hass.bus.events[-1]
    hass.services.fail_move = False
    await manager.async_shutdown()
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert stored_after_failure == {
        "active": {},
        "positions": {"cover.terrace": 25.0},
    }
    assert active_after_failure == {}
    assert task_after_failure is None
    assert event_after_failure == (
        "theme_studio_cover_position_changed",
        {
            "entity_id": "cover.terrace",
            "position": 25.0,
            "motion_stopped": True,
        },
    )


async def test_move_timeout_keeps_safety_timer_active() -> None:
    """An uncertain Move timeout retains the backend safety stop."""

    hass = FakeHass()
    gate = asyncio.Event()
    hass.services.blocked_services[("open_cover", "cover.terrace")] = gate
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        move_call_timeout=0.01,
    )

    result = await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )

    assert result["moved"] is True
    assert "cover.terrace" in manager._active
    assert not manager._tasks["cover.terrace"].done()
    pending_move = manager._move_tasks["cover.terrace"]
    assert not pending_move.cancelled()
    assert not pending_move.done()
    await manager.async_stop("cover.terrace")
    hass.services.blocked_services.clear()
    gate.set()
    await pending_move
    for _ in range(5):
        await asyncio.sleep(0)
    await manager.async_shutdown()
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
        "stop_cover",
    ]


async def test_automatic_stop_is_repeated_after_delayed_move_finishes() -> None:
    """A late Move completion cannot restart the motor after its safety stop."""

    hass = FakeHass()
    gate = asyncio.Event()
    hass.services.blocked_services[("open_cover", "cover.terrace")] = gate
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=AsyncMock(),
        move_call_timeout=0.01,
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )
    pending_move = manager._move_tasks["cover.terrace"]
    for _ in range(10):
        await asyncio.sleep(0)
    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
    ]

    gate.set()
    await pending_move
    for _ in range(10):
        await asyncio.sleep(0)

    assert [call[1] for call in hass.services.calls] == [
        "open_cover",
        "stop_cover",
        "stop_cover",
    ]


async def test_second_move_is_rejected_while_first_service_call_is_pending() -> None:
    """A late first command cannot overwrite tracking for a newer direction."""

    hass = FakeHass()
    gate = asyncio.Event()
    hass.services.blocked_services[("open_cover", "cover.terrace")] = gate
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
        move_call_timeout=0.01,
    )

    await manager.async_start(
        "cover.terrace",
        "opening",
        20.0,
        fallback_position=0,
    )
    pending_move = manager._move_tasks["cover.terrace"]
    rejection = None
    try:
        await manager.async_start(
            "cover.terrace",
            "closing",
            20.0,
            fallback_position=50,
        )
    except vol.Invalid as error:
        rejection = error
    gate.set()
    await pending_move
    for _ in range(10):
        await asyncio.sleep(0)
    await manager.async_shutdown()
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)

    assert rejection is not None
    assert "still running" in str(rejection)


async def test_schedule_recovery_registers_an_async_callback(monkeypatch) -> None:
    """Home Assistant startup receives an awaitable recovery callback."""

    hass = FakeHass()
    registered = {}

    def capture_callback(_hass, callback):
        registered["callback"] = callback
        return Mock()

    monkeypatch.setattr(cover_motion, "async_at_start", capture_callback)
    manager = CoverMotionManager(hass, store=MemoryStore())
    manager.async_recover = AsyncMock()

    manager.schedule_recovery()

    callback = registered["callback"]
    assert inspect.iscoroutinefunction(callback)
    await callback(hass)
    manager.async_recover.assert_awaited_once_with()


async def test_blocked_cover_does_not_block_a_different_cover() -> None:
    """One slow integration call cannot block another physical cover."""

    hass = FakeHass()
    hass.states.entities["cover.patio"] = FakeState(
        int(CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE | CoverEntityFeature.STOP)
    )
    gate = asyncio.Event()
    hass.services.blocked_services[("open_cover", "cover.terrace")] = gate
    never = asyncio.Event()
    manager = CoverMotionManager(
        hass,
        store=MemoryStore(),
        sleep=lambda _duration: never.wait(),
    )

    blocked_start = asyncio.create_task(
        manager.async_start(
            "cover.terrace",
            "opening",
            20.0,
            fallback_position=0,
        )
    )
    for _ in range(3):
        await asyncio.sleep(0)
    assert "cover.terrace" in manager._tasks
    assert not manager._tasks["cover.terrace"].done()

    other_result = await asyncio.wait_for(
        manager.async_start(
            "cover.patio",
            "opening",
            20.0,
            fallback_position=0,
        ),
        timeout=0.1,
    )
    assert other_result["moved"] is True

    gate.set()
    await blocked_start
    await manager.async_stop("cover.terrace")
    await manager.async_stop("cover.patio")
    await asyncio.gather(*hass.background_tasks, return_exceptions=True)


async def test_restore_rejects_boolean_position() -> None:
    """Boolean storage values are not valid cover percentages."""

    hass = FakeHass()
    store = MemoryStore({"active": {}, "positions": {"cover.terrace": True}})
    manager = CoverMotionManager(hass, store=store)

    await manager.async_setup()

    assert await manager.async_get_position("cover.terrace") is None
