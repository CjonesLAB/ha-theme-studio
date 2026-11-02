"""Tests for the Theme Studio configuration flow."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from custom_components.theme_studio.config_flow import ThemeStudioConfigFlow
from custom_components.theme_studio.const import DOMAIN


def _flow() -> SimpleNamespace:
    """Return the minimal flow interface used by the user step."""

    return SimpleNamespace(
        async_set_unique_id=AsyncMock(),
        _abort_if_unique_id_configured=Mock(),
        async_show_form=Mock(return_value={"type": "form"}),
        async_create_entry=Mock(return_value={"type": "create_entry"}),
    )


async def test_user_step_shows_confirmation_form() -> None:
    """The first visit reserves the unique ID and shows the setup form."""

    flow = _flow()

    result = await ThemeStudioConfigFlow.async_step_user(flow, None)

    assert result == {"type": "form"}
    flow.async_set_unique_id.assert_awaited_once_with(DOMAIN)
    flow._abort_if_unique_id_configured.assert_called_once_with()
    flow.async_show_form.assert_called_once_with(step_id="user", data_schema=None)
    flow.async_create_entry.assert_not_called()


async def test_user_step_creates_single_empty_entry() -> None:
    """Confirming the form creates the one configuration entry."""

    flow = _flow()

    result = await ThemeStudioConfigFlow.async_step_user(flow, {})

    assert result == {"type": "create_entry"}
    flow.async_create_entry.assert_called_once_with(
        title="Theme Studio",
        data={},
    )
    flow.async_show_form.assert_not_called()
