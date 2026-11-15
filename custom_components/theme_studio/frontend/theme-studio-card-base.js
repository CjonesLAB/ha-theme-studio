import {
  ThemeStudioLocalizer,
  themeStudioLanguage,
} from "./theme-studio-locales.js?v=0.11.0";

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

export function translateThemeStudioText(value, hass = null) {
  return new ThemeStudioLocalizer(themeStudioLanguage(hass)).translate(value);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeEntityId(value, expectedDomain = "") {
  const entity = String(value || "").trim().toLowerCase();
  if (!ENTITY_ID_PATTERN.test(entity)) {
    throw new Error(translateThemeStudioText("Bitte eine gültige Home-Assistant-Entität auswählen."));
  }
  if (expectedDomain && !entity.startsWith(`${expectedDomain}.`)) {
    throw new Error(translateThemeStudioText(`Diese Karte benötigt eine ${expectedDomain}.-Entität.`));
  }
  return entity;
}

export function normalizeOptionalEntityId(value, expectedDomain = "") {
  return value ? normalizeEntityId(value, expectedDomain) : "";
}

export function normalizeCardConfig(config, expectedDomain) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(translateThemeStudioText("Für diese Theme-Studio-Karte fehlt die Konfiguration."));
  }
  return {
    entity: normalizeEntityId(config.entity, expectedDomain),
    name: String(config.name || "").trim().slice(0, 80),
    compact: config.compact !== false,
  };
}

export function clampPercentage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export const COVER_FEATURES = Object.freeze({
  OPEN: 1,
  CLOSE: 2,
  SET_POSITION: 4,
  STOP: 8,
  OPEN_TILT: 16,
  CLOSE_TILT: 32,
  STOP_TILT: 64,
  SET_TILT_POSITION: 128,
});

export function coverSupportsFeature(state, feature) {
  const supported = Number(state?.attributes?.supported_features);
  return Number.isInteger(supported) && (supported & feature) === feature;
}

export function canLearnCoverTravelTimes(state) {
  return [COVER_FEATURES.OPEN, COVER_FEATURES.CLOSE, COVER_FEATURES.STOP]
    .every((feature) => coverSupportsFeature(state, feature));
}

export function readCoverPosition(state) {
  const value = Number(state?.attributes?.current_position);
  return Number.isFinite(value) ? clampPercentage(value) : null;
}

export function normalizeCoverTravelTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(600, Math.round(seconds * 10) / 10);
}

const COVER_MATERIALS = new Set(["theme", "aluminum", "plastic", "wood"]);
const COVER_TEXTURES = new Set(["smooth", "brushed", "ribbed", "grain"]);
const COVER_DEFAULT_TEXTURES = Object.freeze({
  theme: "smooth",
  aluminum: "brushed",
  plastic: "smooth",
  wood: "grain",
});

export function normalizeCoverAppearance(config = {}) {
  const requestedMaterial = String(config?.cover_material || "theme").toLowerCase();
  const material = COVER_MATERIALS.has(requestedMaterial) ? requestedMaterial : "theme";
  if (material === "theme") return { material: "theme", texture: "smooth", color: "" };
  const requestedTexture = String(config?.cover_texture || "").toLowerCase();
  const texture = COVER_TEXTURES.has(requestedTexture)
    ? requestedTexture
    : COVER_DEFAULT_TEXTURES[material];
  const requestedColor = String(config?.cover_color || "").trim().toLowerCase();
  const color = /^#[0-9a-f]{6}$/.test(requestedColor) ? requestedColor : "";
  return { material, texture, color };
}

export async function stopCoverAndConfirmTravelTime(stopCover, elapsedSeconds) {
  const seconds = normalizeCoverTravelTime(elapsedSeconds);
  if (seconds === null) throw new Error(translateThemeStudioText("Die gemessene Laufzeit ist ungültig."));
  await stopCover();
  return seconds;
}

