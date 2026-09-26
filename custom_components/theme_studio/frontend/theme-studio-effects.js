const EFFECT_LAYER_ID = "theme-studio-effects-layer";
const THEME_STUDIO_EFFECTS_VERSION = "0.6.3";

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
const DEFAULT_LIQUID_GLASS = false;
const DEFAULT_CARD_SHAPE = "standard";
const DEFAULT_TECH_FRAME_CUT = 18;
const DEFAULT_TECH_FRAME_GLOW = 35;
const DEFAULT_TECH_FRAME_SHADOW = 28;
const DEFAULT_TECH_FRAME_BORDER_WIDTH = 2;
const DEFAULT_GLASS_BLUR = 22;
const DEFAULT_GLASS_SATURATION = 145;
const DEFAULT_GLASS_HIGHLIGHT = 42;

const EFFECT_CHECK_INTERVAL = 1200;
const GLASS_SCAN_INTERVAL = 3000;
const STARTUP_SYNC_DELAYS = [0, 40, 100, 220, 450, 800, 1400];
const MAX_PIXEL_RATIO = 2;
const CARD_INDEX_TTL = 30000;


class ThemeStudioEffects {
  constructor() {
    this.version = THEME_STUDIO_EFFECTS_VERSION;
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
    this.liquidGlass = DEFAULT_LIQUID_GLASS;
    this.cardShape = DEFAULT_CARD_SHAPE;
    this.techFrameCut = DEFAULT_TECH_FRAME_CUT;
    this.techFrameGlow = DEFAULT_TECH_FRAME_GLOW;
    this.techFrameShadow = DEFAULT_TECH_FRAME_SHADOW;
    this.techFrameBorderWidth = DEFAULT_TECH_FRAME_BORDER_WIDTH;
    this.glassBlur = DEFAULT_GLASS_BLUR;
    this.glassSaturation = DEFAULT_GLASS_SATURATION;
    this.glassHighlight = DEFAULT_GLASS_HIGHLIGHT;
    this.overlayBackground = "#182326";
    this.effectsExcludedForConfig = false;
    this.stateSnapshot = new Map();
    this.cardAnimations = new WeakMap();
    this.energyCards = new Set();
    this.climateCards = new Set();
    this.alertCards = new Set();
    this.originalCardStyles = new WeakMap();
    this.glassCards = new Set();
    this.originalGlassStyles = new WeakMap();
    this.glassHeadings = new Set();
    this.originalGlassHeadingStyles = new WeakMap();
    this.techFrameCards = new Set();
    this.originalTechFrameStyles = new WeakMap();
    this.techFrameOutlines = new WeakMap();
    this.glassLastScan = 0;
    this.overlaySurfaces = new Set();
    this.originalOverlayStyles = new WeakMap();
    this.overlayScrims = new Set();
    this.originalOverlayScrimStyles = new WeakMap();
    this.configSurface = null;
    this.originalConfigStyles = null;

    this.canvas = null;
    this.context = null;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.stars = [];
    this.pollIntervalId = null;
    this.startupSyncTimeoutIds = new Set();
    this.overlaySyncFrame = 0;
    this.overlaySyncTimeoutIds = new Set();
    this.overlayEventHandler = () => this._startOverlaySync();
    this.resizeEventHandler = () => this._resize();
    this.locationChangedEventHandler = () => {
      this.stateSnapshot.clear();
      this._invalidateCardIndex();
      this.glassLastScan = 0;
      this._readThemeSettings();
      this._startStartupSync();
    };
    this.reduceMotionEventHandler = () => this._readThemeSettings();
    this.visibilityEventHandler = () => {
      if (document.hidden) {
        this._stopStartupSync();
        this._stopPolling();
        return;
      }

      this._readThemeSettings();
      this._startStartupSync();
      this._checkCardStates();
      this._startPolling();
    };
    this.cardIndex = new Map();
    this.cardIndexBuiltAt = 0;
    this.themeComputedStyles = null;

    this.reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    this._createLayer();
    this._bindEvents();
    this._resize();
    this._readThemeSettings();
    this._startStartupSync();
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
      this.resizeEventHandler,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "location-changed",
      this.locationChangedEventHandler
    );

    window.addEventListener(
      "hass-more-info",
      this.overlayEventHandler
    );

    window.addEventListener(
      "show-dialog",
      this.overlayEventHandler
    );

    this.reduceMotionQuery.addEventListener(
      "change",
      this.reduceMotionEventHandler
    );

