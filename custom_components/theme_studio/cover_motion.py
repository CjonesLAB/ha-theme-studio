"""Server-side safety timer for Theme Studio cover cards."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections.abc import Awaitable, Callable
from contextlib import suppress
from typing import Any

import voluptuous as vol
from homeassistant.auth.permissions.const import POLICY_CONTROL, POLICY_READ
from homeassistant.components import websocket_api
from homeassistant.components.cover import CoverEntityFeature
from homeassistant.core import Context, HomeAssistant, callback
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.start import async_at_start
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.cover_motion"
DATA_COVER_MOTION_MANAGER = "cover_motion_manager"
MAX_TRAVEL_TIME = 600.0
LEARNING_SAFETY_TIMEOUT = 60.0
STOP_RETRY_ATTEMPTS = 3
STOP_RETRY_DELAY = 0.5
MOVE_CALL_TIMEOUT = 10.0
EVENT_COVER_POSITION_CHANGED = "theme_studio_cover_position_changed"
_COVER_ENTITY_PATTERN = re.compile(r"^cover\.[a-z0-9_]+$")


class CoverMotionManager:
    """Run timed cover movement independently from the browser."""

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        store: Store[dict[str, Any]] | Any | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        retry_sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        clock: Callable[[], float] = time.monotonic,
        move_call_timeout: float = MOVE_CALL_TIMEOUT,
    ) -> None:
        self.hass = hass
        self._store = store or Store[dict[str, Any]](
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
        )
        self._active: dict[str, dict[str, Any]] = {}
        self._positions: dict[str, float] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._move_tasks: dict[str, asyncio.Task[None]] = {}
        self._stop_after_move: set[str] = set()
        self._learning_started: dict[str, float] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._sleep = sleep
        self._retry_sleep = retry_sleep
        self._clock = clock
        self._move_call_timeout = move_call_timeout
        self._cancel_recovery: Callable[[], None] | None = None
        self._cancel_recovery_listener: Callable[[], None] | None = None

    async def async_setup(self) -> None:
        """Load persisted motion state before startup recovery runs."""

        raw = await self._store.async_load()
        stored_active = raw.get("active", {}) if isinstance(raw, dict) else {}
        stored_positions = raw.get("positions", {}) if isinstance(raw, dict) else {}
        self._active = {
            entity_id: {**dict(details), "recovery_pending": True}
            for entity_id, details in stored_active.items()
            if _COVER_ENTITY_PATTERN.fullmatch(str(entity_id))
            and isinstance(details, dict)
        }
        self._positions = {
            entity_id: float(position)
            for entity_id, position in stored_positions.items()
            if _COVER_ENTITY_PATTERN.fullmatch(str(entity_id))
            and isinstance(position, int | float)
            and not isinstance(position, bool)
            and 0 <= float(position) <= 100
        }
        await self._async_save()

    def schedule_recovery(self) -> None:
        """Recover unfinished movement after Home Assistant has started."""

        if self._cancel_recovery is not None:
            self._cancel_recovery()

        async def _recover(_hass: HomeAssistant) -> None:
            await self.async_recover()

        self._cancel_recovery = async_at_start(self.hass, _recover)

    async def async_recover(self) -> None:
        """Stop persisted movement only after cover entities are available."""

        self._cancel_recovery = None
        if self._cancel_recovery_listener is not None:
            self._cancel_recovery_listener()
            self._cancel_recovery_listener = None
        missing_entities: set[str] = set()
        for entity_id in tuple(self._active):
            if self.hass.states.get(entity_id) is None:
                _LOGGER.warning(
                    "Cannot recover unfinished cover motion because %s is unavailable",
                    entity_id,
                )
                missing_entities.add(entity_id)
                continue
            async with self._lock_for(entity_id):
                if entity_id not in self._active:
                    continue
                try:
                    await self._async_issue_stop(entity_id)
                except Exception:  # noqa: BLE001 - preserve recovery marker
                    _LOGGER.exception(
                        "Could not stop unfinished cover motion for %s",
                        entity_id,
                    )
                    continue
                self._active.pop(entity_id, None)
                self._learning_started.pop(entity_id, None)
                self._positions.pop(entity_id, None)
                await self._async_save()
                self._publish_position(
                    entity_id,
                    None,
                    motion_stopped=True,
                )
        if missing_entities:
            @callback
            def _retry_recovery(_event: Any) -> None:
                self.hass.async_create_task(
                    self.async_recover(),
                    "Theme Studio retry cover recovery",
                )

            self._cancel_recovery_listener = async_track_state_change_event(
                self.hass,
                missing_entities,
                _retry_recovery,
            )

    async def async_start(
        self,
        entity_id: str,
        direction: str,
        full_duration: float,
        *,
        fallback_position: float,
        context: Context | None = None,
    ) -> dict[str, float]:
        """Start movement and schedule a bounded server-side safety stop."""

        entity_id = self._validate_entity_id(entity_id)
        self._validate_stop_support(entity_id)
        if direction not in {"opening", "closing"}:
            raise vol.Invalid("Unsupported cover direction")
        seconds = float(full_duration)
        if not 0.1 <= seconds <= MAX_TRAVEL_TIME:
            raise vol.Invalid("Cover travel time must be between 0.1 and 600 seconds")
        fallback = self._validate_position(fallback_position)
        lock = self._lock_for(entity_id)
        async with lock:
            self._reject_pending_move(entity_id)
            if entity_id in self._active:
                await self._async_stop_locked(entity_id, context=context)
            position = self._positions.get(entity_id, fallback)
            remaining_fraction = (
                (100.0 - position) / 100.0
                if direction == "opening"
                else position / 100.0
            )
            if remaining_fraction <= 0:
                return {"duration": 0.0, "position": position, "moved": False}
            remaining_duration = max(0.1, round(seconds * remaining_fraction, 3))
            await self._async_begin_and_issue_motion_locked(
                entity_id,
                direction,
                remaining_duration,
                kind="timed",
                start_position=position,
                full_duration=seconds,
                context=context,
            )
        return {"duration": remaining_duration, "position": position, "moved": True}

    async def async_start_learning(
        self,
        entity_id: str,
        direction: str,
        *,
        context: Context | None = None,
    ) -> None:
        """Start a measured ride with a server-side safety timeout."""

        entity_id = self._validate_entity_id(entity_id)
        self._validate_stop_support(entity_id)
        if direction not in {"opening", "closing"}:
            raise vol.Invalid("Unsupported cover direction")
        lock = self._lock_for(entity_id)
        async with lock:
            self._reject_pending_move(entity_id)
            if entity_id in self._active:
                await self._async_stop_locked(entity_id, context=context)
            await self._async_begin_and_issue_motion_locked(
                entity_id,
                direction,
                LEARNING_SAFETY_TIMEOUT,
                kind="learning",
                start_position=0.0 if direction == "opening" else 100.0,
                full_duration=None,
                context=context,
            )

    async def async_finish_learning(
        self,
        entity_id: str,
        *,
        context: Context | None = None,
    ) -> dict[str, float]:
        """Stop a learning ride and return the measured duration."""

        entity_id = self._validate_entity_id(entity_id)
        async with self._lock_for(entity_id):
            started_at = self._learning_started.get(entity_id)
            details = self._active.get(entity_id)
            if started_at is None or not details or details.get("kind") != "learning":
                raise vol.Invalid("No learning ride is active for this cover")
            ended_at = self._clock()
            await self._async_issue_stop(entity_id, context=context)
            await self._async_cancel_timer(entity_id)
            duration = round(max(0.1, ended_at - started_at), 1)
            direction = details["direction"]
            position = 100.0 if direction == "opening" else 0.0
            self._positions[entity_id] = position
            self._active.pop(entity_id, None)
            self._learning_started.pop(entity_id, None)
            await self._async_save()
            self._publish_position(entity_id, position, motion_stopped=True)
        return {"duration": duration, "position": position}

    async def async_stop(
        self,
        entity_id: str,
        *,
        context: Context | None = None,
    ) -> float | None:
        """Cancel a pending timer and stop the cover immediately."""

        entity_id = self._validate_entity_id(entity_id)
        lock = self._lock_for(entity_id)
        move_task = self._move_tasks.get(entity_id)
        immediate_stop_sent = move_task is not None and not move_task.done()
        if immediate_stop_sent:
            self._stop_after_move.add(entity_id)
            await self._async_issue_stop(entity_id, context=context)
        async with lock:
            pending_move = self._move_tasks.get(entity_id)
            issue_stop = not immediate_stop_sent or pending_move is None or pending_move.done()
            position = await self._async_stop_locked(
                entity_id,
                context=context,
                issue_stop=issue_stop,
            )
            if pending_move is None or pending_move.done():
                self._stop_after_move.discard(entity_id)
            return position

    async def async_get_position(self, entity_id: str) -> float | None:
        """Return the shared estimated position for a positionless cover."""

        entity_id = self._validate_entity_id(entity_id)
        self._validate_entity_exists(entity_id)
        return self._calculate_active_position(entity_id)

    def position_snapshot(self, entity_id: str) -> dict[str, Any]:
        """Return a display-only snapshot for a newly connected dashboard."""

        entity_id = self._validate_entity_id(entity_id)
        self._validate_entity_exists(entity_id)
        details = self._active.get(entity_id)
        if details:
            if details.get("stop_failed") or details.get("recovery_pending"):
                return {
                    "entity_id": entity_id,
                    "position": None,
                    "moving": False,
                    "motion_stopped": True,
                    "stop_failed": bool(details.get("stop_failed")),
                    "initial": True,
                }
            started_at = details.get("started_at")
            if not isinstance(started_at, int | float):
                started_at = self._clock()
            elapsed = max(
                0.0,
                self._clock() - float(started_at),
            )
            return {
                "entity_id": entity_id,
                "position": self._positions.get(
                    entity_id,
                    float(details.get("start_position", 50.0)),
                ),
                "direction": details.get("direction"),
                "moving": True,
                "elapsed": round(elapsed, 3),
                "initial": True,
            }
        return {
            "entity_id": entity_id,
            "position": self._positions.get(entity_id),
            "initial": True,
        }

    async def async_set_position(self, entity_id: str, position: float) -> float:
        """Synchronize an estimate without moving the physical cover."""

        entity_id = self._validate_entity_id(entity_id)
        self._validate_entity_exists(entity_id)
        normalized = self._validate_position(position)
        async with self._lock_for(entity_id):
            if entity_id in self._active:
                raise vol.Invalid("Position cannot be changed while the cover is moving")
            self._positions[entity_id] = normalized
            await self._async_save()
            self._publish_position(entity_id, normalized)
        return normalized

    async def async_shutdown(self) -> None:
        """Stop every active motion before the integration unloads."""

        if self._cancel_recovery is not None:
            self._cancel_recovery()
            self._cancel_recovery = None
        if self._cancel_recovery_listener is not None:
            self._cancel_recovery_listener()
            self._cancel_recovery_listener = None

        for entity_id in tuple(self._active):
            try:
                await self.async_stop(entity_id)
            except Exception:  # noqa: BLE001 - retain recovery marker
                _LOGGER.exception(
                    "Could not stop cover motion while unloading: %s",
                    entity_id,
                )
        for entity_id in tuple(self._tasks):
            await self._async_cancel_timer(entity_id)
        for entity_id, task in tuple(self._move_tasks.items()):
            self._stop_after_move.add(entity_id)
            if not task.done():
                with suppress(Exception):
                    await self._async_issue_stop(entity_id)

    async def _async_wait_and_stop(
        self,
        entity_id: str,
        duration: float,
        context: Context | None,
    ) -> None:
        details: dict[str, Any] | None = None
        try:
            await self._sleep(duration)
            current_task = asyncio.current_task()
            if self._tasks.get(entity_id) is not current_task:
                return
            details = self._active.get(entity_id)
            if not details:
                return
            move_task = self._move_tasks.get(entity_id)
            immediate_stop_sent = move_task is not None and not move_task.done()
            if immediate_stop_sent:
                self._stop_after_move.add(entity_id)
                await self._async_issue_stop_with_retries(
                    entity_id,
                    context=context,
                )
            async with self._lock_for(entity_id):
                if self._tasks.get(entity_id) is not current_task:
                    return
                if self._active.get(entity_id) is not details:
                    return
                pending_move = self._move_tasks.get(entity_id)
                if not immediate_stop_sent or pending_move is None or pending_move.done():
                    await self._async_issue_stop_with_retries(
                        entity_id,
                        context=context,
                    )
                    self._stop_after_move.discard(entity_id)
                if details.get("kind") == "timed":
                    self._positions[entity_id] = (
                        100.0 if details.get("direction") == "opening" else 0.0
                    )
                else:
                    self._positions.pop(entity_id, None)
                self._active.pop(entity_id, None)
                self._learning_started.pop(entity_id, None)
                await self._async_save()
                self._publish_position(
                    entity_id,
                    self._positions.get(entity_id),
                    motion_stopped=True,
                )
        except Exception:  # noqa: BLE001 - retain recovery state after retries
            _LOGGER.exception(
                "Could not stop cover motion after %s attempts: %s",
                STOP_RETRY_ATTEMPTS,
                entity_id,
            )
            marked_failed = False
            async with self._lock_for(entity_id):
                current = self._active.get(entity_id)
                if details is not None and current is details:
                    current["stop_failed"] = True
                    await self._async_save()
                    marked_failed = True
            if marked_failed:
                self._publish_position(
                    entity_id,
                    None,
                    motion_stopped=True,
                    stop_failed=True,
                )
        finally:
            if self._tasks.get(entity_id) is asyncio.current_task():
                self._tasks.pop(entity_id, None)

    async def _async_cancel_timer(self, entity_id: str) -> None:
        task = self._tasks.pop(entity_id, None)
        if task is None or task is asyncio.current_task() or task.done():
            return
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

    async def _async_begin_motion_locked(
        self,
        entity_id: str,
        direction: str,
        duration: float,
        *,
        kind: str,
        start_position: float,
        full_duration: float | None,
        context: Context | None,
    ) -> None:
        await self._async_cancel_timer(entity_id)
        started_at = self._clock()
        self._active[entity_id] = {
            "direction": direction,
            "duration": duration,
            "kind": kind,
            "start_position": start_position,
            "full_duration": full_duration,
            "started_at": started_at,
        }
        self._positions[entity_id] = start_position
        await self._async_save()
        self.hass.bus.async_fire(
            EVENT_COVER_POSITION_CHANGED,
            {
                "entity_id": entity_id,
                "position": start_position,
                "direction": direction,
                "moving": True,
                "elapsed": 0.0,
            },
        )

    async def _async_begin_and_issue_motion_locked(
        self,
        entity_id: str,
        direction: str,
        duration: float,
        *,
        kind: str,
        start_position: float,
        full_duration: float | None,
        context: Context | None,
    ) -> None:
        """Prepare and issue one move without exposing a Stop race window."""

        await self._async_begin_motion_locked(
            entity_id,
            direction,
            duration,
            kind=kind,
            start_position=start_position,
            full_duration=full_duration,
            context=context,
        )
        details = self._active[entity_id]
        move_task = self.hass.async_create_task(
            self._async_issue_move(entity_id, direction, context=context),
            f"Theme Studio cover move: {entity_id}",
        )
        self._move_tasks[entity_id] = move_task
        self._tasks[entity_id] = self.hass.async_create_background_task(
            self._async_wait_and_stop(entity_id, duration, context),
            f"Theme Studio cover safety stop: {entity_id}",
        )
        done, _pending = await asyncio.wait(
            {move_task},
            timeout=self._move_call_timeout,
        )
        if not done:
            _LOGGER.warning(
                "Cover move call is still running for %s; retaining the safety timer",
                entity_id,
            )
            if kind == "learning":
                self._learning_started[entity_id] = self._clock()
            self.hass.async_create_background_task(
                self._async_monitor_delayed_move(
                    entity_id,
                    move_task,
                    details,
                    kind=kind,
                    start_position=start_position,
                    context=context,
                ),
                f"Theme Studio delayed cover move: {entity_id}",
            )
            return
        self._move_tasks.pop(entity_id, None)
        try:
            move_task.result()
        except Exception:
            await self._async_rollback_failed_move_locked(
                entity_id,
                kind=kind,
                start_position=start_position,
            )
            raise
        if kind == "learning" and self._active.get(entity_id) is details:
            learned_started_at = self._clock()
            self._learning_started[entity_id] = learned_started_at
            details["started_at"] = learned_started_at
            await self._async_save()

    async def _async_monitor_delayed_move(
        self,
        entity_id: str,
        move_task: asyncio.Task[None],
        details: dict[str, Any],
        *,
        kind: str,
        start_position: float,
        context: Context | None,
    ) -> None:
        """Finish bookkeeping without cancelling an uncertain device command."""

        move_failed = False
        try:
            await move_task
        except Exception:  # noqa: BLE001 - handled under the entity lock below
            move_failed = True

        if not move_failed and entity_id in self._stop_after_move:
            try:
                await self._async_issue_stop(entity_id, context=context)
            except Exception:  # noqa: BLE001 - warn; recovery marker remains if present
                _LOGGER.exception(
                    "Could not stop %s after its delayed move call completed",
                    entity_id,
                )

        async with self._lock_for(entity_id):
            if self._move_tasks.get(entity_id) is move_task:
                self._move_tasks.pop(entity_id, None)
            self._stop_after_move.discard(entity_id)
            if move_failed and self._active.get(entity_id) is details:
                await self._async_rollback_failed_move_locked(
                    entity_id,
                    kind=kind,
                    start_position=start_position,
                )

    async def _async_rollback_failed_move_locked(
        self,
        entity_id: str,
        *,
        kind: str,
        start_position: float,
    ) -> None:
        """Remove provisional state after a definitely rejected move call."""

        await self._async_cancel_timer(entity_id)
        self._active.pop(entity_id, None)
        self._learning_started.pop(entity_id, None)
        position = None
        if kind == "timed":
            position = start_position
            self._positions[entity_id] = start_position
        else:
            self._positions.pop(entity_id, None)
        await self._async_save()
        self._publish_position(entity_id, position, motion_stopped=True)

    async def _async_stop_locked(
        self,
        entity_id: str,
        *,
        context: Context | None,
        issue_stop: bool = True,
    ) -> float | None:
        details = self._active.get(entity_id)
        position = self._calculate_active_position(entity_id)
        if issue_stop:
            await self._async_issue_stop(entity_id, context=context)
        await self._async_cancel_timer(entity_id)
        if details and details.get("kind") == "learning":
            position = None
            self._positions.pop(entity_id, None)
        elif position is not None:
            self._positions[entity_id] = position
        self._active.pop(entity_id, None)
        self._learning_started.pop(entity_id, None)
        await self._async_save()
        final_position = position if position is not None else self._positions.get(entity_id)
        self._publish_position(
            entity_id,
            final_position,
            motion_stopped=True,
        )
        return final_position

    async def _async_issue_move(
        self,
        entity_id: str,
        direction: str,
        *,
        context: Context | None,
    ) -> None:
        service = "open_cover" if direction == "opening" else "close_cover"
        await self.hass.services.async_call(
            "cover",
            service,
            {"entity_id": entity_id},
            blocking=True,
            context=context,
        )

    async def _async_issue_stop_with_retries(
        self,
        entity_id: str,
        *,
        context: Context | None,
    ) -> None:
        for attempt in range(1, STOP_RETRY_ATTEMPTS + 1):
            try:
                await self._async_issue_stop(entity_id, context=context)
                return
            except Exception:
                if attempt >= STOP_RETRY_ATTEMPTS:
                    raise
                _LOGGER.warning(
                    "Cover stop attempt %s/%s failed for %s; retrying",
                    attempt,
                    STOP_RETRY_ATTEMPTS,
                    entity_id,
                )
                await self._retry_sleep(STOP_RETRY_DELAY)

    def _lock_for(self, entity_id: str) -> asyncio.Lock:
        return self._locks.setdefault(entity_id, asyncio.Lock())

    def _reject_pending_move(self, entity_id: str) -> None:
        move_task = self._move_tasks.get(entity_id)
        if move_task is not None and not move_task.done():
            raise vol.Invalid("A previous cover move command is still running")

    async def _async_issue_stop(
        self,
        entity_id: str,
        *,
        context: Context | None = None,
    ) -> None:
        await self.hass.services.async_call(
            "cover",
            "stop_cover",
            {"entity_id": entity_id},
            blocking=True,
            context=context,
        )

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "active": dict(self._active),
                "positions": dict(self._positions),
            }
        )

    def _publish_position(
        self,
        entity_id: str,
        position: float | None,
        *,
        motion_stopped: bool = False,
        stop_failed: bool = False,
    ) -> None:
        """Notify every open dashboard about the shared estimated position."""

        data: dict[str, Any] = {"entity_id": entity_id, "position": position}
        if motion_stopped:
            data["motion_stopped"] = True
        if stop_failed:
            data["stop_failed"] = True
        self.hass.bus.async_fire(
            EVENT_COVER_POSITION_CHANGED,
            data,
        )

    def _validate_stop_support(self, entity_id: str) -> None:
        state = self._validate_entity_exists(entity_id)
        supported = int(state.attributes.get("supported_features", 0) or 0)
        if not supported & int(CoverEntityFeature.STOP):
            raise vol.Invalid("The selected cover does not support Stop")

    def _validate_entity_exists(self, entity_id: str) -> Any:
        state = self.hass.states.get(entity_id)
        if state is None:
            raise vol.Invalid("The selected cover entity does not exist")
        return state

    def _calculate_active_position(self, entity_id: str) -> float | None:
        details = self._active.get(entity_id)
        if not details or details.get("kind") != "timed":
            return self._positions.get(entity_id)
        full_duration = details.get("full_duration")
        if not isinstance(full_duration, int | float) or full_duration <= 0:
            return self._positions.get(entity_id)
        elapsed = max(0.0, self._clock() - float(details.get("started_at", 0.0)))
        delta = min(100.0, elapsed / float(full_duration) * 100.0)
        start = float(details.get("start_position", 0.0))
        position = start + delta if details.get("direction") == "opening" else start - delta
        return round(max(0.0, min(100.0, position)), 1)

    @staticmethod
    def _validate_position(position: float) -> float:
        if isinstance(position, bool):
            raise vol.Invalid("Cover position must be between 0 and 100")
        normalized = float(position)
        if not 0 <= normalized <= 100:
            raise vol.Invalid("Cover position must be between 0 and 100")
        return normalized

    @staticmethod
    def _validate_entity_id(entity_id: str) -> str:
        normalized = str(entity_id).strip().lower()
        if not _COVER_ENTITY_PATTERN.fullmatch(normalized):
            raise vol.Invalid("A valid cover entity is required")
        return normalized


def _check_control_permission(
    connection: websocket_api.ActiveConnection,
    entity_id: str,
) -> None:
    if not connection.user.permissions.check_entity(entity_id, POLICY_CONTROL):
        raise Unauthorized(user_id=connection.user.id)


def _check_read_permission(
    connection: websocket_api.ActiveConnection,
    entity_id: str,
) -> None:
    if not connection.user.permissions.check_entity(entity_id, POLICY_READ):
        raise Unauthorized(user_id=connection.user.id)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/timed_move",
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("direction"): vol.In(("opening", "closing")),
        vol.Required("full_duration"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0.1, max=MAX_TRAVEL_TIME),
        ),
        vol.Required("fallback_position"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=100),
        ),
    }
)
@websocket_api.async_response
async def websocket_cover_timed_move(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Start a cover movement with a Home Assistant-side stop timer."""

    entity_id = msg["entity_id"]
    _check_control_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        result = await manager.async_start(
            entity_id,
            msg["direction"],
            msg["full_duration"],
            fallback_position=msg["fallback_position"],
            context=connection.context(msg),
        )
    except Exception as error:  # noqa: BLE001 - return a useful card error
        connection.send_error(msg["id"], "cover_move_failed", str(error))
        return
    connection.send_result(msg["id"], {"success": True, **result})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/stop",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.async_response
