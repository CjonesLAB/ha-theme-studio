import {
  COMMON_CARD_STYLES,
  COVER_FEATURES,
  ThemeStudioCardBase,
  ThemeStudioEntityCardEditor,
  calculateCoverPosition,
  calculateCoverRemainingTravelTime,
  canLearnCoverTravelTimes,
  clampPercentage,
  coverSupportsFeature,
  escapeHtml,
  friendlyName,
  normalizeCoverAppearance,
  normalizeCoverTravelTime,
  normalizeCardConfig,
  readCoverPosition,
  stopCoverAndConfirmTravelTime,
  translateThemeStudioText,
} from "./theme-studio-card-base.js?v=0.11.0";

const COVER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 3h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v14h-2V8H6v13H4V7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m3 6h10v2H7V9m0 4h10v2H7v-2m0 4h10v2H7v-2m0 4h10v2H7v-2Z"/></svg>`;
const COVER_POSITION_STORAGE_PREFIX = "theme-studio:cover-position:";
const coverPositionMemory = new Map();

function readRememberedCoverPosition(entityId) {
  if (!entityId) return null;
  const remembered = coverPositionMemory.get(entityId);
  if (remembered && Number.isFinite(remembered.position)) return remembered.position;
  try {
    const rawStored = window.localStorage.getItem(`${COVER_POSITION_STORAGE_PREFIX}${entityId}`);
    if (rawStored === null || rawStored === "") return null;
    const stored = Number(rawStored);
    if (!Number.isFinite(stored)) return null;
    const position = clampPercentage(stored);
    coverPositionMemory.set(entityId, { position, lastPersistedAt: Date.now() });
    return position;
  } catch (_error) {
    return null;
  }
}

function rememberCoverPosition(entityId, value, persistImmediately = false) {
  if (!entityId || !Number.isFinite(Number(value))) return;
  const position = clampPercentage(value);
  const previous = coverPositionMemory.get(entityId);
  const now = Date.now();
  coverPositionMemory.set(entityId, {
    position,
    lastPersistedAt: previous?.lastPersistedAt || 0,
  });
  if (!persistImmediately && previous && now - (previous.lastPersistedAt || 0) < 750) return;
  try {
    window.localStorage.setItem(`${COVER_POSITION_STORAGE_PREFIX}${entityId}`, String(position));
    coverPositionMemory.set(entityId, { position, lastPersistedAt: now });
  } catch (_error) {
    // The in-memory value still protects card recreation when browser storage is unavailable.
  }
}

class ThemeStudioCoverCardEditor extends ThemeStudioEntityCardEditor {
  constructor() {
    super("cover");
    this._measurement = null;
    this._measurementTimer = null;
  }

  disconnectedCallback() {
    if (this._measurement) this._cancelMeasurement(true);
    else this._clearMeasurementTimer();
    super.disconnectedCallback();
  }

