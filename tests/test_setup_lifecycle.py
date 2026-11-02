"""Tests for Theme Studio setup and unload lifecycle."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, call

from homeassistant.components import frontend

from custom_components import theme_studio
from custom_components.theme_studio.const import DOMAIN


async def test_unload_removes_owned_frontend_modules(monkeypatch) -> None:
    """Unloading removes only Theme Studio modules and permits re-registration."""

    unrelated_url = "/local/unrelated-module.js"
    manager = SimpleNamespace(
        urls={
            theme_studio.EFFECTS_MODULE_URL,
            theme_studio.CLOCK_CARD_MODULE_URL,
            unrelated_url,
        }
    )
    hass = SimpleNamespace(
        data={
            DOMAIN: {theme_studio.DATA_EFFECTS_MODULE_REGISTERED: True},
            frontend.DATA_EXTRA_MODULE_URL: manager,
        }
    )
    remove_panel = Mock()
    remove_module = Mock()
    monkeypatch.setattr(theme_studio.frontend, "async_remove_panel", remove_panel)
    monkeypatch.setattr(
        theme_studio.frontend,
        "remove_extra_js_url",
        remove_module,
    )

    result = await theme_studio.async_unload_entry(
        hass,  # type: ignore[arg-type]
        SimpleNamespace(),  # type: ignore[arg-type]
    )

    assert result is True
    remove_panel.assert_called_once_with(hass, theme_studio.PANEL_URL)
    assert remove_module.call_count == 2
    remove_module.assert_has_calls(
        [
            call(hass, theme_studio.EFFECTS_MODULE_URL),
            call(hass, theme_studio.CLOCK_CARD_MODULE_URL),
        ],
        any_order=True,
    )
    assert unrelated_url not in {
        arguments.args[1] for arguments in remove_module.call_args_list
    }
    assert (
        theme_studio.DATA_EFFECTS_MODULE_REGISTERED
        not in hass.data[DOMAIN]
    )


async def test_setup_registers_frontend_resources_only_once(monkeypatch) -> None:
    """Repeated setup does not duplicate global frontend registrations."""

    manager = SimpleNamespace(urls=set())
    register_static = AsyncMock()
    hass = SimpleNamespace(
        data={
            frontend.DATA_EXTRA_MODULE_URL: manager,
            "frontend_panels": {},
        },
        http=SimpleNamespace(async_register_static_paths=register_static),
    )
    add_module = Mock()
    register_panel = AsyncMock()
    register_websockets = Mock()
    refresh_registry = AsyncMock()
    monkeypatch.setattr(theme_studio.frontend, "add_extra_js_url", add_module)
    monkeypatch.setattr(
        theme_studio.panel_custom,
        "async_register_panel",
        register_panel,
    )
    monkeypatch.setattr(
        theme_studio,
        "async_register_websocket_commands",
        register_websockets,
    )
    monkeypatch.setattr(
        theme_studio,
        "async_refresh_theme_registry",
        refresh_registry,
    )

    assert await theme_studio.async_setup_entry(
        hass,  # type: ignore[arg-type]
        SimpleNamespace(),  # type: ignore[arg-type]
    )
    hass.data["frontend_panels"][theme_studio.PANEL_URL] = object()
    assert await theme_studio.async_setup_entry(
        hass,  # type: ignore[arg-type]
        SimpleNamespace(),  # type: ignore[arg-type]
    )

    register_static.assert_awaited_once()
    register_panel.assert_awaited_once()
    register_websockets.assert_called_once_with(hass)
    assert add_module.call_args_list == [
        call(hass, theme_studio.EFFECTS_MODULE_URL),
        call(hass, theme_studio.CLOCK_CARD_MODULE_URL),
    ]
    assert refresh_registry.await_count == 2


async def test_setup_survives_theme_registry_refresh_failure(
    monkeypatch,
) -> None:
    """A recoverable registry failure must not hide the repair panel."""

    hass = SimpleNamespace(
        data={
            DOMAIN: {
                theme_studio.DATA_STATIC_PATH_REGISTERED: True,
                theme_studio.DATA_EFFECTS_MODULE_REGISTERED: True,
                theme_studio.DATA_WEBSOCKET_REGISTERED: True,
            },
            "frontend_panels": {theme_studio.PANEL_URL: object()},
        }
    )
    refresh_registry = AsyncMock(side_effect=OSError("temporary failure"))
    monkeypatch.setattr(
        theme_studio,
        "async_refresh_theme_registry",
        refresh_registry,
    )

    result = await theme_studio.async_setup_entry(
        hass,  # type: ignore[arg-type]
        SimpleNamespace(),  # type: ignore[arg-type]
    )

    assert result is True
    refresh_registry.assert_awaited_once_with(hass)
