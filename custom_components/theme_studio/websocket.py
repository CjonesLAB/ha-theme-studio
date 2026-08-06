"""WebSocket API for Theme Studio."""

from __future__ import annotations

import base64
import binascii
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN


STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.settings"
PROFILE_STORAGE_VERSION = 1
PROFILE_STORAGE_KEY = f"{DOMAIN}.profiles"
BACKGROUND_STORAGE_VERSION = 1
BACKGROUND_STORAGE_KEY = f"{DOMAIN}.backgrounds"

MAX_PROFILES = 32
MAX_PROFILE_NAME_LENGTH = 48
MAX_BACKGROUNDS = 24
MAX_BACKGROUND_NAME_LENGTH = 48

THEME_NAME = "Theme Studio"
THEME_FILENAME = "theme_studio.yaml"

BACKGROUND_DIRECTORY = "theme_studio"
MAX_BACKGROUND_SIZE = 5 * 1024 * 1024
MAX_BASE64_LENGTH = 7 * 1024 * 1024

MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

DEFAULT_LIGHT_PROFILE: dict[str, Any] = {
    "primaryColor": "#2f6fa3",
    "backgroundColor": "#eef2f5",
    "cardColor": "#ffffff",
    "cardTextColor": "#1c1c1c",
    "cardIconColor": "#2f6fa3",
    "cardBorderColor": "#d5dde5",
    "headerBackgroundColor": "#eef2f5",
    "headerTextColor": "#1c1c1c",
    "sidebarBackgroundColor": "#eef2f5",
    "sidebarTextColor": "#1c1c1c",
    "sidebarIconColor": "#5f6b72",
    "sidebarSelectedColor": "#2f6fa3",
    "cardOpacity": 96,
    "cardBorderWidth": 1,
    "cardShadow": 16,
    "borderRadius": 18,
    "darkening": 10,
    "background": "color",
    "backgroundImage": "",
}

DEFAULT_DARK_PROFILE: dict[str, Any] = {
    "primaryColor": "#26b2b3",
    "backgroundColor": "#101719",
    "cardColor": "#182326",
    "cardTextColor": "#ffffff",
    "cardIconColor": "#26b2b3",
    "cardBorderColor": "#26b2b3",
    "headerBackgroundColor": "#101719",
    "headerTextColor": "#ffffff",
    "sidebarBackgroundColor": "#101719",
    "sidebarTextColor": "#ffffff",
    "sidebarIconColor": "#b8c4c7",
    "sidebarSelectedColor": "#26b2b3",
    "cardOpacity": 92,
    "cardBorderWidth": 0,
    "cardShadow": 28,
    "borderRadius": 18,
    "darkening": 30,
    "background": "color",
    "backgroundImage": "",
}

DEFAULT_EFFECT_SETTINGS: dict[str, Any] = {
    "effect": "none",
    "motion": 35,
    "glow": 35,
    "cardEffects": [],
    "cardIntensity": 55,
    "pulseEntities": [],
    "energyEntities": [],
    "energyWarning": 500,
    "energyCritical": 2000,
    "climateEntities": [],
    "climateComfortMin": 19,
    "climateComfortMax": 24,
    "climateHot": 28,
    "alertEntities": [],
    "alertBatteryLow": 20,
}

COLOR_VALIDATOR = vol.Match(r"^#[0-9a-fA-F]{6}$")

BACKGROUND_URL_VALIDATOR = vol.Any(
    "",
    vol.Match(
        r"^/local/theme_studio/"
        r"(background|background_light|background_dark|image_[a-f0-9]{32})"
        r"\.(jpg|png|webp)(\?v=[0-9]+)?$"
    ),
)

BACKGROUND_FILENAME_VALIDATOR = vol.Match(
    r"^(background|background_light|background_dark|image_[a-f0-9]{32})"
    r"\.(jpg|png|webp)$"
)

PROFILE_SCHEMA = vol.Schema(
    {
        vol.Required("primaryColor"): COLOR_VALIDATOR,
        vol.Required("backgroundColor"): COLOR_VALIDATOR,
        vol.Required("cardColor"): COLOR_VALIDATOR,
        vol.Required("cardTextColor"): COLOR_VALIDATOR,
        vol.Required("cardIconColor"): COLOR_VALIDATOR,
        vol.Required("cardBorderColor"): COLOR_VALIDATOR,
        vol.Required("headerBackgroundColor"): COLOR_VALIDATOR,
        vol.Required("headerTextColor"): COLOR_VALIDATOR,
        vol.Required("sidebarBackgroundColor"): COLOR_VALIDATOR,
        vol.Required("sidebarTextColor"): COLOR_VALIDATOR,
        vol.Required("sidebarIconColor"): COLOR_VALIDATOR,
        vol.Required("sidebarSelectedColor"): COLOR_VALIDATOR,
        vol.Required("cardOpacity"): vol.All(
            vol.Coerce(int),
            vol.Range(min=30, max=100),
        ),
        vol.Required("cardBorderWidth"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=6),
        ),
        vol.Required("cardShadow"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=50),
        ),
        vol.Required("borderRadius"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=36),
        ),
        vol.Required("darkening"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=80),
        ),
        vol.Required("background"): vol.In(
            ("color", "waves", "aurora", "image")
        ),
        vol.Required(
            "backgroundImage"
        ): BACKGROUND_URL_VALIDATOR,
    },
    extra=vol.PREVENT_EXTRA,
)

