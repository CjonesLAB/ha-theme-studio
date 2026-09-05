"""Tests for the local Theme Studio background library."""

from __future__ import annotations

from pathlib import Path
from inspect import unwrap
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from custom_components.theme_studio.websocket import (
    background_is_referenced,
    background_results,
    default_settings,
    normalize_saved_backgrounds,
    sync_background_library,
)
from custom_components.theme_studio import websocket


async def test_delete_protects_recovery_background(monkeypatch) -> None:
    """An image referenced only by recovery must not be deleted."""
    filename = "image_" + "a" * 32 + ".png"
    recovery_settings = default_settings()
    recovery_settings["dark"]["backgroundImage"] = f"/local/theme_studio/{filename}?v=123"
    recovery_settings["dark"]["background"] = "image"
    monkeypatch.setattr(websocket, "async_load_backgrounds", AsyncMock(return_value=([
        {"id": "a" * 32, "filename": filename}], [])))
    monkeypatch.setattr(websocket, "get_store", lambda hass: SimpleNamespace(async_load=AsyncMock(return_value=default_settings())))
    monkeypatch.setattr(websocket, "get_recovery_store", lambda hass: SimpleNamespace(async_load=AsyncMock(return_value={"settings": recovery_settings})))
    monkeypatch.setattr(websocket, "async_load_profiles", AsyncMock(return_value=[]))
    delete = Mock()
    monkeypatch.setattr(websocket, "delete_background_file", delete)
    connection = SimpleNamespace(send_error=Mock(), send_result=Mock())
    await unwrap(websocket.websocket_delete_background)(object(), connection, {"id": 1, "background_id": "a" * 32})
    assert connection.send_error.call_args.args[1] == "background_in_use"
    delete.assert_not_called()
    connection.send_result.assert_not_called()


def test_saved_backgrounds_ignore_invalid_and_duplicate_records() -> None:
    """Only unique, validated image metadata is retained."""

    background_id = "a" * 32
    saved = {
        "backgrounds": [
            {
                "id": background_id,
                "name": "  Urlaub   2026 ",
                "filename": "image_" + "b" * 32 + ".jpg",
                "created_at": "2026-08-18T10:00:00+00:00",
            },
            {
                "id": background_id,
                "name": "Doppelt",
                "filename": "image_" + "c" * 32 + ".png",
            },
            {
                "id": "d" * 32,
                "name": "Falscher Dateiname",
                "filename": "../../secret.jpg",
            },
        ]
    }

    backgrounds = normalize_saved_backgrounds(saved)

    assert backgrounds == [
        {
            "id": background_id,
            "name": "Urlaub 2026",
            "filename": "image_" + "b" * 32 + ".jpg",
            "created_at": "2026-08-18T10:00:00+00:00",
        }
    ]


def test_background_library_discovers_legacy_files(tmp_path: Path) -> None:
    """Known legacy files are discovered while unrelated files are ignored."""

    (tmp_path / "background.jpg").write_bytes(b"legacy")
    (tmp_path / ("image_" + "a" * 32 + ".webp")).write_bytes(b"image")
    (tmp_path / "notes.txt").write_text("not an image", encoding="utf-8")
    stored = [
        {
            "id": "b" * 32,
            "name": "Fehlt",
            "filename": "image_" + "b" * 32 + ".png",
            "created_at": "",
        }
    ]

    backgrounds, changed = sync_background_library(tmp_path, stored)
    filenames = {background["filename"] for background in backgrounds}

    assert changed is True
    assert filenames == {
        "background.jpg",
        "image_" + "a" * 32 + ".webp",
    }
    assert "notes.txt" not in filenames


def test_background_results_include_safe_cache_url_and_size(
    tmp_path: Path,
) -> None:
    """Public results reference only the validated local library path."""

    filename = "image_" + "a" * 32 + ".png"
    (tmp_path / filename).write_bytes(b"12345")
    backgrounds = [
        {
            "id": "b" * 32,
            "name": "Testbild",
            "filename": filename,
            "created_at": "",
        }
    ]

    results = background_results(tmp_path, backgrounds)

    assert len(results) == 1
    assert results[0]["size"] == 5
    assert results[0]["url"].startswith(
        f"/local/theme_studio/{filename}?v="
    )


def test_referenced_background_is_protected() -> None:
    """Current settings and saved profiles both protect referenced images."""

    filename = "image_" + "a" * 32 + ".jpg"
    settings = default_settings()
    settings["light"]["backgroundImage"] = (
        f"/local/theme_studio/{filename}?v=123"
    )

    assert background_is_referenced(filename, settings, []) is True

    settings["light"]["backgroundImage"] = ""
    profile_settings = default_settings()
    profile_settings["dark"]["backgroundImage"] = (
        f"/local/theme_studio/{filename}"
    )

    assert background_is_referenced(
        filename,
        settings,
        [{"settings": profile_settings}],
    ) is True
    assert background_is_referenced(
        "background_dark.png",
        settings,
        [],
    ) is False