async def websocket_cover_stop(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Cancel a pending timer and stop a cover."""

    entity_id = msg["entity_id"]
    _check_control_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        position = await manager.async_stop(
            entity_id,
            context=connection.context(msg),
        )
    except Exception as error:  # noqa: BLE001 - return a useful card error
        connection.send_error(msg["id"], "cover_stop_failed", str(error))
        return
    connection.send_result(msg["id"], {"success": True, "position": position})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/learning_start",
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("direction"): vol.In(("opening", "closing")),
    }
)
@websocket_api.async_response
async def websocket_cover_learning_start(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Start a backend-monitored cover learning ride."""

    entity_id = msg["entity_id"]
    _check_control_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        await manager.async_start_learning(
            entity_id,
            msg["direction"],
            context=connection.context(msg),
        )
    except Exception as error:  # noqa: BLE001 - return a useful card error
        connection.send_error(msg["id"], "cover_learning_start_failed", str(error))
        return
    connection.send_result(
        msg["id"],
        {"success": True, "safety_timeout": LEARNING_SAFETY_TIMEOUT},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/learning_finish",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.async_response
async def websocket_cover_learning_finish(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stop a learning ride and return its measured duration."""

    entity_id = msg["entity_id"]
    _check_control_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        result = await manager.async_finish_learning(
            entity_id,
            context=connection.context(msg),
        )
    except Exception as error:  # noqa: BLE001 - return a useful card error
        connection.send_error(msg["id"], "cover_learning_finish_failed", str(error))
        return
    connection.send_result(msg["id"], {"success": True, **result})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/position_get",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.async_response
async def websocket_cover_position_get(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the Home Assistant-side estimated cover position."""

    entity_id = msg["entity_id"]
    _check_read_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        position = await manager.async_get_position(entity_id)
    except Exception as error:  # noqa: BLE001 - return a stable card error
        connection.send_error(msg["id"], "cover_position_get_failed", str(error))
        return
    connection.send_result(msg["id"], {"position": position})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/position_set",
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("position"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=100),
        ),
    }
)
@websocket_api.async_response
async def websocket_cover_position_set(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Synchronize a position estimate without moving the motor."""

    entity_id = msg["entity_id"]
    _check_control_permission(connection, entity_id)
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    try:
        position = await manager.async_set_position(entity_id, msg["position"])
    except Exception as error:  # noqa: BLE001 - return a stable card error
        connection.send_error(msg["id"], "cover_position_set_failed", str(error))
        return
    connection.send_result(msg["id"], {"position": position})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "theme_studio/cover/subscribe_position",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@callback
def websocket_cover_subscribe_position(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe one dashboard card to shared position changes."""

    entity_id = msg["entity_id"]
    _check_read_permission(connection, entity_id)
    if not _COVER_ENTITY_PATTERN.fullmatch(entity_id) or hass.states.get(entity_id) is None:
        connection.send_error(
            msg["id"],
            "cover_not_found",
            "The selected cover entity does not exist",
        )
        return

    @callback
    def forward_position(event: Any) -> None:
        data = event.data
        if data.get("entity_id") == entity_id:
            connection.send_event(msg["id"], data)

    connection.subscriptions[msg["id"]] = hass.bus.async_listen(
        EVENT_COVER_POSITION_CHANGED,
        forward_position,
    )
    connection.send_result(msg["id"])
    manager: CoverMotionManager = hass.data[DOMAIN][DATA_COVER_MOTION_MANAGER]
    connection.send_event(msg["id"], manager.position_snapshot(entity_id))


@callback
def async_register_cover_motion_commands(hass: HomeAssistant) -> None:
    """Register cover motion WebSocket commands."""

    websocket_api.async_register_command(hass, websocket_cover_timed_move)
    websocket_api.async_register_command(hass, websocket_cover_stop)
    websocket_api.async_register_command(hass, websocket_cover_learning_start)
    websocket_api.async_register_command(hass, websocket_cover_learning_finish)
    websocket_api.async_register_command(hass, websocket_cover_position_get)
    websocket_api.async_register_command(hass, websocket_cover_position_set)
    websocket_api.async_register_command(hass, websocket_cover_subscribe_position)
