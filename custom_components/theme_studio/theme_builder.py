"""Pure helpers for generating Theme Studio theme values and YAML."""

from __future__ import annotations

import base64
import json
import re
from typing import Any

from .const import NAME as THEME_NAME


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

    if profile["background"] == "texture" and profile["backgroundImage"]:
        image_url = json.dumps(
            profile["backgroundImage"]
        )

        return (
            f"{overlay}, "
            f"url({image_url}) "
            "center / cover no-repeat fixed"
        )

    if profile["background"] == "image" and profile["backgroundImage"]:
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
    liquid_glass: bool = False,
    highlight: int = 0,
) -> str:
    """Create a card shadow."""

    if strength == 0 and not liquid_glass:
        return "none"

    vertical_offset = max(
        2,
        round(strength / 4),
    )

    opacity = min(
        0.45,
        0.12 + strength / 150,
    )

    shadow = (
        f"0 {vertical_offset}px {strength}px "
        f"rgba(0, 0, 0, {opacity:.2f})"
    )

    if not liquid_glass:
        return shadow

    highlight_opacity = min(0.7, highlight / 100)
    lower_opacity = min(0.22, 0.06 + highlight / 500)
    return (
        f"{shadow}, "
        f"inset 0 1px 0 rgba(255, 255, 255, {highlight_opacity:.2f}), "
        f"inset 0 -1px 0 rgba(0, 0, 0, {lower_opacity:.2f})"
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
    card_background_image = (
        f'url({json.dumps(profile["cardBackgroundImage"])})'
        if profile["cardBackgroundImage"]
        else "none"
    )
    texture_darkening = profile["cardTextureDarkening"] / 100
    overlay_material_image = "none"
    if card_background_image != "none":
        overlay_material_image = (
            "linear-gradient("
            "var(--theme-studio-card-texture-veil), "
            "var(--theme-studio-card-texture-veil)), "
            "linear-gradient("
            f"rgba(0, 0, 0, {texture_darkening:.2f}), "
            f"rgba(0, 0, 0, {texture_darkening:.2f})), "
            f"{card_background_image}"
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
            profile["cardShadow"],
            profile["liquidGlass"],
            profile["glassHighlight"],
        ),
        "theme-studio-liquid-glass": (
            "1" if profile["liquidGlass"] else "0"
        ),
        "theme-studio-clock-type": profile["clockType"],
        "theme-studio-card-shape": profile["cardShape"],
        "theme-studio-card-background-image": card_background_image,
        "theme-studio-card-texture-opacity": (
            f'{profile["cardOpacity"] / 100:.2f}'
        ),
        "theme-studio-card-texture-veil": rgba_color(
            profile["cardColor"],
            100 - profile["cardOpacity"],
        ),
        "theme-studio-card-texture-darkening": (
            f'{profile["cardTextureDarkening"] / 100:.2f}'
        ),
        "theme-studio-tech-frame-cut": str(profile["techFrameCut"]),
        "theme-studio-tech-frame-glow": str(profile["techFrameGlow"]),
        "theme-studio-tech-frame-border-color": profile["cardBorderColor"],
        "theme-studio-tech-frame-border-width": (
            f'{profile["cardBorderWidth"]}px'
        ),
        "theme-studio-tech-frame-shadow": str(profile["cardShadow"]),
        "theme-studio-glass-blur": str(profile["glassBlur"]),
        "theme-studio-glass-saturation": str(
            profile["glassSaturation"]
        ),
        "theme-studio-glass-highlight": str(
            profile["glassHighlight"]
        ),
        "theme-studio-overlay-background": profile["cardColor"],
        "theme-studio-overlay-material-image": overlay_material_image,
        "theme-studio-overlay-backdrop-filter": (
            "blur(64px) brightness(35%) saturate(60%)"
            if profile["liquidGlass"]
            else "none"
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


def build_expert_rules_css(rules: list[dict[str, Any]]) -> str:
    """Build scoped CSS from validated visual expert rules."""

    blocks: list[str] = []

    for rule in rules:
        if not rule["enabled"]:
            continue

        target_type = rule["targetType"]
        target = rule["target"]
        attribute = ""

        if target_type == "entity":
            attribute = f'[data-theme-studio-entity~="{target}"]'
        elif target_type == "id":
            attribute = f'[data-theme-studio-id="{target}"]'
        elif target_type == "card":
            attribute = f'[data-theme-studio-card-key="{target}"]'

        card_selector = f"ha-card{attribute}"
        container_selector = (
            f"[data-theme-studio-card-container]{attribute}"
        )
        visual: list[str] = []
        placement: list[str] = []
        font_descendants: list[str] = []

        if rule["padding"] is not None:
            visual.append(f'padding: {rule["padding"]}px !important;')
        if rule["minHeight"] is not None:
            visual.append(f'min-height: {rule["minHeight"]}px !important;')
        if rule["opacity"] is not None:
            visual.append(f'opacity: {rule["opacity"] / 100:.2f} !important;')
        if rule["fontSize"] is not None:
            visual.append(f'font-size: {rule["fontSize"]}px !important;')
            for variable in (
                "--ha-font-size-xs",
                "--ha-font-size-s",
                "--ha-font-size-m",
                "--ha-font-size-l",
                "--mdc-typography-body1-font-size",
                "--mdc-typography-body2-font-size",
                "--paper-font-body1_-_font-size",
                "--paper-font-body2_-_font-size",
                "--state-card-primary-font-size",
                "--state-card-secondary-font-size",
                "--card-primary-font-size",
                "--card-secondary-font-size",
            ):
                visual.append(
                    f'{variable}: {rule["fontSize"]}px !important;'
                )
            font_descendants.append(
                f'font-size: {rule["fontSize"]}px !important;'
            )
        if rule["borderRadius"] is not None:
            visual.append(f'border-radius: {rule["borderRadius"]}px !important;')

        if rule["margin"] is not None:
            placement.append(f'margin: {rule["margin"]}px !important;')
        if rule["width"] is not None:
            placement.extend(
                (
                    (
                        f'width: min({rule["width"]}px, 100%, '
                        "calc(100vw - 24px)) !important;"
                    ),
                    "max-width: min(100%, calc(100vw - 24px)) !important;",
                    "box-sizing: border-box !important;",
                )
            )
        if rule["columns"] is not None:
            placement.append(f'grid-column: span {rule["columns"]} !important;')
        if rule["offsetX"] is not None or rule["offsetY"] is not None:
            offset_x = rule["offsetX"] or 0
            offset_y = rule["offsetY"] or 0
            placement.append(
                f"transform: translate({offset_x}px, {offset_y}px) !important;"
            )

        declarations: list[tuple[str, list[str]]] = []

        if target_type == "layout":
            layout_rules = visual + placement
            if rule["gap"] is not None:
                layout_rules.append(f'gap: {rule["gap"]}px !important;')
            declarations.append(("[data-theme-studio-layout]", layout_rules))
        else:
            declarations.extend(
                (
                    (card_selector, visual),
                    (f"{card_selector} *", font_descendants),
                    (container_selector, placement),
                )
            )

        rule_blocks = []
        for selector, properties in declarations:
            if not properties:
                continue
            body = "\n".join(f"  {property_value}" for property_value in properties)
            rule_blocks.append(f"{selector} {{\n{body}\n}}")

        if not rule_blocks:
            continue

        css = f"/* Theme Studio rule {rule['id']} */\n" + "\n\n".join(rule_blocks)
        media = {
            "desktop": "(min-width: 1025px)",
            "tablet": "(min-width: 601px) and (max-width: 1024px)",
            "mobile": "(max-width: 600px)",
        }.get(rule["device"])

        if media:
            indented = "\n".join(f"  {line}" for line in css.splitlines())
            css = f"@media {media} {{\n{indented}\n}}"
        elif target_type != "layout":
            mobile_placement: list[str] = []
            if rule["columns"] is not None:
                mobile_placement.append("grid-column: 1 / -1 !important;")
                mobile_placement.append("justify-self: start !important;")
            if rule["offsetX"] not in (None, 0):
                offset_y = rule["offsetY"] or 0
                mobile_placement.append(
                    f"transform: translate(0px, {offset_y}px) !important;"
                )

            if mobile_placement:
                body = "\n".join(
                    f"    {property_value}" for property_value in mobile_placement
                )
                css += (
                    "\n\n@media (max-width: 600px) {\n"
                    f"  {container_selector} {{\n{body}\n  }}\n"
                    "}"
                )

        blocks.append(css)

    return "\n\n".join(blocks)


def build_card_designs_css(designs: list[dict[str, Any]]) -> str:
    """Build card-local design overrides without changing the global theme."""

    blocks: list[str] = []
    for design in designs:
        if not design["enabled"]:
            continue

        target_attribute = (
            "data-theme-studio-card-key"
            if re.fullmatch(r"[a-f0-9]{16}", design["target"])
            else "data-theme-studio-id"
        )
        selector = f'ha-card[{target_attribute}="{design["target"]}"]'
        local_style = (
            "standard" if design["style"] == "inherit" else design["style"]
        )
        declarations: list[str] = [
            "--theme-studio-local-card-design: 1 !important;",
            f"--theme-studio-local-card-style: {local_style} !important;",
            "position: relative !important;",
            "isolation: isolate !important;",
            "clip-path: none !important;",
            "border-radius: var(--ha-card-border-radius, 12px) !important;",
            "border-style: solid !important;",
            "border-width: 0 !important;",
            "border-color: transparent !important;",
            "filter: none !important;",
            "box-shadow: none !important;",
            "backdrop-filter: none !important;",
            "-webkit-backdrop-filter: none !important;",
            "overflow: hidden !important;",
            "background: var(--ha-card-background, var(--card-background-color)) !important;",
            "background-image: none !important;",
            "background-size: auto !important;",
            "background-position: initial !important;",
            "background-repeat: repeat !important;",
        ]

        if design["textColor"]:
            declarations.extend(
                (
                    f'--primary-text-color: {design["textColor"]} !important;',
                    f'--secondary-text-color: {design["textColor"]} !important;',
                )
            )
        if design["iconColor"]:
            declarations.extend(
                (
                    f'--state-icon-color: {design["iconColor"]} !important;',
                    f'--paper-item-icon-color: {design["iconColor"]} !important;',
                )
            )

        style = design["style"]
        if style == "standard":
            declarations.extend(
                (
                    "clip-path: none !important;",
                    "backdrop-filter: none !important;",
                    "-webkit-backdrop-filter: none !important;",
                )
            )
        elif style == "glass":
            declarations.extend(
                (
                    "clip-path: none !important;",
                    "border-radius: 18px !important;",
                    "backdrop-filter: blur(18px) saturate(145%) !important;",
                    "-webkit-backdrop-filter: blur(18px) saturate(145%) !important;",
                    "border: 1px solid rgba(255,255,255,.55) !important;",
                    "box-shadow: 0 12px 30px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.4) !important;",
                )
            )
        elif style == "tech-frame":
            declarations.extend(
                (
                    "border-radius: 0 !important;",
                    "clip-path: polygon(18px 0, calc(100% - 48px) 0, calc(100% - 36px) 10px, 100% 10px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 26px 100%, 12px calc(100% - 10px), 0 calc(100% - 10px), 0 18px) !important;",
                    "border: 0 !important;",
                    "filter: drop-shadow(0 0 8px color-mix(in srgb, var(--primary-color) 42%, transparent)) !important;",
                )
            )

        background_type = design["backgroundType"]
        background_color = design["backgroundColor"] or "var(--ha-card-background)"
        opacity = design["backgroundOpacity"]
        darkening = design["backgroundDarkening"] / 100
        if background_type == "color":
            declarations.append(
                f"background: color-mix(in srgb, {background_color} {opacity}%, transparent) !important;"
            )
        elif background_type == "dots":
            declarations.extend(
                (
                    f"background-color: color-mix(in srgb, {background_color} {opacity}%, transparent) !important;",
                    "background-image: radial-gradient(circle, color-mix(in srgb, var(--primary-color) 55%, transparent) 1.5px, transparent 1.6px) !important;",
                    "background-size: 18px 18px !important;",
                )
            )
        elif background_type == "waves":
            declarations.extend(
                (
                    f"background-color: color-mix(in srgb, {background_color} {opacity}%, transparent) !important;",
                    "background-image: radial-gradient(ellipse at 15% 15%, color-mix(in srgb, var(--primary-color) 35%, transparent), transparent 52%), radial-gradient(ellipse at 85% 80%, rgba(72,120,255,.26), transparent 55%) !important;",
                    "background-size: cover !important;",
                )
            )
        elif background_type == "carbon":
            declarations.extend(
                (
                    f"background-color: color-mix(in srgb, {background_color} {opacity}%, #171a1e) !important;",
                    "background-image: linear-gradient(45deg, rgba(255,255,255,.07) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.07) 75%), linear-gradient(45deg, rgba(0,0,0,.34) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.34) 75%) !important;",
                    "background-position: 0 0, 7px 7px !important;",
                    "background-size: 14px 14px !important;",
                )
            )
        elif background_type == "metal":
            declarations.extend(
                (
                    f"background-color: color-mix(in srgb, {background_color} {opacity}%, #66717a) !important;",
                    "background-image: linear-gradient(110deg, rgba(255,255,255,.26), transparent 28%, rgba(255,255,255,.08) 48%, rgba(0,0,0,.22) 72%, rgba(255,255,255,.16)), repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.07) 1px 2px) !important;",
                    "background-size: cover, 100% 3px !important;",
                )
            )
        elif background_type == "grid":
            declarations.extend(
                (
                    f"background-color: color-mix(in srgb, {background_color} {opacity}%, transparent) !important;",
                    "background-image: linear-gradient(color-mix(in srgb, var(--primary-color) 25%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 25%, transparent) 1px, transparent 1px) !important;",
                    "background-size: 20px 20px !important;",
                )
            )
        elif background_type in ("image", "texture") and design["backgroundImage"]:
            image_fade = 100 - opacity
            declarations.extend(
                (
                    f'background-image: linear-gradient(rgba(0,0,0,{darkening:.2f}), rgba(0,0,0,{darkening:.2f})), linear-gradient(color-mix(in srgb, {background_color} {image_fade}%, transparent), color-mix(in srgb, {background_color} {image_fade}%, transparent)), url("{design["backgroundImage"]}") !important;',
                    "background-position: center !important;",
                    "background-repeat: no-repeat !important;",
                    "background-size: cover !important;",
                )
            )

        body = "\n".join(f"  {value}" for value in declarations)
        blocks.append(f"{selector} {{\n{body}\n}}")

    return "\n\n".join(blocks)


def build_effect_values(
    settings: dict[str, Any],
    active_profile_id: str = "",
) -> dict[str, str]:
    """Return the effect variables shared by files and live previews."""

    if not re.fullmatch(r"[a-f0-9]{32}", active_profile_id):
        active_profile_id = ""

    effects = settings["effects"]

    generated_expert_css = build_expert_rules_css(effects["expertRules"])
    generated_card_css = build_card_designs_css(effects["cardDesigns"])
    expert_css = "\n\n".join(
        part for part in (
            generated_expert_css,
            generated_card_css,
            effects["expertCss"],
        ) if part
    )

    effect_values = {
        "theme-studio-active-profile": active_profile_id,
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
        "theme-studio-expert-css-enabled": (
            "1" if effects["expertCssEnabled"] or effects["cardDesigns"] else "0"
        ),
        "theme-studio-expert-css-b64": base64.b64encode(
            expert_css.encode("utf-8")
        ).decode("ascii"),
    }

    return effect_values


def build_theme_file(
    settings: dict[str, Any],
    theme_name: str = THEME_NAME,
    active_profile_id: str = "",
) -> str:
    """Build a theme with light, dark and effect settings."""

    effect_values = build_effect_values(settings, active_profile_id)

    lines = [
        f"{theme_name}:",
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

    for mode in ((settings["mode"],) if "mode" in settings else ("light", "dark")):
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