EFFECT_SCHEMA = vol.Schema(
    {
        vol.Required("effect"): vol.In(
            ("none", "space-command")
        ),
        vol.Required("motion"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=100),
        ),
        vol.Required("glow"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=100),
        ),
        vol.Required("cardEffects"): vol.All(
            [
                vol.In(
                    (
                        "status-pulse",
                        "energy-flow",
                        "climate-aura",
                        "alert-focus",
                    )
                )
            ],
            vol.Length(max=4),
        ),
        vol.Required("cardIntensity"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=100),
        ),
        vol.Required("pulseEntities"): vol.All(
            [vol.Match(r"^[a-z0-9_]+\.[a-z0-9_]+$")],
            vol.Length(max=64),
        ),
        vol.Required("energyEntities"): vol.All(
            [vol.Match(r"^[a-z0-9_]+\.[a-z0-9_]+$")],
            vol.Length(max=32),
        ),
        vol.Required("energyWarning"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=999999),
        ),
        vol.Required("energyCritical"): vol.All(
            vol.Coerce(int),
            vol.Range(min=1, max=1000000),
        ),
        vol.Required("climateEntities"): vol.All(
            [vol.Match(r"^[a-z0-9_]+\.[a-z0-9_]+$")],
            vol.Length(max=32),
        ),
        vol.Required("climateComfortMin"): vol.All(
            vol.Coerce(int),
            vol.Range(min=-50, max=99),
        ),
        vol.Required("climateComfortMax"): vol.All(
            vol.Coerce(int),
            vol.Range(min=-49, max=100),
        ),
        vol.Required("climateHot"): vol.All(
            vol.Coerce(int),
            vol.Range(min=-48, max=120),
        ),
        vol.Required("alertEntities"): vol.All(
            [vol.Match(r"^[a-z0-9_]+\.[a-z0-9_]+$")],
            vol.Length(max=64),
        ),
        vol.Required("alertBatteryLow"): vol.All(
            vol.Coerce(int),
            vol.Range(min=1, max=100),
        ),
    },
    extra=vol.PREVENT_EXTRA,
)

SETTINGS_SCHEMA = vol.Schema(
    {
        vol.Required("light"): PROFILE_SCHEMA,
        vol.Required("dark"): PROFILE_SCHEMA,
        vol.Required("effects"): EFFECT_SCHEMA,
    },
    extra=vol.PREVENT_EXTRA,
)

PROFILE_NAME_VALIDATOR = vol.All(
    str,
    vol.Length(min=1, max=MAX_PROFILE_NAME_LENGTH),
)

PROFILE_ID_VALIDATOR = vol.Match(r"^[a-f0-9]{32}$")
BACKGROUND_ID_VALIDATOR = PROFILE_ID_VALIDATOR


def get_store(
    hass: HomeAssistant,
) -> Store[dict[str, Any]]:
    """Return the Theme Studio storage helper."""

    return Store(
        hass,
        STORAGE_VERSION,
        STORAGE_KEY,
    )


def get_profile_store(
    hass: HomeAssistant,
) -> Store[dict[str, Any]]:
    """Return the Theme Studio profile storage helper."""

    return Store(
        hass,
        PROFILE_STORAGE_VERSION,
        PROFILE_STORAGE_KEY,
    )


def get_background_store(
    hass: HomeAssistant,
) -> Store[dict[str, Any]]:
    """Return the Theme Studio background storage helper."""

    return Store(
        hass,
        BACKGROUND_STORAGE_VERSION,
        BACKGROUND_STORAGE_KEY,
    )


def normalize_profile(
    profile: dict[str, Any],
    defaults: dict[str, Any],
) -> dict[str, Any]:
    """Merge and validate one color-mode profile."""

    normalized = defaults.copy()

    for key in defaults:
        if key in profile:
            normalized[key] = profile[key]

    return PROFILE_SCHEMA(normalized)


