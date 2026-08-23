"""Capacity checks for the supported Theme Studio library limits."""

from __future__ import annotations

from pathlib import Path
from time import perf_counter

from custom_components.theme_studio.websocket import (
    MAX_BACKGROUNDS,
    MAX_PROFILES,
    background_results,
    default_settings,
    normalize_saved_backgrounds,
    normalize_saved_profiles,
    sync_background_library,
)


def _profiles() -> dict[str, list[dict[str, object]]]:
    """Return a full synthetic profile library."""

    return {
        "profiles": [
            {
                "id": f"{index:032x}",
                "name": f"Profil {index:02d}",
                "created_at": "2026-08-23T08:00:00+00:00",
                "updated_at": "2026-08-23T08:00:00+00:00",
                "settings": default_settings(),
            }
            for index in range(MAX_PROFILES)
        ]
    }


def _backgrounds(directory: Path) -> dict[str, list[dict[str, str]]]:
    """Create and return a full synthetic background library."""

    records: list[dict[str, str]] = []

    for index in range(MAX_BACKGROUNDS):
        filename = f"image_{index:032x}.jpg"
        (directory / filename).write_bytes(b"synthetic-image")
        records.append(
            {
                "id": f"{index:032x}",
                "name": f"Hintergrund {index:02d}",
                "filename": filename,
                "created_at": "2026-08-23T08:00:00+00:00",
            }
        )

    return {"backgrounds": records}


def test_supported_capacity_remains_responsive(tmp_path: Path) -> None:
    """Repeated processing at both documented limits stays inexpensive."""

    saved_profiles = _profiles()
    saved_backgrounds = _backgrounds(tmp_path)
    started = perf_counter()

    for _ in range(100):
        profiles = normalize_saved_profiles(saved_profiles)
        backgrounds = normalize_saved_backgrounds(saved_backgrounds)
        synced, changed = sync_background_library(tmp_path, backgrounds)
        results = background_results(tmp_path, synced)

    elapsed = perf_counter() - started

    assert len(profiles) == MAX_PROFILES
    assert len(backgrounds) == MAX_BACKGROUNDS
    assert len(synced) == MAX_BACKGROUNDS
    assert len(results) == MAX_BACKGROUNDS
    assert changed is False
    assert elapsed < 5.0