  _render() {
    super._render();
    const editor = this.shadowRoot?.querySelector(".editor");
    if (!editor) return;
    const appearance = normalizeCoverAppearance(this._config);
    const appearanceSection = document.createElement("section");
    appearanceSection.className = "appearance-section";
    appearanceSection.innerHTML = `
      <style>
        .appearance-section { display:grid; gap:12px; padding:14px; border:1px solid var(--divider-color); border-radius:12px; }
        .appearance-section h3, .appearance-section p { margin:0; }
        .appearance-section h3 { font-size:.95rem; }
        .appearance-section p { color:var(--secondary-text-color); font-size:.78rem; line-height:1.45; }
        .appearance-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .appearance-section label { display:grid; gap:6px; }
        .appearance-section select, .appearance-section input { width:100%; min-height:40px; box-sizing:border-box; padding:8px 10px; border:1px solid var(--divider-color); border-radius:8px; color:var(--primary-text-color); background:var(--card-background-color); }
        .color-row { display:grid; grid-template-columns:minmax(90px, 1fr) auto; gap:8px; align-items:end; }
        .appearance-section button { min-height:40px; padding:8px 12px; border:1px solid var(--divider-color); border-radius:9px; color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color) 6%, transparent); cursor:pointer; }
        .appearance-section :disabled { cursor:not-allowed; opacity:.55; }
        @media (max-width:520px) { .appearance-fields { grid-template-columns:1fr; } }
      </style>
      <h3>Jalousie-Darstellung</h3>
      <p>Diese Einstellungen gelten nur für die Lamellen dieser Karte. „Vom Theme“ übernimmt Farbe und Oberfläche vollständig aus Theme Studio.</p>
      <div class="appearance-fields">
        <label><span>Material</span><select data-cover-material>
          <option value="theme">Vom Theme</option>
          <option value="aluminum">Aluminium</option>
          <option value="plastic">Kunststoff</option>
          <option value="wood">Holz</option>
        </select></label>
        <label><span>Oberfläche</span><select data-cover-texture>
          <option value="smooth">Glatt</option>
          <option value="brushed">Gebürstet</option>
          <option value="ribbed">Fein geriffelt</option>
          <option value="grain">Maserung</option>
        </select></label>
      </div>
      <div class="color-row">
        <label><span>Farbe</span><input data-cover-color type="color" aria-label="Farbe der Jalousielamellen"></label>
        <button type="button" data-reset-cover-color>Materialfarbe</button>
      </div>
    `;
    editor.append(appearanceSection);
    const materialSelect = appearanceSection.querySelector("[data-cover-material]");
    const textureSelect = appearanceSection.querySelector("[data-cover-texture]");
    const colorInput = appearanceSection.querySelector("[data-cover-color]");
    materialSelect.value = appearance.material;
    textureSelect.value = appearance.texture;
    colorInput.value = appearance.color || ({ aluminum: "#b8c0c8", plastic: "#eceff1", wood: "#8a5a32" }[appearance.material] || "#808080");
    materialSelect.addEventListener("change", () => {
      const material = materialSelect.value;
      if (material === "theme") {
        delete this._config.cover_material;
        delete this._config.cover_texture;
        delete this._config.cover_color;
      } else {
        this._config.cover_material = material;
        this._config.cover_texture = ({ aluminum: "brushed", plastic: "smooth", wood: "grain" })[material];
      }
      const updatedAppearance = normalizeCoverAppearance(this._config);
      textureSelect.value = updatedAppearance.texture;
      colorInput.value = updatedAppearance.color || ({ aluminum: "#b8c0c8", plastic: "#eceff1", wood: "#8a5a32" }[updatedAppearance.material] || "#808080");
      const enabled = updatedAppearance.material !== "theme";
      textureSelect.disabled = !enabled;
      colorInput.disabled = !enabled;
      appearanceSection.querySelector("[data-reset-cover-color]").disabled = !enabled;
      this._emitConfig();
    });
    textureSelect.addEventListener("change", () => {
      this._config.cover_texture = textureSelect.value;
      this._emitConfig();
    });
    colorInput.addEventListener("input", () => {
      this._config.cover_color = colorInput.value;
      this._emitConfig();
    });
    appearanceSection.querySelector("[data-reset-cover-color]")?.addEventListener("click", () => {
      delete this._config.cover_color;
      colorInput.value = ({ aluminum: "#b8c0c8", plastic: "#eceff1", wood: "#8a5a32" })[this._config.cover_material] || "#808080";
      this._emitConfig();
    });
    const customAppearanceEnabled = appearance.material !== "theme";
    textureSelect.disabled = !customAppearanceEnabled;
    colorInput.disabled = !customAppearanceEnabled;
    appearanceSection.querySelector("[data-reset-cover-color]").disabled = !customAppearanceEnabled;

    const section = document.createElement("section");
    section.className = "learning-section";
    section.innerHTML = `
      <style>
        .learning-section { display:grid; gap:12px; padding:14px; border:1px solid var(--divider-color); border-radius:12px; }
        .learning-section h3, .learning-section p { margin:0; }
        .learning-section h3 { font-size:.95rem; }
        .learning-section p { color:var(--secondary-text-color); font-size:.78rem; line-height:1.45; }
        .learning-times, .learning-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .learning-section label { display:grid; gap:6px; }
        .learning-section input { width:100%; min-height:40px; padding:8px 10px; border:1px solid var(--divider-color); border-radius:8px; color:var(--primary-text-color); background:var(--card-background-color); }
        .learning-section button { min-height:40px; padding:8px 10px; border:1px solid var(--divider-color); border-radius:9px; color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color) 6%, transparent); cursor:pointer; }
        .learning-section button.primary { border-color:var(--primary-color); }
        .learning-section button.stop { grid-column:1 / -1; color:var(--warning-color, var(--primary-color)); }
        .measurement-status { min-height:1.2em; color:var(--primary-text-color) !important; font-weight:650; }
        @media (max-width:520px) { .learning-times, .learning-actions { grid-template-columns:1fr; } .learning-section button.stop { grid-column:auto; } }
      </style>
      <h3>Laufzeiten einlernen</h3>
      <p>Fahre zuerst in eine Endlage. Starte dann die jeweilige Testfahrt und bestätige den Endpunkt. Dabei wird sofort gestoppt und die gemessene Zeit übernommen.</p>
      <div class="learning-times">
        <label><span>Öffnen (Sekunden)</span><input data-travel-time="opening_time" type="number" min="0.1" max="600" step="0.1" value="${this._config.opening_time || ""}"></label>
        <label><span>Schließen (Sekunden)</span><input data-travel-time="closing_time" type="number" min="0.1" max="600" step="0.1" value="${this._config.closing_time || ""}"></label>
      </div>
      <p class="measurement-status" role="status" aria-live="polite">Bereit für eine Testfahrt.</p>
      <div class="learning-actions">
        <button class="primary" data-learn-direction="opening">Öffnungsfahrt starten</button>
        <button class="primary" data-learn-direction="closing">Schließfahrt starten</button>
        <button class="stop" data-learning-stop>Not-Stopp</button>
      </div>
    `;
    editor.append(section);

    section.querySelectorAll("[data-travel-time]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.travelTime;
        const seconds = normalizeCoverTravelTime(input.value);
        if (seconds === null) delete this._config[field];
        else this._config[field] = seconds;
        this._emitConfig();
      });
    });
    section.querySelectorAll("[data-learn-direction]").forEach((button) => {
      button.addEventListener("click", () => this._toggleMeasurement(button.dataset.learnDirection));
    });
    section.querySelector("[data-learning-stop]")?.addEventListener("click", () => this._cancelMeasurement(true));
    this._updateLearningControls();
  }

  _callCoverService(service) {
    const entityId = String(this._config?.entity || "");
    if (!entityId || !this._hass?.callService) {
      return Promise.reject(new Error("Die Jalousie-Entität ist nicht verfügbar."));
    }
    try {
      return Promise.resolve(this._hass.callService("cover", service, { entity_id: entityId }));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  _toggleMeasurement(direction) {
    if (this._measurement?.direction === direction) {
      this._finishMeasurement();
      return;
    }
    const entityId = String(this._config?.entity || "");
    if (!entityId || !this._hass?.states?.[entityId]) {
      this._updateLearningControls("Bitte zuerst eine Jalousie-Entität auswählen.");
      return;
    }
    if (!canLearnCoverTravelTimes(this._hass.states[entityId])) {
      this._updateLearningControls("Für die Testfahrt werden Öffnen, Schließen und ein nativer Stopp-Befehl benötigt.");
      return;
    }
    if (this._measurement) this._cancelMeasurement(true);
    const service = direction === "opening" ? "open_cover" : "close_cover";
    this._measurement = { direction, startedAt: performance.now() };
    this._callCoverService(service).catch(() => {
      if (this._measurement?.direction !== direction) return;
      this._clearMeasurementTimer();
      this._measurement = null;
      this._updateLearningControls("Die Testfahrt konnte nicht gestartet werden.");
    });
    this._measurementTimer = window.setInterval(() => this._updateLearningControls(), 100);
    this._updateLearningControls();
  }

  async _finishMeasurement() {
    if (!this._measurement || this._measurement.stopping) return;
    const measurement = this._measurement;
    measurement.stopping = true;
    const { direction, startedAt } = measurement;
    this._clearMeasurementTimer();
    this._updateLearningControls("Endpunkt erreicht – Motor wird gestoppt …");
    try {
      const seconds = await stopCoverAndConfirmTravelTime(
        () => this._callCoverService("stop_cover"),
        (performance.now() - startedAt) / 1000
      );
      if (this._measurement !== measurement) return;
      this._measurement = null;
      const field = direction === "opening" ? "opening_time" : "closing_time";
      this._config[field] = seconds;
      this._config.estimated_position = direction === "opening" ? 100 : 0;
      rememberCoverPosition(this._config.entity, this._config.estimated_position, true);
      const input = this.shadowRoot.querySelector(`[data-travel-time="${field}"]`);
      if (input) input.value = seconds;
      this._emitConfig();
      this._updateLearningControls(`Motor gestoppt. Gemessene ${direction === "opening" ? "Öffnungszeit" : "Schließzeit"}: ${seconds} Sekunden.`);
    } catch (_error) {
      if (this._measurement !== measurement) return;
      this._measurement = null;
      this._updateLearningControls("Stopp fehlgeschlagen – Zeit wurde nicht gespeichert. Bitte die Jalousie sofort manuell stoppen.");
    }
  }

  _cancelMeasurement(stopMotor = false) {
    const wasMeasuring = Boolean(this._measurement);
    if (stopMotor) this._callCoverService("stop_cover").catch(() => {
      this._updateLearningControls("Stopp fehlgeschlagen. Bitte die Jalousie sofort manuell stoppen.");
    });
    this._clearMeasurementTimer();
    this._measurement = null;
    this._updateLearningControls(stopMotor
      ? (wasMeasuring ? "Testfahrt gestoppt, Zeit wurde nicht übernommen." : "Stopp-Befehl gesendet.")
      : "");
  }

  _clearMeasurementTimer() {
    if (this._measurementTimer !== null) window.clearInterval(this._measurementTimer);
    this._measurementTimer = null;
  }

  _updateLearningControls(message = "") {
    const status = this.shadowRoot?.querySelector(".measurement-status");
    const opening = this.shadowRoot?.querySelector('[data-learn-direction="opening"]');
    const closing = this.shadowRoot?.querySelector('[data-learn-direction="closing"]');
    if (!status || !opening || !closing) return;
    const state = this._hass?.states?.[this._config?.entity];
    const canLearn = canLearnCoverTravelTimes(state);
    opening.textContent = this._measurement?.direction === "opening" ? "Oben erreicht" : "Öffnungsfahrt starten";
    closing.textContent = this._measurement?.direction === "closing" ? "Unten erreicht" : "Schließfahrt starten";
    opening.disabled = !canLearn || Boolean(this._measurement?.stopping) || Boolean(this._measurement && this._measurement.direction !== "opening");
    closing.disabled = !canLearn || Boolean(this._measurement?.stopping) || Boolean(this._measurement && this._measurement.direction !== "closing");
    if (message) status.textContent = message;
    else if (this._measurement) {
      const elapsed = Math.max(0, (performance.now() - this._measurement.startedAt) / 1000).toFixed(1);
      status.textContent = `${this._measurement.direction === "opening" ? "Öffnungsfahrt" : "Schließfahrt"} läuft: ${elapsed} Sekunden`;
    } else if (!this._config?.entity) status.textContent = "Bitte zuerst eine Jalousie-Entität auswählen.";
    else if (!canLearn) status.textContent = "Für das Einlernen wird ein nativer Stopp-Befehl benötigt.";
  }
}

class ThemeStudioCoverCard extends ThemeStudioCardBase {
  constructor() {
    super();
    this._estimatedPosition = 50;
    this._coverMotion = null;
    this._motionTimer = null;
    this._motionStopTimer = null;
  }

  disconnectedCallback() {
    if (this._coverMotion) {
      this._rememberEstimatedPosition(this._currentVisualPosition(), true);
    }
    super.disconnectedCallback();
    this._clearMotionTimer();
    this._clearMotionStopTimer();
  }

  static getConfigElement() { return document.createElement("theme-studio-cover-card-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith("cover."));
    return {
      type: "custom:theme-studio-cover-card",
      entity: entity || "cover.jalousie",
      grid_options: { columns: 6, rows: 3 },
      theme_studio_layout_initialized: true,
    };
  }
  getGridOptions() { return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 }; }
  getCardSize() { return 3; }

  setConfig(config) {
    const configuredEstimate = Number(config.estimated_position);
    const appearance = normalizeCoverAppearance(config);
    const normalizedConfig = normalizeCardConfig(config, "cover");
    const sameEntity = Boolean(this._config?.entity && this._config.entity === normalizedConfig.entity);
    const rememberedEstimate = readRememberedCoverPosition(normalizedConfig.entity);
    if (rememberedEstimate !== null) {
      this._estimatedPosition = rememberedEstimate;
    } else if (!sameEntity && Number.isFinite(configuredEstimate)) {
      this._estimatedPosition = clampPercentage(configuredEstimate);
    }
    this._config = {
      ...normalizedConfig,
      ...(normalizeCoverTravelTime(config.opening_time) !== null
        ? { opening_time: normalizeCoverTravelTime(config.opening_time) }
        : {}),
      ...(normalizeCoverTravelTime(config.closing_time) !== null
        ? { closing_time: normalizeCoverTravelTime(config.closing_time) }
        : {}),
      ...(Number.isFinite(configuredEstimate)
        ? { estimated_position: clampPercentage(configuredEstimate) }
        : {}),
      ...(appearance.material !== "theme" ? {
        cover_material: appearance.material,
        cover_texture: appearance.texture,
      } : {}),
      ...(appearance.color ? { cover_color: appearance.color } : {}),
    };
    this._renderPreservingDialog();
  }

  render() {
    if (!this._config) return this._missingCard("Jalousie-Entität auswählen");
    const state = this.stateObj;
    if (!state) return this._missingCard("Jalousie-Entität nicht gefunden");
    const position = readCoverPosition(state);
    if (position !== null) this._rememberEstimatedPosition(position);
    else if (state.state === "closed" || state.attributes?.is_closed === true) this._rememberEstimatedPosition(0);
    const visualPosition = this._currentVisualPosition(state, position);
    const rawTilt = Number(state.attributes?.current_tilt_position);
    const tilt = Number.isFinite(rawTilt) ? clampPercentage(rawTilt) : null;
    const canOpen = coverSupportsFeature(state, COVER_FEATURES.OPEN);
    const canClose = coverSupportsFeature(state, COVER_FEATURES.CLOSE);
    const canStop = coverSupportsFeature(state, COVER_FEATURES.STOP);
    const canSetPosition = coverSupportsFeature(state, COVER_FEATURES.SET_POSITION);
    const canSetTilt = coverSupportsFeature(state, COVER_FEATURES.SET_TILT_POSITION);
    const unavailable = ["unavailable", "unknown"].includes(state.state);
    const moving = ["opening", "closing"].includes(state.state);
    const name = escapeHtml(friendlyName(state, this._config, "Jalousie"));
    const stateLabel = unavailable
      ? "Nicht verfügbar"
      : moving
        ? (state.state === "opening" ? "Öffnet …" : "Schließt …")
        : state.state === "stopped"
          ? "Gestoppt"
          : state.state === "closed" || state.attributes?.is_closed === true
            ? "Geschlossen"
            : state.state === "open" || state.attributes?.is_closed === false
              ? (position === null ? "Geöffnet" : `${position} % geöffnet`)
              : position === null ? "Position unbekannt" : `${position} % geöffnet`;
    const displayPosition = position === null ? `~ ${visualPosition} %` : `${position} %`;
    const appearance = normalizeCoverAppearance(this._config);
    const appearanceClass = `material-${appearance.material} texture-${appearance.texture}`;
    const appearanceStyle = appearance.color ? ` style="--ts-cover-slat-color:${appearance.color}"` : "";
    const slats = Array.from({ length: 8 }, () => "<i></i>").join("");
    const compactActions = [
      canOpen ? '<button class="action-button direction" data-cover-action="open_cover" aria-label="Öffnen"><svg class="direction-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg></button>' : "",
      canStop ? '<button class="action-button stop" data-cover-action="stop_cover" aria-label="Stoppen">■</button>' : "",
      canClose ? '<button class="action-button direction" data-cover-action="close_cover" aria-label="Schließen"><svg class="direction-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14m5.5-5.5L12 19l-5.5-5.5"/></svg></button>' : "",
    ].filter(Boolean).join("");
    const dialogActions = [
      canOpen ? '<button class="action-button" data-cover-action="open_cover">Öffnen</button>' : "",
      canStop ? '<button class="action-button stop" data-cover-action="stop_cover">Stopp</button>' : "",
      canClose ? '<button class="action-button" data-cover-action="close_cover">Schließen</button>' : "",
    ].filter(Boolean).join("");
    const positionControls = canSetPosition ? `
      <div class="range-row"><div class="range-label"><span>Geschlossen</span><output>${displayPosition}</output><span>Offen</span></div><input data-position type="range" min="0" max="100" value="${position ?? 0}" style="--range-value:${position ?? 0}%" aria-label="Öffnungsgrad"></div>
      <section class="dialog-section"><h4>Schnellpositionen</h4><div class="preset-grid">${[0, 25, 50, 100].map((value) => `<button class="choice-button" data-position-preset="${value}">${value} %</button>`).join("")}</div></section>
    ` : '<p class="capability-note">Dieser Empfänger meldet keine genaue Position. Auf, Stopp und Zu bleiben vollständig nutzbar.</p>';
    const tiltControls = canSetTilt ? `
      <section class="dialog-section"><h4>Lamellen</h4><div class="range-row"><div class="range-label"><span>Geschlossen</span><output>${tilt ?? "–"} %</output><span>Offen</span></div><input data-tilt type="range" min="0" max="100" value="${tilt ?? 0}" style="--range-value:${tilt ?? 0}%" aria-label="Lamellenposition"></div></section>
    ` : "";

    this._commitCardMarkup(`
      <style>
        ${COMMON_CARD_STYLES}
        .cover-grid { display:grid; grid-template-columns:1fr 1.25fr; gap:14px; align-items:stretch; flex:1; min-height:76px; }
        .position-copy { display:flex; flex-direction:column; justify-content:flex-end; }
        .position-number { color:var(--primary-text-color); font-size:2rem; font-weight:780; letter-spacing:-.05em; }
        .position-caption { color:var(--secondary-text-color); font-size:.72rem; }
        .window { --ts-cover-slat-color:color-mix(in srgb, var(--primary-text-color) 18%, transparent); --ts-cover-slat-texture:none; position:relative; min-height:76px; overflow:hidden; border:2px solid color-mix(in srgb, var(--primary-text-color) 32%, var(--divider-color)); border-radius:12px; background:transparent; box-shadow:inset 0 0 0 4px color-mix(in srgb, var(--card-background-color) 42%, transparent); }
        .window-frame { position:absolute; inset:6px; z-index:0; border:1px solid color-mix(in srgb, var(--primary-text-color) 24%, var(--divider-color)); border-radius:6px; background:color-mix(in srgb, var(--primary-color) 7%, transparent); overflow:hidden; }
        .window-frame::before, .window-frame::after { content:""; position:absolute; z-index:1; background:color-mix(in srgb, var(--primary-text-color) 28%, var(--divider-color)); }
        .window-frame::before { inset:0 auto 0 50%; width:1px; transform:translateX(-.5px); }
        .window-frame::after { inset:50% 0 auto; height:1px; transform:translateY(-.5px); }
        .window-glass { position:absolute; inset:0; background:linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 13%, transparent), transparent 48%, color-mix(in srgb, var(--primary-text-color) 8%, transparent)); }
        .window.material-aluminum { --ts-cover-slat-color:#b8c0c8; }
        .window.material-plastic { --ts-cover-slat-color:#eceff1; }
        .window.material-wood { --ts-cover-slat-color:#8a5a32; }
        .window.texture-brushed { --ts-cover-slat-texture:repeating-linear-gradient(90deg, rgba(255,255,255,.12) 0 1px, rgba(0,0,0,.07) 1px 3px); }
        .window.texture-ribbed { --ts-cover-slat-texture:repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0 2px, rgba(0,0,0,.08) 2px 5px); }
        .window.texture-grain { --ts-cover-slat-texture:repeating-linear-gradient(3deg, rgba(255,255,255,.09) 0 1px, transparent 1px 5px, rgba(0,0,0,.11) 5px 7px); }
        .slats { position:absolute; inset:6px; z-index:2; display:grid; grid-template-rows:repeat(8, 1fr); overflow:hidden; border-radius:6px; transform:translateY(calc(-1% * ${visualPosition})); transition:transform 260ms ease; }
        .slats i { border-bottom:1px solid color-mix(in srgb, var(--primary-text-color) 34%, transparent); background-color:var(--ts-cover-slat-color); background-image:var(--ts-cover-slat-texture); transform:perspective(80px) rotateX(calc(68deg - (${tilt ?? 50} * .68deg))); transform-origin:center; }
        .quick-actions { display:grid; grid-template-columns:repeat(auto-fit, minmax(52px, 1fr)); gap:8px; flex:1; }
        .action-button { min-height:34px; padding:7px; border-radius:9px; color:var(--primary-text-color); font-weight:760; }
        .action-button.direction { display:grid; place-items:center; border:1px solid color-mix(in srgb, var(--primary-text-color) 28%, var(--divider-color)); background:color-mix(in srgb, var(--primary-text-color) 10%, transparent); color:var(--primary-text-color); }
        .direction-icon { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2.4; }
        .action-button.direction:hover, .action-button.direction:focus-visible { border-color:var(--primary-color); background:color-mix(in srgb, var(--primary-text-color) 17%, transparent); box-shadow:0 0 0 2px color-mix(in srgb, var(--primary-color) 35%, transparent); }
        .action-button.stop { color:var(--warning-color, var(--primary-color)); }
        .cover-stage { display:grid; grid-template-columns:minmax(180px, .8fr) 1fr; gap:20px; align-items:center; }
        .large-window { aspect-ratio:1.25; min-height:220px; }
        .large-window .slats i { border-bottom-width:2px; }
        .preset-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
        .choice-button { min-height:42px; border-radius:10px; color:var(--primary-text-color); font-weight:700; }
        .capability-note { margin:0; color:var(--secondary-text-color); font-size:.78rem; line-height:1.45; }
        @media (max-width:560px) { .cover-stage { grid-template-columns:1fr; } .large-window { min-height:190px; } }
      </style>
      <ha-card>
        <div class="card-shell">
          <div class="card-header"><div class="entity-icon">${COVER_ICON}</div><div class="entity-copy"><h3 class="entity-name">${name}</h3><p class="entity-state"><span class="state-dot ${state.state === "closed" ? "off" : ""}"></span>${escapeHtml(stateLabel)}</p></div></div>
          <div class="cover-grid"><div class="position-copy"><span class="position-number" data-position-copy>${displayPosition}</span><span class="position-caption">${position === null ? "Geschätzter Öffnungsgrad" : "Öffnungsgrad"}</span></div><div class="window ${appearanceClass}"${appearanceStyle} aria-hidden="true"><div class="window-frame"><span class="window-glass"></span></div><div class="slats">${slats}</div></div></div>
          <div class="card-footer"><div class="quick-actions">${compactActions}</div><button class="detail-button" data-open-details>Details</button></div>
        </div>
      </ha-card>
      <dialog aria-label="${name} steuern">
        <div class="dialog-shell"><header class="dialog-header"><div class="entity-icon">${COVER_ICON}</div><div class="dialog-title"><h3>${name}</h3><p>${escapeHtml(stateLabel)}</p></div><button class="icon-button" data-close-dialog aria-label="Schließen">✕</button></header>
          <div class="dialog-body"><section class="cover-stage"><div class="window large-window ${appearanceClass}"${appearanceStyle} aria-hidden="true"><div class="window-frame"><span class="window-glass"></span></div><div class="slats">${slats}</div></div><div class="dialog-section"><h4>Steuerung</h4>${positionControls}<div class="quick-actions">${dialogActions}</div></div></section>
            ${tiltControls}
          </div><footer class="dialog-actions"><button data-close-dialog>Fertig</button></footer></div>
      </dialog>
    `);
    this._bindBaseEvents();
    this.shadowRoot.querySelectorAll("[data-cover-action]").forEach((button) => button.addEventListener("click", () => {
      const service = button.dataset.coverAction;
      if (service === "stop_cover") {
        this._stopVisualMotion();
        this._callService("cover", "stop_cover").catch(() => {});
        return;
      }
      const direction = service === "open_cover" ? "opening" : "closing";
      this._callService("cover", service)
        .then(() => this._startVisualMotion(direction, true))
        .catch(() => this._stopVisualMotion());
    }));
    this.shadowRoot.querySelector("[data-position]")?.addEventListener("change", (event) => this._callService("cover", "set_cover_position", { position: clampPercentage(event.target.value) }));
    this.shadowRoot.querySelectorAll("[data-position-preset]").forEach((button) => button.addEventListener("click", () => this._callService("cover", "set_cover_position", { position: Number(button.dataset.positionPreset) })));
    this.shadowRoot.querySelector("[data-tilt]")?.addEventListener("change", (event) => this._callService("cover", "set_cover_tilt_position", { tilt_position: clampPercentage(event.target.value) }));
    if (["opening", "closing"].includes(state.state) && !this._coverMotion) {
      this._startVisualMotion(state.state);
    } else {
      this._updateMotionVisual();
    }
  }

  _currentVisualPosition(state = this.stateObj, reportedPosition = readCoverPosition(state)) {
    const motion = this._coverMotion;
    return calculateCoverPosition({
      reportedPosition,
      estimatedPosition: motion?.startPosition ?? this._estimatedPosition,
      state: motion ? "" : state?.state,
      isClosed: motion ? null : state?.attributes?.is_closed,
      direction: motion?.direction || "",
      elapsedSeconds: motion ? (performance.now() - motion.startedAt) / 1000 : 0,
      openingTime: this._config?.opening_time || 30,
      closingTime: this._config?.closing_time || 30,
    });
  }

  _startVisualMotion(direction, autoStop = false) {
    const startPosition = this._currentVisualPosition();
    this._rememberEstimatedPosition(startPosition);
    this._coverMotion = { direction, startPosition, startedAt: performance.now() };
    this._clearMotionTimer();
    this._clearMotionStopTimer();
    this._motionTimer = window.setInterval(() => this._updateMotionVisual(), 100);
    if (autoStop) {
      const fullTravelTime = direction === "opening"
        ? this._config?.opening_time
        : this._config?.closing_time;
      const remainingSeconds = calculateCoverRemainingTravelTime(
        direction,
        startPosition,
        fullTravelTime
      );
      if (remainingSeconds !== null) {
        this._motionStopTimer = window.setTimeout(() => {
          this._motionStopTimer = null;
          this._callService("cover", "stop_cover")
            .catch(() => {})
            .finally(() => this._stopVisualMotion());
        }, remainingSeconds * 1000);
      }
    }
    this._updateMotionVisual();
  }

  _stopVisualMotion() {
    this._rememberEstimatedPosition(this._currentVisualPosition(), true);
    this._coverMotion = null;
    this._clearMotionTimer();
    this._clearMotionStopTimer();
    this._updateMotionVisual();
  }

  _updateMotionVisual() {
    const position = this._currentVisualPosition();
    this._rememberEstimatedPosition(position);
    this.shadowRoot.querySelectorAll(".slats").forEach((slatsElement) => {
      slatsElement.style.transform = `translateY(-${position}%)`;
    });
    const positionCopy = this.shadowRoot.querySelector("[data-position-copy]");
    if (positionCopy && readCoverPosition(this.stateObj) === null) {
      positionCopy.textContent = `~ ${position} %`;
    }
    if ((this._coverMotion?.direction === "opening" && position >= 100)
      || (this._coverMotion?.direction === "closing" && position <= 0)) {
      this._rememberEstimatedPosition(position, true);
      this._coverMotion = null;
      this._clearMotionTimer();
    }
  }

  _rememberEstimatedPosition(position, persistImmediately = false) {
    this._estimatedPosition = clampPercentage(position);
    rememberCoverPosition(this._config?.entity, this._estimatedPosition, persistImmediately);
  }

  _clearMotionTimer() {
    if (this._motionTimer !== null) window.clearInterval(this._motionTimer);
    this._motionTimer = null;
  }

  _clearMotionStopTimer() {
    if (this._motionStopTimer !== null) window.clearTimeout(this._motionStopTimer);
    this._motionStopTimer = null;
  }
}

if (!customElements.get("theme-studio-cover-card-editor")) customElements.define("theme-studio-cover-card-editor", ThemeStudioCoverCardEditor);
if (!customElements.get("theme-studio-cover-card")) customElements.define("theme-studio-cover-card", ThemeStudioCoverCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "theme-studio-cover-card")) {
  window.customCards.push({ type: "theme-studio-cover-card", name: translateThemeStudioText("Theme Studio Jalousie"), description: translateThemeStudioText("Kompakte Jalousiekarte mit visueller Position"), preview: true });
}
