"""Tests for the public Theme Studio Gallery client."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.theme_studio import gallery


PUBLIC_ID = "12345678-1234-4123-8123-123456789abc"


async def test_malformed_preview_does_not_break_gallery(monkeypatch: Any) -> None:
    """Invalid preview types fall back while other designs remain visible."""
    malformed = {
        "id": PUBLIC_ID, "title": "Malformed preview", "downloads": float("inf"),
        "preview": {"modes": {"light": {"background_type": [], "opacity": float("nan")}},
                    "effects": {"background": {}, "card_effects": [{}, [], "energy-flow"]}},
    }
    monkeypatch.setattr(gallery, "_async_get_json", AsyncMock(return_value={
        "success": True, "api_version": 1,
        "designs": [malformed, {"id": PUBLIC_ID, "title": "Valid design"}],
    }))
    results = await gallery.async_get_gallery_designs(SimpleNamespace(data={}))
    assert len(results) == 2
    assert results[0]["downloads"] == 0
    assert results[0]["preview"]["modes"]["light"]["background_type"] == "color"
    assert results[0]["preview"]["modes"]["light"]["opacity"] == 96
    assert results[0]["preview"]["effects"]["card_effects"] == ["energy-flow"]


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
                    "background_image": "https://example.invalid/tracker.webp",
                    "card_background_image": "data:image/webp;base64,AAAA",
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
    assert light["background_image"] == ""
    assert light["card_background_image"] == ""
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


def test_gallery_preview_uses_profile_bounds() -> None:
    """Preview values match the limits applied during profile import."""

    normalized = gallery._normalize_gallery_item(
        {
            "id": PUBLIC_ID,
            "title": "Grenzwerte",
            "preview": {
                "opacity": 1,
                "radius": 999,
                "modes": {
                    "light": {"opacity": 1, "radius": 999},
                    "dark": {"opacity": 1, "radius": 999},
                },
            },
        }
    )

    assert normalized is not None

    for values in (
        normalized["preview"],
        normalized["preview"]["modes"]["light"],
        normalized["preview"]["modes"]["dark"],
    ):
        assert 30 <= values["opacity"] <= 100
        assert 0 <= values["radius"] <= 36


def test_gallery_preview_keeps_safe_version_010_textures() -> None:
    """Bundled 0.10.x textures reach the frontend after strict validation."""

    normalized = gallery._normalize_gallery_item(
        {
            "id": PUBLIC_ID,
            "title": "Carbon",
            "category": "Dunkel",
            "preview": {
                "mode": "dark",
                "modes": {
                    "dark": {
                        "background_type": "texture",
                        "background_image": (
                            "/assets/theme-textures/background/"
                            "carbon-01-classic.webp"
                        ),
                        "card_background_image": (
                            "/assets/theme-textures/card/wood-01-walnut.webp"
                        ),
                        "card_texture_darkening": 19,
                    }
                },
            },
        }
    )

    assert normalized is not None
    mode = normalized["preview"]["modes"]["dark"]
    assert mode["background_type"] == "texture"
    assert mode["background_image"].endswith("carbon-01-classic.webp")
    assert mode["card_background_image"].endswith("wood-01-walnut.webp")
    assert mode["card_texture_darkening"] == 19


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