export function calculateCoverPosition({
  reportedPosition = null,
  estimatedPosition = 50,
  state = "",
  isClosed = null,
  direction = "",
  elapsedSeconds = 0,
  openingTime = null,
  closingTime = null,
} = {}) {
  if (reportedPosition !== null && Number.isFinite(Number(reportedPosition))) {
    return clampPercentage(reportedPosition);
  }
  if (state === "closed" || isClosed === true) return 0;
  const start = clampPercentage(estimatedPosition);
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  if (direction === "opening") {
    const duration = normalizeCoverTravelTime(openingTime);
    return duration ? clampPercentage(start + ((elapsed / duration) * 100)) : start;
  }
  if (direction === "closing") {
    const duration = normalizeCoverTravelTime(closingTime);
    return duration ? clampPercentage(start - ((elapsed / duration) * 100)) : start;
  }
  return start;
}

export function calculateCoverRemainingTravelTime(direction, position, fullTravelTime) {
  const duration = normalizeCoverTravelTime(fullTravelTime);
  if (duration === null) return null;
  const currentPosition = clampPercentage(position);
  const remainingFraction = direction === "opening"
    ? (100 - currentPosition) / 100
    : direction === "closing"
      ? currentPosition / 100
      : 0;
  return Math.round(duration * remainingFraction * 10) / 10;
}

