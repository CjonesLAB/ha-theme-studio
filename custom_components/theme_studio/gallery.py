"""Client for the public Theme Studio Gallery."""

from __future__ import annotations

import asyncio
import json
import math
import re
import time
from typing import Any
from urllib.parse import urlencode

from aiohttp import ClientError

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    DOMAIN,
    GALLERY_DOWNLOAD_URL,
    GALLERY_LIST_URL,
    VERSION,
)


MAX_LIST_BYTES = 512 * 1024
MAX_PROFILE_BYTES = 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 15
GALLERY_CACHE_SECONDS = 5 * 60
GALLERY_CACHE_KEY = "gallery_designs"
PUBLIC_ID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


class GalleryError(Exception):
    """Raised when the public gallery cannot be used safely."""


async def _async_get_json(
    hass: HomeAssistant,
    url: str,
    maximum_bytes: int,
) -> Any:
    """Fetch and decode one size-limited JSON response."""

    session = async_get_clientsession(hass)

    try:
        async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
            async with session.get(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": f"Home-Assistant-Theme-Studio/{VERSION}",
                },
            ) as response:
                if response.status != 200:
                    raise GalleryError(
                        "Die Galerie antwortet derzeit nicht korrekt "
                        f"(HTTP {response.status})."
                    )

                if (
                    response.content_length is not None
                    and response.content_length > maximum_bytes
                ):
                    raise GalleryError(
                        "Die Antwort der Galerie ist unerwartet groß."
                    )

                chunks: list[bytes] = []
                received = 0

                async for chunk in response.content.iter_chunked(64 * 1024):
                    received += len(chunk)
                    if received > maximum_bytes:
                        raise GalleryError(
                            "Die Antwort der Galerie ist unerwartet groß."
                        )
                    chunks.append(chunk)

                payload = b"".join(chunks)
    except TimeoutError as error:
        raise GalleryError(
            "Die Galerie hat nicht rechtzeitig geantwortet."
        ) from error
    except ClientError as error:
        raise GalleryError(
            "Die Galerie konnte nicht erreicht werden."
        ) from error

    try:
        return json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise GalleryError(
            "Die Galerie hat ungültige Daten geliefert."
        ) from error


def _text(value: Any, maximum: int) -> str:
    """Return one compact, length-limited text value."""

    if not isinstance(value, str):
        return ""

    return " ".join(value.split())[:maximum]


def _color(value: Any, fallback: str) -> str:
    """Return one validated preview color."""

    if isinstance(value, str) and COLOR_PATTERN.fullmatch(value):
        return value.lower()

    return fallback


def _integer(
    value: Any,
    minimum: int,
    maximum: int,
    fallback: int,
) -> int:
    """Return one bounded preview integer."""

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return fallback

    if isinstance(value, float) and not math.isfinite(value):
        return fallback

    return min(maximum, max(minimum, round(value)))


def _preview_mode(value: Any, light: bool) -> dict[str, Any]:
    """Return a preview mode using the same bounds as imported profiles."""

    raw = value if isinstance(value, dict) else {}
    defaults = {
        "primary": "#2f6fa3" if light else "#26b2b3",
        "background": "#eef2f5" if light else "#101719",
        "card": "#ffffff" if light else "#182326",
        "text": "#1c1c1c" if light else "#ffffff",
        "icon": "#2f6fa3" if light else "#26b2b3",
        "border": "#d5dde5" if light else "#26b2b3",
        "header_background": "#eef2f5" if light else "#101719",
        "header_text": "#1c1c1c" if light else "#ffffff",
        "sidebar_background": "#eef2f5" if light else "#101719",
        "sidebar_text": "#1c1c1c" if light else "#ffffff",
        "sidebar_icon": "#5f6b72" if light else "#b8c4c7",
        "sidebar_selected": "#2f6fa3" if light else "#26b2b3",
    }
    background_type = raw.get("background_type")

    if not isinstance(background_type, str) or background_type not in {"color", "waves", "aurora", "image"}:
        background_type = "color"

    return {
        key: _color(raw.get(key), fallback)
        for key, fallback in defaults.items()
    } | {
        "opacity": _integer(raw.get("opacity"), 30, 100, 96 if light else 92),
        "border_width": _integer(raw.get("border_width"), 0, 6, 1 if light else 0),
        "shadow": _integer(raw.get("shadow"), 0, 50, 16 if light else 28),
        "radius": _integer(raw.get("radius"), 0, 36, 18),
        "darkening": _integer(raw.get("darkening"), 0, 80, 10 if light else 30),
        "background_type": background_type,
    }


def _preview_effects(value: Any) -> dict[str, Any]:
    """Return the safe visual subset of gallery effects."""

    raw = value if isinstance(value, dict) else {}
    background = raw.get("background")
    if not isinstance(background, str) or background not in {"none", "space-command"}:
        background = "none"

    allowed = {
        "status-pulse",
        "energy-flow",
        "climate-aura",
        "alert-focus",
    }
    raw_card_effects = raw.get("card_effects")
    card_effects = []

    if isinstance(raw_card_effects, list):
        for effect in raw_card_effects:
            if isinstance(effect, str) and effect in allowed and effect not in card_effects:
                card_effects.append(effect)

    return {
        "background": background,
        "card_effects": card_effects,
        "intensity": _integer(raw.get("intensity"), 0, 100, 55),
    }


