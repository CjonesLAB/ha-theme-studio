"""WebSocket API for Theme Studio."""

from __future__ import annotations

import base64
import binascii
import json
import time
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN


STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.settings"

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
        r"(background|background_light|background_dark)"
        r"\.(jpg|png|webp)(\?v=[0-9]+)?$"
    ),
)

PROFILE_SCHEMA = vol.Schema(
    {
        vol.Required("primaryColor"): COLOR_VALIDATOR,
        vol.Required("backgroundColor"): COLOR_VALIDATOR,
        vol.Required("cardColor"): COLOR_VALIDATOR,
        vol.Required("cardTextColor"): COLOR_VALIDATOR,
        vol.Required("cardIconColor"): COLOR_VALIDATOR,
        vol.Required("cardBorderColor"): COLOR_VALIDATOR,
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


def get_store(
    hass: HomeAssistant,
) -> Store[dict[str, Any]]:
    """Return the Theme Studio storage helper."""

    return Store(
        hass,
        STORAGE_VERSION,
        STORAGE_KEY,
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
        sidebar_text = "rgba(0, 0, 0, 0.78)"
        sidebar_icon = "rgba(0, 0, 0, 0.62)"
        header_text = "#1c1c1c"
    else:
        secondary_text = "rgba(255, 255, 255, 0.72)"
        disabled_text = "rgba(255, 255, 255, 0.38)"
        divider = "rgba(255, 255, 255, 0.12)"
        sidebar_text = "rgba(255, 255, 255, 0.78)"
        sidebar_icon = "rgba(255, 255, 255, 0.72)"
        header_text = "#ffffff"

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
        "app-header-background-color": background,
        "app-header-text-color": header_text,
        "sidebar-background-color": background,
        "sidebar-text-color": sidebar_text,
        "sidebar-icon-color": sidebar_icon,
        "sidebar-selected-background-color": (
            card_background
        ),
        "sidebar-selected-text-color": primary,
        "sidebar-selected-icon-color": primary,
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
        ): "theme_studio/upload_background",
        vol.Required("mode"): vol.In(
            ("light", "dark")
        ),
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

    mode = msg["mode"]
    mime_type = msg["mime_type"]
    extension = MIME_EXTENSIONS[mime_type]

    filename = (
        f"background_{mode}.{extension}"
    )

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

    connection.send_result(
        msg["id"],
        {
            "success": True,
            "mode": mode,
            "url": image_url,
            "mime_type": mime_type,
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
        websocket_upload_background,
    )