export function readNumericAttribute(state, names, fallback = 0) {
  for (const name of names) {
    const value = Number(state?.attributes?.[name]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

export function energyPeriodLabel({ entityId = "", state = null, attributeNames = [] } = {}) {
  const searchable = [
    entityId,
    state?.attributes?.friendly_name,
    ...attributeNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const dailyMarker = /(^|[\s._-])(today|daily|heute|tages(?:energie|verbrauch)?|day)([\s._-]|$)/;
  return dailyMarker.test(searchable) ? "Heute" : "Gesamt";
}

export function findRelatedSensor(hass, sourceEntityId, options = {}) {
  const sourceId = String(sourceEntityId || "");
  if (!sourceId || !hass?.states) return "";
  const deviceClasses = new Set(options.deviceClasses || []);
  const units = new Set(options.units || []);
  const suffixes = options.suffixes || [];
  const sourceKey = sourceId.split(".").slice(1).join(".").toLowerCase();
  const sourceName = String(
    hass.states[sourceId]?.attributes?.friendly_name || sourceKey
  ).toLowerCase();
  const registryEntry = (entityId) => hass.entities instanceof Map
    ? hass.entities.get(entityId)
    : hass.entities?.[entityId];
  const sourceDeviceId = registryEntry(sourceId)?.device_id;
  let bestEntity = "";
  let bestScore = -1;

  for (const [entityId, state] of Object.entries(hass.states)) {
    if (!entityId.startsWith("sensor.")) continue;
    const deviceClass = String(state?.attributes?.device_class || "");
    const unit = String(state?.attributes?.unit_of_measurement || "");
    if (deviceClasses.size && !deviceClasses.has(deviceClass)) continue;
    if (units.size && !units.has(unit)) continue;

    const candidateKey = entityId.slice("sensor.".length).toLowerCase();
    const candidateName = String(
      state?.attributes?.friendly_name || candidateKey
    ).toLowerCase();
    const candidateDeviceId = registryEntry(entityId)?.device_id;
    const sameDevice = Boolean(
      sourceDeviceId && candidateDeviceId === sourceDeviceId
    );
    const nameRelated = candidateKey.includes(sourceKey)
      || sourceKey.includes(candidateKey)
      || candidateName.includes(sourceName)
      || sourceName.includes(candidateName);
    if (!sameDevice && !nameRelated) continue;

    let score = sameDevice ? 100 : 0;
    if (candidateKey.includes(sourceKey)) score += 35;
    if (candidateName.includes(sourceName)) score += 20;
    const suffixIndex = suffixes.findIndex((suffix) => (
      candidateKey.endsWith(`_${suffix}`)
      || candidateKey.includes(`_${suffix}_`)
    ));
    if (suffixIndex >= 0) score += 12 - Math.min(10, suffixIndex);
    if (Number.isFinite(Number(state?.state))) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestEntity = entityId;
    }
  }

  return bestEntity;
}

export function formatNumber(value, maximumFractionDigits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "–";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export function friendlyName(state, config, fallback) {
  return config?.name || state?.attributes?.friendly_name || fallback;
}

export const COMMON_CARD_STYLES = `
  :host {
    display: block;
    height: 100%;
    color: var(--primary-text-color, white);
    font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    --tsc-accent: var(--primary-color, var(--accent-color));
    --tsc-positive: var(--success-color, #43a047);
    --tsc-warning: var(--warning-color, #f5a623);
    --tsc-danger: var(--error-color, #db4437);
    --tsc-muted: var(--secondary-text-color, rgba(255, 255, 255, .7));
    --tsc-divider: var(--divider-color, rgba(255, 255, 255, .12));
  }
  * { box-sizing: border-box; }
  button, input { font: inherit; }
  button { color: inherit; }
  button:focus-visible, input:focus-visible {
    outline: 3px solid var(--tsc-accent);
    outline-offset: 2px;
  }
  ha-card {
    height: 100%;
    min-height: 176px;
    overflow: hidden;
    color: inherit;
  }
  .card-shell {
    position: relative;
    height: 100%;
    min-height: 176px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }
  .entity-icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border: 1px solid color-mix(in srgb, var(--tsc-accent) 36%, transparent);
    border-radius: var(--ha-card-border-radius, 12px);
    color: var(--tsc-accent);
    background: color-mix(in srgb, var(--tsc-accent) 12%, transparent);
  }
  .entity-icon svg { width: 23px; height: 23px; }
  .entity-copy { min-width: 0; flex: 1; }
  .entity-name {
    margin: 0;
    overflow: hidden;
    color: var(--primary-text-color, white);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entity-state {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin: 3px 0 0;
    color: var(--tsc-muted);
    font-size: .76rem;
  }
  .state-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: var(--tsc-positive);
    box-shadow: 0 0 10px color-mix(in srgb, var(--tsc-positive) 72%, transparent);
  }
  .state-dot.off { background: var(--tsc-muted); box-shadow: none; }
  .icon-button, .toggle, .detail-button, .action-button, .choice-button {
    border: 1px solid var(--tsc-divider);
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    cursor: pointer;
  }
  .toggle {
    position: relative;
    width: 46px;
    height: 27px;
    flex: 0 0 46px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tsc-muted) 32%, transparent);
  }
  .toggle::after {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: var(--primary-background-color, white);
    box-shadow: 0 2px 7px rgba(0, 0, 0, .35);
    transition: transform 160ms ease;
  }
  .toggle[aria-pressed="true"] { background: var(--tsc-accent); }
  .toggle[aria-pressed="true"]::after { transform: translateX(19px); }
  .detail-button {
    min-height: 34px;
    padding: 7px 11px;
    border-radius: 999px;
    color: var(--primary-text-color, white);
    font-size: .72rem;
    font-weight: 700;
  }
  .card-footer {
    position: relative;
    display: flex;
    min-height: 34px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
  }
  .card-footer.end { justify-content: flex-end; }
  .card-footer-label {
    min-width: 0;
    overflow: hidden;
    color: var(--tsc-muted);
    font-size: .7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .range-row { display: grid; gap: 7px; }
  .range-label, .data-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--tsc-muted);
    font-size: .75rem;
  }
  .range-label output, .data-row strong { color: var(--primary-text-color, white); }
  input[type="range"] {
    width: 100%;
    height: 6px;
    appearance: none;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      var(--tsc-accent) 0 var(--range-value, 50%),
      color-mix(in srgb, var(--tsc-muted) 28%, transparent) var(--range-value, 50%)
    );
  }
  input[type="range"]::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
    appearance: none;
    border: 4px solid var(--tsc-accent);
    border-radius: 50%;
    background: var(--primary-background-color, white);
    box-shadow: 0 2px 7px rgba(0, 0, 0, .35);
    cursor: pointer;
  }
  dialog {
    width: min(620px, calc(100vw - 32px));
    max-height: min(760px, calc(100vh - 32px));
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--ha-card-border-color, var(--divider-color));
    border-radius: var(--ha-card-border-radius, 20px);
    color: var(--primary-text-color, white);
    background: var(--card-background-color, var(--ha-card-background, var(--primary-background-color)));
    box-shadow: 0 30px 90px rgba(0, 0, 0, .58);
  }
  dialog::backdrop {
    background: color-mix(in srgb, var(--primary-background-color, black) 70%, transparent);
    backdrop-filter: blur(10px);
  }
  .dialog-shell { display: flex; max-height: inherit; flex-direction: column; }
  .dialog-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--tsc-divider);
  }
  .dialog-title { min-width: 0; flex: 1; }
  .dialog-title h3 { margin: 0; font-size: 1.15rem; }
  .dialog-title p { margin: 4px 0 0; color: var(--tsc-muted); font-size: .78rem; }
  .icon-button {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
  }
  .dialog-body {
    display: grid;
    gap: 20px;
    padding: 20px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  .dialog-section {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--tsc-divider);
    border-radius: calc(var(--ha-card-border-radius, 16px) * .7);
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }
  .dialog-section h4 { margin: 0; font-size: .86rem; }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid var(--tsc-divider);
  }
  .dialog-actions button {
    min-height: 40px;
    padding: 9px 15px;
    border: 1px solid var(--tsc-divider);
    border-radius: 10px;
    color: inherit;
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    cursor: pointer;
  }
  .unavailable {
    display: grid;
    min-height: 140px;
    place-items: center;
    padding: 20px;
    color: var(--tsc-muted);
    text-align: center;
  }
  @media (max-width: 520px) {
    .card-header {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      align-items: start;
    }
    .card-header > .toggle { grid-column: 2; justify-self: end; }
    dialog { width: 100vw; max-width: none; max-height: 100dvh; height: 100dvh; border-radius: 0; }
    .dialog-shell { height: 100%; }
    .dialog-body { padding: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
  }
`;

export class ThemeStudioCardBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._lastState = null;
    this._returnFocus = null;
    this._localizer = null;
  }

  set hass(hass) {
    const watchedEntities = this._watchedEntityIds();
    const previousStates = watchedEntities.map((entity) => this._hass?.states?.[entity]);
    this._hass = hass;
    const languageChanged = this._syncLocalizer();
    const hasChanged = watchedEntities.some(
      (entity, index) => previousStates[index] !== hass?.states?.[entity]
    );
    if (languageChanged || hasChanged || !this.shadowRoot.firstElementChild) {
      this._renderPreservingDialog();
    }
  }

  connectedCallback() {
    this._syncLocalizer();
    this._renderPreservingDialog();
  }

  disconnectedCallback() {
    this.shadowRoot.querySelector("dialog[open]")?.close("disconnected");
    this._localizer?.disconnect();
  }

  _syncLocalizer() {
    const language = themeStudioLanguage(this._hass);
    if (this._localizer?.language === language) {
      if (!this._localizer.observer) this._localizer.observe(this.shadowRoot);
      return false;
    }
    this._localizer?.disconnect();
    this._localizer = new ThemeStudioLocalizer(language);
    this._localizer.translateTree(this.shadowRoot);
    this._localizer.observe(this.shadowRoot);
    return true;
  }

  _translate(value) {
    return this._localizer?.translate(value) || value;
  }

  get stateObj() {
    return this._config ? this._hass?.states?.[this._config.entity] : null;
  }

  _watchedEntityIds() {
    return this._config?.entity ? [this._config.entity] : [];
  }

  _renderPreservingDialog() {
    const wasOpen = Boolean(this.shadowRoot.querySelector("dialog[open]"));
    this.render();
    if (wasOpen) this._openDialog(null, false);
  }

  _commitCardMarkup(markup) {
    const previousCard = this.shadowRoot.querySelector("ha-card");
    const presentationStyle = previousCard?.getAttribute("style") || "";
    const presentationAttributes = previousCard
      ? Array.from(previousCard.attributes)
          .filter((attribute) => attribute.name.startsWith("data-theme-studio-"))
          .map((attribute) => [attribute.name, attribute.value])
      : [];
    const persistentThemeChildren = previousCard
      ? Array.from(previousCard.children)
          .filter((child) => child.matches?.(
            "svg[data-theme-studio-tech-frame-outline]"
          ))
          .map((child) => child.cloneNode(true))
      : [];
    const persistentThemeStyles = Array.from(
      this.shadowRoot.querySelectorAll("style")
    ).filter((style) => Array.from(style.attributes).some(
      (attribute) => attribute.name.startsWith("data-theme-studio-")
    ));

    this.shadowRoot.innerHTML = markup;
    this._localizer?.translateTree(this.shadowRoot);

    for (const style of persistentThemeStyles) {
      this.shadowRoot.appendChild(style);
    }

    const nextCard = this.shadowRoot.querySelector("ha-card");
    if (!nextCard) return;
    for (const [name, value] of presentationAttributes) {
      nextCard.setAttribute(name, value);
    }
    if (presentationStyle) {
      nextCard.setAttribute("style", presentationStyle);
      nextCard.setAttribute("data-theme-studio-presentation-carryover", "");
    }
    for (const child of persistentThemeChildren) {
      nextCard.appendChild(child);
    }
  }

  _callService(domain, service, data = {}) {
    if (!this._hass?.callService || !this._config?.entity) return Promise.resolve();
    return this._hass.callService(domain, service, {
      entity_id: this._config.entity,
      ...data,
    });
  }

  _bindBaseEvents() {
    const dialog = this.shadowRoot.querySelector("dialog");
    this.shadowRoot.querySelectorAll("[data-open-details]").forEach((button) => {
      button.addEventListener("click", (event) => this._openDialog(event.currentTarget));
    });
    this.shadowRoot.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => dialog?.close("close"));
    });
    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("backdrop");
    });
    dialog?.addEventListener("close", () => {
      this._lastDialogResult = dialog.returnValue;
      this._returnFocus?.focus?.();
      this._returnFocus = null;
    });
  }

  _openDialog(returnFocus, rememberFocus = true) {
    const dialog = this.shadowRoot.querySelector("dialog");
    if (!dialog || dialog.open) return;
    if (rememberFocus) this._returnFocus = returnFocus || this.shadowRoot.activeElement;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    this.shadowRoot.querySelector("[data-close-dialog]")?.focus?.();
  }

  _missingCard(message) {
    this._commitCardMarkup(`
      <style>${COMMON_CARD_STYLES}</style>
      <ha-card><div class="unavailable" role="status">${escapeHtml(message)}</div></ha-card>
    `);
  }
}