def normalize_effects(
    effects: Any,
) -> dict[str, Any]:
    """Merge and validate dashboard effect settings."""

    normalized = DEFAULT_EFFECT_SETTINGS.copy()

    if isinstance(effects, dict):
        for key in DEFAULT_EFFECT_SETTINGS:
            if key in effects:
                normalized[key] = effects[key]

        if (
            "energyEntities" not in effects
            and isinstance(effects.get("energyEntity"), str)
            and effects["energyEntity"]
        ):
            normalized["energyEntities"] = [
                effects["energyEntity"]
            ]

        if (
            "cardEffects" not in effects
            and isinstance(effects.get("cardEffect"), str)
            and effects["cardEffect"] != "none"
        ):
            normalized["cardEffects"] = [
                effects["cardEffect"]
            ]

    if normalized["effect"] not in (
        "none",
        "space-command",
    ):
        normalized["effect"] = "none"

    normalized["energyEntities"] = list(
        dict.fromkeys(normalized["energyEntities"])
    )

    normalized["pulseEntities"] = list(
        dict.fromkeys(normalized["pulseEntities"])
    )

    normalized["climateEntities"] = list(
        dict.fromkeys(normalized["climateEntities"])
    )

    normalized["cardEffects"] = list(
        dict.fromkeys(normalized["cardEffects"])
    )

    normalized["alertEntities"] = list(
        dict.fromkeys(normalized["alertEntities"])
    )

    if (
        normalized["energyCritical"]
        <= normalized["energyWarning"]
    ):
        normalized["energyCritical"] = min(
            1000000,
            normalized["energyWarning"] + 1,
        )

    if (
        normalized["climateComfortMax"]
        <= normalized["climateComfortMin"]
    ):
        normalized["climateComfortMax"] = min(
            100,
            normalized["climateComfortMin"] + 1,
        )

    if (
        normalized["climateHot"]
        <= normalized["climateComfortMax"]
    ):
        normalized["climateHot"] = min(
            120,
            normalized["climateComfortMax"] + 1,
        )

    return EFFECT_SCHEMA(normalized)


def normalize_settings(
    settings: dict[str, Any],
) -> dict[str, Any]:
    """Normalize settings and migrate older formats."""

    if (
        isinstance(settings.get("light"), dict)
        and isinstance(settings.get("dark"), dict)
    ):
        return SETTINGS_SCHEMA(
            {
                "light": normalize_profile(
                    settings["light"],
                    DEFAULT_LIGHT_PROFILE,
                ),
                "dark": normalize_profile(
                    settings["dark"],
                    DEFAULT_DARK_PROFILE,
                ),
                "effects": normalize_effects(
                    settings.get("effects")
                ),
            }
        )

    return SETTINGS_SCHEMA(
        {
            "light": DEFAULT_LIGHT_PROFILE.copy(),
            "dark": normalize_profile(
                settings,
                DEFAULT_DARK_PROFILE,
            ),
            "effects": DEFAULT_EFFECT_SETTINGS.copy(),
        }
    )


def default_settings() -> dict[str, Any]:
    """Return a complete independent default configuration."""

    return {
        "light": DEFAULT_LIGHT_PROFILE.copy(),
        "dark": DEFAULT_DARK_PROFILE.copy(),
        "effects": DEFAULT_EFFECT_SETTINGS.copy(),
    }


def normalize_profile_name(name: Any) -> str:
    """Normalize and validate a user-facing profile name."""

    if not isinstance(name, str):
        raise vol.Invalid("Der Profilname muss Text sein.")

    normalized = " ".join(name.split())
    return PROFILE_NAME_VALIDATOR(normalized)


def normalize_saved_profiles(
    saved: Any,
) -> list[dict[str, Any]]:
    """Return valid stored profiles and ignore invalid records."""

    if not isinstance(saved, dict):
        return []

    raw_profiles = saved.get("profiles")
    if not isinstance(raw_profiles, list):
        return []

    profiles: list[dict[str, Any]] = []
    known_ids: set[str] = set()

    for raw_profile in raw_profiles:
        if not isinstance(raw_profile, dict):
            continue

        try:
            profile_id = PROFILE_ID_VALIDATOR(
                raw_profile.get("id", "")
            )
            name = normalize_profile_name(
                raw_profile.get("name")
            )
            settings = normalize_settings(
                raw_profile.get("settings", {})
            )
        except (vol.Invalid, TypeError, ValueError):
            continue

        if profile_id in known_ids:
            continue

        created_at = raw_profile.get("created_at")
        updated_at = raw_profile.get("updated_at")

        if not isinstance(created_at, str):
            created_at = ""

        if not isinstance(updated_at, str):
            updated_at = created_at

        known_ids.add(profile_id)
        profiles.append(
            {
                "id": profile_id,
                "name": name,
                "created_at": created_at,
                "updated_at": updated_at,
                "settings": settings,
            }
        )

        if len(profiles) >= MAX_PROFILES:
            break

    profiles.sort(
        key=lambda profile: profile["name"].casefold()
    )
    return profiles


async def async_load_profiles(
    hass: HomeAssistant,
) -> list[dict[str, Any]]:
    """Load and normalize all saved profiles."""

    store = get_profile_store(hass)
    saved = await store.async_load()
    return normalize_saved_profiles(saved)


async def async_save_profiles(
    hass: HomeAssistant,
    profiles: list[dict[str, Any]],
) -> None:
    """Persist all normalized profiles."""

    store = get_profile_store(hass)
    await store.async_save({"profiles": profiles})


def normalize_background_name(name: Any) -> str:
    """Normalize and validate a background display name."""

    if not isinstance(name, str):
        raise vol.Invalid("Der Bildname muss Text sein.")

    normalized = " ".join(name.split())

    if not 1 <= len(normalized) <= MAX_BACKGROUND_NAME_LENGTH:
        raise vol.Invalid(
            "Der Bildname muss zwischen 1 und "
            f"{MAX_BACKGROUND_NAME_LENGTH} Zeichen lang sein."
        )

    return normalized