    document.addEventListener(
      "visibilitychange",
      this.visibilityEventHandler
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

  _startStartupSync() {
    this._stopStartupSync();

    if (document.hidden) {
      return;
    }

    for (const delay of STARTUP_SYNC_DELAYS) {
      const timeoutId = window.setTimeout(
        () => {
          this.startupSyncTimeoutIds.delete(timeoutId);
          this._readThemeSettings();

          if (this.liquidGlass || this.cardShape === "tech-frame") {
            this.glassLastScan = 0;
            this._syncLiquidGlassCards(true);
          }
        },
        delay
      );

      this.startupSyncTimeoutIds.add(timeoutId);
    }
  }

  _stopStartupSync() {
    for (const timeoutId of this.startupSyncTimeoutIds) {
      window.clearTimeout(timeoutId);
    }

    this.startupSyncTimeoutIds.clear();
  }

  _startOverlaySync() {
    this._stopOverlaySync();

    for (const delay of [0, 80]) {
      const timeoutId = window.setTimeout(
        () => {
          this.overlaySyncTimeoutIds.delete(timeoutId);
          this._scheduleMaterialSync();
        },
        delay
      );

      this.overlaySyncTimeoutIds.add(timeoutId);
    }
  }

  _scheduleMaterialSync() {
    if (
      this.overlaySyncFrame
      || (!this.liquidGlass && this.cardShape !== "tech-frame")
    ) {
      return;
    }

    this.overlaySyncFrame = window.requestAnimationFrame(() => {
      this.overlaySyncFrame = 0;
      this.glassLastScan = 0;
      this._syncLiquidGlassCards(true);
    });
  }

  _stopOverlaySync() {
    if (this.overlaySyncFrame) {
      window.cancelAnimationFrame(this.overlaySyncFrame);
      this.overlaySyncFrame = 0;
    }

    for (const timeoutId of this.overlaySyncTimeoutIds) {
      window.clearTimeout(timeoutId);
    }

    this.overlaySyncTimeoutIds.clear();
  }

  _stopDynamicSync() {
    this._stopOverlaySync();
    window.removeEventListener(
      "hass-more-info",
      this.overlayEventHandler
    );
    window.removeEventListener(
      "show-dialog",
      this.overlayEventHandler
    );
  }

  _unbindEvents() {
    window.removeEventListener("resize", this.resizeEventHandler);
    window.removeEventListener(
      "location-changed",
      this.locationChangedEventHandler
    );
    this.reduceMotionQuery.removeEventListener(
      "change",
      this.reduceMotionEventHandler
    );
    document.removeEventListener(
      "visibilitychange",
      this.visibilityEventHandler
    );
    this._stopDynamicSync();
  }

  _destroy() {
    this._unbindEvents();
    this._stopStartupSync();
    this._stopPolling();
    this._stopAnimation();
    this._clearEnergyCards();
    this._clearClimateCards();
    this._clearAlertCards();
    this._clearLiquidGlassCards();
    this._clearTechFrameCards();
    this._restoreConfigSurface();
    this.canvas?.remove();
  }

  _themeElements() {
    return [
      document.querySelector("home-assistant"),
      document.documentElement,
      document.body,
    ].filter(Boolean);
  }

  _readCssVariable(name) {
    const computedStyles = this.themeComputedStyles
      || this._themeElements().map((element) =>
        window.getComputedStyle(element)
      );

    for (const computedStyle of computedStyles) {
      const value = computedStyle
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
            /^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId)
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
    this.themeComputedStyles = this._themeElements().map((element) =>
      window.getComputedStyle(element)
    );

    try {
      this._readThemeSettingsFromComputedStyles();
    } finally {
      this.themeComputedStyles = null;
    }
  }

  _readThemeSettingsFromComputedStyles() {
    const effectsExcludedForConfig =
      this._isConfigPath();
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

    const requestedLiquidGlass =
      this._readNumberVariable(
        "--theme-studio-liquid-glass",
        DEFAULT_LIQUID_GLASS ? 1 : 0,
        0,
        1
      ) >= 0.5;

    const requestedCardShapeValue = this._readCssVariable(
      "--theme-studio-card-shape"
    );
    const requestedCardShape = requestedCardShapeValue === "tech-frame"
      ? "tech-frame"
      : DEFAULT_CARD_SHAPE;

    const requestedTechFrameCut = this._readNumberVariable(
      "--theme-studio-tech-frame-cut",
      DEFAULT_TECH_FRAME_CUT,
      6,
      34
    );

    const requestedTechFrameGlow = this._readNumberVariable(
      "--theme-studio-tech-frame-glow",
      DEFAULT_TECH_FRAME_GLOW,
      0,
      70
    );

    const requestedTechFrameShadow = this._readNumberVariable(
      "--theme-studio-tech-frame-shadow",
      DEFAULT_TECH_FRAME_SHADOW,
      0,
      50
    );

    const requestedTechFrameBorderWidth = this._readNumberVariable(
      "--theme-studio-tech-frame-border-width",
      DEFAULT_TECH_FRAME_BORDER_WIDTH,
      0,
      6
    );

    const requestedGlassBlur =
      this._readNumberVariable(
        "--theme-studio-glass-blur",
        DEFAULT_GLASS_BLUR,
        0,
        30
      );

    const requestedGlassSaturation =
      this._readNumberVariable(
        "--theme-studio-glass-saturation",
        DEFAULT_GLASS_SATURATION,
        100,
        180
      );

    const requestedGlassHighlight =
      this._readNumberVariable(
        "--theme-studio-glass-highlight",
        DEFAULT_GLASS_HIGHLIGHT,
        0,
        70
      );

    const requestedOverlayBackground =
      this._readCssVariable(
        "--theme-studio-overlay-background"
      ) || "#182326";

    const reduceMotion =
      this.reduceMotionQuery.matches;

    const nextEffect = reduceMotion || effectsExcludedForConfig
      ? "none"
      : requestedEffect;

    const nextCardEffects = reduceMotion || effectsExcludedForConfig
      ? []
      : requestedCardEffects;

    const nextLiquidGlass = effectsExcludedForConfig
      ? false
      : requestedLiquidGlass;

    const nextCardShape = nextLiquidGlass
      ? "standard"
      : requestedCardShape;

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
        this.alertBatteryLow
      || nextLiquidGlass !== this.liquidGlass
      || nextCardShape !== this.cardShape
      || requestedTechFrameCut !== this.techFrameCut
      || requestedTechFrameGlow !== this.techFrameGlow
      || requestedTechFrameShadow !== this.techFrameShadow
      || requestedTechFrameBorderWidth !== this.techFrameBorderWidth
      || requestedGlassBlur !== this.glassBlur
      || requestedGlassSaturation !== this.glassSaturation
      || requestedGlassHighlight !== this.glassHighlight
      || requestedOverlayBackground !== this.overlayBackground
      || effectsExcludedForConfig !==
        this.effectsExcludedForConfig;

    if (!changed) {
      return;
    }

    this._clearEnergyCards();
    this._clearClimateCards();
    this._clearAlertCards();
    this._clearLiquidGlassCards();
    this._clearTechFrameCards();

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
    this.liquidGlass = nextLiquidGlass;
    this.cardShape = nextCardShape;
    this.techFrameCut = requestedTechFrameCut;
    this.techFrameGlow = requestedTechFrameGlow;
    this.techFrameShadow = requestedTechFrameShadow;
    this.techFrameBorderWidth = requestedTechFrameBorderWidth;
    this.glassBlur = requestedGlassBlur;
    this.glassSaturation = requestedGlassSaturation;
    this.glassHighlight = requestedGlassHighlight;
    this.overlayBackground = requestedOverlayBackground;
    this.effectsExcludedForConfig =
      effectsExcludedForConfig;
    this.stateSnapshot.clear();

    this._applyEffect();
    this._syncConfigSurface();
    this._syncLiquidGlassCards(true);
  }

  _isConfigPath() {
    const path = window.location?.pathname || "";

    return path === "/config" || path.startsWith("/config/");
  }

  _syncConfigSurface() {
    const surface = document.querySelector("home-assistant");

    if (!this.effectsExcludedForConfig || !surface) {
      this._restoreConfigSurface();
      return;
    }

    if (this.configSurface && this.configSurface !== surface) {
      this._restoreConfigSurface();
    }

    const properties = {
      "--ha-card-background": this.overlayBackground,
      "--card-background-color": this.overlayBackground,
      "--ha-card-box-shadow": "none",
      "--ha-card-border-color": "var(--divider-color)",
      "--ha-card-border-width": "1px",
    };

    if (!this.originalConfigStyles) {
      this.originalConfigStyles = {};

      for (const property of Object.keys(properties)) {
        this.originalConfigStyles[property] = {
          value: surface.style.getPropertyValue(property),
          priority: surface.style.getPropertyPriority(property),
        };
      }
    }

    this.configSurface = surface;

    for (const [property, value] of Object.entries(properties)) {
      surface.style.setProperty(property, value, "important");
    }
  }

  _restoreConfigSurface() {
    if (!this.configSurface || !this.originalConfigStyles) {
      this.configSurface = null;
      this.originalConfigStyles = null;
      return;
    }

    for (
      const [property, original]
      of Object.entries(this.originalConfigStyles)
    ) {
      if (original.value) {
        this.configSurface.style.setProperty(
          property,
          original.value,
          original.priority
        );
      } else {
        this.configSurface.style.removeProperty(property);
      }
    }

    this.configSurface = null;
    this.originalConfigStyles = null;
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
    this._syncLiquidGlassCards();

    if (this.cardEffects.length === 0) {
      this.stateSnapshot.clear();
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

  _syncLiquidGlassCards(force = false) {
    const techFrameEnabled = this.cardShape === "tech-frame";

    if (!this.liquidGlass && !techFrameEnabled) {
      this._clearLiquidGlassCards();
      this._clearTechFrameCards();
      return;
    }

    const now = Date.now();

    if (
      !force
      && now - this.glassLastScan < GLASS_SCAN_INTERVAL
    ) {
      return;
    }

    this.glassLastScan = now;

    const currentCards = new Set();
    const currentHeadings = new Set();
    const currentOverlays = new Set();
    const currentScrims = new Set();

    this._visitElements(document, (element) => {
      if (this.liquidGlass && this._isOverlayScrimElement(element)) {
        currentScrims.add(element);
        this._styleOverlayScrim(element);
      }

      if (
        (this.liquidGlass || techFrameEnabled)
        && this._isOverlayElement(element)
      ) {
        currentOverlays.add(element);
        this._styleOverlaySurface(element);
      }

      if (element.localName !== "ha-card") {
        return;
      }

      if (this._isInsideOverlay(element)) {
        this._restoreLiquidGlassCard(element);
        this._restoreLiquidGlassHeading(element);

        if (this.liquidGlass) {
          this._restoreTechFrameCard(element);
          return;
        }
      }

      if (this._isHeadingCard(element)) {
        this._restoreLiquidGlassCard(element);
        this._restoreTechFrameCard(element);

        if (this.liquidGlass) {
          currentHeadings.add(element);
          this._styleLiquidGlassHeading(element);
        } else {
          this._restoreLiquidGlassHeading(element);
        }
        return;
      }

      this._restoreLiquidGlassHeading(element);
      currentCards.add(element);

      if (this.liquidGlass) {
        this._restoreTechFrameCard(element);
        this._styleLiquidGlassCard(element);
      } else {
        this._restoreLiquidGlassCard(element);
        this._styleTechFrameCard(element);
      }
    });

    for (const card of this.glassCards) {
      if (!currentCards.has(card) || !card.isConnected) {
        this._restoreLiquidGlassCard(card);
      }
    }

    this.glassCards = this.liquidGlass
      ? currentCards
      : new Set();

    for (const card of this.techFrameCards) {
      if (!currentCards.has(card) || !card.isConnected) {
        this._restoreTechFrameCard(card);
      }
    }

    this.techFrameCards = techFrameEnabled
      ? currentCards
      : new Set();

    for (const heading of this.glassHeadings) {
      if (!currentHeadings.has(heading) || !heading.isConnected) {
        this._restoreLiquidGlassHeading(heading);
      }
    }

    this.glassHeadings = currentHeadings;

    for (const overlay of this.overlaySurfaces) {
      if (!currentOverlays.has(overlay) || !overlay.isConnected) {
        this._restoreOverlaySurface(overlay);
      }
    }

    this.overlaySurfaces = currentOverlays;

    for (const scrim of this.overlayScrims) {
      if (!currentScrims.has(scrim) || !scrim.isConnected) {
        this._restoreOverlayScrim(scrim);
      }
    }

    this.overlayScrims = currentScrims;
  }

  _isOverlayScrimElement(element) {
    const classes = String(element?.className || "")
      .split(/\s+/);

    return (
      classes.includes("mdc-dialog__scrim")
      || classes.includes("scrim")
      || element?.getAttribute?.("part") === "scrim"
    );
  }

  _isHeadingCard(card) {
    let current = card;

    while (current) {
      const name = String(current.localName || "");

      if (
        name === "hui-heading-card"
        || name === "ha-heading-card"
        || name.endsWith("-heading-card")
      ) {
        return true;
      }

      let config;

      try {
        config = current._config || current.config;
      } catch (_error) {
        config = null;
      }

      if (config?.type === "heading") {
        return true;
      }

      if (current.parentElement) {
        current = current.parentElement;
        continue;
      }

      current = current.getRootNode?.()?.host || null;
    }

    return false;
  }

  _styleOverlayScrim(element) {
    if (!this.originalOverlayScrimStyles.has(element)) {
      const properties = [
        "background-color",
        "opacity",
        "backdrop-filter",
        "-webkit-backdrop-filter",
      ];
      const originals = {};

      for (const property of properties) {
        originals[property] = {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        };
      }

      this.originalOverlayScrimStyles.set(element, originals);
    }

    element.style.setProperty(
      "background-color",
      "rgba(0, 0, 0, 0.12)",
      "important"
    );
    element.style.setProperty("opacity", "1", "important");
    element.style.setProperty(
      "backdrop-filter",
      "blur(2px) saturate(110%)",
      "important"
    );
    element.style.setProperty(
      "-webkit-backdrop-filter",
      "blur(2px) saturate(110%)",
      "important"
    );
  }

  _restoreOverlayScrim(element) {
    const originals =
      this.originalOverlayScrimStyles.get(element);

    if (!originals) {
      return;
    }

    for (const [property, original] of Object.entries(originals)) {
      if (original.value) {
        element.style.setProperty(
          property,
          original.value,
          original.priority
        );
      } else {
        element.style.removeProperty(property);
      }
    }

    this.originalOverlayScrimStyles.delete(element);
    this.overlayScrims.delete(element);
  }

  _clearOverlayScrims() {
    for (const scrim of Array.from(this.overlayScrims)) {
      this._restoreOverlayScrim(scrim);
    }

    this.overlayScrims.clear();
  }

  _isOverlayElement(element) {
    const name = String(element?.localName || "");
    const classes = String(element?.className || "")
      .split(/\s+/);

    return (
      name === "dialog"
      || name === "ha-dialog"
      || name === "ha-more-info-dialog"
      || name.startsWith("hui-dialog-")
      || name.startsWith("more-info-")
      || classes.includes("mdc-dialog__surface")
      || element?.getAttribute?.("role") === "dialog"
      || element?.getAttribute?.("aria-modal") === "true"
    );
  }

  _isInsideOverlay(element) {
    let current = element;

    while (current) {
      if (this._isOverlayElement(current)) {
        return true;
      }

      if (current.parentElement) {
        current = current.parentElement;
        continue;
      }

      current = current.getRootNode?.()?.host || null;
    }

    return false;
  }

  _styleOverlaySurface(element) {
    const backgroundVariables = [
      "--ha-card-background",
      "--card-background-color",
      "--ha-dialog-surface-background",
      "--mdc-dialog-surface-color",
      "--mdc-theme-surface",
    ];
    const properties = [
      ...backgroundVariables,
      "position",
      "clip-path",
      "border-radius",
      "overflow",
      "isolation",
      "background",
      "background-color",
      "box-shadow",
      "--theme-studio-tech-frame-shape",
    ];

    if (!this.originalOverlayStyles.has(element)) {
      const originals = {};

      for (const property of properties) {
        originals[property] = {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        };
      }

      this.originalOverlayStyles.set(element, originals);
    }

    for (const property of backgroundVariables) {
      element.style.setProperty(
        property,
        this.overlayBackground,
        "important"
      );
    }

    if (
      this.cardShape === "tech-frame"
      && this._isOverlayVisualSurface(element)
    ) {
      this._styleTechFrameOverlaySurface(element);
    }
  }

  _isOverlayVisualSurface(element) {
    const classes = String(element?.className || "")
      .split(/\s+/);

    return classes.includes("mdc-dialog__surface")
      || element?.localName === "dialog";
  }

  _styleTechFrameOverlaySurface(element) {
    const cut = this.techFrameCut;
    const polygon = [
      `0 ${cut}px`,
      `${cut}px 0`,
      "calc(100% - 48px) 0",
      "calc(100% - 36px) 10px",
      "100% 10px",
      `100% calc(100% - ${cut}px)`,
      `calc(100% - ${cut}px) 100%`,
      "26px 100%",
      "12px calc(100% - 10px)",
      "0 calc(100% - 10px)",
    ].join(", ");

    this._ensureTechFrameStyle(element.getRootNode?.());
    element.style.setProperty("position", "relative", "important");
    element.style.setProperty("clip-path", "none", "important");
    element.style.setProperty("border-radius", "0", "important");
    element.style.setProperty("overflow", "visible", "important");
    element.style.setProperty("isolation", "isolate", "important");
    element.style.setProperty("background", "transparent", "important");
    element.style.setProperty("background-color", "transparent", "important");
    element.style.setProperty("box-shadow", "none", "important");
    element.style.setProperty(
      "--theme-studio-tech-frame-shape",
      `polygon(${polygon})`
    );
    element.setAttribute("data-theme-studio-tech-frame-overlay", "");
    this._syncTechFrameOutline(element, cut);
  }

  _restoreOverlaySurface(element) {
    const originals = this.originalOverlayStyles.get(element);

    if (!originals) {
      return;
    }

    for (const [property, original] of Object.entries(originals)) {
      if (original.value) {
        element.style.setProperty(
          property,
          original.value,
          original.priority
        );
      } else {
        element.style.removeProperty(property);
      }
    }

    this.originalOverlayStyles.delete(element);
    this.overlaySurfaces.delete(element);
    this.techFrameOutlines.get(element)?.svg?.remove();
    this.techFrameOutlines.delete(element);
    for (const outline of element.querySelectorAll?.(
      ":scope > svg[data-theme-studio-tech-frame-outline]"
    ) || []) {
      outline.remove();
    }
    element.removeAttribute("data-theme-studio-tech-frame-overlay");
  }

  _clearOverlaySurfaces() {
    for (const overlay of Array.from(this.overlaySurfaces)) {
      this._restoreOverlaySurface(overlay);
    }

    this.overlaySurfaces.clear();
    this._clearOverlayScrims();
  }

  _styleLiquidGlassCard(card) {
    if (!this.originalGlassStyles.has(card)) {
      this.originalGlassStyles.set(card, {
        backdropFilter: card.style.getPropertyValue("backdrop-filter"),
        backdropFilterPriority:
          card.style.getPropertyPriority("backdrop-filter"),
        webkitBackdropFilter:
          card.style.getPropertyValue("-webkit-backdrop-filter"),
        webkitBackdropFilterPriority:
          card.style.getPropertyPriority("-webkit-backdrop-filter"),
        backgroundImage: card.style.getPropertyValue("background-image"),
        backgroundImagePriority:
          card.style.getPropertyPriority("background-image"),
      });
    }

    const filter =
      `blur(${this.glassBlur}px) `
      + `saturate(${this.glassSaturation}%)`;
    const highlight = this.glassHighlight / 100;
    const gradient =
      "linear-gradient(145deg, "
      + `rgba(255, 255, 255, ${highlight}) 0%, `
      + `rgba(255, 255, 255, ${highlight * 0.28}) 36%, `
      + "rgba(255, 255, 255, 0) 62%, "
      + "rgba(0, 0, 0, 0.08) 100%)";

    if (
      typeof CSS === "undefined"
      || CSS.supports("backdrop-filter", "blur(1px)")
    ) {
      card.style.setProperty("backdrop-filter", filter, "important");
    }

    if (
      typeof CSS === "undefined"
      || CSS.supports("-webkit-backdrop-filter", "blur(1px)")
    ) {
      card.style.setProperty(
        "-webkit-backdrop-filter",
        filter,
        "important"
      );
    }

    card.style.setProperty("background-image", gradient, "important");
  }

  _styleLiquidGlassHeading(heading) {
    const properties = [
      "background",
      "background-color",
      "background-image",
      "backdrop-filter",
      "-webkit-backdrop-filter",
      "border-color",
      "box-shadow",
    ];

    if (!this.originalGlassHeadingStyles.has(heading)) {
      const originals = {};

      for (const property of properties) {
        originals[property] = {
          value: heading.style.getPropertyValue(property),
          priority: heading.style.getPropertyPriority(property),
        };
      }

      this.originalGlassHeadingStyles.set(heading, originals);
    }

    heading.style.setProperty("background", "transparent", "important");
    heading.style.setProperty(
      "background-color",
      "transparent",
      "important"
    );
    heading.style.setProperty("background-image", "none", "important");
    heading.style.setProperty("backdrop-filter", "none", "important");
    heading.style.setProperty(
      "-webkit-backdrop-filter",
      "none",
      "important"
    );
    heading.style.setProperty("border-color", "transparent", "important");
    heading.style.setProperty("box-shadow", "none", "important");
  }

  _restoreLiquidGlassHeading(heading) {
    const originals = this.originalGlassHeadingStyles.get(heading);

    if (!originals) {
      return;
    }

    for (const [property, original] of Object.entries(originals)) {
      if (original.value) {
        heading.style.setProperty(
          property,
          original.value,
          original.priority
        );
      } else {
        heading.style.removeProperty(property);
      }
    }

    this.originalGlassHeadingStyles.delete(heading);
    this.glassHeadings.delete(heading);
  }

  _restoreLiquidGlassCard(card) {
    const original = this.originalGlassStyles.get(card);

    if (!original) {
      return;
    }

    const restore = (property, value, priority) => {
      if (value) {
        card.style.setProperty(property, value, priority);
      } else {
        card.style.removeProperty(property);
      }
    };

    restore(
      "backdrop-filter",
      original.backdropFilter,
      original.backdropFilterPriority
    );
    restore(
      "-webkit-backdrop-filter",
      original.webkitBackdropFilter,
      original.webkitBackdropFilterPriority
    );
    restore(
      "background-image",
      original.backgroundImage,
      original.backgroundImagePriority
    );

    this.originalGlassStyles.delete(card);
    this.glassCards.delete(card);
  }

  _clearLiquidGlassCards() {
    for (const card of Array.from(this.glassCards)) {
      this._restoreLiquidGlassCard(card);
    }

    this.glassCards.clear();

    for (const heading of Array.from(this.glassHeadings)) {
      this._restoreLiquidGlassHeading(heading);
    }

    this.glassHeadings.clear();
    this._clearOverlaySurfaces();
  }

  _styleTechFrameCard(card) {
    const properties = [
      "clip-path",
      "border-radius",
      "border-style",
      "border-width",
      "border-color",
      "filter",
      "overflow",
      "isolation",
      "--theme-studio-tech-frame-shape",
      "--theme-studio-tech-frame-border-width",
    ];

    if (!this.originalTechFrameStyles.has(card)) {
      const originals = {};

      for (const property of properties) {
        originals[property] = {
          value: card.style.getPropertyValue(property),
          priority: card.style.getPropertyPriority(property),
        };
      }

      this.originalTechFrameStyles.set(card, originals);
    }

    this._ensureTechFrameStyle(card.getRootNode?.());
    card.setAttribute("data-theme-studio-tech-frame", "");

    const cut = this.techFrameCut;
    const glow = Math.round(this.techFrameGlow / 7);
    const polygon = [
      `0 ${cut}px`,
      `${cut}px 0`,
      "calc(100% - 48px) 0",
      "calc(100% - 36px) 10px",
      "100% 10px",
      `100% calc(100% - ${cut}px)`,
      `calc(100% - ${cut}px) 100%`,
      "26px 100%",
      "12px calc(100% - 10px)",
      "0 calc(100% - 10px)",
    ].join(", ");

    card.style.setProperty("clip-path", `polygon(${polygon})`, "important");
    card.style.setProperty(
      "--theme-studio-tech-frame-shape",
      `polygon(${polygon})`
    );
    card.style.setProperty(
      "--theme-studio-tech-frame-border-width",
      `${this.techFrameBorderWidth}px`
    );
    card.style.setProperty("border-radius", "0", "important");
    card.style.setProperty("border-style", "solid", "important");
    card.style.setProperty("border-width", "0", "important");
    card.style.setProperty("border-color", "var(--primary-color)", "important");
    card.style.setProperty("overflow", "hidden", "important");
    card.style.setProperty("isolation", "isolate", "important");
    this._syncTechFrameOutline(card, cut);
    const frame = [];
    const shadow = this.techFrameShadow;

    if (shadow > 0) {
      const shadowY = Math.max(1, Math.round(shadow / 8));
      const shadowBlur = Math.max(2, Math.round(shadow / 2));
      frame.push(
        `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.42))`
      );
    }

    if (glow > 0) {
      frame.push(
        `drop-shadow(0 0 ${glow}px color-mix(in srgb, var(--theme-studio-tech-frame-border-color) 58%, transparent))`
      );
    }

    card.style.setProperty(
      "filter",
      frame.length > 0 ? frame.join(" ") : "none",
      "important"
    );

    this.techFrameCards.add(card);
  }

  _syncTechFrameOutline(card, cut) {
    const namespace = "http://www.w3.org/2000/svg";
    let outline = this.techFrameOutlines.get(card);

    if (!outline?.svg?.isConnected) {
      const existingSvg = card.querySelector?.(
        ":scope > svg[data-theme-studio-tech-frame-outline]"
      );
      const existingPolygon = existingSvg?.querySelector("polygon");

      if (existingSvg && existingPolygon) {
        outline = { svg: existingSvg, polygon: existingPolygon };
        this.techFrameOutlines.set(card, outline);
      }
    }

    if (!outline?.svg?.isConnected) {
      const svg = document.createElementNS(namespace, "svg");
      const polygon = document.createElementNS(namespace, "polygon");

      svg.setAttribute("data-theme-studio-tech-frame-outline", "");
      svg.setAttribute("aria-hidden", "true");
      Object.assign(svg.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "2",
      });
      polygon.setAttribute("fill", "none");
      polygon.setAttribute("stroke-linejoin", "round");
      polygon.setAttribute("vector-effect", "non-scaling-stroke");
      polygon.style.stroke =
        "var(--theme-studio-tech-frame-border-color)";
      svg.appendChild(polygon);
      card.appendChild(svg);
      outline = { svg, polygon };
      this.techFrameOutlines.set(card, outline);
    }

    for (const duplicate of card.querySelectorAll?.(
      ":scope > svg[data-theme-studio-tech-frame-outline]"
    ) || []) {
      if (duplicate !== outline.svg) {
        duplicate.remove();
      }
    }

    const rect = card.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const inset = Math.max(0.5, this.techFrameBorderWidth / 2);
    const left = inset;
    const top = inset;
    const right = Math.max(left, width - inset);
    const bottom = Math.max(top, height - inset);
    const points = [
      [left, Math.min(bottom, cut)],
      [Math.min(right, cut), top],
      [Math.max(left, width - 48), top],
      [Math.max(left, width - 36), Math.min(bottom, 10)],
      [right, Math.min(bottom, 10)],
      [right, Math.max(top, height - cut)],
      [Math.max(left, width - cut), bottom],
      [Math.min(right, 26), bottom],
      [Math.min(right, 12), Math.max(top, height - 10)],
      [left, Math.max(top, height - 10)],
    ].map((point) => point.join(",")).join(" ");

    outline.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    outline.svg.setAttribute("preserveAspectRatio", "none");
    outline.polygon.setAttribute("points", points);
    outline.polygon.setAttribute(
      "stroke-width",
      String(this.techFrameBorderWidth)
    );
  }

  _ensureTechFrameStyle(root) {
    if (!root?.querySelector || !root?.appendChild) {
      return;
    }

    let style = root.querySelector(
      "style[data-theme-studio-tech-frame-style]"
    );

    if (
      style?.getAttribute("data-theme-studio-tech-frame-version")
      === THEME_STUDIO_EFFECTS_VERSION
    ) {
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-theme-studio-tech-frame-style", "");
    }

    style.setAttribute(
      "data-theme-studio-tech-frame-version",
      THEME_STUDIO_EFFECTS_VERSION
    );
    style.textContent = `
      ha-card[data-theme-studio-tech-frame] {
        position: relative !important;
      }

      ha-card[data-theme-studio-tech-frame]::after {
        position: absolute;
        top: 0;
        right: 18px;
        width: 38%;
        height: 2px;
        content: "";
        background: var(--theme-studio-tech-frame-border-color);
        box-shadow:
          0 0 10px var(--theme-studio-tech-frame-border-color);
        pointer-events: none;
        z-index: 3;
      }

      [data-theme-studio-tech-frame-overlay]::before {
        position: absolute;
        inset: 0;
        content: "";
        background: var(--ha-dialog-surface-background);
        clip-path: var(--theme-studio-tech-frame-shape);
        pointer-events: none;
        z-index: 0;
      }

      [data-theme-studio-tech-frame-overlay]
        > :not(svg[data-theme-studio-tech-frame-outline]) {
        position: relative;
        z-index: 1;
      }
    `;
    if (!style.isConnected) {
      root.appendChild(style);
    }
  }

  _restoreTechFrameCard(card) {
    const originals = this.originalTechFrameStyles.get(card);

    if (!originals) {
      return;
    }

    for (const [property, original] of Object.entries(originals)) {
      if (original.value) {
        card.style.setProperty(property, original.value, original.priority);
      } else {
        card.style.removeProperty(property);
      }
    }

    this.originalTechFrameStyles.delete(card);
    this.techFrameCards.delete(card);
    this.techFrameOutlines.get(card)?.svg?.remove();
    this.techFrameOutlines.delete(card);
    for (const outline of card.querySelectorAll?.(
      ":scope > svg[data-theme-studio-tech-frame-outline]"
    ) || []) {
      outline.remove();
    }
    card.removeAttribute("data-theme-studio-tech-frame");
  }

  _clearTechFrameCards() {
    for (const card of Array.from(this.techFrameCards)) {
      this._restoreTechFrameCard(card);
    }

    this.techFrameCards.clear();
  }

  _collectChangedPulseEntities(hass) {
    const entries = this.pulseEntities.length === 0
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

      const previousRevision = this.stateSnapshot.get(entityId);

      if (
        this.stateSnapshot.size > 0
        && previousRevision !== undefined
        && previousRevision !== revision
      ) {
        changedEntities.push([entityId, stateObject]);
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

    if (
      typeof element.entity === "string"
      && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(element.entity)
    ) {
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
      if (/^[a-z0-9_]+\.[a-z0-9_]+$/.test(value)) {
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

    this._drawStars(
      context,
      frameTime,
      elapsed
    );
    this._drawEdgeGlow(context, frameTime);
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
  const current = window.themeStudioEffects;

  if (current?.version === THEME_STUDIO_EFFECTS_VERSION) {
    return;
  }

  if (current) {
    if (typeof current._destroy === "function") {
      current._destroy();
    } else {
      current._stopStartupSync?.();
      current._stopDynamicSync?.();
      current._stopPolling?.();
      current._stopAnimation?.();
      current._clearEnergyCards?.();
      current._clearClimateCards?.();
      current._clearAlertCards?.();
      current._clearLiquidGlassCards?.();
      current._clearTechFrameCards?.();
      current._restoreConfigSurface?.();
      current.canvas?.remove?.();
    }

    current._startPolling = () => {};
    current._startStartupSync = () => {};
    current._readThemeSettings = () => {};
    current._checkCardStates = () => {};
    current._invalidateCardIndex = () => {};
    current._resize = () => {};
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
