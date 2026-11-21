import {
  COMMON_CARD_STYLES,
  ThemeStudioCardBase,
  ThemeStudioEntityCardEditor,
  clampPercentage,
  escapeHtml,
  friendlyName,
  normalizeCardConfig,
  readNumericAttribute,
  translateThemeStudioText,
} from "./theme-studio-card-base.js?v=0.11.2";

const LIGHT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 21h6v-1H9v1m3-20a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.26A7 7 0 0 0 12 1m2 12.58V16h-4v-2.42A5 5 0 1 1 14 13.58Z"/></svg>`;
const WARM_WHITE_KELVIN = 2700;
const COOL_WHITE_KELVIN = 6500;

function boundedKelvin(value, minKelvin, maxKelvin) {
  return Math.round(Math.max(minKelvin, Math.min(maxKelvin, value)));
}

export function lightTemperaturePresets(minimum = 2000, maximum = 6500) {
  const first = Number.isFinite(Number(minimum)) ? Number(minimum) : 2000;
  const second = Number.isFinite(Number(maximum)) ? Number(maximum) : 6500;
  const minKelvin = Math.round(Math.min(first, second));
  const maxKelvin = Math.round(Math.max(first, second));
  return {
    minKelvin,
    maxKelvin,
    warmKelvin: boundedKelvin(WARM_WHITE_KELVIN, minKelvin, maxKelvin),
    coolKelvin: boundedKelvin(COOL_WHITE_KELVIN, minKelvin, maxKelvin),
  };
}

export function lightWhiteChannelServiceData(
  supportedColorModes,
  tone = "warm",
  brightnessPercent = 100,
  kelvin = WARM_WHITE_KELVIN
) {
  const modes = new Set(Array.isArray(supportedColorModes) ? supportedColorModes : []);
  const whiteLevel = Math.max(
    1,
    Math.min(255, Math.round((clampPercentage(brightnessPercent) / 100) * 255))
  );
  if (modes.has("color_temp")) {
    return { color_temp_kelvin: Math.round(Number(kelvin) || WARM_WHITE_KELVIN) };
  }
  if (modes.has("rgbww")) {
    return {
      rgbww_color: tone === "cool"
        ? [0, 0, 0, 255, 0]
        : [0, 0, 0, 0, 255],
    };
  }
  if (modes.has("rgbw")) {
    return { rgbw_color: [0, 0, 0, whiteLevel] };
  }
  if (modes.has("white")) {
    return { white: whiteLevel };
  }
  return null;
}

function rgbToHs([red, green, blue]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return [hue, max ? (delta / max) * 100 : 0];
}

class ThemeStudioLightCardEditor extends ThemeStudioEntityCardEditor {
  constructor() { super("light"); }
}

