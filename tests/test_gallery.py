"""Tests for the public Theme Studio Gallery client."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.theme_studio import gallery


PUBLIC_ID = "12345678-1234-4123-8123-123456789abc"


def test_gallery_item_validates_preview_and_effects() -> None:
    """Untrusted preview data is bounded before reaching the frontend."""

    item = {
        "id": PUBLIC_ID.upper(),
        "title": "  Mein   Design  ",
        "summary": "  Ruhig   und klar ",
        "downloads": -12,
        "preview": {
            "modes": {
                "light": {
                    "primary": "#ABCDEF",
                    "background": "javascript:alert(1)",
                    "opacity": 999,
                    "radius": -5,
                    "background_type": "unknown",
                }
            },
            "effects": {
                "background": "invalid",
                "card_effects": [
                    "energy-flow",
                    "energy-flow",
                    "not-supported",
                ],
                "intensity": 150,
            },
        },
    }

    normalized = gallery._normalize_gallery_item(item)

    assert normalized is not None
    assert normalized["id"] == PUBLIC_ID
    assert normalized["title"] == "Mein Design"
    assert normalized["summary"] == "Ruhig und klar"
    assert normalized["downloads"] == 0
    light = normalized["preview"]["modes"]["light"]
    assert light["primary"] == "#abcdef"
    assert light["background"] == "#eef2f5"
    assert light["opacity"] == 100
    assert light["radius"] == 0
    assert light["background_type"] == "color"
    effects = normalized["preview"]["effects"]
    assert effects == {
        "background": "none",
        "card_effects": ["energy-flow"],
        "intensity": 100,
    }


@pytest.mark.parametrize(
    "item",
    [
        None,
        {},
        {"id": "invalid", "title": "Design"},
        {"id": PUBLIC_ID, "title": "   "},
    ],
)
def test_gallery_rejects_invalid_list_items(item: Any) -> None:
    """Malformed public records are silently excluded from the gallery."""

    assert gallery._normalize_gallery_item(item) is None


def test_gallery_preview_bounds_match_profile_schema() -> None:
    """The list preview never shows a value import would later clamp.

    A design imported through ``websocket_import_gallery_design`` is run
    through ``PROFILE_SCHEMA`` (cardOpacity 30-100, borderRadius 0-36). If
    the gallery list preview allowed a wider range, users could see a
    thumbnail that looks different from the profile they actually get.
    """

    # Mirrors the bounds enforced by PROFILE_SCHEMA in websocket.py.
    min_opacity, max_opacity = 30, 100
    min_radius, max_radius = 0, 36

    item = {
        "id": PUBLIC_ID,
        "title": "Grenzwerte",
        "preview": {
            "opacity": 1,
            "radius": 999,
            "modes": {
                "dark": {
                    "opacity": 1,
                    "radius": 999,
                },
                "light": {
                    "opacity": 1,
                    "radius": 999,
                },
            },
        },
    }

    normalized = gallery._normalize_gallery_item(item)
    assert normalized is not None
    preview = normalized["preview"]

    for values in (
        preview,
        preview["modes"]["dark"],
        preview["modes"]["light"],
    ):
        assert min_opacity <= values["opacity"] <= max_opacity
        assert min_radius <= values["radius"] <= max_radius


async def test_gallery_list_is_validated_and_cached(monkeypatch: Any) -> None:
    """Only valid designs are cached and repeated requests avoid the network."""

    get_json = AsyncMock(
        return_value={
            "success": True,
            "api_version": 1,
            "designs": [
                {"id": PUBLIC_ID, "title": "Gültig"},
                {"id": "invalid", "title": "Ungültig"},
            ],
        }
    )
    monkeypatch.setattr(gallery, "_async_get_json", get_json)
    hass = SimpleNamespace(data={})

    first = await gallery.async_get_gallery_designs(hass)  # type: ignore[arg-type]
    second = await gallery.async_get_gallery_designs(hass)  # type: ignore[arg-type]

    assert [design["title"] for design in first] == ["Gültig"]
    assert second == first
    get_json.assert_awaited_once()


async def test_gallery_rejects_unsupported_api_format(
    monkeypatch: Any,
) -> None:
    """Unexpected gallery API versions fail closed."""

    monkeypatch.setattr(
        gallery,
        "_async_get_json",
        AsyncMock(
            return_value={
                "success": True,
                "api_version": 999,
                "designs": [],
            }
        ),
    )

    with pytest.raises(gallery.GalleryError):
        await gallery.async_get_gallery_designs(  # type: ignore[arg-type]
            SimpleNamespace(data={})
        )
