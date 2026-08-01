"""Theme Studio integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .websocket import async_register_websocket_commands


PANEL_URL = "theme-studio"
PANEL_TITLE = "Theme Studio"
PANEL_ICON = "mdi:palette"
PANEL_ELEMENT = "theme-studio-panel"
STATIC_URL = "/theme_studio_files"

DATA_WEBSOCKET_REGISTERED = "websocket_registered"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up Theme Studio from a config entry."""

    hass.data.setdefault(DOMAIN, {})

    frontend_path = Path(__file__).parent / "frontend"

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                STATIC_URL,
                str(frontend_path),
                cache_headers=False,
            )
        ]
    )

    if PANEL_URL not in hass.data.get("frontend_panels", {}):
        await panel_custom.async_register_panel(
            hass,
            webcomponent_name=PANEL_ELEMENT,
            frontend_url_path=PANEL_URL,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=f"{STATIC_URL}/theme-studio-panel.js",
            embed_iframe=False,
            require_admin=False,
        )

    if not hass.data[DOMAIN].get(DATA_WEBSOCKET_REGISTERED):
        async_register_websocket_commands(hass)
        hass.data[DOMAIN][DATA_WEBSOCKET_REGISTERED] = True

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload a Theme Studio config entry."""

    frontend.async_remove_panel(hass, PANEL_URL)
    return True