def normalize_saved_backgrounds(
    saved: Any,
) -> list[dict[str, Any]]:
    """Return valid stored background metadata."""

    if not isinstance(saved, dict):
        return []

    raw_backgrounds = saved.get("backgrounds")
    if not isinstance(raw_backgrounds, list):
        return []

    backgrounds: list[dict[str, Any]] = []
    known_ids: set[str] = set()
    known_filenames: set[str] = set()

    for raw_background in raw_backgrounds:
        if not isinstance(raw_background, dict):
            continue

        try:
            background_id = BACKGROUND_ID_VALIDATOR(
                raw_background.get("id", "")
            )
            filename = BACKGROUND_FILENAME_VALIDATOR(
                raw_background.get("filename", "")
            )
            name = normalize_background_name(
                raw_background.get("name")
            )
        except (vol.Invalid, TypeError, ValueError):
            continue

        if (
            background_id in known_ids
            or filename in known_filenames
        ):
            continue

        created_at = raw_background.get("created_at")
        if not isinstance(created_at, str):
            created_at = ""

        known_ids.add(background_id)
        known_filenames.add(filename)
        backgrounds.append(
            {
                "id": background_id,
                "name": name,
                "filename": filename,
                "created_at": created_at,
            }
        )

        if len(backgrounds) >= MAX_BACKGROUNDS:
            break

    return backgrounds


def default_background_name(filename: str) -> str:
    """Return a readable name for an existing image file."""

    stem = Path(filename).stem
    names = {
        "background": "Hintergrund",
        "background_light": "Hintergrund hell",
        "background_dark": "Hintergrund dunkel",
    }
    return names.get(stem, "Eigenes Hintergrundbild")


def sync_background_library(
    directory: Path,
    stored_backgrounds: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], bool]:
    """Discover valid files and remove missing library records."""

    directory.mkdir(parents=True, exist_ok=True)
    files: dict[str, Path] = {}

    for path in directory.iterdir():
        if not path.is_file():
            continue

        try:
            filename = BACKGROUND_FILENAME_VALIDATOR(path.name)
        except vol.Invalid:
            continue

        files[filename] = path

    backgrounds = [
        background
        for background in stored_backgrounds
        if background["filename"] in files
    ]
    known_filenames = {
        background["filename"]
        for background in backgrounds
    }

    for filename in sorted(files):
        if (
            filename in known_filenames
            or len(backgrounds) >= MAX_BACKGROUNDS
        ):
            continue

        backgrounds.append(
            {
                "id": uuid4().hex,
                "name": default_background_name(filename),
                "filename": filename,
                "created_at": datetime.fromtimestamp(
                    files[filename].stat().st_mtime,
                    UTC,
                ).isoformat(),
            }
        )

    backgrounds.sort(
        key=lambda background: background["name"].casefold()
    )
    changed = backgrounds != stored_backgrounds
    return backgrounds, changed


def background_results(
    directory: Path,
    backgrounds: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Add public URLs and file sizes to background metadata."""

    results: list[dict[str, Any]] = []

    for background in backgrounds:
        path = directory / background["filename"]

        try:
            stat = path.stat()
        except OSError:
            continue

        results.append(
            {
                **background,
                "url": (
                    f"/local/{BACKGROUND_DIRECTORY}/"
                    f'{background["filename"]}?v={stat.st_mtime_ns}'
                ),
                "size": stat.st_size,
            }
        )

    return results


async def async_load_backgrounds(
    hass: HomeAssistant,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Load metadata, discover legacy images and build responses."""

    store = get_background_store(hass)
    saved = await store.async_load()
    stored_backgrounds = normalize_saved_backgrounds(saved)
    directory = Path(
        hass.config.path("www", BACKGROUND_DIRECTORY)
    )
    backgrounds, changed = await hass.async_add_executor_job(
        sync_background_library,
        directory,
        stored_backgrounds,
    )

    if changed or saved is None:
        await store.async_save({"backgrounds": backgrounds})

    results = await hass.async_add_executor_job(
        background_results,
        directory,
        backgrounds,
    )
    return backgrounds, results


async def async_save_backgrounds(
    hass: HomeAssistant,
    backgrounds: list[dict[str, Any]],
) -> None:
    """Persist normalized background metadata."""

    store = get_background_store(hass)
    await store.async_save({"backgrounds": backgrounds})


def background_is_referenced(
    filename: str,
    settings: dict[str, Any],
    profiles: list[dict[str, Any]],
) -> bool:
    """Return whether current settings or a profile uses a file."""

    expected_path = f"/local/{BACKGROUND_DIRECTORY}/{filename}"

    def settings_use_file(candidate: dict[str, Any]) -> bool:
        return any(
            str(candidate[mode].get("backgroundImage", ""))
            .split("?", 1)[0]
            == expected_path
            for mode in ("light", "dark")
        )

    return settings_use_file(settings) or any(
        settings_use_file(profile["settings"])
        for profile in profiles
    )


def delete_background_file(path: Path) -> None:
    """Delete one validated background file."""

    path.unlink(missing_ok=True)


def hex_to_rgb(
    color: str,
) -> tuple[int, int, int]:
    """Convert a hexadecimal color to RGB."""

    value = color.removeprefix("#")

    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
    )


