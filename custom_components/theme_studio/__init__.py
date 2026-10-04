"""Theme Studio integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, FRONTEND_REVISION
from .websocket import (
    async_refresh_theme_registry,
    async_register_websocket_commands,
)


_LOGGER = logging.getLogger(__name__)


PANEL_URL = "theme-studio"
PANEL_TITLE = "Theme Studio"
PANEL_ICON = "mdi:palette"
PANEL_ELEMENT = "theme-studio-panel"
STATIC_URL = "/theme_studio_files"
EFFECTS_MODULE_URL = (
    f"{STATIC_URL}/theme-studio-effects.js?v={FRONTEND_REVISION}"
)

DATA_WEBSOCKET_REGISTERED = "websocket_registered"
DATA_STATIC_PATH_REGISTERED = "static_path_registered"
DATA_EFFECTS_MODULE_REGISTERED = "effects_module_registered"


def _register_effects_module(hass: HomeAssistant) -> None:
    """Register only the current dashboard effects module URL."""

    manager = hass.data.get(frontend.DATA_EXTRA_MODULE_URL)

    if manager is not None:
        for url in manager.urls:
            if url.startswith(f"{STATIC_URL}/theme-studio-effects.js"):
                frontend.remove_extra_js_url(hass, url)

    frontend.add_extra_js_url(hass, EFFECTS_MODULE_URL)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up Theme Studio from a config entry."""

    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get(DATA_STATIC_PATH_REGISTERED):
        frontend_path = Path(__file__).parent / "frontend"

        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(frontend_path),
                    cache_headers=True,
                )
            ]
        )
        hass.data[DOMAIN][DATA_STATIC_PATH_REGISTERED] = True

    if not hass.data[DOMAIN].get(DATA_EFFECTS_MODULE_REGISTERED):
        _register_effects_module(hass)
        hass.data[DOMAIN][DATA_EFFECTS_MODULE_REGISTERED] = True

    if PANEL_URL not in hass.data.get("frontend_panels", {}):
        await panel_custom.async_register_panel(
            hass,
            webcomponent_name=PANEL_ELEMENT,
            frontend_url_path=PANEL_URL,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=(
                f"{STATIC_URL}/theme-studio-panel.js?v={FRONTEND_REVISION}"
            ),
            embed_iframe=False,
            require_admin=False,
        )

    if not hass.data[DOMAIN].get(DATA_WEBSOCKET_REGISTERED):
        async_register_websocket_commands(hass)
        hass.data[DOMAIN][DATA_WEBSOCKET_REGISTERED] = True

    try:
        await async_refresh_theme_registry(hass)
    except Exception:  # noqa: BLE001 - setup remains available for recovery
        _LOGGER.exception("Theme Studio themes could not be refreshed during setup")

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload a Theme Studio config entry."""

    frontend.async_remove_panel(hass, PANEL_URL)
    return True
