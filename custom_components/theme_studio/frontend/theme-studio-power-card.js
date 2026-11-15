import {
  COMMON_CARD_STYLES,
  ThemeStudioCardBase,
  ThemeStudioEntityCardEditor,
  energyPeriodLabel,
  escapeHtml,
  findRelatedSensor,
  formatNumber,
  friendlyName,
  normalizeCardConfig,
  normalizeOptionalEntityId,
  readNumericAttribute,
  translateThemeStudioText,
} from "./theme-studio-card-base.js?v=0.11.0";

const PLUG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 7V3h-2v4h-4V3H8v4H6v5a6 6 0 0 0 5 5.91V22h2v-4.09A6 6 0 0 0 18 12V7h-2Z"/></svg>`;

class ThemeStudioPowerCardEditor extends ThemeStudioEntityCardEditor {
  constructor() {
    super("switch", [
      { key: "power_entity", label: "Leistungssensor (optional)", domains: ["sensor"], deviceClasses: ["power"], units: ["W", "kW"] },
      { key: "energy_entity", label: "Energiesensor (optional)", domains: ["sensor"], deviceClasses: ["energy"], units: ["Wh", "kWh", "MWh"] },
      { key: "voltage_entity", label: "Spannungssensor (optional)", domains: ["sensor"], deviceClasses: ["voltage"], units: ["mV", "V", "kV"] },
      { key: "current_entity", label: "Stromsensor (optional)", domains: ["sensor"], deviceClasses: ["current"], units: ["mA", "A"] },
      { key: "power_factor_entity", label: "Leistungsfaktor-Sensor (optional)", domains: ["sensor"], deviceClasses: ["power_factor"] },
    ]);
  }
}

class ThemeStudioPowerCard extends ThemeStudioCardBase {
  constructor() {
    super();
    this._samples = [];
    this._lastSample = null;
  }

  static getConfigElement() { return document.createElement("theme-studio-power-card-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith("switch."));
    return {
      type: "custom:theme-studio-power-card",
      entity: entity || "switch.steckdose",
      grid_options: { columns: 6, rows: 3 },
      theme_studio_layout_initialized: true,
    };
  }
  getGridOptions() { return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 }; }
  getCardSize() { return 3; }

  setConfig(config) {
    const base = normalizeCardConfig(config, "switch");
    this._config = {
      ...base,
      power_entity: normalizeOptionalEntityId(config.power_entity, "sensor"),
      energy_entity: normalizeOptionalEntityId(config.energy_entity, "sensor"),
      voltage_entity: normalizeOptionalEntityId(config.voltage_entity, "sensor"),
      current_entity: normalizeOptionalEntityId(config.current_entity, "sensor"),
      power_factor_entity: normalizeOptionalEntityId(config.power_factor_entity, "sensor"),
    };
    this._renderPreservingDialog();
  }

  _watchedEntityIds() {
    return [
      this._config?.entity,
      this._config?.power_entity,
      this._config?.energy_entity,
      this._config?.voltage_entity,
      this._config?.current_entity,
      this._config?.power_factor_entity,
      this._resolvedPowerEntity,
      this._resolvedEnergyEntity,
      this._resolvedVoltageEntity,
      this._resolvedCurrentEntity,
      this._resolvedPowerFactorEntity,
    ].filter(Boolean);
  }

  _sensorValue(entity, attributes, names, fallback = 0) {
    const sensor = entity ? this._hass?.states?.[entity] : null;
    const direct = Number(sensor?.state);
    if (Number.isFinite(direct)) return direct;
    return readNumericAttribute({ attributes }, names, fallback);
  }

  _sensorUnit(entity, fallback) {
    return escapeHtml(
      this._hass?.states?.[entity]?.attributes?.unit_of_measurement || fallback
    );
  }

