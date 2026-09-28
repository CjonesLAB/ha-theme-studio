"""Privacy-preserving diagnostics for Theme Studio."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, VERSION
from .websocket import (
    BACKGROUND_STORAGE_VERSION,
    MAX_BACKGROUNDS,
    MAX_PROFILES,
    PROFILE_ID_VALIDATOR,
    PROFILE_STORAGE_VERSION,
    RECOVERY_STORAGE_VERSION,
    STORAGE_VERSION,
    USER_STORAGE_VERSION,
    get_background_store,
    get_profile_store,
    get_recovery_store,
    get_store,
    get_user_store,
    normalize_recovery_state,
    normalize_saved_backgrounds,
    normalize_saved_profiles,
    normalize_settings,
    normalize_user_state,
)


_UNAVAILABLE = object()
_ENTITY_LIST_KEYS = (
    "energyEntities",
    "pulseEntities",
    "climateEntities",
    "alertEntities",
)


async def _async_load_store(store: Any) -> Any:
    """Load one storage record without exposing an exception or its data."""

    try:
        return await store.async_load()
    except Exception:  # noqa: BLE001 - diagnostics must remain available
        return _UNAVAILABLE


def _settings_diagnostics(saved: Any) -> dict[str, Any]:
    """Summarize settings without returning design or entity data."""

    result: dict[str, Any] = {
        "status": "missing",
        "theme_studio_active": False,
        "active_profile_selected": False,
        "entity_assignment_count": 0,
    }

    if saved is _UNAVAILABLE:
        result["status"] = "unavailable"
        return result

    if saved is None:
        return result

    try:
        normalized = normalize_settings(saved)
    except (vol.Invalid, TypeError, ValueError):
        result["status"] = "invalid"
        return result

    result["status"] = "valid"

    if isinstance(saved, dict):
        result["theme_studio_active"] = bool(
            saved.get("theme_studio_active", True)
        )
        candidate = saved.get("active_profile_id")
        if isinstance(candidate, str):
            try:
                PROFILE_ID_VALIDATOR(candidate)
            except vol.Invalid:
                pass
            else:
                result["active_profile_selected"] = True

    effects = normalized["effects"]
    result["entity_assignment_count"] = sum(
        len(effects[key])
        for key in _ENTITY_LIST_KEYS
    )
    return result


def _collection_diagnostics(
    saved: Any,
    *,
    key: str,
    normalizer: Any,
    capacity: int,
) -> dict[str, Any]:
    """Summarize one stored collection without returning its records."""

    result = {
        "status": "missing",
        "valid_count": 0,
        "invalid_count": 0,
        "capacity": capacity,
    }

    if saved is _UNAVAILABLE:
        result["status"] = "unavailable"
        return result

    if saved is None:
        return result

    if not isinstance(saved, dict) or not isinstance(saved.get(key), list):
        result["status"] = "invalid"
        return result

    normalized = normalizer(saved)
    result["status"] = "valid"
    result["valid_count"] = len(normalized)
    result["invalid_count"] = max(0, len(saved[key]) - len(normalized))
    return result


def _recovery_diagnostics(saved: Any) -> dict[str, Any]:
    """Summarize recovery storage without returning a saved design."""

    if saved is _UNAVAILABLE:
        return {"status": "unavailable", "available": False}

    if saved is None:
        return {"status": "missing", "available": False}

    recovery = normalize_recovery_state(saved)
    return {
        "status": "valid" if recovery is not None else "invalid",
        "available": recovery is not None,
    }


def _user_diagnostics(saved: Any) -> dict[str, Any]:
    """Summarize private user storage without returning identifiers or designs."""

    result = {
        "status": "missing",
        "user_count": 0,
        "active_user_count": 0,
        "profile_count": 0,
        "recovery_count": 0,
    }
    if saved is _UNAVAILABLE:
        result["status"] = "unavailable"
        return result
    if saved is None:
        return result
    if not isinstance(saved, dict) or not isinstance(saved.get("users"), dict):
        result["status"] = "invalid"
        return result

    result["status"] = "valid"
    for raw_state in saved["users"].values():
        state = normalize_user_state(raw_state)
        result["user_count"] += 1
        result["active_user_count"] += int(state["theme_studio_active"])
        result["profile_count"] += len(state["profiles"])
        result["recovery_count"] += int(state["recovery"] is not None)
    return result


def build_diagnostics(
    *,
    hass: HomeAssistant,
    entry: ConfigEntry,
    settings: Any,
    profiles: Any,
    backgrounds: Any,
    recovery: Any,
    users: Any = None,
) -> dict[str, Any]:
    """Build a diagnostic report containing metadata only."""

    return {
        "integration": {
            "version": VERSION,
            "config_entry_version": entry.version,
            "config_entry_minor_version": getattr(entry, "minor_version", 1),
            "websocket_registered": bool(
                hass.data.get(DOMAIN, {}).get("websocket_registered")
            ),
        },
        "storage": {
            "versions": {
                "settings": STORAGE_VERSION,
                "profiles": PROFILE_STORAGE_VERSION,
                "backgrounds": BACKGROUND_STORAGE_VERSION,
                "recovery": RECOVERY_STORAGE_VERSION,
                "users": USER_STORAGE_VERSION,
            },
            "settings": _settings_diagnostics(settings),
            "profiles": _collection_diagnostics(
                profiles,
                key="profiles",
                normalizer=normalize_saved_profiles,
                capacity=MAX_PROFILES,
            ),
            "backgrounds": _collection_diagnostics(
                backgrounds,
                key="backgrounds",
                normalizer=normalize_saved_backgrounds,
                capacity=MAX_BACKGROUNDS,
            ),
            "recovery": _recovery_diagnostics(recovery),
            "users": _user_diagnostics(users),
        },
        "privacy": {
            "contains_design_values": False,
            "contains_entity_ids": False,
            "contains_profile_names": False,
            "contains_background_names_or_paths": False,
            "contains_credentials": False,
        },
    }


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return privacy-preserving diagnostics for a config entry."""

    settings = await _async_load_store(get_store(hass))
    profiles = await _async_load_store(get_profile_store(hass))
    backgrounds = await _async_load_store(get_background_store(hass))
    recovery = await _async_load_store(get_recovery_store(hass))
    users = await _async_load_store(get_user_store(hass))

    return build_diagnostics(
        hass=hass,
        entry=entry,
        settings=settings,
        profiles=profiles,
        backgrounds=backgrounds,
        recovery=recovery,
        users=users,
    )