class ThemeStudioLightCard extends ThemeStudioCardBase {
  static getConfigElement() {
    return document.createElement("theme-studio-light-card-editor");
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith("light."));
    return {
      type: "custom:theme-studio-light-card",
      entity: entity || "light.wohnzimmer",
      grid_options: { columns: 6, rows: 3 },
      theme_studio_layout_initialized: true,
    };
  }

  getGridOptions() {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  getCardSize() { return 3; }

  setConfig(config) {
    this._config = normalizeCardConfig(config, "light");
    this._renderPreservingDialog();
  }

  render() {
    if (!this._config) return this._missingCard("Licht-Entität auswählen");
    const state = this.stateObj;
    if (!state) return this._missingCard("Licht-Entität nicht gefunden");

    const isOn = state.state === "on";
    const unavailable = ["unavailable", "unknown"].includes(state.state);
    const brightness = isOn
      ? clampPercentage((readNumericAttribute(state, ["brightness"], 0) / 255) * 100)
      : 0;
    const kelvin = Math.round(readNumericAttribute(state, ["color_temp_kelvin"], 3000));
    const firstKelvinBoundary = Math.round(readNumericAttribute(state, ["min_color_temp_kelvin"], 2000));
    const secondKelvinBoundary = Math.round(readNumericAttribute(state, ["max_color_temp_kelvin"], 6500));
    const {
      minKelvin,
      maxKelvin,
      warmKelvin: warmWhiteKelvin,
      coolKelvin: coolWhiteKelvin,
    } = lightTemperaturePresets(firstKelvinBoundary, secondKelvinBoundary);
    const rgb = Array.isArray(state.attributes?.rgb_color)
      ? state.attributes.rgb_color.slice(0, 3).map((value) => Math.max(0, Math.min(255, Number(value) || 0)))
      : state.attributes?.color_mode === "white" ? [255, 255, 255] : [255, 190, 92];
    const colorModes = Array.isArray(state.attributes?.supported_color_modes)
      ? state.attributes.supported_color_modes
      : [];
    const supportsColorTemperature = colorModes.includes("color_temp")
      || "color_temp_kelvin" in (state.attributes || {})
      || "color_temp" in (state.attributes || {});
    const supportsColor = colorModes.some((mode) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(mode));
    const supportsDedicatedWhite = colorModes.some((mode) => ["white", "rgbw", "rgbww"].includes(mode));
    const supportsWhiteTone = supportsColorTemperature || supportsDedicatedWhite;
    const supportsAdjustableWhiteTone = supportsColorTemperature || colorModes.includes("rgbww");
    const usesSingleWhiteChannel = supportsWhiteTone && !supportsAdjustableWhiteTone;
    const currentColorMode = String(state.attributes?.color_mode || "");
    const defaultControlView = ["color_temp", "white"].includes(currentColorMode)
      ? "white"
      : supportsColor ? "color" : "white";
    if (!["white", "color"].includes(this._lightControlView)) {
      this._lightControlView = defaultControlView;
    }
    if (!supportsColor) this._lightControlView = "white";
    if (!supportsWhiteTone) this._lightControlView = "color";
    const showWhiteControls = supportsWhiteTone && this._lightControlView === "white";
    const showColorControls = supportsColor && this._lightControlView === "color";
    this._whiteChannelContext = {
      colorModes: supportsColorTemperature && !colorModes.includes("color_temp")
        ? [...colorModes, "color_temp"]
        : colorModes,
      brightness: brightness || 100,
      kelvin,
    };
    const presetTolerance = Math.max(100, Math.round((maxKelvin - minKelvin) * 0.04));
    const warmWhiteSelected = Math.abs(kelvin - warmWhiteKelvin) <= presetTolerance;
    const coolWhiteSelected = Math.abs(kelvin - coolWhiteKelvin) <= presetTolerance;
    const currentHs = Array.isArray(state.attributes?.hs_color)
      ? state.attributes.hs_color.slice(0, 2).map(Number)
      : rgbToHs(rgb);
    const hue = ((Number(currentHs[0]) || 0) % 360 + 360) % 360;
    const saturation = clampPercentage(currentHs[1]);
    const markerAngle = (hue - 90) * (Math.PI / 180);
    const markerX = 50 + Math.cos(markerAngle) * saturation * 0.44;
    const markerY = 50 + Math.sin(markerAngle) * saturation * 0.44;
    const glow = `rgb(${rgb.join(",")})`;
    const name = escapeHtml(friendlyName(state, this._config, "Licht"));
    const stateLabel = unavailable ? "Nicht verfügbar" : isOn ? `${brightness} % Helligkeit` : "Aus";

    this._commitCardMarkup(`
      <style>
        ${COMMON_CARD_STYLES}
        :host { --light-glow: ${glow}; }
        .entity-icon.on { color: var(--light-glow); box-shadow: 0 0 24px color-mix(in srgb, var(--light-glow) 52%, transparent); }
        .light-main { position: relative; display: flex; flex: 1; align-items: end; }
        .light-value { color: var(--primary-text-color); font-size: 2rem; font-weight: 760; letter-spacing: -.04em; }
        .light-caption { color: var(--secondary-text-color); font-size: .72rem; }
        .light-footer { gap: 12px; }
        .brightness-slider { min-width: 64px; flex: 1; }
        .temperature { color: var(--secondary-text-color); font-size: .74rem; }
        .color-wheel-wrap { display: grid; place-items: center; padding: 4px 0 8px; }
        .color-wheel {
          position: relative; width: min(220px, 52vw); aspect-ratio: 1; border: 0; border-radius: 50%;
          cursor: crosshair; touch-action: none;
          background:
            radial-gradient(circle at center, #fff 0%, rgba(255,255,255,.94) 9%, rgba(255,255,255,0) 72%),
            conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.3), 0 14px 36px rgba(0,0,0,.28);
        }
        .color-wheel:focus-visible { outline: 3px solid var(--primary-color); outline-offset: 4px; }
        .color-marker {
          position: absolute; left: ${markerX}%; top: ${markerY}%; width: 24px; height: 24px;
          box-sizing: border-box; border: 4px solid #fff; border-radius: 50%; pointer-events: none;
          background: var(--light-glow); box-shadow: 0 2px 10px rgba(0,0,0,.65);
          transform: translate(-50%, -50%);
        }
        .light-dialog-body { grid-template-columns: minmax(0, 1fr) minmax(220px, .78fr); gap: 12px; padding: 14px; align-items: start; }
        .light-dialog-body .dialog-section { gap: 9px; padding: 12px; }
        .light-mode-switch { display: grid; grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border: 1px solid var(--divider-color); border-radius: 14px; background: color-mix(in srgb, var(--card-background-color) 82%, transparent); }
        .light-mode-switch button { min-height: 40px; border: 0; border-radius: 10px; color: var(--secondary-text-color); background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
        .light-mode-switch button[aria-selected="true"] { color: var(--primary-text-color); background: color-mix(in srgb, var(--primary-color) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 50%, transparent); }
        .light-mode-switch button:focus-visible { outline: 3px solid color-mix(in srgb, var(--primary-color) 45%, transparent); outline-offset: 1px; }
        .dialog-hero { display: grid; grid-template-columns: 68px 1fr; align-items: center; gap: 14px; }
        .bulb-hero { display: grid; width: 68px; height: 68px; place-items: center; border-radius: 21px; color: var(--light-glow); background: color-mix(in srgb, var(--light-glow) 15%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--light-glow) 35%, transparent), 0 0 24px color-mix(in srgb, var(--light-glow) 18%, transparent); }
        .bulb-hero svg { width: 36px; }
        .light-control-grid { display: grid; grid-column: 1; gap: 12px; }
        .temperature-presets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .temperature-preset {
          display: grid; grid-template-columns: 13px minmax(0, 1fr); gap: 8px; align-items: center;
          min-height: 44px; padding: 7px 10px; border: 1px solid var(--divider-color); border-radius: 12px;
          color: var(--primary-text-color); background: transparent; text-align: left; cursor: pointer;
        }
        .temperature-preset:hover { border-color: color-mix(in srgb, var(--primary-color) 68%, var(--divider-color)); }
        .temperature-preset[aria-pressed="true"] { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
        .temperature-preset:focus-visible { outline: 3px solid color-mix(in srgb, var(--primary-color) 45%, transparent); outline-offset: 2px; }
        .temperature-preset-dot { width: 13px; height: 13px; border-radius: 50%; background: var(--preset-color); box-shadow: 0 0 12px color-mix(in srgb, var(--preset-color) 72%, transparent); }
        .temperature-preset-copy { min-width: 0; }
        .temperature-preset-copy strong, .temperature-preset-copy small { display: block; }
        .temperature-preset-copy strong { font-size: .76rem; }
        .temperature-preset-copy small { margin-top: 2px; color: var(--secondary-text-color); font-size: .66rem; }
        .white-channel-copy { margin: 0; color: var(--secondary-text-color); font-size: .74rem; line-height: 1.45; }
        .white-channel-button { min-height: 44px; border: 1px solid var(--primary-color); border-radius: 12px; color: var(--primary-text-color); background: color-mix(in srgb, var(--primary-color) 13%, transparent); font: inherit; font-weight: 750; cursor: pointer; }
        .color-section { grid-column: 2; grid-row: 2 / span 2; }
        @media (max-width: 620px) {
          .light-dialog-body { grid-template-columns: 1fr; }
          .color-section { grid-column: 1; grid-row: auto; }
          .color-wheel { width: min(220px, 62vw); }
        }
      </style>
      <ha-card>
        <div class="card-shell">
          <div class="card-header">
            <div class="entity-icon ${isOn ? "on" : ""}">${LIGHT_ICON}</div>
            <div class="entity-copy"><h3 class="entity-name">${name}</h3><p class="entity-state"><span class="state-dot ${isOn ? "" : "off"}"></span>${escapeHtml(stateLabel)}</p></div>
            <button class="toggle" data-toggle aria-label="${isOn ? "Licht ausschalten" : "Licht einschalten"}" aria-pressed="${isOn}" ${unavailable ? "disabled" : ""}></button>
          </div>
          <div class="light-main">
            <div><div class="light-value">${isOn ? `${brightness} %` : "Aus"}</div><div class="light-caption">Lichtstimmung</div></div>
          </div>
          <div class="card-footer light-footer"><input class="brightness-slider" data-card-brightness type="range" min="0" max="100" value="${brightness}" style="--range-value:${brightness}%" aria-label="Helligkeit" ${unavailable ? "disabled" : ""}><button class="detail-button" data-open-details>Details</button></div>
        </div>
      </ha-card>
      <dialog aria-label="${name} steuern">
        <div class="dialog-shell">
          <header class="dialog-header"><div class="dialog-title"><h3>${name}</h3><p>Licht, Farbe und Stimmung</p></div><button class="icon-button" data-close-dialog aria-label="Schließen">✕</button></header>
          <div class="dialog-body light-dialog-body">
            ${supportsWhiteTone && supportsColor ? `<div class="light-mode-switch" role="tablist" aria-label="Lichtmodus"><button type="button" role="tab" data-light-control-view="white" data-activate-white="${usesSingleWhiteChannel}" aria-selected="${this._lightControlView === "white"}">${usesSingleWhiteChannel ? "Weißkanal" : "Weißtöne"}</button><button type="button" role="tab" data-light-control-view="color" aria-selected="${this._lightControlView === "color"}">Farbe</button></div>` : ""}
            <section class="dialog-section dialog-hero"><div class="bulb-hero">${LIGHT_ICON}</div><div><h4>${escapeHtml(stateLabel)}</h4>${showWhiteControls ? `<p class="temperature">${kelvin} Kelvin</p>` : ""}<button class="toggle" data-dialog-toggle aria-label="Licht umschalten" aria-pressed="${isOn}"></button></div></section>
            <div class="light-control-grid"><section class="dialog-section"><h4>Helligkeit</h4><div class="range-row"><div class="range-label"><span>Gedimmt</span><output>${brightness} %</output></div><input data-brightness type="range" min="1" max="100" value="${Math.max(1, brightness)}" style="--range-value:${brightness}%" aria-label="Helligkeit"></div></section>
              ${showWhiteControls && supportsAdjustableWhiteTone ? `<section class="dialog-section"><h4>Farbtemperatur</h4><div class="temperature-presets" role="group" aria-label="Farbtemperatur"><button class="temperature-preset" type="button" data-temperature-preset="warm" data-temperature-kelvin="${warmWhiteKelvin}" aria-pressed="${warmWhiteSelected}"><span class="temperature-preset-dot" style="--preset-color:#ffbd6b"></span><span class="temperature-preset-copy"><strong>Warmweiß</strong><small>${supportsColorTemperature ? `${warmWhiteKelvin} K` : "Warm-W-Kanal"}</small></span></button><button class="temperature-preset" type="button" data-temperature-preset="cool" data-temperature-kelvin="${coolWhiteKelvin}" aria-pressed="${coolWhiteSelected}"><span class="temperature-preset-dot" style="--preset-color:#d8f0ff"></span><span class="temperature-preset-copy"><strong>Kaltweiß</strong><small>${supportsColorTemperature ? `${coolWhiteKelvin} K` : "Kalt-W-Kanal"}</small></span></button></div>${supportsColorTemperature ? `<div class="range-row"><div class="range-label"><span>Warmweiß</span><output>${kelvin} K</output><span>Kaltweiß</span></div><input data-temperature type="range" min="${minKelvin}" max="${maxKelvin}" value="${boundedKelvin(kelvin, minKelvin, maxKelvin)}" aria-label="Farbtemperatur"></div>` : ""}</section>` : ""}
              ${showWhiteControls && usesSingleWhiteChannel ? `<section class="dialog-section"><h4>Weißkanal</h4><p class="white-channel-copy">Der separate W-Kanal wird direkt angesteuert. Die RGB-Kanäle bleiben ausgeschaltet.</p><button class="white-channel-button" type="button" data-white-channel>W-Kanal aktivieren</button></section>` : ""}</div>
            ${showColorControls ? `<section class="dialog-section color-section"><h4>Farbe</h4><div class="color-wheel-wrap"><div class="color-wheel" data-color-wheel role="slider" tabindex="0" aria-label="Lichtfarbe" aria-valuemin="0" aria-valuemax="360" aria-valuenow="${Math.round(hue)}"><span class="color-marker"></span></div></div></section>` : ""}
          </div>
          <footer class="dialog-actions"><button data-close-dialog>Fertig</button></footer>
        </div>
      </dialog>
    `);
    this._bindBaseEvents();
    this.shadowRoot.querySelector("[data-toggle]")?.addEventListener("click", () => this._callService("light", "toggle"));
    this.shadowRoot.querySelector("[data-dialog-toggle]")?.addEventListener("click", () => this._callService("light", "toggle"));
    const cardBrightness = this.shadowRoot.querySelector("[data-card-brightness]");
    cardBrightness?.addEventListener("input", (event) => {
      const value = clampPercentage(event.target.value);
      event.target.style.setProperty("--range-value", `${value}%`);
    });
    cardBrightness?.addEventListener("change", (event) => {
      const value = clampPercentage(event.target.value);
      if (value === 0) this._callService("light", "turn_off");
      else this._callService("light", "turn_on", { brightness_pct: value });
    });
    this.shadowRoot.querySelector("[data-brightness]")?.addEventListener("change", (event) => this._callService("light", "turn_on", { brightness_pct: clampPercentage(event.target.value) }));
    this.shadowRoot.querySelector("[data-temperature]")?.addEventListener("change", (event) => this._callService("light", "turn_on", { color_temp_kelvin: Number(event.target.value) }));
    this.shadowRoot.querySelectorAll("[data-temperature-preset]").forEach((button) => {
      button.addEventListener("click", () => this._setTemperaturePreset(
        button.dataset.temperatureKelvin,
        button.dataset.temperaturePreset
      ));
    });
    this.shadowRoot.querySelector("[data-white-channel]")?.addEventListener("click", () => {
      this._setTemperaturePreset(warmWhiteKelvin, "warm");
    });
    this.shadowRoot.querySelectorAll("[data-light-control-view]").forEach((button) => {
      button.addEventListener("click", () => this._setLightControlView(
        button.dataset.lightControlView,
        button.dataset.activateWhite === "true"
      ));
    });
    const colorWheel = this.shadowRoot.querySelector("[data-color-wheel]");
    colorWheel?.addEventListener("pointerup", (event) => this._setColorFromWheel(event));
    colorWheel?.addEventListener("keydown", (event) => this._changeColorWithKeyboard(event, hue, saturation));
  }

  _setLightControlView(view, activateWhite = false) {
    if (!["white", "color"].includes(view)) return;
    const changed = view !== this._lightControlView;
    this._lightControlView = view;
    if (activateWhite) this._setTemperaturePreset(this._whiteChannelContext?.kelvin, "warm");
    if (changed) this._renderPreservingDialog();
  }

  _setTemperaturePreset(value, tone = "warm") {
    const colorTempKelvin = Number(value);
    if (!Number.isFinite(colorTempKelvin)) return;
    const serviceData = lightWhiteChannelServiceData(
      this._whiteChannelContext?.colorModes,
      tone,
      this._whiteChannelContext?.brightness,
      colorTempKelvin
    );
    if (serviceData) this._callService("light", "turn_on", serviceData);
  }

  _setColorFromWheel(event) {
    const wheel = event.currentTarget;
    const rect = wheel.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const hue = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    const saturation = clampPercentage((Math.hypot(x, y) / radius) * 100);
    this._callService("light", "turn_on", {
      hs_color: [Math.round(hue), Math.round(saturation)],
    });
  }

  _changeColorWithKeyboard(event, currentHue, saturation) {
    const direction = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const hue = (currentHue + direction + 360) % 360;
    this._callService("light", "turn_on", {
      hs_color: [Math.round(hue), Math.max(1, Math.round(saturation))],
    });
  }
}

if (!customElements.get("theme-studio-light-card-editor")) customElements.define("theme-studio-light-card-editor", ThemeStudioLightCardEditor);
if (!customElements.get("theme-studio-light-card")) customElements.define("theme-studio-light-card", ThemeStudioLightCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "theme-studio-light-card")) {
  window.customCards.push({ type: "theme-studio-light-card", name: translateThemeStudioText("Theme Studio Licht"), description: translateThemeStudioText("Kompakte Lichtkarte mit Detailsteuerung"), preview: true });
}
