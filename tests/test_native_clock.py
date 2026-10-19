"""Regression checks for Home Assistant's built-in clock card integration."""

from pathlib import Path


def test_native_clock_style_is_bound_to_active_design() -> None:
    """The built-in clock saves and applies its style through Theme Studio."""

    source = (
        Path(__file__).parents[1]
        / "custom_components/theme_studio/frontend/theme-studio-effects.js"
    ).read_text(encoding="utf-8")

    assert 'config?.type !== "clock"' in source
    assert 'type: "theme_studio/set_clock_type"' in source
    assert 'element.localName !== "hui-clock-card"' in source
    assert "clock_style: this.nativeClockType" in source
    assert '"--theme-studio-clock-type"' in source
    assert '"theme-studio-clock-type-changed"' in source
    assert "_restoreNativeClockCards()" in source