export class ThemeStudioEntityCardEditor extends HTMLElement {
  constructor(domain, extraFields = []) {
    super();
    this.attachShadow({ mode: "open" });
    this.domain = domain;
    this.extraFields = extraFields;
    this._config = {};
    this._hass = null;
    this._nameInputActive = false;
    this._localizer = null;
  }

  set hass(hass) {
    this._hass = hass;
    const languageChanged = this._syncLocalizer();
    if (languageChanged || !this.shadowRoot?.hasChildNodes()) {
      this._render();
      return;
    }
    this._updatePickerContexts();
  }

  connectedCallback() {
    this._syncLocalizer();
  }

  disconnectedCallback() {
    this._localizer?.disconnect();
  }

  _syncLocalizer() {
    const language = themeStudioLanguage(this._hass);
    if (this._localizer?.language === language) {
      if (!this._localizer.observer) this._localizer.observe(this.shadowRoot);
      return false;
    }
    this._localizer?.disconnect();
    this._localizer = new ThemeStudioLocalizer(language);
    this._localizer.translateTree(this.shadowRoot);
    this._localizer.observe(this.shadowRoot);
    return true;
  }

  setConfig(config) {
    const preserveNameInput = this._nameInputActive
      && Boolean(this.shadowRoot?.querySelector('input[data-field="name"]'));
    const needsLayoutInitialization = config
      && config.theme_studio_layout_initialized !== true;
    this._config = needsLayoutInitialization
      ? {
          ...config,
          grid_options: config.grid_options?.columns !== undefined
            && config.grid_options?.rows !== undefined
            ? { ...config.grid_options }
            : {
                columns: 6,
                rows: 3,
                ...(config.grid_options || {}),
              },
          theme_studio_layout_initialized: true,
        }
      : { ...config };
    if (!preserveNameInput) this._render();
    if (needsLayoutInitialization) {
      queueMicrotask(() => {
        if (this.isConnected) this._emitConfig();
      });
    }
  }

