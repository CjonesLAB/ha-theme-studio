const THEME_STUDIO_CLOCK_CARD_VERSION = "0.10.2";

const DEFAULT_CONFIG = Object.freeze({
  clock_type: "analog",
  clock_style: "theme",
  show_seconds: true,
  show_numerals: true,
  show_date: true,
  use_24_hour: true,
  title: "",
});

const CLOCK_TYPES = new Set(["analog", "digital"]);
const CLOCK_STYLES = new Set(["theme", "clean", "classic", "tech"]);

function normalizedClockTypes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([profileId, clockType]) => (
        /^[a-f0-9]{32}$/.test(profileId) && CLOCK_TYPES.has(clockType)
      ))
      .slice(0, 64)
  );
}

function activeThemeStudioProfileId(element) {
  if (!element?.isConnected || typeof window.getComputedStyle !== "function") return "";
  return window.getComputedStyle(element)
    .getPropertyValue("--theme-studio-active-profile")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function themeClockType(element) {
  if (!element?.isConnected || typeof window.getComputedStyle !== "function") return "";
  const value = window.getComputedStyle(element)
    .getPropertyValue("--theme-studio-clock-type")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  return CLOCK_TYPES.has(value) ? value : "";
}

function effectiveClockType(config, element) {
  if (CLOCK_TYPES.has(element?._themeClockTypeOverride)) {
    return element._themeClockTypeOverride;
  }
  const themedType = themeClockType(element);
  if (themedType) return themedType;
  const profileId = activeThemeStudioProfileId(element);
  return config.clock_types[profileId] || config.clock_type;
}

function normalizedConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    clock_type: CLOCK_TYPES.has(config.clock_type)
      ? config.clock_type
      : DEFAULT_CONFIG.clock_type,
    clock_types: normalizedClockTypes(config.clock_types),
    clock_style: CLOCK_STYLES.has(config.clock_style)
      ? config.clock_style
      : DEFAULT_CONFIG.clock_style,
    show_seconds: config.show_seconds !== false,
    show_numerals: config.show_numerals !== false,
    show_date: config.show_date !== false,
    use_24_hour: config.use_24_hour !== false,
    title: String(config.title || "").slice(0, 80),
  };
}

function analogFace(showNumerals) {
  const ticks = Array.from({ length: 60 }, (_, index) => {
    const major = index % 5 === 0;
    const y2 = major ? 17 : 13;
    return `<line class="tick${major ? " major" : ""}" x1="100" y1="7" x2="100" y2="${y2}" transform="rotate(${index * 6} 100 100)"></line>`;
  }).join("");
  const numerals = showNumerals
    ? Array.from({ length: 12 }, (_, index) => {
      const value = index + 1;
      const angle = value * Math.PI / 6;
      const x = 100 + Math.sin(angle) * 72;
      const y = 100 - Math.cos(angle) * 72 + 4;
      return `<text class="numeral" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${value}</text>`;
    }).join("")
    : "";

  return `
    <svg class="analog-face" viewBox="0 0 200 200" aria-hidden="true">
      <circle class="face-ring" cx="100" cy="100" r="96"></circle>
      ${ticks}${numerals}
      <g class="hour-hand"><line x1="100" y1="106" x2="100" y2="59"></line></g>
      <g class="minute-hand"><line x1="100" y1="108" x2="100" y2="38"></line></g>
      <g class="second-hand"><line x1="100" y1="112" x2="100" y2="28"></line></g>
      <circle class="hand-center" cx="100" cy="100" r="5"></circle>
    </svg>
  `;
}

class ThemeStudioClockCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = normalizedConfig();
    this._hass = null;
    this._timer = null;
    this._renderKey = "";
    this._themeClockTypeOverride = "";
    this._clockTypeSyncStarted = false;
    this._clockTypeChangeHandler = (event) => {
      const clockType = event.detail?.clockType;
      if (clockType !== "" && !CLOCK_TYPES.has(clockType)) return;
      this._themeClockTypeOverride = clockType;
      this._renderKey = "";
      this._render();
    };
  }

  static getConfigElement() {
    return document.createElement("theme-studio-clock-card-editor");
  }

  static getStubConfig() {
    return {
      clock_type: "analog",
      clock_style: "theme",
      show_seconds: true,
      show_numerals: true,
      show_date: true,
      use_24_hour: true,
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (this.isConnected) this._syncClockTypeFromActiveDesign();
    this._render();
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Für die Theme-Studio-Uhr fehlt die Konfiguration.");
    }
    this._config = normalizedConfig(config);
    this._render();
    this._restartTimer();
  }

  connectedCallback() {
    this._clockTypeSyncStarted = false;
    window.addEventListener(
      "theme-studio-clock-type-changed",
      this._clockTypeChangeHandler
    );
    this._syncClockTypeFromActiveDesign();
    this._render();
    this._restartTimer();
  }

  disconnectedCallback() {
    window.removeEventListener(
      "theme-studio-clock-type-changed",
      this._clockTypeChangeHandler
    );
    this._stopTimer();
  }

  async _syncClockTypeFromActiveDesign() {
    if (this._clockTypeSyncStarted || !this._hass?.callWS) return;
    this._clockTypeSyncStarted = true;

    try {
      const settings = await this._hass.callWS({
        type: "theme_studio/get_settings",
      });
      if (!settings?.active_profile_id) return;
      const mode = settings.mode === "light" ? "light" : "dark";
      const clockType = settings?.[mode]?.clockType || "";
      if (clockType !== "" && !CLOCK_TYPES.has(clockType)) return;
      this._themeClockTypeOverride = clockType;
      this._renderKey = "";
      this._render();
    } catch (_error) {
      // The regular card configuration remains a safe fallback.
    }
  }

  getCardSize() {
    return effectiveClockType(this._config, this) === "analog" ? 4 : 2;
  }

  getGridOptions() {
    return effectiveClockType(this._config, this) === "analog"
      ? { columns: 4, rows: 4, min_columns: 2, min_rows: 3 }
      : { columns: 4, rows: 2, min_columns: 2, min_rows: 1 };
  }

  _stopTimer() {
    if (this._timer !== null) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }

  _restartTimer() {
    this._stopTimer();
    if (!this.isConnected) return;
    this._updateTime();
    this._timer = window.setInterval(
      () => this._updateTime(),
      this._config.show_seconds ? 1000 : 30000
    );
  }

  _render() {
    const clockType = effectiveClockType(this._config, this);
    const renderKey = [
      clockType,
      this._config.clock_style,
      this._config.show_seconds,
      this._config.show_numerals,
      this._config.show_date,
      this._config.title,
    ].join(":");
    if (renderKey === this._renderKey && this.shadowRoot.firstElementChild) {
      this._updateTime();
      return;
    }
    this._renderKey = renderKey;
    const analog = clockType === "analog";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          color: var(--primary-text-color, #fff);
          font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
        }
        ha-card {
          position: relative;
          box-sizing: border-box;
          height: 100%;
          min-height: ${analog ? "230px" : "116px"};
          overflow: hidden;
          container-type: inline-size;
        }
        .card-content {
          box-sizing: border-box;
          display: grid;
          width: 100%;
          height: 100%;
          min-height: inherit;
          place-items: center;
          padding: ${analog ? "16px" : "18px 22px"};
        }
        .title {
          position: absolute;
          z-index: 2;
          top: 12px;
          left: 16px;
          max-width: calc(100% - 32px);
          overflow: hidden;
          color: var(--secondary-text-color, rgba(255,255,255,.72));
          font-size: 12px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .title:not([hidden]) + .card-content { padding-top: 36px; }
        .analog-shell {
          width: min(100%, 280px);
          aspect-ratio: 1;
          color: var(--primary-text-color, #fff);
        }
        .analog-face {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
          filter: drop-shadow(0 8px 18px rgba(0,0,0,.22));
        }
        .face-ring {
          fill: transparent;
          stroke: color-mix(in srgb, var(--primary-text-color, #fff) 34%, transparent);
          stroke-width: 1.5;
        }
        .tick {
          stroke: currentColor;
          stroke-linecap: round;
          stroke-width: 1;
          opacity: .38;
        }
        .tick.major { stroke-width: 2; opacity: .78; }
        .numeral {
          fill: currentColor;
          font-size: 11px;
          font-weight: 650;
          text-anchor: middle;
          opacity: .82;
        }
        .hour-hand line,
        .minute-hand line,
        .second-hand line {
          stroke: currentColor;
          stroke-linecap: round;
          transform-origin: 100px 100px;
        }
        .hour-hand line { stroke-width: 6; }
        .minute-hand line { stroke-width: 4; }
        .second-hand line {
          stroke: var(--primary-color, #26b2b3);
          stroke-width: 2;
        }
        .hand-center {
          fill: var(--primary-color, #26b2b3);
          stroke: color-mix(in srgb, var(--primary-text-color, #fff) 75%, transparent);
          stroke-width: 2;
        }
        .digital-shell {
          display: grid;
          width: 100%;
          justify-items: center;
          gap: 7px;
        }
        .digital-time {
          letter-spacing: .035em;
          font-size: clamp(40px, 10cqw, 86px);
          font-weight: 620;
          font-variant-numeric: tabular-nums;
          line-height: .92;
          text-shadow: 0 6px 18px rgba(0,0,0,.24);
        }
        .digital-seconds {
          color: var(--primary-color, #26b2b3);
          font-size: .42em;
          vertical-align: .68em;
        }
        .digital-date {
          color: var(--secondary-text-color, rgba(255,255,255,.72));
          font-size: clamp(12px, 2.6cqw, 18px);
          letter-spacing: .025em;
        }
        :host([clock-style="clean"]) .face-ring {
          fill: transparent;
          stroke: transparent;
        }
        :host([clock-style="classic"]) .face-ring {
          fill: color-mix(in srgb, var(--ha-card-background, #1f2b33) 88%, transparent);
          stroke: color-mix(in srgb, var(--primary-text-color, #fff) 66%, transparent);
          stroke-width: 3;
        }
        :host([clock-style="tech"]) .face-ring {
          fill: color-mix(in srgb, var(--ha-card-background, #1f2b33) 78%, transparent);
          stroke: var(--primary-color, #26b2b3);
          stroke-width: 2.5;
          stroke-dasharray: 34 6 8 6;
        }
        :host([clock-style="tech"]) .digital-time {
          color: var(--primary-color, #26b2b3);
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
          text-shadow: 0 0 18px color-mix(in srgb, var(--primary-color, #26b2b3) 42%, transparent);
        }
        @container (max-width: 240px) {
          .card-content { padding: 10px; }
          .title { top: 8px; left: 10px; }
        }
      </style>
      <ha-card>
        <div class="title" ${this._config.title ? "" : "hidden"}></div>
        <div class="card-content">
          ${analog
            ? `<div class="analog-shell">${analogFace(this._config.show_numerals)}</div>`
            : `<div class="digital-shell">
                <div class="digital-time" aria-hidden="true"><span class="digital-hours"></span><span class="digital-colon">:</span><span class="digital-minutes"></span><span class="digital-seconds"></span></div>
                <div class="digital-date" ${this._config.show_date ? "" : "hidden"}></div>
              </div>`}
        </div>
      </ha-card>
    `;
    this.setAttribute("clock-style", this._config.clock_style);
    this.shadowRoot.querySelector(".title").textContent = this._config.title;
    this._updateTime();
  }

  _locale() {
    return this._hass?.language || navigator.language || "de-DE";
  }

  _updateTime() {
    if (!this.shadowRoot?.firstElementChild) return;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const spokenTime = new Intl.DateTimeFormat(this._locale(), {
      hour: "2-digit",
      minute: "2-digit",
      second: this._config.show_seconds ? "2-digit" : undefined,
    }).format(now);
    this.setAttribute("aria-label", `Uhrzeit ${spokenTime}`);

    if (effectiveClockType(this._config, this) === "analog") {
      const hourAngle = (hours % 12) * 30 + minutes * 0.5;
      const minuteAngle = minutes * 6 + (this._config.show_seconds ? seconds * 0.1 : 0);
      const secondHand = this.shadowRoot.querySelector(".second-hand");
      this.shadowRoot.querySelector(".hour-hand")
        ?.setAttribute("transform", `rotate(${hourAngle} 100 100)`);
      this.shadowRoot.querySelector(".minute-hand")
        ?.setAttribute("transform", `rotate(${minuteAngle} 100 100)`);
      if (secondHand) {
        secondHand.style.display = this._config.show_seconds ? "" : "none";
        secondHand.setAttribute("transform", `rotate(${seconds * 6} 100 100)`);
      }
      return;
    }

    let displayHours = hours;
    let suffix = "";
    if (!this._config.use_24_hour) {
      displayHours = hours % 12 || 12;
      suffix = hours < 12 ? " AM" : " PM";
    }
    this.shadowRoot.querySelector(".digital-hours").textContent =
      String(displayHours).padStart(2, "0");
    this.shadowRoot.querySelector(".digital-minutes").textContent =
      String(minutes).padStart(2, "0");
    this.shadowRoot.querySelector(".digital-seconds").textContent =
      this._config.show_seconds
        ? `:${String(seconds).padStart(2, "0")}${suffix}`
        : suffix;
    const date = this.shadowRoot.querySelector(".digital-date");
    if (date && this._config.show_date) {
      date.textContent = new Intl.DateTimeFormat(this._locale(), {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(now);
    }
  }
}

class ThemeStudioClockCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = normalizedConfig();
    this._themeClockTypeOverride = "";
  }

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = normalizedConfig(config);
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    const clockType = effectiveClockType(this._config, this);
    const analog = clockType === "analog";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color); }
        .form { display: grid; gap: 14px; padding: 8px 0; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        label { display: grid; gap: 6px; color: var(--secondary-text-color); font-size: 12px; }
        select, input[type="text"] {
          box-sizing: border-box;
          width: 100%;
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          outline: none;
          color: var(--primary-text-color);
          background: var(--card-background-color);
          font: inherit;
        }
        select:focus, input[type="text"]:focus { border-color: var(--primary-color); }
        .toggle {
          display: flex;
          grid-template-columns: none;
          min-height: 38px;
          align-items: center;
          gap: 9px;
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .toggle input { width: 18px; height: 18px; margin: 0; accent-color: var(--primary-color); }
        .hint { margin: 0; color: var(--secondary-text-color); font-size: 12px; line-height: 1.45; }
        .hint[data-state="success"] { color: #45d483; }
        .hint[data-state="error"] { color: #ff6b78; }
        @media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
      </style>
      <div class="form">
        <div class="grid">
          <label>Uhrtyp
            <select data-key="clock_type">
              <option value="analog">Analog</option>
              <option value="digital">Digital</option>
            </select>
          </label>
          <label>Darstellung
            <select data-key="clock_style">
              <option value="theme">Theme</option>
              <option value="clean">Minimal</option>
              <option value="classic">Klassisch</option>
              <option value="tech">Tech</option>
            </select>
          </label>
        </div>
        <label>Optionale Überschrift
          <input type="text" data-key="title" maxlength="80" placeholder="z. B. Wohnzimmer">
        </label>
        <div class="grid">
          <label class="toggle"><input type="checkbox" data-key="show_seconds">Sekunden anzeigen</label>
          ${analog
            ? '<label class="toggle"><input type="checkbox" data-key="show_numerals">Ziffern anzeigen</label>'
            : '<label class="toggle"><input type="checkbox" data-key="show_date">Datum anzeigen</label><label class="toggle"><input type="checkbox" data-key="use_24_hour">24-Stunden-Anzeige</label>'}
        </div>
        <p id="clock-type-status" class="hint">Der Uhrtyp wird sofort im aktiven Theme-Studio-Design gespeichert. Größe und Position stellst du wie bei jeder anderen Home-Assistant-Karte im Layout ein.</p>
      </div>
    `;

    for (const element of this.shadowRoot.querySelectorAll("[data-key]")) {
      const key = element.dataset.key;
      if (element.type === "checkbox") element.checked = Boolean(this._config[key]);
      else element.value = key === "clock_type" ? clockType : this._config[key];
      element.addEventListener("change", (event) => this._change(event));
    }
  }

  _change(event) {
    const key = event.target.dataset.key;
    const value = event.target.type === "checkbox"
      ? event.target.checked
      : event.target.value;
    if (key === "clock_type") {
      this._saveThemeClockType(value);
      return;
    } else {
      this._config = { ...this._config, [key]: value };
    }
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true,
    }));
  }

  async _saveThemeClockType(clockType) {
    const previousOverride = this._themeClockTypeOverride;
    this._themeClockTypeOverride = clockType;
    this._render();
    const status = this.shadowRoot.getElementById("clock-type-status");
    if (status) {
      status.dataset.state = "";
      status.textContent = "Uhrtyp wird im aktiven Design gespeichert …";
    }

    try {
      if (!this._hass?.callWS) throw new Error("Home Assistant ist nicht verbunden.");
      const result = await this._hass.callWS({
        type: "theme_studio/set_clock_type",
        clock_type: clockType,
      });
      this.dispatchEvent(new CustomEvent("settheme", {
        detail: {
          theme: result.theme,
          dark: this._hass?.selectedTheme?.dark,
        },
        bubbles: true,
        composed: true,
      }));
      window.dispatchEvent(new CustomEvent("theme-studio-clock-type-changed", {
        detail: { clockType },
      }));
      const nextStatus = this.shadowRoot.getElementById("clock-type-status");
      if (nextStatus) {
        nextStatus.dataset.state = "success";
        nextStatus.textContent = "Uhrtyp wurde für dieses Design gespeichert.";
      }
    } catch (error) {
      this._themeClockTypeOverride = previousOverride;
      this._render();
      const nextStatus = this.shadowRoot.getElementById("clock-type-status");
      if (nextStatus) {
        nextStatus.dataset.state = "error";
        nextStatus.textContent = error?.message
          || "Der Uhrtyp konnte nicht gespeichert werden.";
      }
    }
  }
}

if (!customElements.get("theme-studio-clock-card-editor")) {
  customElements.define("theme-studio-clock-card-editor", ThemeStudioClockCardEditor);
}
if (!customElements.get("theme-studio-clock-card")) {
  customElements.define("theme-studio-clock-card", ThemeStudioClockCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "theme-studio-clock-card")) {
  window.customCards.push({
    type: "theme-studio-clock-card",
    name: "Theme Studio Uhr",
    description: "Analoge oder digitale Uhr im Design des aktiven Theme-Studio-Themes.",
    preview: true,
  });
}

console.info(
  `%c THEME STUDIO CLOCK %c ${THEME_STUDIO_CLOCK_CARD_VERSION} `,
  "color:#071012;background:#27d3c2;font-weight:700;padding:2px 5px;border-radius:4px 0 0 4px",
  "color:#dce7ec;background:#263640;padding:2px 5px;border-radius:0 4px 4px 0"
);
