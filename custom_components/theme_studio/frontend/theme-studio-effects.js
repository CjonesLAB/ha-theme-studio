const EFFECT_LAYER_ID = "theme-studio-effects-layer";

const DEFAULT_EFFECT = "none";
const DEFAULT_MOTION = 35;
const DEFAULT_GLOW = 35;
const DEFAULT_CARD_EFFECTS = [];
const DEFAULT_CARD_INTENSITY = 55;
const DEFAULT_PULSE_ENTITIES = [];
const DEFAULT_ENERGY_ENTITIES = [];
const DEFAULT_ENERGY_WARNING = 500;
const DEFAULT_ENERGY_CRITICAL = 2000;
const DEFAULT_CLIMATE_ENTITIES = [];
const DEFAULT_CLIMATE_COMFORT_MIN = 19;
const DEFAULT_CLIMATE_COMFORT_MAX = 24;
const DEFAULT_CLIMATE_HOT = 28;
const DEFAULT_ALERT_ENTITIES = [];
const DEFAULT_ALERT_BATTERY_LOW = 20;

const EFFECT_CHECK_INTERVAL = 1200;
const MAX_PIXEL_RATIO = 2;

// Rebuilding the entity->card index walks the full (shadow) DOM tree, so it
// is cached and only rebuilt on navigation or after this TTL, instead of on
// every 1.2s check.
const CARD_INDEX_TTL = 30000;

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_-]+$/;


class ThemeStudioEffects {
  constructor() {
    this.effect = DEFAULT_EFFECT;
    this.motion = DEFAULT_MOTION;
    this.glow = DEFAULT_GLOW;
    this.cardEffects = [...DEFAULT_CARD_EFFECTS];
    this.cardIntensity = DEFAULT_CARD_INTENSITY;
    this.pulseEntities = [...DEFAULT_PULSE_ENTITIES];
    this.energyEntities = [...DEFAULT_ENERGY_ENTITIES];
    this.energyWarning = DEFAULT_ENERGY_WARNING;
    this.energyCritical = DEFAULT_ENERGY_CRITICAL;
    this.climateEntities = [
      ...DEFAULT_CLIMATE_ENTITIES,
    ];
    this.climateComfortMin =
      DEFAULT_CLIMATE_COMFORT_MIN;
    this.climateComfortMax =
      DEFAULT_CLIMATE_COMFORT_MAX;
    this.climateHot = DEFAULT_CLIMATE_HOT;
    this.alertEntities = [...DEFAULT_ALERT_ENTITIES];
    this.alertBatteryLow = DEFAULT_ALERT_BATTERY_LOW;
    this.stateSnapshot = new Map();
    this.cardAnimations = new WeakMap();
    this.energyCards = new Set();
    this.climateCards = new Set();
    this.alertCards = new Set();
    this.originalCardStyles = new WeakMap();

    this.canvas = null;
    this.context = null;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.stars = [];

    this.pollIntervalId = null;
    this.cardIndex = new Map();
    this.cardIndexBuiltAt = 0;

    this.reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    this._createLayer();
    this._bindEvents();
    this._resize();
    this._readThemeSettings();
  }

  _createLayer() {
    const oldLayer =
      document.getElementById(EFFECT_LAYER_ID);

    if (oldLayer) {
      oldLayer.remove();
    }

    this.canvas = document.createElement("canvas");
    this.canvas.id = EFFECT_LAYER_ID;
    this.canvas.setAttribute("aria-hidden", "true");

    Object.assign(this.canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2",
      opacity: "0",
      transition: "opacity 400ms ease",
    });

    document.body.appendChild(this.canvas);