  render() {
    if (!this._config) return this._missingCard("Schaltbare Steckdose auswählen");
    const state = this.stateObj;
    if (!state) return this._missingCard("Steckdosen-Entität nicht gefunden");
    const isOn = state.state === "on";
    const unavailable = ["unavailable", "unknown"].includes(state.state);
    this._resolvedPowerEntity = this._config.power_entity || findRelatedSensor(
      this._hass,
      this._config.entity,
      { deviceClasses: ["power"], units: ["W", "kW"], suffixes: ["power", "current_power", "active_power"] }
    );
    this._resolvedEnergyEntity = this._config.energy_entity || findRelatedSensor(
      this._hass,
      this._config.entity,
      { deviceClasses: ["energy"], units: ["Wh", "kWh"], suffixes: ["energy_today", "today_energy", "energy"] }
    );
    this._resolvedVoltageEntity = this._config.voltage_entity || findRelatedSensor(
      this._hass,
      this._config.entity,
      { deviceClasses: ["voltage"], units: ["mV", "V", "kV"], suffixes: ["voltage", "voltage_v"] }
    );
    this._resolvedCurrentEntity = this._config.current_entity || findRelatedSensor(
      this._hass,
      this._config.entity,
      { deviceClasses: ["current"], units: ["mA", "A"], suffixes: ["current", "current_a"] }
    );
    this._resolvedPowerFactorEntity = this._config.power_factor_entity || findRelatedSensor(
      this._hass,
      this._config.entity,
      { deviceClasses: ["power_factor"], suffixes: ["power_factor", "powerfactor"] }
    );
    const power = Math.max(0, this._sensorValue(this._resolvedPowerEntity, state.attributes, ["power", "current_power_w", "active_power", "load_power"]));
    const energyAttributes = ["energy_today", "today_energy", "energy"];
    const energy = Math.max(0, this._sensorValue(this._resolvedEnergyEntity, state.attributes, energyAttributes));
    const directEnergyAttribute = energyAttributes.find((name) => (
      Number.isFinite(Number(state.attributes?.[name]))
    ));
    const energyLabel = energyPeriodLabel({
      entityId: this._resolvedEnergyEntity,
      state: this._resolvedEnergyEntity
        ? this._hass?.states?.[this._resolvedEnergyEntity]
        : state,
      attributeNames: this._resolvedEnergyEntity ? [] : [directEnergyAttribute],
    });
    const powerUnit = this._sensorUnit(this._resolvedPowerEntity, "W");
    const energyUnit = this._sensorUnit(this._resolvedEnergyEntity, "kWh");
    const voltage = this._sensorValue(this._resolvedVoltageEntity, state.attributes, ["voltage", "voltage_v"], NaN);
    const current = this._sensorValue(this._resolvedCurrentEntity, state.attributes, ["current", "current_a"], NaN);
    const factor = this._sensorValue(this._resolvedPowerFactorEntity, state.attributes, ["power_factor"], NaN);
    const voltageUnit = this._sensorUnit(this._resolvedVoltageEntity, "V");
    const currentUnit = this._sensorUnit(this._resolvedCurrentEntity, "A");
    const factorUnit = this._sensorUnit(this._resolvedPowerFactorEntity, "");
    const name = escapeHtml(friendlyName(state, this._config, "Steckdose"));
    if (this._lastSample !== power) {
      this._samples = [...this._samples.slice(-17), power];
      this._lastSample = power;
    }
    const sampleMax = Math.max(1, ...this._samples);
    const bars = Array.from({ length: 18 }, (_, index) => {
      const value = this._samples[index] ?? 0;
      const height = Math.max(8, Math.round((value / sampleMax) * 100));
      return `<i style="--bar:${height}%"></i>`;
    }).join("");

    this._commitCardMarkup(`
      <style>
        ${COMMON_CARD_STYLES}
        .entity-icon.on { color: var(--primary-color); box-shadow: 0 0 22px color-mix(in srgb, var(--primary-color) 34%, transparent); }
        .power-grid { position:relative; display:grid; grid-template-columns:1fr 1.15fr; align-items:end; gap:14px; flex:1; }
        .power-number { color:var(--primary-text-color); font-size:2rem; font-weight:780; letter-spacing:-.05em; }
        .power-unit { margin-left:4px; color:var(--secondary-text-color); font-size:.8rem; font-weight:700; }
        .energy-copy { margin-top:3px; color:var(--secondary-text-color); font-size:.72rem; }
        .spark-bars { display:flex; height:52px; align-items:end; gap:3px; }
        .spark-bars i { width:100%; height:var(--bar); min-height:4px; border-radius:4px 4px 1px 1px; background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 42%, transparent)); }
        .live-label { display:flex; align-items:center; gap:7px; color:var(--secondary-text-color); font-size:.7rem; }
        .pulse { width:7px; height:7px; border-radius:50%; background:var(--success-color, var(--primary-color)); box-shadow:0 0 12px var(--success-color, var(--primary-color)); }
        .metric-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; }
        .metric { min-height:72px; padding:12px; border:1px solid var(--divider-color); border-radius:12px; background:color-mix(in srgb, var(--primary-text-color) 4%, transparent); }
        .metric span { display:block; color:var(--secondary-text-color); font-size:.72rem; }
        .metric strong { display:block; margin-top:6px; color:var(--primary-text-color); font-size:1.18rem; }
        .large-chart { display:flex; height:132px; align-items:end; gap:6px; padding:14px 8px 0; border-bottom:1px solid var(--divider-color); }
        .large-chart i { flex:1; height:var(--bar); min-height:5px; border-radius:6px 6px 2px 2px; background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 30%, transparent)); }
      </style>
      <ha-card>
        <div class="card-shell">
          <div class="card-header"><div class="entity-icon ${isOn ? "on" : ""}">${PLUG_ICON}</div><div class="entity-copy"><h3 class="entity-name">${name}</h3><p class="entity-state"><span class="state-dot ${isOn ? "" : "off"}"></span>${unavailable ? "Nicht verfügbar" : isOn ? "Eingeschaltet" : "Ausgeschaltet"}</p></div><button class="toggle" data-toggle aria-label="Steckdose umschalten" aria-pressed="${isOn}" ${unavailable ? "disabled" : ""}></button></div>
          <div class="power-grid"><div><span class="power-number">${formatNumber(power)}</span><span class="power-unit">${powerUnit}</span><div class="energy-copy">${energyLabel} ${formatNumber(energy, 2)} ${energyUnit}</div></div><div class="spark-bars" aria-label="Leistungsverlauf">${bars}</div></div>
          <div class="card-footer"><span class="live-label">${isOn ? '<i class="pulse"></i>Live-Verbrauch' : "Kein aktiver Verbrauch"}</span><button class="detail-button" data-open-details>Analyse</button></div>
        </div>
      </ha-card>
      <dialog aria-label="${name} analysieren">
        <div class="dialog-shell"><header class="dialog-header"><div class="entity-icon ${isOn ? "on" : ""}">${PLUG_ICON}</div><div class="dialog-title"><h3>${name}</h3><p>Energie und Gerätestatus</p></div><button class="toggle" data-dialog-toggle aria-label="Steckdose umschalten" aria-pressed="${isOn}"></button><button class="icon-button" data-close-dialog aria-label="Schließen">✕</button></header>
          <div class="dialog-body"><section class="dialog-section"><h4>Momentanleistung</h4><div><span class="power-number">${formatNumber(power)}</span><span class="power-unit">${powerUnit}</span></div><div class="large-chart">${bars}</div></section>
            <section class="metric-grid"><div class="metric"><span>${energyLabel === "Heute" ? "Energie heute" : "Gesamtenergie"}</span><strong>${formatNumber(energy, 2)} ${energyUnit}</strong></div><div class="metric"><span>Spannung</span><strong>${formatNumber(voltage)}${voltageUnit ? ` ${voltageUnit}` : ""}</strong></div><div class="metric"><span>Stromstärke</span><strong>${formatNumber(current, 2)}${currentUnit ? ` ${currentUnit}` : ""}</strong></div><div class="metric"><span>Leistungsfaktor</span><strong>${formatNumber(factor, 2)}${factorUnit ? ` ${factorUnit}` : ""}</strong></div></section>
          </div><footer class="dialog-actions"><button data-close-dialog>Fertig</button></footer></div>
      </dialog>
    `);
    this._bindBaseEvents();
    this.shadowRoot.querySelector("[data-toggle]")?.addEventListener("click", () => this._callService("switch", "toggle"));
    this.shadowRoot.querySelector("[data-dialog-toggle]")?.addEventListener("click", () => this._callService("switch", "toggle"));
  }
}

if (!customElements.get("theme-studio-power-card-editor")) customElements.define("theme-studio-power-card-editor", ThemeStudioPowerCardEditor);
if (!customElements.get("theme-studio-power-card")) customElements.define("theme-studio-power-card", ThemeStudioPowerCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "theme-studio-power-card")) {
  window.customCards.push({ type: "theme-studio-power-card", name: translateThemeStudioText("Theme Studio Energie-Steckdose"), description: translateThemeStudioText("Steckdose mit Leistung und Energieanalyse"), preview: true });
}