def rgba_color(
    color: str,
    opacity: int,
) -> str:
    """Create an RGBA color value."""

    red, green, blue = hex_to_rgb(color)
    alpha = opacity / 100

    return (
        f"rgba({red}, {green}, {blue}, "
        f"{alpha:.2f})"
    )


def build_background(
    profile: dict[str, Any],
) -> str:
    """Create a dashboard background."""

    primary = profile["primaryColor"]
    background = profile["backgroundColor"]
    darkening = profile["darkening"] / 100

    overlay = (
        "linear-gradient("
        f"rgba(0, 0, 0, {darkening:.2f}), "
        f"rgba(0, 0, 0, {darkening:.2f})"
        ")"
    )

    if (
        profile["background"] == "image"
        and profile["backgroundImage"]
    ):
        image_url = json.dumps(
            profile["backgroundImage"]
        )

        return (
            f"{overlay}, "
            f"url({image_url}) "
            "center / cover no-repeat fixed"
        )

    if profile["background"] == "waves":
        return (
            f"{overlay}, "
            "radial-gradient("
            "circle at 20% 20%, "
            f"{primary} 0%, transparent 35%"
            "), "
            "radial-gradient("
            "circle at 80% 70%, "
            "#2f6fa3 0%, transparent 40%"
            "), "
            f"{background}"
        )

    if profile["background"] == "aurora":
        return (
            f"{overlay}, "
            "linear-gradient("
            "135deg, "
            f"{background}, "
            f"{primary} 48%, "
            "#552d6f"
            ")"
        )

    return (
        f"{overlay}, "
        f"linear-gradient({background}, {background})"
    )


def build_card_shadow(
    strength: int,
) -> str:
    """Create a card shadow."""

    if strength == 0:
        return "none"

    vertical_offset = max(
        2,
        round(strength / 4),
    )

    opacity = min(
        0.45,
        0.12 + strength / 150,
    )

    return (
        f"0 {vertical_offset}px {strength}px "
        f"rgba(0, 0, 0, {opacity:.2f})"
    )


def build_mode_values(
    profile: dict[str, Any],
    mode: str,
) -> dict[str, str]:
    """Build the theme variables for one mode."""

    primary = profile["primaryColor"]
    background = profile["backgroundColor"]

    card_background = rgba_color(
        profile["cardColor"],
        profile["cardOpacity"],
    )

    if mode == "light":
        secondary_text = "rgba(0, 0, 0, 0.68)"
        disabled_text = "rgba(0, 0, 0, 0.38)"
        divider = "rgba(0, 0, 0, 0.12)"
    else:
        secondary_text = "rgba(255, 255, 255, 0.72)"
        disabled_text = "rgba(255, 255, 255, 0.38)"
        divider = "rgba(255, 255, 255, 0.12)"

    return {
        "primary-color": primary,
        "accent-color": primary,
        "primary-background-color": background,
        "secondary-background-color": background,
        "card-background-color": card_background,
        "ha-card-background": card_background,
        "ha-card-border-radius": (
            f'{profile["borderRadius"]}px'
        ),
        "ha-card-border-width": (
            f'{profile["cardBorderWidth"]}px'
        ),
        "ha-card-border-style": "solid",
        "ha-card-border-color": (
            profile["cardBorderColor"]
        ),
        "ha-card-box-shadow": build_card_shadow(
            profile["cardShadow"]
        ),
        "primary-text-color": (
            profile["cardTextColor"]
        ),
        "secondary-text-color": secondary_text,
        "text-primary-color": "#ffffff",
        "disabled-text-color": disabled_text,
        "divider-color": divider,
        "app-header-background-color": (
            profile["headerBackgroundColor"]
        ),
        "app-header-edit-background-color": (
            profile["headerBackgroundColor"]
        ),
        "app-header-text-color": profile["headerTextColor"],
        "sidebar-background-color": (
            profile["sidebarBackgroundColor"]
        ),
        "sidebar-text-color": profile["sidebarTextColor"],
        "sidebar-icon-color": profile["sidebarIconColor"],
        "sidebar-selected-text-color": (
            profile["sidebarSelectedColor"]
        ),
        "sidebar-selected-icon-color": (
            profile["sidebarSelectedColor"]
        ),
        "state-icon-color": (
            profile["cardIconColor"]
        ),
        "state-icon-active-color": primary,
        "switch-checked-color": primary,
        "switch-checked-button-color": primary,
        "switch-checked-track-color": primary,
        "lovelace-background": build_background(
            profile
        ),
    }