    this.context = this.canvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );
  }

  _bindEvents() {
    window.addEventListener(
      "resize",
      () => this._resize(),
      {
        passive: true,
      }
    );

    window.addEventListener(
      "location-changed",
      () => {
        this.stateSnapshot.clear();
        this._invalidateCardIndex();
        this._readThemeSettings();
      }
    );

    this.reduceMotionQuery.addEventListener(
      "change",
      () => this._readThemeSettings()
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          this._stopPolling();
          return;
        }

        this._readThemeSettings();
        this._checkCardStates();
        this._startPolling();
      }
    );

    this._startPolling();
  }

  _startPolling() {
    if (
      this.pollIntervalId !== null
      || document.hidden
    ) {
      return;
    }

    this.pollIntervalId = window.setInterval(
      () => {
        this._readThemeSettings();
        this._checkCardStates();
      },
      EFFECT_CHECK_INTERVAL
    );
  }

  _stopPolling() {
    if (this.pollIntervalId === null) {
      return;
    }

    window.clearInterval(this.pollIntervalId);
    this.pollIntervalId = null;
  }

  _themeElements() {
    return [
      document.querySelector("home-assistant"),
      document.documentElement,
      document.body,
    ].filter(Boolean);
  }

  _readCssVariable(name) {
    for (const element of this._themeElements()) {
      const value = window
        .getComputedStyle(element)
        .getPropertyValue(name)
        .trim()
        .replace(/^["']|["']$/g, "");

      if (value) {
        return value;
      }
    }

    return "";
  }

  _readNumberVariable(
    name,
    fallback,
    minimum,
    maximum
  ) {
    const rawValue = this._readCssVariable(name);
    const parsedValue = Number.parseFloat(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    return Math.min(
      maximum,
      Math.max(minimum, parsedValue)
    );
  }

  _readEntityListVariable(name) {
    const value = this._readCssVariable(name);

    if (!value) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .split(",")
          .map((entityId) => entityId.trim())
          .filter((entityId) =>
            ENTITY_ID_PATTERN.test(entityId)
          )
      )
    );
  }

  _readCardEffectListVariable(name) {
    const allowedEffects = new Set([
      "status-pulse",
      "energy-flow",
      "climate-aura",
      "alert-focus",
    ]);

    return this._readCssVariable(name)
      .split(",")
      .map((effect) => effect.trim())
      .filter((effect, index, effects) =>
        allowedEffects.has(effect)
        && effects.indexOf(effect) === index
      );
  }

  _readThemeSettings() {
    const requestedEffect =
      this._readCssVariable(
        "--theme-studio-effect"
      ) || DEFAULT_EFFECT;

    const requestedMotion =
      this._readNumberVariable(
        "--theme-studio-motion",
        DEFAULT_MOTION,
        0,
        100
      );

    const requestedGlow =
      this._readNumberVariable(
        "--theme-studio-glow",
        DEFAULT_GLOW,
        0,
        100
      );

    const requestedCardEffects =
      this._readCardEffectListVariable(
        "--theme-studio-card-effects"
      );

    const requestedCardIntensity =
      this._readNumberVariable(
        "--theme-studio-card-intensity",
        DEFAULT_CARD_INTENSITY,
        0,
        100
      );

    const requestedPulseEntities =
      this._readEntityListVariable(
        "--theme-studio-pulse-entities"
      );

    const requestedEnergyEntities =
      this._readEntityListVariable(
        "--theme-studio-energy-entities"
      );

    const requestedEnergyWarning =
      this._readNumberVariable(
        "--theme-studio-energy-warning",
        DEFAULT_ENERGY_WARNING,
        0,
        999999
      );

    const requestedEnergyCritical =
      this._readNumberVariable(
        "--theme-studio-energy-critical",
        DEFAULT_ENERGY_CRITICAL,
        1,
        1000000
      );

    const requestedClimateEntities =
      this._readEntityListVariable(
        "--theme-studio-climate-entities"
      );

    const requestedClimateComfortMin =
      this._readNumberVariable(
        "--theme-studio-climate-comfort-min",
        DEFAULT_CLIMATE_COMFORT_MIN,
        -50,
        99
      );

    const requestedClimateComfortMax =
      this._readNumberVariable(
        "--theme-studio-climate-comfort-max",
        DEFAULT_CLIMATE_COMFORT_MAX,
        -49,
        100
      );

    const requestedClimateHot =
      this._readNumberVariable(
        "--theme-studio-climate-hot",
        DEFAULT_CLIMATE_HOT,
        -48,
        120
      );

    const requestedAlertEntities =
      this._readEntityListVariable(
        "--theme-studio-alert-entities"
      );

    const requestedAlertBatteryLow =
      this._readNumberVariable(
        "--theme-studio-alert-battery-low",
        DEFAULT_ALERT_BATTERY_LOW,
        1,
        100
      );

    const reduceMotion =
      this.reduceMotionQuery.matches;

    const nextEffect = reduceMotion
      ? "none"
      : requestedEffect;

    const nextCardEffects = reduceMotion
      ? []
      : requestedCardEffects;

    const changed =
      nextEffect !== this.effect
      || requestedMotion !== this.motion
      || requestedGlow !== this.glow
      || nextCardEffects.join(",") !==
        this.cardEffects.join(",")
      || requestedCardIntensity !==
        this.cardIntensity
      || requestedPulseEntities.join(",") !==
        this.pulseEntities.join(",")
      || requestedEnergyEntities.join(",") !==
        this.energyEntities.join(",")
      || requestedEnergyWarning !== this.energyWarning
      || requestedEnergyCritical !==
        this.energyCritical
      || requestedClimateEntities.join(",") !==
        this.climateEntities.join(",")
      || requestedClimateComfortMin !==
        this.climateComfortMin
      || requestedClimateComfortMax !==
        this.climateComfortMax
      || requestedClimateHot !== this.climateHot
      || requestedAlertEntities.join(",") !==
        this.alertEntities.join(",")
      || requestedAlertBatteryLow !==
        this.alertBatteryLow;

    if (!changed) {
      return;
    }

    this._clearEnergyCards();
    this._clearClimateCards();
    this._clearAlertCards();

    this.effect = nextEffect;
    this.motion = requestedMotion;
    this.glow = requestedGlow;
    this.cardEffects = nextCardEffects;
    this.cardIntensity = requestedCardIntensity;
    this.pulseEntities = requestedPulseEntities;
    this.energyEntities = requestedEnergyEntities;
    this.energyWarning = requestedEnergyWarning;
    this.energyCritical = Math.max(
      requestedEnergyWarning + 1,
      requestedEnergyCritical
    );
    this.climateEntities = requestedClimateEntities;
    this.climateComfortMin =
      requestedClimateComfortMin;
    this.climateComfortMax = Math.max(
      requestedClimateComfortMin + 1,
      requestedClimateComfortMax
    );
    this.climateHot = Math.max(
      this.climateComfortMax + 1,
      requestedClimateHot
    );
    this.alertEntities = requestedAlertEntities;
    this.alertBatteryLow = requestedAlertBatteryLow;
    this.stateSnapshot.clear();

    this._applyEffect();
  }

  _applyEffect() {
    this._stopAnimation();
    this._clearCanvas();

    if (this.effect === "space-command") {
      this.canvas.style.opacity = "1";
      this._createStars();
      this._startAnimation();
      return;
    }

    this.canvas.style.opacity = "0";
  }

  _getHass() {
    return document
      .querySelector("home-assistant")
      ?.hass;
  }

  _checkCardStates() {
    // Nothing is configured to react to state changes: skip touching
    // hass.states entirely instead of scanning it every 1.2s for no reason.
    if (this.cardEffects.length === 0) {
      return;
    }

    const hass = this._getHass();

    if (!hass?.states) {
      return;
    }

    if (this.cardEffects.includes("energy-flow")) {
      this._updateEnergyFlow(hass);
    } else {
      this._clearEnergyCards();
    }

    if (this.cardEffects.includes("climate-aura")) {
      this._updateClimateAura(hass);
    } else {
      this._clearClimateCards();
    }

    if (this.cardEffects.includes("alert-focus")) {
      this._updateAlertFocus(hass);
    } else {
      this._clearAlertCards();
    }

    if (!this.cardEffects.includes("status-pulse")) {
      this.stateSnapshot.clear();
      return;
    }

    for (
      const [entityId, stateObject]
      of this._collectChangedPulseEntities(hass)
    ) {
      this._pulseEntityCards(
        entityId,
        stateObject
      );
    }
  }

  _collectChangedPulseEntities(hass) {
    // Status Pulse is the only effect that needs revision tracking. When it
    // targets specific entities (the UI requires at least one), only those
    // are read instead of the full hass.states object, which can hold
    // thousands of entries on larger installations. An empty list is a
    // legacy "watch everything" mode kept for backward compatibility.
    const watchAllStates = this.pulseEntities.length === 0;

    const entries = watchAllStates
      ? Object.entries(hass.states)
      : this.pulseEntities
          .map((entityId) => [entityId, hass.states[entityId]])
          .filter(([, stateObject]) => Boolean(stateObject));

    const nextSnapshot = new Map();
    const changedEntities = [];

    for (const [entityId, stateObject] of entries) {
      const revision =
        stateObject.last_updated
        || stateObject.last_changed
        || stateObject.state;

      nextSnapshot.set(entityId, revision);

      const previousRevision =
        this.stateSnapshot.get(entityId);

      if (
        this.stateSnapshot.size > 0
        && previousRevision !== undefined
        && previousRevision !== revision
      ) {
        changedEntities.push([
          entityId,
          stateObject,
        ]);
      }
    }

    this.stateSnapshot = nextSnapshot;
    return changedEntities;
  }

  _pulseEntityCards(entityId, stateObject) {
    const cards = this._findCardsForEntity(entityId);

    if (cards.size === 0) {
      return;
    }

    const color =
      this._statusColor(stateObject);

    for (const card of cards) {
      this._animateCard(card, color);
    }
  }

  _updateEnergyFlow(hass) {
    if (this.energyEntities.length === 0) {
      this._clearEnergyCards();
      return;
    }

    const cardStates = new Map();

    for (const entityId of this.energyEntities) {
      const stateObject = hass.states[entityId];

      if (!stateObject) {
        continue;
      }

      const watts = this._powerInWatts(stateObject);
      const color = Number.isFinite(watts)
        ? this._energyColor(watts)
        : "#8a929d";

      const severity = Number.isFinite(watts)
        ? watts / this.energyCritical
        : -1;

      const cards =
        this._findCardsForEntity(entityId);

      for (const card of cards) {
        const previous = cardStates.get(card);

        if (!previous || severity > previous.severity) {
          cardStates.set(card, {
            color,
            watts,
            severity,
          });
        }
      }
    }

    const cards = new Set(cardStates.keys());

    for (const oldCard of this.energyCards) {
      if (
        !cards.has(oldCard)
        && !this.climateCards.has(oldCard)
        && !this.alertCards.has(oldCard)
      ) {
        this._restoreEnergyCard(oldCard);
      }
    }

    this.energyCards = cards;

    for (const [card, cardState] of cardStates) {
      this._styleEnergyCard(
        card,
        cardState.color,
        cardState.watts
      );
    }
  }

  _powerInWatts(stateObject) {
    const value = Number.parseFloat(
      stateObject.state
    );

    if (!Number.isFinite(value)) {
      return Number.NaN;
    }

    const unit = String(
      stateObject.attributes
        ?.unit_of_measurement || "W"
    ).trim().toLowerCase();

    if (unit === "kw") {
      return value * 1000;
    }

    if (unit === "mw") {
      return value * 1000000;
    }

    return value;
  }

  _updateClimateAura(hass) {
    if (this.climateEntities.length === 0) {
      this._clearClimateCards();
      return;
    }

    const cardStates = new Map();

    for (const entityId of this.climateEntities) {
      const stateObject = hass.states[entityId];

      if (!stateObject) {
        continue;
      }

      const reading = Number.parseFloat(
        stateObject.state
      );

      const climateState =
        this._climateState(stateObject, reading);

      const cards =
        this._findCardsForEntity(entityId);

      for (const card of cards) {
        const previous = cardStates.get(card);

        if (
          !previous
          || climateState.severity > previous.severity
        ) {
          cardStates.set(card, climateState);
        }
      }
    }

    const cards = new Set(cardStates.keys());

    for (const oldCard of this.climateCards) {
      if (
        !cards.has(oldCard)
        && !this.energyCards.has(oldCard)
        && !this.alertCards.has(oldCard)
      ) {
        this._restoreEnergyCard(oldCard);
      }
    }

    this.climateCards = cards;

    for (const [card, climateState] of cardStates) {
      this._styleEnergyCard(
        card,
        climateState.color,
        climateState.value
      );
    }
  }

  _climateState(stateObject, reading) {
    if (!Number.isFinite(reading)) {
      return {
        color: "#8a929d",
        severity: -1,
        value: Number.NaN,
      };
    }

    const deviceClass = String(
      stateObject.attributes?.device_class || ""
    ).toLowerCase();

    if (deviceClass === "humidity") {
      return this._humidityState(reading);
    }

    return this._temperatureState(
      this._temperatureInCelsius(
        reading,
        stateObject.attributes
          ?.unit_of_measurement
      )
    );
  }

  _temperatureInCelsius(value, unit) {
    const normalizedUnit = String(unit || "°C")
      .trim()
      .toLowerCase();

    if (
      normalizedUnit === "°f"
      || normalizedUnit === "f"
    ) {
      return (value - 32) * 5 / 9;
    }

    return value;
  }

  _temperatureState(value) {
    const minimum = this.climateComfortMin;
    const maximum = this.climateComfortMax;
    const hot = this.climateHot;

    if (value < minimum) {
      const severity = Math.min(
        1,
        (minimum - value) / 8
      );

      return {
        color: this._mixColor(
          "#45d483",
          "#4f9dff",
          severity
        ),
        severity,
        value,
      };
    }

    if (value <= maximum) {
      return {
        color: "#45d483",
        severity: 0,
        value,
      };
    }

    if (value < hot) {
      const ratio =
        (value - maximum) / (hot - maximum);

      return {
        color: this._mixColor(
          "#f2d64b",
          "#ff9f32",
          ratio
        ),
        severity: 0.4 + ratio * 0.4,
        value,
      };
    }

    return {
      color: "#ff3b4f",
      severity: 1 + (value - hot) / 10,
      value,
    };
  }

  _humidityState(value) {
    if (value < 30) {
      return {
        color: "#ff9f32",
        severity: 0.7 + (30 - value) / 30,
        value,
      };
    }

    if (value <= 60) {
      return {
        color: "#45d483",
        severity: 0,
        value,
      };
    }

    if (value < 70) {
      return {
        color: "#54c8ff",
        severity: 0.35,
        value,
      };
    }

    if (value < 80) {
      const ratio = (value - 70) / 10;

      return {
        color: this._mixColor(
          "#ff9f32",
          "#ff3b4f",
          ratio
        ),
        severity: 0.7 + ratio * 0.3,
        value,
      };
    }

    return {
      color: "#ff3b4f",
      severity: 1 + (value - 80) / 20,
      value,
    };
  }

  _updateAlertFocus(hass) {
    if (this.alertEntities.length === 0) {
      this._clearAlertCards();
      return;
    }

    const cardStates = new Map();

    for (const entityId of this.alertEntities) {
      const stateObject = hass.states[entityId];

      if (!stateObject) {
        continue;
      }

      const alertState = this._alertState(
        entityId,
        stateObject
      );

      if (!alertState) {
        continue;
      }

      for (const card of this._findCardsForEntity(entityId)) {
        const previous = cardStates.get(card);

        if (!previous || alertState.severity > previous.severity) {
          cardStates.set(card, alertState);
        }
      }
    }

    const cards = new Set(cardStates.keys());

    for (const oldCard of this.alertCards) {
      if (
        !cards.has(oldCard)
        && !this.energyCards.has(oldCard)
        && !this.climateCards.has(oldCard)
      ) {
        this._restoreEnergyCard(oldCard);
      }
    }

    this.alertCards = cards;

    for (const [card, alertState] of cardStates) {
      this._styleEnergyCard(
        card,
        alertState.color,
        alertState.value
      );
    }
  }

  _alertState(entityId, stateObject) {
    const state = String(stateObject.state).toLowerCase();
    const domain = entityId.split(".")[0];
    const deviceClass = String(
      stateObject.attributes?.device_class || ""
    ).toLowerCase();
    const unavailable = ["unknown", "unavailable"].includes(state);

    if (unavailable) {
      return {
        color: "#8a929d",
        severity: 0.5,
        value: Number.NaN,
      };
    }

    const numericValue = Number.parseFloat(state);
    const isBattery =
      deviceClass === "battery"
      || (
        domain === "sensor"
        && String(
          stateObject.attributes?.unit_of_measurement || ""
        ).trim() === "%"
        && entityId.includes("battery")
      );

    if (isBattery && Number.isFinite(numericValue)) {
      if (numericValue <= Math.max(5, this.alertBatteryLow / 2)) {
        return {
          color: "#ff3b4f",
          severity: 2,
          value: numericValue,
        };
      }

      if (numericValue <= this.alertBatteryLow) {
        return {
          color: "#ff9f32",
          severity: 1,
          value: numericValue,
        };
      }

      return null;
    }

    if (domain === "alarm_control_panel") {
      if (state === "triggered") {
        return { color: "#ff3b4f", severity: 3, value: Number.NaN };
      }

      if (["arming", "pending"].includes(state)) {
        return { color: "#ff9f32", severity: 1.5, value: Number.NaN };
      }

      return null;
    }

    if (domain === "lock") {
      return ["unlocked", "open", "opening"].includes(state)
        ? { color: "#ff9f32", severity: 1.5, value: Number.NaN }
        : null;
    }

    const criticalClasses = [
      "smoke",
      "gas",
      "carbon_monoxide",
      "moisture",
      "problem",
      "safety",
    ];

    if (
      criticalClasses.includes(deviceClass)
      && ["on", "detected", "unsafe", "problem"].includes(state)
    ) {
      return { color: "#ff3b4f", severity: 3, value: Number.NaN };
    }

    const accessClasses = [
      "door",
      "window",
      "opening",
      "garage_door",
    ];

    if (
      accessClasses.includes(deviceClass)
      && ["on", "open", "opening"].includes(state)
    ) {
      return { color: "#ff9f32", severity: 1, value: Number.NaN };
    }

    return null;
  }

  _energyColor(watts) {
    const warning = this.energyWarning;
    const critical = this.energyCritical;

    if (watts <= warning) {
      const ratio = warning > 0
        ? Math.max(0, watts) / warning
        : 1;

      return this._mixColor(
        "#45d483",
        "#f2d64b",
        ratio
      );
    }

    if (watts < critical) {
      const ratio =
        (watts - warning)
        / (critical - warning);

      if (ratio < 0.5) {
        return this._mixColor(
          "#f2d64b",
          "#ff9f32",
          ratio * 2
        );
      }

      return this._mixColor(
        "#ff9f32",
        "#ff3b4f",
        (ratio - 0.5) * 2
      );
    }

    return "#ff3b4f";
  }

  _mixColor(start, end, amount) {
    const clamped = Math.min(
      1,
      Math.max(0, amount)
    );

    const startRgb = this._hexToRgb(start);
    const endRgb = this._hexToRgb(end);

    const mixed = [0, 1, 2].map((index) =>
      Math.round(
        startRgb[index]
        + (endRgb[index] - startRgb[index])
        * clamped
      )
    );

    return `rgb(${mixed.join(", ")})`;
  }

  _hexToRgb(color) {
    const value = color.replace("#", "");

    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
    ];
  }

  _styleEnergyCard(card, color, watts) {
    if (!this.originalCardStyles.has(card)) {
      this.originalCardStyles.set(card, {
        outline: card.style.outline,
        outlineOffset: card.style.outlineOffset,
        boxShadow: card.style.boxShadow,
        transition: card.style.transition,
        primaryColor:
          card.style.getPropertyValue("--primary-color"),
        iconColor:
          card.style.getPropertyValue("--state-icon-color"),
        activeIconColor:
          card.style.getPropertyValue(
            "--state-icon-active-color"
          ),
      });
    }

    const intensity = this.cardIntensity / 100;
    const width = 1 + intensity * 2.5;
    const glow = 7 + intensity * 24;

    card.style.transition = [
      "outline-color 450ms ease",
      "box-shadow 450ms ease",
      "color 450ms ease",
    ].join(", ");

    card.style.outline =
      `${width}px solid ${color}`;
    card.style.outlineOffset = "1px";
    card.style.boxShadow =
      `0 0 ${glow}px color-mix(`
      + `in srgb, ${color} 68%, transparent)`;

    card.style.setProperty(
      "--primary-color",
      color
    );
    card.style.setProperty(
      "--state-icon-color",
      color
    );
    card.style.setProperty(
      "--state-icon-active-color",
      color
    );

    card.dataset.themeStudioEnergy =
      Number.isFinite(watts)
        ? Math.round(watts).toString()
        : "unavailable";
  }

  _clearEnergyCards() {
    for (const card of this.energyCards) {
      if (
        !this.climateCards.has(card)
        && !this.alertCards.has(card)
      ) {
        this._restoreEnergyCard(card);
      }
    }

    this.energyCards.clear();
  }

  _clearClimateCards() {
    for (const card of this.climateCards) {
      if (
        !this.energyCards.has(card)
        && !this.alertCards.has(card)
      ) {
        this._restoreEnergyCard(card);
      }
    }

    this.climateCards.clear();
  }

  _clearAlertCards() {
    for (const card of this.alertCards) {
      if (
        !this.energyCards.has(card)
        && !this.climateCards.has(card)
      ) {
        this._restoreEnergyCard(card);
      }
    }

    this.alertCards.clear();
  }

  _restoreEnergyCard(card) {
    const original =
      this.originalCardStyles.get(card);

    if (!original) {
      return;
    }

    card.style.outline = original.outline;
    card.style.outlineOffset = original.outlineOffset;
    card.style.boxShadow = original.boxShadow;
    card.style.transition = original.transition;

    this._restoreCustomProperty(
      card,
      "--primary-color",
      original.primaryColor
    );
    this._restoreCustomProperty(
      card,
      "--state-icon-color",
      original.iconColor
    );
    this._restoreCustomProperty(
      card,
      "--state-icon-active-color",
      original.activeIconColor
    );

    delete card.dataset.themeStudioEnergy;
    this.originalCardStyles.delete(card);
  }

  _restoreCustomProperty(element, name, value) {
    if (value) {
      element.style.setProperty(name, value);
      return;
    }

    element.style.removeProperty(name);
  }

  _findCardsForEntity(entityId) {
    this._ensureCardIndex();
    return this.cardIndex.get(entityId) || new Set();
  }

  _invalidateCardIndex() {
    this.cardIndex.clear();
    this.cardIndexBuiltAt = 0;
  }

  _ensureCardIndex() {
    const now = Date.now();

    if (
      this.cardIndexBuiltAt !== 0
      && now - this.cardIndexBuiltAt < CARD_INDEX_TTL
    ) {
      return;
    }

    this._buildCardIndex();
    this.cardIndexBuiltAt = now;
  }

  // Walking the full (shadow) DOM tree is the expensive part of card
  // lookups, so it happens once per rebuild and indexes every entity a card
  // references, rather than once per configured entity per 1.2s check.
  _buildCardIndex() {
    this.cardIndex.clear();

    this._visitElements(
      document,
      (element) => {
        const entityIds = this._entityIdsForElement(element);

        if (entityIds.size === 0) {
          return;
        }

        const card = this._findOwningCard(element);

        if (!card) {
          return;
        }

        for (const entityId of entityIds) {
          let cards = this.cardIndex.get(entityId);

          if (!cards) {
            cards = new Set();
            this.cardIndex.set(entityId, cards);
          }

          cards.add(card);
        }
      }
    );
  }

  _visitElements(root, callback) {
    if (!root?.querySelectorAll) {
      return;
    }

    for (const element of root.querySelectorAll("*")) {
      callback(element);

      if (element.shadowRoot) {
        this._visitElements(
          element.shadowRoot,
          callback
        );
      }
    }
  }

  _entityIdsForElement(element) {
    const entityIds = new Set();

    if (typeof element.entity === "string") {
      entityIds.add(element.entity);
    }

    const candidates = [];

    try {
      candidates.push(element._config);
    } catch (_error) {
      // Some custom elements expose guarded properties.
    }

    try {
      candidates.push(element.config);
    } catch (_error) {
      // Some custom elements expose guarded properties.
    }

    for (const candidate of candidates) {
      this._collectConfigEntityIds(
        candidate,
        0,
        entityIds
      );
    }

    return entityIds;
  }

  _collectConfigEntityIds(value, depth, into) {
    if (typeof value === "string") {
      if (ENTITY_ID_PATTERN.test(value)) {
        into.add(value);
      }
      return;
    }

    if (
      value === null
      || value === undefined
      || depth > 3
    ) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this._collectConfigEntityIds(
          item,
          depth + 1,
          into
        );
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const keys = [
      "entity",
      "entity_id",
      "entities",
      "cards",
      "card",
    ];

    for (const key of keys) {
      if (key in value) {
        this._collectConfigEntityIds(
          value[key],
          depth + 1,
          into
        );
      }
    }
  }

  _findOwningCard(element) {
    if (element.localName === "ha-card") {
      return element;
    }

    const ownCard = element.shadowRoot
      ?.querySelector("ha-card");

    if (ownCard) {
      return ownCard;
    }

    let current = element;

    while (current) {
      if (current.localName === "ha-card") {
        return current;
      }

      if (current.parentElement) {
        current = current.parentElement;
        continue;
      }

      const root = current.getRootNode?.();

      current = root?.host || null;
    }

    return null;
  }

  _statusColor(stateObject) {
    const state = String(
      stateObject?.state || ""
    ).toLowerCase();

    const deviceClass = String(
      stateObject?.attributes?.device_class || ""
    ).toLowerCase();

    const criticalClasses = new Set([
      "carbon_monoxide",
      "gas",
      "moisture",
      "problem",
      "safety",
      "smoke",
    ]);

    if (
      state === "unavailable"
      || state === "unknown"
    ) {
      return "#8a929d";
    }

    if (
      criticalClasses.has(deviceClass)
      && state === "on"
    ) {
      return "#ff3b4f";
    }

    if (
      [
        "alarm",
        "detected",
        "jammed",
        "open",
        "opening",
        "triggered",
        "unlocked",
      ].includes(state)
    ) {
      return "#ffad1f";
    }

    if (
      [
        "on",
        "home",
        "playing",
        "heat",
        "cool",
      ].includes(state)
    ) {
      return "#45d483";
    }

    if (
      [
        "off",
        "closed",
        "locked",
        "idle",
        "standby",
      ].includes(state)
    ) {
      return "#54c8ff";
    }

    return (
      this._readCssVariable("--primary-color")
      || "#26b2b3"
    );
  }

  _animateCard(card, color) {
    const oldAnimation =
      this.cardAnimations.get(card);

    oldAnimation?.cancel();

    const intensity =
      this.cardIntensity / 100;

    const outlineWidth =
      1 + intensity * 3;

    const glowSize =
      8 + intensity * 28;

    const duration =
      700 + intensity * 900;

    const baseBoxShadow =
      window.getComputedStyle(card).boxShadow;

    const animation = card.animate(
      [
        {
          outlineColor: color,
          outlineStyle: "solid",
          outlineWidth: "0px",
          outlineOffset: "0px",
          boxShadow: baseBoxShadow,
        },
        {
          outlineColor: color,
          outlineStyle: "solid",
          outlineWidth: `${outlineWidth}px`,
          outlineOffset: "2px",
          boxShadow:
            `0 0 ${glowSize}px ${color}`,
          offset: 0.28,
        },
        {
          outlineColor: color,
          outlineStyle: "solid",
          outlineWidth: `${outlineWidth * 0.65}px`,
          outlineOffset: "1px",
          boxShadow:
            `0 0 ${glowSize * 0.6}px ${color}`,
          offset: 0.68,
        },
        {
          outlineColor: color,
          outlineStyle: "solid",
          outlineWidth: "0px",
          outlineOffset: "0px",
          boxShadow: baseBoxShadow,
        },
      ],
      {
        duration,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );

    this.cardAnimations.set(card, animation);

    animation.addEventListener(
      "finish",
      () => {
        if (
          this.cardAnimations.get(card) === animation
        ) {
          this.cardAnimations.delete(card);
        }
      },
      {
        once: true,
      }
    );
  }

  _resize() {
    if (!this.canvas || !this.context) {
      return;
    }

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_PIXEL_RATIO
    );

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width =
      Math.round(width * pixelRatio);

    this.canvas.height =
      Math.round(height * pixelRatio);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.context.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0
    );

    this.width = width;
    this.height = height;

    if (this.effect === "space-command") {
      this._createStars();
    }
  }

  _createStars() {
    const area =
      Math.max(
        1,
        this.width * this.height
      );

    const density =
      35 + this.motion * 0.65;

    const starCount = Math.round(
      Math.min(
        180,
        Math.max(
          45,
          area / 15000 * density / 50
        )
      )
    );

    this.stars = Array.from(
      {
        length: starCount,
      },
      () => this._newStar(true)
    );
  }

  _newStar(randomY = false) {
    return {
      x: Math.random() * this.width,
      y: randomY
        ? Math.random() * this.height
        : -10,
      size: 0.45 + Math.random() * 1.25,
      speed: 0.08 + Math.random() * 0.24,
      alpha: 0.2 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      color:
        Math.random() > 0.82
          ? "80, 225, 255"
          : "220, 242, 255",
    };
  }

  _startAnimation() {
    this.lastFrameTime = performance.now();

    const animate = (frameTime) => {
      if (this.effect !== "space-command") {
        return;
      }

      const elapsed = Math.min(
        40,
        frameTime - this.lastFrameTime
      );

      this.lastFrameTime = frameTime;

      this._drawSpaceCommand(
        frameTime,
        elapsed
      );

      this.animationFrame =
        window.requestAnimationFrame(animate);
    };

    this.animationFrame =
      window.requestAnimationFrame(animate);
  }

  _stopAnimation() {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }
  }

  _clearCanvas() {
    if (!this.context) {
      return;
    }

    this.context.clearRect(
      0,
      0,
      this.width,
      this.height
    );
  }

  _drawSpaceCommand(
    frameTime,
    elapsed
  ) {
    const context = this.context;

    context.clearRect(
      0,
      0,
      this.width,
      this.height
    );

    this._drawGrid(context);
    this._drawStars(
      context,
      frameTime,
      elapsed
    );
    this._drawEdgeGlow(context, frameTime);
  }

  _drawGrid(context) {
    const gridOpacity =
      0.015 + this.glow / 5000;

    context.save();
    context.strokeStyle =
      `rgba(80, 225, 255, ${gridOpacity})`;
    context.lineWidth = 1;

    const gridSize = 64;

    for (
      let x = 0;
      x <= this.width;
      x += gridSize
    ) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
      context.stroke();
    }

    for (
      let y = 0;
      y <= this.height;
      y += gridSize
    ) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }

    context.restore();
  }

  _drawStars(
    context,
    frameTime,
    elapsed
  ) {
    const speedMultiplier =
      0.25 + this.motion / 45;

    const glowMultiplier =
      0.3 + this.glow / 100;

    for (let index = 0; index < this.stars.length; index += 1) {
      const star = this.stars[index];

      star.y +=
        star.speed
        * elapsed
        * speedMultiplier;

      star.x -=
        star.speed
        * elapsed
        * speedMultiplier
        * 0.16;

      if (
        star.y > this.height + 12
        || star.x < -12
      ) {
        this.stars[index] =
          this._newStar(false);
        continue;
      }

      const pulse =
        0.7
        + Math.sin(
          frameTime / 900 + star.phase
        ) * 0.3;

      const alpha =
        star.alpha * pulse;

      context.save();
      context.beginPath();
      context.fillStyle =
        `rgba(${star.color}, ${alpha})`;

      context.shadowColor =
        `rgba(${star.color}, ${
          alpha * glowMultiplier
        })`;

      context.shadowBlur =
        3 + this.glow / 12;

      context.arc(
        star.x,
        star.y,
        star.size,
        0,
        Math.PI * 2
      );

      context.fill();
      context.restore();
    }
  }

  _drawEdgeGlow(
    context,
    frameTime
  ) {
    const pulse =
      0.65
      + Math.sin(frameTime / 1800) * 0.2;

    const opacity =
      (this.glow / 100)
      * 0.12
      * pulse;

    if (opacity <= 0) {
      return;
    }

    const gradient =
      context.createLinearGradient(
        0,
        0,
        this.width,
        this.height
      );

    gradient.addColorStop(
      0,
      `rgba(38, 178, 179, ${opacity})`
    );

    gradient.addColorStop(
      0.5,
      "rgba(38, 178, 179, 0)"
    );

    gradient.addColorStop(
      1,
      `rgba(47, 111, 163, ${opacity})`
    );

    context.fillStyle = gradient;

    context.fillRect(
      0,
      0,
      this.width,
      this.height
    );
  }
}


function startThemeStudioEffects() {
  if (window.themeStudioEffects) {
    return;
  }

  window.themeStudioEffects =
    new ThemeStudioEffects();
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startThemeStudioEffects,
    {
      once: true,
    }
  );
} else {
  startThemeStudioEffects();
}
