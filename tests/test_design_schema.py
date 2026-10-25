"""Contract tests for portable designs shared with the public gallery."""

import json
from pathlib import Path

from custom_components.theme_studio import websocket

ROOT = Path(__file__).parents[1]
SCHEMA_PATH = ROOT / "custom_components/theme_studio/design-profile.schema.json"


def test_portable_schema_matches_all_current_palette_fields() -> None:
    """Website validation cannot silently lag behind new Theme Studio fields."""

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    palette = schema["$defs"]["palette"]
    expected = set(websocket.DEFAULT_LIGHT_PROFILE)

    assert set(palette["required"]) == expected
    assert set(palette["properties"]) == expected
    assert set(websocket.DEFAULT_DARK_PROFILE) == expected
    assert palette["additionalProperties"] is False


def test_portable_schema_describes_the_current_export_envelope() -> None:
    """Keep the gallery-facing file envelope explicit and versioned."""

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    assert schema["properties"]["format"]["const"] == "theme-studio-profile"
    assert schema["properties"]["version"]["const"] == 2
    assert schema["properties"]["settings"]["required"] == ["mode", "design"]
    assert "Theme Studio 0.10.0" in schema["description"]
    assert schema["x-theme-studio-min-version"] == "0.10.0"