def build_theme_file(
    settings: dict[str, Any],
) -> str:
    """Build a theme with light, dark and effect settings."""

    effects = settings["effects"]

    effect_values = {
        "theme-studio-effect": effects["effect"],
        "theme-studio-motion": str(effects["motion"]),
        "theme-studio-glow": str(effects["glow"]),
        "theme-studio-card-effects": ",".join(
            effects["cardEffects"]
        ),
        "theme-studio-card-intensity": str(
            effects["cardIntensity"]
        ),
        "theme-studio-pulse-entities": ",".join(
            effects["pulseEntities"]
        ),
        "theme-studio-energy-entities": ",".join(
            effects["energyEntities"]
        ),
        "theme-studio-energy-warning": str(
            effects["energyWarning"]
        ),
        "theme-studio-energy-critical": str(
            effects["energyCritical"]
        ),
        "theme-studio-climate-entities": ",".join(
            effects["climateEntities"]
        ),
        "theme-studio-climate-comfort-min": str(
            effects["climateComfortMin"]
        ),
        "theme-studio-climate-comfort-max": str(
            effects["climateComfortMax"]
        ),
        "theme-studio-climate-hot": str(
            effects["climateHot"]
        ),
        "theme-studio-alert-entities": ",".join(
            effects["alertEntities"]
        ),
        "theme-studio-alert-battery-low": str(
            effects["alertBatteryLow"]
        ),
    }

    lines = [
        f"{THEME_NAME}:",
    ]

    for key, value in effect_values.items():
        encoded_value = json.dumps(
            value,
            ensure_ascii=False,
        )

        lines.append(
            f"  {key}: {encoded_value}"
        )

    lines.append("  modes:")

    for mode in ("light", "dark"):
        lines.append(f"    {mode}:")

        values = build_mode_values(
            settings[mode],
            mode,
        )

        for key, value in values.items():
            encoded_value = json.dumps(
                value,
                ensure_ascii=False,
            )

            lines.append(
                f"      {key}: {encoded_value}"
            )

    lines.append("")

    return "\n".join(lines)


def write_theme_file(
    theme_path: Path,
    content: str,
) -> None:
    """Write the generated theme atomically."""

    theme_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_path = theme_path.with_suffix(
        ".yaml.tmp"
    )

    temporary_path.write_text(
        content,
        encoding="utf-8",
    )

    temporary_path.replace(theme_path)


def validate_image_signature(
    image_data: bytes,
    mime_type: str,
) -> None:
    """Validate the actual image type."""

    if mime_type == "image/png":
        valid = image_data.startswith(
            b"\x89PNG\r\n\x1a\n"
        )
    elif mime_type == "image/jpeg":
        valid = image_data.startswith(
            b"\xff\xd8\xff"
        )
    elif mime_type == "image/webp":
        valid = (
            len(image_data) >= 12
            and image_data.startswith(b"RIFF")
            and image_data[8:12] == b"WEBP"
        )
    else:
        valid = False

    if not valid:
        raise ValueError(
            "Der Dateiinhalt entspricht nicht "
            "dem angegebenen Bildformat."
        )


def decode_and_write_background(
    target_path: Path,
    encoded_content: str,
    mime_type: str,
) -> None:
    """Decode, validate and save a background image."""

    if len(encoded_content) > MAX_BASE64_LENGTH:
        raise ValueError(
            "Die Bilddatei ist größer als 5 MB."
        )

    try:
        image_data = base64.b64decode(
            encoded_content,
            validate=True,
        )
    except (binascii.Error, ValueError) as error:
        raise ValueError(
            "Die Bilddaten sind ungültig."
        ) from error

    if not image_data:
        raise ValueError(
            "Die Bilddatei ist leer."
        )

    if len(image_data) > MAX_BACKGROUND_SIZE:
        raise ValueError(
            "Die Bilddatei ist größer als 5 MB."
        )

    validate_image_signature(
        image_data,
        mime_type,
    )

    target_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_path = target_path.with_suffix(
        f"{target_path.suffix}.tmp"
    )

    temporary_path.write_bytes(image_data)
    temporary_path.replace(target_path)