def _normalize_gallery_item(item: Any) -> dict[str, Any] | None:
    """Validate one gallery list record before sending it to the UI."""

    if not isinstance(item, dict):
        return None

    public_id = _text(item.get("id"), 36).lower()
    title = _text(item.get("title"), 80)

    if not PUBLIC_ID_PATTERN.fullmatch(public_id) or not title:
        return None

    raw_preview = item.get("preview")
    preview = raw_preview if isinstance(raw_preview, dict) else {}
    raw_modes = preview.get("modes")
    modes = raw_modes if isinstance(raw_modes, dict) else {}

    legacy_dark = {
        "background": preview.get("background"),
        "card": preview.get("card"),
        "primary": preview.get("primary"),
        "text": preview.get("text"),
        "icon": preview.get("primary"),
        "border": preview.get("border"),
        "opacity": preview.get("opacity"),
        "radius": preview.get("radius"),
        "border_width": preview.get("border_width"),
    }
    legacy_light = {
        "background": preview.get("light_background"),
        "primary": preview.get("light_primary"),
    }

    return {
        "id": public_id,
        "title": title,
        "summary": _text(item.get("summary"), 280),
        "author": _text(item.get("author"), 39),
        "category": _text(item.get("category"), 80) or "Design",
        "license": _text(item.get("license"), 24),
        "version": _integer(item.get("version"), 1, 9999, 1),
        "downloads": _integer(
            item.get("downloads"),
            0,
            2_147_483_647,
            0,
        ),
        "preview": {
            "background": _color(
                preview.get("background"),
                "#101719",
            ),
            "card": _color(preview.get("card"), "#182326"),
            "primary": _color(
                preview.get("primary"),
                "#26b2b3",
            ),
            "text": _color(preview.get("text"), "#ffffff"),
            "border": _color(
                preview.get("border"),
                "#26b2b3",
            ),
            "light_background": _color(
                preview.get("light_background"),
                "#eef2f5",
            ),
            "light_primary": _color(
                preview.get("light_primary"),
                "#2f6fa3",
            ),
            "opacity": _integer(
                preview.get("opacity"),
                30,
                100,
                92,
            ),
            "radius": _integer(
                preview.get("radius"),
                0,
                36,
                18,
            ),
            "border_width": _integer(
                preview.get("border_width"),
                0,
                6,
                1,
            ),
            "modes": {
                "light": _preview_mode(
                    modes.get("light", legacy_light),
                    True,
                ),
                "dark": _preview_mode(
                    modes.get("dark", legacy_dark),
                    False,
                ),
            },
            "effects": _preview_effects(preview.get("effects")),
        },
    }


async def async_get_gallery_designs(
    hass: HomeAssistant,
    force_refresh: bool = False,
) -> list[dict[str, Any]]:
    """Return validated, published gallery designs."""

    domain_data = hass.data.setdefault(DOMAIN, {})
    cached = domain_data.get(GALLERY_CACHE_KEY)

    if (
        not force_refresh
        and isinstance(cached, tuple)
        and len(cached) == 2
        and isinstance(cached[0], (int, float))
        and time.monotonic() - cached[0] < GALLERY_CACHE_SECONDS
        and isinstance(cached[1], list)
    ):
        return cached[1]

    payload = await _async_get_json(
        hass,
        GALLERY_LIST_URL,
        MAX_LIST_BYTES,
    )

    if (
        not isinstance(payload, dict)
        or payload.get("success") is not True
        or payload.get("api_version") != 1
        or not isinstance(payload.get("designs"), list)
    ):
        raise GalleryError(
            "Die Galerie verwendet ein nicht unterstütztes Datenformat."
        )

    designs = []

    for item in payload["designs"][:60]:
        normalized = _normalize_gallery_item(item)
        if normalized is not None:
            designs.append(normalized)

    domain_data[GALLERY_CACHE_KEY] = (
        time.monotonic(),
        designs,
    )
    return designs


async def async_download_gallery_profile(
    hass: HomeAssistant,
    public_id: str,
) -> dict[str, Any]:
    """Download one approved Theme Studio profile."""

    normalized_id = public_id.lower()
    if not PUBLIC_ID_PATTERN.fullmatch(normalized_id):
        raise GalleryError("Die Design-ID ist ungültig.")

    url = f"{GALLERY_DOWNLOAD_URL}?{urlencode({'id': normalized_id})}"
    profile = await _async_get_json(hass, url, MAX_PROFILE_BYTES)

    if (
        not isinstance(profile, dict)
        or profile.get("format") != "theme-studio-profile"
        or profile.get("version") != 1
        or not isinstance(profile.get("name"), str)
        or not isinstance(profile.get("settings"), dict)
    ):
        raise GalleryError(
            "Das gewählte Design ist kein gültiges Theme-Studio-Profil."
        )

    return profile