  _emitConfig() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config: { ...this._config } },
    }));
  }

  _setNameValue(rawValue) {
    const value = String(rawValue || "").trim().slice(0, 80);
    if (value) this._config.name = value;
    else delete this._config.name;
  }

  _updatePickerContexts() {
    this.shadowRoot?.querySelectorAll("ha-entity-picker").forEach((picker) => {
      picker.hass = this._hass;
    });
  }

  _render() {
    if (!this.shadowRoot) return;
    const extraMarkup = this.extraFields.map((field) => `
      <label>
        <span>${escapeHtml(field.label)}</span>
        <ha-entity-picker data-field="${escapeHtml(field.key)}"></ha-entity-picker>
      </label>
    `).join("");
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color); }
        .editor { display: grid; gap: 16px; padding: 8px 0; }
        label { display: grid; gap: 7px; color: var(--secondary-text-color); font-size: .86rem; }
        ha-entity-picker, input[data-field="name"] { width: 100%; box-sizing: border-box; }
        input[data-field="name"] {
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--input-fill-color, var(--card-background-color));
          color: var(--primary-text-color);
          font: inherit;
        }
        input[data-field="name"]::placeholder { color: var(--secondary-text-color); }
        input[data-field="name"]:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .field-hint, .layout-hint { margin: 0; color: var(--secondary-text-color); font-size: .78rem; line-height: 1.45; }
      </style>
      <div class="editor">
        <label><span>Entität</span><ha-entity-picker data-field="entity"></ha-entity-picker></label>
        ${extraMarkup}
        <label>
          <span>Name der Karte (optional)</span>
          <input data-field="name" type="text" maxlength="80" autocomplete="off" placeholder="Name der Karte">
          <small class="field-hint">Leer lassen, um den Namen der Entität zu verwenden.</small>
        </label>
        <p class="layout-hint">Im Reiter Layout kannst du Breite und Höhe frei wählen. Schalte dazu „Empfohlene Größe verwenden“ aus.</p>
      </div>
    `;
    this._localizer?.translateTree(this.shadowRoot);

    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => {
      const field = picker.dataset.field;
      const definition = this.extraFields.find((item) => item.key === field);
      picker.hass = this._hass;
      picker.value = this._config[field] || "";
      picker.includeDomains = definition?.domains || [this.domain];
      picker.includeDeviceClasses = definition?.deviceClasses;
      picker.includeUnitOfMeasurement = definition?.units;
      picker.allowCustomEntity = false;
      picker.addEventListener("value-changed", (event) => {
        const value = String(event.detail?.value || "").trim();
        if (value) this._config[field] = value;
        else delete this._config[field];
        this._emitConfig();
      });
    });
    const nameField = this.shadowRoot.querySelector('input[data-field="name"]');
    nameField.value = this._config.name || "";
    nameField.addEventListener("focus", () => {
      this._nameInputActive = true;
    });
    nameField.addEventListener("input", (event) => {
      this._nameInputActive = true;
      this._setNameValue(event.target.value);
      this._emitConfig();
    });
    nameField.addEventListener("change", (event) => {
      this._setNameValue(event.target.value);
      event.target.value = this._config.name || "";
      this._emitConfig();
    });
    nameField.addEventListener("blur", () => {
      this._nameInputActive = false;
    });
    nameField.addEventListener("keydown", (event) => {
      if (event.key === "Enter") nameField.blur();
    });
  }
}