async def async_generate_and_apply_theme(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    settings: dict[str, Any],
) -> None:
    """Generate, reload and activate the theme."""

    theme_path = Path(
        hass.config.path(
            "themes",
            THEME_FILENAME,
        )
    )

    content = build_theme_file(settings)

    await hass.async_add_executor_job(
        write_theme_file,
        theme_path,
        content,
    )

    await hass.services.async_call(
        "frontend",
        "reload_themes",
        {},
        blocking=True,
        context=connection.context(msg),
    )

    await hass.services.async_call(
        "frontend",
        "set_theme",
        {
            "name": THEME_NAME,
            "name_dark": THEME_NAME,
        },
        blocking=True,
        context=connection.context(msg),
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/get_settings",
    }
)
@websocket_api.async_response
async def websocket_get_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return saved and migrated settings."""

    store = get_store(hass)
    saved_settings = await store.async_load()

    try:
        settings = normalize_settings(
            saved_settings or {}
        )
    except (vol.Invalid, TypeError, ValueError):
        settings = default_settings()

    connection.send_result(
        msg["id"],
        settings,
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/save_settings",
        vol.Required("settings"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_save_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save settings and apply the theme."""

    try:
        settings = normalize_settings(
            msg["settings"]
        )
    except (vol.Invalid, TypeError, ValueError) as error:
        connection.send_error(
            msg["id"],
            "invalid_settings",
            f"Die Einstellungen sind ungültig: {error}",
        )
        return

    store = get_store(hass)
    await store.async_save(settings)

    try:
        await async_generate_and_apply_theme(
            hass,
            connection,
            msg,
            settings,
        )
    except Exception as error:
        connection.send_error(
            msg["id"],
            "theme_apply_failed",
            (
                "Das Theme wurde gespeichert, "
                "konnte aber nicht aktiviert werden: "
                f"{error}"
            ),
        )
        return

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "applied": True,
            "theme": THEME_NAME,
            "settings": settings,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/restore_default_theme",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_restore_default_theme(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Restore the backend-preferred Home Assistant themes."""

    try:
        await hass.services.async_call(
            "frontend",
            "set_theme",
            {
                "name": "default",
                "name_dark": "default",
            },
            blocking=True,
            context=connection.context(msg),
        )
    except Exception as error:
        connection.send_error(
            msg["id"],
            "theme_restore_failed",
            (
                "Das Home-Assistant-Standarddesign konnte "
                f"nicht wiederhergestellt werden: {error}"
            ),
        )
        return

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "theme": "default",
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/get_profiles",
    }
)
@websocket_api.async_response
async def websocket_get_profiles(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all saved design profiles."""

    profiles = await async_load_profiles(hass)

    connection.send_result(
        msg["id"],
        {
            "profiles": profiles,
            "maximum": MAX_PROFILES,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/save_profile",
        vol.Optional("profile_id"): PROFILE_ID_VALIDATOR,
        vol.Required("name"): str,
        vol.Required("settings"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_save_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create or update one design profile."""

    try:
        name = normalize_profile_name(msg["name"])
        settings = normalize_settings(msg["settings"])
    except (vol.Invalid, TypeError, ValueError) as error:
        connection.send_error(
            msg["id"],
            "invalid_profile",
            f"Das Profil ist ungültig: {error}",
        )
        return

    profiles = await async_load_profiles(hass)
    profile_id = msg.get("profile_id")
    existing_profile = next(
        (
            profile
            for profile in profiles
            if profile["id"] == profile_id
        ),
        None,
    )

    if profile_id and existing_profile is None:
        connection.send_error(
            msg["id"],
            "profile_not_found",
            "Das gewählte Profil wurde nicht gefunden.",
        )
        return

    if existing_profile is None and len(profiles) >= MAX_PROFILES:
        connection.send_error(
            msg["id"],
            "profile_limit_reached",
            (
                "Es können höchstens "
                f"{MAX_PROFILES} Profile gespeichert werden."
            ),
        )
        return

    now = datetime.now(UTC).isoformat()

    if existing_profile is None:
        saved_profile = {
            "id": uuid4().hex,
            "name": name,
            "created_at": now,
            "updated_at": now,
            "settings": settings,
        }
        profiles.append(saved_profile)
    else:
        existing_profile["name"] = name
        existing_profile["settings"] = settings
        existing_profile["updated_at"] = now
        saved_profile = existing_profile

    profiles.sort(
        key=lambda profile: profile["name"].casefold()
    )
    await async_save_profiles(hass, profiles)

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "profile": saved_profile,
            "profiles": profiles,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/delete_profile",
        vol.Required("profile_id"): PROFILE_ID_VALIDATOR,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_delete_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete one saved design profile."""

    profiles = await async_load_profiles(hass)
    remaining_profiles = [
        profile
        for profile in profiles
        if profile["id"] != msg["profile_id"]
    ]

    if len(remaining_profiles) == len(profiles):
        connection.send_error(
            msg["id"],
            "profile_not_found",
            "Das gewählte Profil wurde nicht gefunden.",
        )
        return

    await async_save_profiles(
        hass,
        remaining_profiles,
    )

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "profiles": remaining_profiles,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/get_backgrounds",
    }
)
@websocket_api.async_response
async def websocket_get_backgrounds(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all managed and discovered background images."""

    _, results = await async_load_backgrounds(hass)

    connection.send_result(
        msg["id"],
        {
            "backgrounds": results,
            "maximum": MAX_BACKGROUNDS,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/rename_background",
        vol.Required("background_id"): BACKGROUND_ID_VALIDATOR,
        vol.Required("name"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_rename_background(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Rename one background without changing its URL."""

    try:
        name = normalize_background_name(msg["name"])
    except (vol.Invalid, TypeError, ValueError) as error:
        connection.send_error(
            msg["id"],
            "invalid_background_name",
            str(error),
        )
        return

    backgrounds, _ = await async_load_backgrounds(hass)
    background = next(
        (
            item
            for item in backgrounds
            if item["id"] == msg["background_id"]
        ),
        None,
    )

    if background is None:
        connection.send_error(
            msg["id"],
            "background_not_found",
            "Das Hintergrundbild wurde nicht gefunden.",
        )
        return

    background["name"] = name
    backgrounds.sort(
        key=lambda item: item["name"].casefold()
    )
    await async_save_backgrounds(hass, backgrounds)
    directory = Path(
        hass.config.path("www", BACKGROUND_DIRECTORY)
    )
    results = await hass.async_add_executor_job(
        background_results,
        directory,
        backgrounds,
    )

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "backgrounds": results,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/delete_background",
        vol.Required("background_id"): BACKGROUND_ID_VALIDATOR,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_delete_background(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete an unused background image and its metadata."""

    backgrounds, _ = await async_load_backgrounds(hass)
    background = next(
        (
            item
            for item in backgrounds
            if item["id"] == msg["background_id"]
        ),
        None,
    )

    if background is None:
        connection.send_error(
            msg["id"],
            "background_not_found",
            "Das Hintergrundbild wurde nicht gefunden.",
        )
        return

    settings_store = get_store(hass)
    raw_settings = await settings_store.async_load()

    try:
        settings = normalize_settings(raw_settings or {})
    except (vol.Invalid, TypeError, ValueError):
        settings = default_settings()

    profiles = await async_load_profiles(hass)

    if background_is_referenced(
        background["filename"],
        settings,
        profiles,
    ):
        connection.send_error(
            msg["id"],
            "background_in_use",
            (
                "Das Bild wird vom aktiven Design oder von einem "
                "gespeicherten Profil verwendet und kann nicht "
                "gelöscht werden."
            ),
        )
        return

    directory = Path(
        hass.config.path("www", BACKGROUND_DIRECTORY)
    )

    try:
        await hass.async_add_executor_job(
            delete_background_file,
            directory / background["filename"],
        )
    except OSError as error:
        connection.send_error(
            msg["id"],
            "background_delete_failed",
            f"Das Bild konnte nicht gelöscht werden: {error}",
        )
        return

    remaining = [
        item
        for item in backgrounds
        if item["id"] != background["id"]
    ]
    await async_save_backgrounds(hass, remaining)
    results = await hass.async_add_executor_job(
        background_results,
        directory,
        remaining,
    )

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "backgrounds": results,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required(
            "type"
        ): "theme_studio/upload_background",
        vol.Optional("mode"): vol.In(
            ("light", "dark")
        ),
        vol.Optional("name"): str,
        vol.Required(
            "mime_type"
        ): vol.In(tuple(MIME_EXTENSIONS)),
        vol.Required("content"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_upload_background(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Upload a background for one color mode."""

    mime_type = msg["mime_type"]
    extension = MIME_EXTENSIONS[mime_type]
    backgrounds, _ = await async_load_backgrounds(hass)

    if len(backgrounds) >= MAX_BACKGROUNDS:
        connection.send_error(
            msg["id"],
            "background_limit_reached",
            (
                "Es können höchstens "
                f"{MAX_BACKGROUNDS} Hintergrundbilder gespeichert werden."
            ),
        )
        return

    background_id = uuid4().hex
    filename = f"image_{background_id}.{extension}"

    try:
        name = normalize_background_name(
            msg.get("name") or "Eigenes Hintergrundbild"
        )
    except (vol.Invalid, TypeError, ValueError) as error:
        connection.send_error(
            msg["id"],
            "invalid_background_name",
            str(error),
        )
        return

    target_path = Path(
        hass.config.path(
            "www",
            BACKGROUND_DIRECTORY,
            filename,
        )
    )

    try:
        await hass.async_add_executor_job(
            decode_and_write_background,
            target_path,
            msg["content"],
            mime_type,
        )
    except ValueError as error:
        connection.send_error(
            msg["id"],
            "invalid_background",
            str(error),
        )
        return
    except OSError as error:
        connection.send_error(
            msg["id"],
            "background_write_failed",
            (
                "Das Hintergrundbild konnte "
                f"nicht gespeichert werden: {error}"
            ),
        )
        return

    version = time.time_ns()

    image_url = (
        f"/local/{BACKGROUND_DIRECTORY}/"
        f"{filename}?v={version}"
    )

    background = {
        "id": background_id,
        "name": name,
        "filename": filename,
        "created_at": datetime.now(UTC).isoformat(),
    }
    backgrounds.append(background)
    backgrounds.sort(
        key=lambda item: item["name"].casefold()
    )
    await async_save_backgrounds(hass, backgrounds)
    results = await hass.async_add_executor_job(
        background_results,
        target_path.parent,
        backgrounds,
    )

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "mode": msg.get("mode"),
            "url": image_url,
            "mime_type": mime_type,
            "background": next(
                item
                for item in results
                if item["id"] == background_id
            ),
            "backgrounds": results,
        },
    )


@callback
def async_register_websocket_commands(
    hass: HomeAssistant,
) -> None:
    """Register Theme Studio WebSocket commands."""

    websocket_api.async_register_command(
        hass,
        websocket_get_settings,
    )

    websocket_api.async_register_command(
        hass,
        websocket_save_settings,
    )

    websocket_api.async_register_command(
        hass,
        websocket_restore_default_theme,
    )

    websocket_api.async_register_command(
        hass,
        websocket_get_profiles,
    )

    websocket_api.async_register_command(
        hass,
        websocket_save_profile,
    )

    websocket_api.async_register_command(
        hass,
        websocket_delete_profile,
    )

    websocket_api.async_register_command(
        hass,
        websocket_get_backgrounds,
    )

    websocket_api.async_register_command(
        hass,
        websocket_rename_background,
    )

    websocket_api.async_register_command(
        hass,
        websocket_delete_background,
    )

    websocket_api.async_register_command(
        hass,
        websocket_upload_background,
    )
