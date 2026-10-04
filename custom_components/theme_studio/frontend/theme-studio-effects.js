const EFFECT_LAYER_ID = "theme-studio-effects-layer";
const THEME_STUDIO_EFFECTS_VERSION = "0.8.2-beta.5";

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
const DEFAULT_EXPERT_CSS_ENABLED = false;
const DEFAULT_EXPERT_CSS = "";
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
const STARTUP_SYNC_DELAYS = [
  0, 40, 100, 180, 280, 400, 550, 750,
  1000, 1300, 1600, 1900, 2200, 2500,
  2800, 3200,
];
const EXPERT_CSS_STARTUP_SYNC_DELAYS = new Set([
  0,
  100,
  400,
  1000,
  2200,
]);
const MAX_PIXEL_RATIO = 2;
const CARD_INDEX_TTL = 30000;
const DASHBOARD_LAYOUT_NAMES = new Set([
  "hui-masonry-view",
  "hui-sections-view",
  "hui-panel-view",
  "hui-view",
]);
const DASHBOARD_LAYOUT_IDS = new Set([
  "columns",
  "grid",
  "root",
  "sections",
]);
const DASHBOARD_LAYOUT_CLASSES = new Set([
  "cards",
  "column",
  "columns",
  "grid",
  "section",
  "sections",
]);
const DASHBOARD_EDITOR_STORAGE_KEY = "theme-studio-dashboard-editor";
const LAST_DASHBOARD_PATH_STORAGE_KEY = "theme-studio-last-dashboard-path";


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
    this.expertCssEnabled = DEFAULT_EXPERT_CSS_ENABLED;
    this.expertCss = DEFAULT_EXPERT_CSS;
    this.expertStyleElements = new Set();
    this.expertCards = new Set();
    this.expertCardTargetsByCard = new WeakMap();
    this.expertCardKeyByCard = new WeakMap();
    this.expertLayouts = new Set();
    this.dashboardEditorActive = false;
    this.dashboardEditorRoot = null;
    this.dashboardEditorHighlight = null;
    this.dashboardEditorOriginGuide = null;
    this.dashboardEditorGridGuide = null;
    this.dashboardEditorPositionLabel = null;
    this.dashboardEditorGuideTimer = 0;
    this.dashboardEditorHoveredCard = null;
    this.dashboardEditorSelectedCard = null;
    this.dashboardEditorSelectedCardKey = "";
    this.dashboardEditorSelectedCardName = "";
    this.dashboardEditorSelectedEntityIds = [];
    this.dashboardEditorSelectedTargets = [];
    this.dashboardEditorSelectedCards = [];
    this.dashboardEditorSelectedRuleIds = new Map();
    this.dashboardEditorLiveStyles = new Set();
    this.dashboardEditorSettings = null;
    this.dashboardEditorExistingRuleId = "";
    this.dashboardEditorActiveProfileId = "";
    this.dashboardEditorThemeActive = true;
    this.dashboardEditorPanelDrag = null;
    this.dashboardEditorCardDrag = null;
    this.dashboardEditorBaselineValues = {};
    this.dashboardEditorDirtyFields = new Set();
    this.dashboardEditorExtraHighlights = [];
    this.dashboardToolbarHost = null;
    this.dashboardToolbarThemeActive = false;
    this.dashboardToolbarExpertModeEnabled = false;
    this.dashboardMobileMenuItem = null;
    this.dashboardMenuSyncTimeoutIds = new Set();
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
    this.techFrameResizeObserver = typeof window.ResizeObserver === "function"
      ? new window.ResizeObserver((entries) => {
        for (const entry of entries) {
          const card = entry.target;

          if (
            this.cardShape === "tech-frame"
            && card.isConnected
            && this.techFrameCards.has(card)
          ) {
            this._syncTechFrameOutline(card, this.techFrameCut);
          }
        }
      })
      : null;
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
    this.resizeEventHandler = () => {
      this._resize();
      this._positionDashboardEditorHighlight();
    };
    this.locationChangedEventHandler = () => {
      this.stateSnapshot.clear();
      this._invalidateCardIndex();
      this.glassLastScan = 0;
      this._readThemeSettings();
      this._startStartupSync();
      this._rememberDashboardPath();
      if (this._dashboardEditorRequested()) {
        this._startDashboardEditor();
      }
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
    this.dashboardMenuEventHandler = (event) => {
      if (this._isDashboardMobileMenuTrigger(event)) {
        this._scheduleDashboardMobileMenuSync();
      }
    };
    this.cardIndex = new Map();
    this.cardIndexBuiltAt = 0;
    this.themeComputedStyles = null;

    this.reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    this._createLayer();
    this._bindEvents();
    this._rememberDashboardPath();
    this._resize();
    this._readThemeSettings();
    this._startStartupSync();

    if (this._dashboardEditorRequested()) {
      this._startDashboardEditor();
    }
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

    this._createDashboardToolbarButton();

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
    document.addEventListener(
      "click",
      this.dashboardMenuEventHandler,
      true
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

          const materialEnabled =
            this.liquidGlass
            || this.cardShape === "tech-frame";
          const expertCssScanDue =
            this.expertCssEnabled
            && EXPERT_CSS_STARTUP_SYNC_DELAYS.has(delay);

          if (materialEnabled || expertCssScanDue) {
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
    document.removeEventListener(
      "click",
      this.dashboardMenuEventHandler,
      true
    );
    for (const timeoutId of this.dashboardMenuSyncTimeoutIds) {
      window.clearTimeout(timeoutId);
    }
    this.dashboardMenuSyncTimeoutIds.clear();
    this.dashboardMobileMenuItem?.remove();
    this.dashboardMobileMenuItem = null;
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
    this._stopDashboardEditor(false);
    this._clearExpertCss();
    this.techFrameResizeObserver?.disconnect();
    this._restoreConfigSurface();
    this.dashboardToolbarHost?.remove();
    this.dashboardToolbarHost = null;
    this.canvas?.remove();
  }

  _createDashboardToolbarButton() {
    this.dashboardToolbarHost?.remove();

    const host = document.createElement("div");
    host.setAttribute("data-theme-studio-dashboard-toolbar", "");
    host.hidden = true;
    const root = host.attachShadow({ mode: "open" });

    root.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 4;
          top: 3px;
          right: 211px;
          color: var(--app-header-text-color, var(--primary-text-color, #fff));
          font: 600 13px/1 system-ui, sans-serif;
        }
        :host([hidden]) { display: none !important; }
        button {
          display: inline-flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          border-radius: 50%;
          color: inherit;
          background: transparent;
          cursor: pointer;
        }
        button:hover, button:focus-visible {
          color: var(--primary-color, #26b2b3);
          background: color-mix(in srgb, currentColor 12%, transparent);
          outline: none;
        }
        .icon { font-size: 22px; line-height: 1; }
        @media (max-width: 600px) {
          :host { display: none !important; }
        }
      </style>
      <button type="button" title="Einzelne Karte direkt bearbeiten" aria-label="Kartenmodus starten">
        <span class="icon" aria-hidden="true">✥</span>
      </button>
    `;

    root.querySelector("button").addEventListener("click", () => {
      this._startDashboardEditor();
    });
    document.body.appendChild(host);
    this.dashboardToolbarHost = host;
  }

  _isDashboardPath() {
    const path = window.location?.pathname || "";
    const hass = this._getHass();
    const panels = hass?.panels || {};
    const pathSegment = path.split("/").filter(Boolean)[0] || "";
    const defaultPanel = hass?.defaultPanel
      || hass?.config?.default_panel
      || "lovelace";
    const panel = panels[pathSegment || defaultPanel]
      || Object.values(panels).find((candidate) =>
        candidate?.url_path === pathSegment
      );

    if (panel) {
      return panel.component_name === "lovelace";
    }

    return path === "/"
      || path === "/lovelace"
      || path.startsWith("/lovelace/")
      || path.startsWith("/dashboard-");
  }

  _syncDashboardToolbarButton() {
    if (!this.dashboardToolbarHost) {
      return;
    }

    this.dashboardToolbarHost.hidden = !(
      this.dashboardToolbarThemeActive
      && this.dashboardToolbarExpertModeEnabled
      && this._isDashboardPath()
      && !this.dashboardEditorActive
    );

    if (!this._dashboardMobileMenuEnabled()) {
      this.dashboardMobileMenuItem?.remove();
      this.dashboardMobileMenuItem = null;
    }

  }

  _dashboardMobileMenuEnabled() {
    return window.matchMedia("(max-width: 600px)").matches
      && this.dashboardToolbarThemeActive
      && this.dashboardToolbarExpertModeEnabled
      && this._isDashboardPath()
      && !this.dashboardEditorActive;
  }

  _scheduleDashboardMobileMenuSync() {
    for (const delay of [0, 40, 120, 250]) {
      const timeoutId = window.setTimeout(() => {
        this.dashboardMenuSyncTimeoutIds.delete(timeoutId);
        this._syncDashboardMobileMenuItem();
      }, delay);
      this.dashboardMenuSyncTimeoutIds.add(timeoutId);
    }
  }

  _isDashboardMobileMenuTrigger(event) {
    if (!this._dashboardMobileMenuEnabled()) {
      return false;
    }

    const signature = (event.composedPath?.() || [])
      .slice(0, 8)
      .map((element) => [
        element?.localName,
        element?.getAttribute?.("aria-label"),
        element?.getAttribute?.("title"),
        element?.getAttribute?.("icon"),
      ].filter(Boolean).join(" "))
      .join(" ")
      .toLowerCase();

    return /more|mehr|menu|menü|dots-vertical|overflow/.test(signature)
      || (
        Number.isFinite(event.clientX)
        && event.clientX >= window.innerWidth - 96
        && event.clientY <= 160
      );
  }

  _syncDashboardMobileMenuItem() {
    if (!this._dashboardMobileMenuEnabled()) {
      this.dashboardMobileMenuItem?.remove();
      this.dashboardMobileMenuItem = null;
      return;
    }

    if (this.dashboardMobileMenuItem?.isConnected) {
      return;
    }

    this.dashboardMobileMenuItem = null;
    let editItem = null;
    let menuLabel = "Kartenmodus";
    const menuLabels = new Map([
      ["Dashboard bearbeiten", "Kartenmodus"],
      ["Edit dashboard", "Card mode"],
      ["Modifier le tableau de bord", "Mode carte"],
      ["Editar panel", "Modo tarjeta"],
    ]);

    this._visitElements(document, (element) => {
      if (editItem) return;

      const text = String(element.textContent || "").trim();
      if (!menuLabels.has(text)) {
        return;
      }

      let candidate = element;
      for (let depth = 0; candidate && depth < 6; depth += 1) {
        const name = String(candidate.localName || "");
        if (
          candidate.getAttribute?.("role") === "menuitem"
          || ["ha-dropdown-item", "ha-list-item", "mwc-list-item", "paper-item"]
            .includes(name)
        ) {
          editItem = candidate;
          menuLabel = menuLabels.get(text);
          break;
        }
        candidate = candidate.parentElement;
      }
    });

    if (!editItem?.parentElement) {
      return;
    }

    const item = editItem.cloneNode(true);
    item.setAttribute("data-theme-studio-mobile-menu-item", "");
    item.removeAttribute("selected");
    item.removeAttribute("activated");
    this._replaceDashboardMobileMenuText(item, menuLabel);

    const oldIcon = item.querySelector?.("ha-icon, ha-svg-icon, mwc-icon");
    const icon = document.createElement("span");
    icon.textContent = "✥";
    icon.setAttribute("aria-hidden", "true");
    icon.style.cssText = "display:inline-flex;width:24px;justify-content:center;font-size:22px;line-height:1";
    if (oldIcon) {
      icon.slot = oldIcon.slot || "start";
      oldIcon.replaceWith(icon);
    } else {
      icon.slot = "start";
      item.prepend(icon);
    }

    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      this._startDashboardEditor();
      item.remove();
      this.dashboardMobileMenuItem = null;
    }, true);
    editItem.parentElement.insertBefore(item, editItem);
    this.dashboardMobileMenuItem = item;
  }

  _replaceDashboardMobileMenuText(root, replacement) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const value = walker.currentNode.nodeValue || "";
      if ([
        "Dashboard bearbeiten",
        "Edit dashboard",
        "Modifier le tableau de bord",
        "Editar panel",
      ].includes(value.trim())) {
        walker.currentNode.nodeValue = value.replace(value.trim(), replacement);
        return;
      }
    }

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

  _decodeExpertCss(encoded) {
    if (!encoded) {
      return "";
    }

    try {
      const bytes = Uint8Array.from(
        window.atob(encoded),
        (character) => character.charCodeAt(0)
      );

      return new TextDecoder("utf-8", { fatal: true })
        .decode(bytes);
    } catch (_error) {
      return "";
    }
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

    const requestedExpertCssEnabled =
      this._readNumberVariable(
        "--theme-studio-expert-css-enabled",
        DEFAULT_EXPERT_CSS_ENABLED ? 1 : 0,
        0,
        1
      ) >= 0.5;

    const requestedExpertCss = this._decodeExpertCss(
      this._readCssVariable("--theme-studio-expert-css-b64")
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
    this.dashboardToolbarThemeActive = Boolean(
      requestedCardShapeValue
      || this._readCssVariable("--theme-studio-effect")
    );
    this.dashboardToolbarExpertModeEnabled = requestedExpertCssEnabled;
    this._syncDashboardToolbarButton();
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

    const nextExpertCssEnabled =
      !effectsExcludedForConfig
      && requestedExpertCssEnabled
      && requestedExpertCss.length > 0;

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
      || nextExpertCssEnabled !== this.expertCssEnabled
      || requestedExpertCss !== this.expertCss
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
    this._clearExpertCss();

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
    this.expertCssEnabled = nextExpertCssEnabled;
    this.expertCss = requestedExpertCss;
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

    if (
      !this.liquidGlass
      && !techFrameEnabled
      && !this.expertCssEnabled
      && !this.dashboardEditorActive
    ) {
      this._clearLiquidGlassCards();
      this._clearTechFrameCards();
      this._clearExpertCss();
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
    const currentExpertStyles = new Set();
    const currentExpertCards = new Set();
    const currentExpertLayouts = new Set();
    const currentExpertRoots = new Set();

    this._visitElements(document, (element) => {
      if (this.expertCssEnabled || this.dashboardEditorActive) {
        if (
          element.localName === "ha-card"
          && !this._isInsideOverlay(element)
          && !this._isHeadingCard(element)
        ) {
          let targets;

          if (!this.expertCards.has(element)) {
            targets = this._markExpertCard(element);
            this.expertCardTargetsByCard.set(element, targets);
          } else {
            targets = this.expertCardTargetsByCard.get(element) || [element];
          }

          for (const target of targets) {
            currentExpertCards.add(target);
            const root = target.getRootNode?.();

            if (!currentExpertRoots.has(root)) {
              currentExpertRoots.add(root);
              const style = this._ensureExpertCssStyle(root);

              if (style) {
                currentExpertStyles.add(style);
              }
            }
          }
        }

        if (this._isDashboardLayoutElement(element)) {
          currentExpertLayouts.add(element);
          element.setAttribute("data-theme-studio-layout", "");
          const root = element.getRootNode?.();

          if (!currentExpertRoots.has(root)) {
            currentExpertRoots.add(root);
            const style = this._ensureExpertCssStyle(root);

            if (style) {
              currentExpertStyles.add(style);
            }
          }
        }
      }

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
        if (!this.glassCards.has(element)) {
          this._styleLiquidGlassCard(element);
        }
      } else if (techFrameEnabled) {
        this._restoreLiquidGlassCard(element);
        if (!this.techFrameCards.has(element)) {
          this._styleTechFrameCard(element);
        }
      } else {
        this._restoreLiquidGlassCard(element);
        this._restoreTechFrameCard(element);
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

    for (const card of this.expertCards) {
      if (!currentExpertCards.has(card) || !card.isConnected) {
        this._clearExpertCardMarkers(card);
      }
    }

    this.expertCards = currentExpertCards;

    for (const layout of this.expertLayouts) {
      if (!currentExpertLayouts.has(layout) || !layout.isConnected) {
        layout.removeAttribute("data-theme-studio-layout");
      }
    }

    this.expertLayouts = currentExpertLayouts;

    for (const style of this.expertStyleElements) {
      if (!currentExpertStyles.has(style) || !style.isConnected) {
        style.remove();
      }
    }

    this.expertStyleElements = currentExpertStyles;
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
    this.techFrameResizeObserver?.observe(card);
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
    this.techFrameResizeObserver?.unobserve(card);
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

  _ensureExpertCssStyle(root) {
    if (!this.expertCssEnabled || !this.expertCss || !root) {
      return null;
    }

    const target = root.nodeType === Node.DOCUMENT_NODE
      ? root.head
      : root;

    if (!target?.querySelector || !target?.appendChild) {
      return null;
    }

    let style = target.querySelector(
      "style[data-theme-studio-expert-css]"
    );

    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-theme-studio-expert-css", "");
      target.appendChild(style);
    }

    if (style.textContent !== this.expertCss) {
      style.textContent = this.expertCss;
    }

    this.expertStyleElements.add(style);
    return style;
  }

  _markExpertCard(card) {
    const entityIds = new Set();
    let themeStudioId = "";
    let current = card;

    for (let depth = 0; current && depth < 12; depth += 1) {
      if (
        current !== card
        && this._isDashboardLayoutElement(current)
      ) {
        break;
      }

      for (const entityId of this._entityIdsForElement(current)) {
        entityIds.add(entityId);
      }

      const configCandidates = this._configCandidates(current);

      if (!themeStudioId) {
        for (const candidate of configCandidates) {
          const value = candidate?.theme_studio_id;

          if (
            typeof value === "string"
            && /^[a-zA-Z0-9_-]{1,64}$/.test(value)
          ) {
            themeStudioId = value;
            break;
          }
        }
      }

      if (
        current !== card
        && entityIds.size > 0
        && (
          configCandidates.length > 0
          || typeof current.entity === "string"
        )
      ) {
        break;
      }

      if (current.parentElement) {
        current = current.parentElement;
      } else {
        current = current.getRootNode?.()?.host || null;
      }
    }

    const targets = [card];
    let outerContainer = null;
    current = card;

    for (let depth = 0; current && depth < 12; depth += 1) {
      if (current !== card && this._isExpertCardContainer(current)) {
        outerContainer = current;
      }

      if (current.parentElement) {
        current = current.parentElement;
      } else {
        current = current.getRootNode?.()?.host || null;
      }
    }

    if (outerContainer) {
      targets.push(outerContainer);
    }

    const entityValue = Array.from(entityIds).join(" ");
    const cardKey = this._dashboardCardKey(card);

    for (const target of targets) {
      if (entityValue) {
        target.setAttribute("data-theme-studio-entity", entityValue);
      } else {
        target.removeAttribute("data-theme-studio-entity");
      }

      if (themeStudioId) {
        target.setAttribute("data-theme-studio-id", themeStudioId);
      } else {
        target.removeAttribute("data-theme-studio-id");
      }

      target.setAttribute("data-theme-studio-card-key", cardKey);

      if (target !== card) {
        target.setAttribute("data-theme-studio-card-container", "");
      }
    }

    return targets;
  }

  _isExpertCardContainer(element) {
    const name = String(element.localName || "");

    return (
      name === "hui-card"
      || name.endsWith("-card")
      || element.classList?.contains("card")
      || element.classList?.contains("card-wrapper")
    );
  }

  _configCandidates(element) {
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

    return candidates.filter(
      (candidate) => candidate && typeof candidate === "object"
    );
  }

  _dashboardCardKey(card) {
    const cached = this.expertCardKeyByCard.get(card);

    if (cached) {
      return cached;
    }

    const identity = [window.location?.pathname || "/"];
    let current = card;

    for (let depth = 0; current && depth < 12; depth += 1) {
      for (const config of this._configCandidates(current)) {
        identity.push(this._stableDashboardCardValue(config));
      }

      if (current !== card && this._isDashboardLayoutElement(current)) {
        break;
      }

      current = current.parentElement || current.getRootNode?.()?.host || null;
    }

    identity.push(this._dashboardCardDomPath(card));
    const value = identity.join("|");
    let hash = 0xcbf29ce484222325n;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= BigInt(value.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }

    const key = hash.toString(16).padStart(16, "0");
    this.expertCardKeyByCard.set(card, key);
    return key;
  }

  _stableDashboardCardValue(value, depth = 0, seen = new WeakSet()) {
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      return JSON.stringify(value);
    }

    if (typeof value === "string") {
      return JSON.stringify(value.slice(0, 500));
    }

    if (depth >= 6 || typeof value !== "object") {
      return "";
    }

    if (seen.has(value)) {
      return '"[cycle]"';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return `[${value.slice(0, 100).map((item) =>
        this._stableDashboardCardValue(item, depth + 1, seen)
      ).join(",")}]`;
    }

    const entries = Object.keys(value)
      .filter((key) => !key.startsWith("_") && typeof value[key] !== "function")
      .sort()
      .slice(0, 100)
      .map((key) => `${JSON.stringify(key)}:${this._stableDashboardCardValue(
        value[key], depth + 1, seen
      )}`);

    return `{${entries.join(",")}}`;
  }

  _dashboardCardDomPath(card) {
    const parts = [];
    let current = card;

    for (let depth = 0; current && depth < 24; depth += 1) {
      const name = String(current.localName || "element");
      const parent = current.parentElement;
      let index = 0;

      if (parent) {
        const peers = Array.from(parent.children).filter(
          (element) => element.localName === current.localName
        );
        index = Math.max(0, peers.indexOf(current));
      }

      parts.push(`${name}:${index}`);

      if (this._isDashboardLayoutElement(current)) {
        break;
      }

      current = parent || current.getRootNode?.()?.host || null;
    }

    return parts.reverse().join("/");
  }

  _clearExpertCardMarkers(card) {
    card.removeAttribute("data-theme-studio-entity");
    card.removeAttribute("data-theme-studio-id");
    card.removeAttribute("data-theme-studio-card-key");
    card.removeAttribute("data-theme-studio-card-container");
  }

  _isDashboardLayoutElement(element) {
    const name = String(element.localName || "");
    let isLayout = false;

    if (DASHBOARD_LAYOUT_NAMES.has(name)) {
      isLayout = true;
    }

    const id = String(element.id || "").toLowerCase();
    isLayout = isLayout || DASHBOARD_LAYOUT_IDS.has(id);

    isLayout = isLayout || Array.from(element.classList || [])
      .some((className) => DASHBOARD_LAYOUT_CLASSES.has(className));

    return isLayout && !this._isInsideOverlay(element);
  }

  _clearExpertCss() {
    for (const style of this.expertStyleElements) {
      style.remove();
    }

    for (const card of this.expertCards) {
      this._clearExpertCardMarkers(card);
    }

    for (const layout of this.expertLayouts) {
      layout.removeAttribute("data-theme-studio-layout");
    }

    this.expertStyleElements.clear();
    this.expertCards.clear();
    this.expertLayouts.clear();
  }

  _dashboardEditorRequested() {
    try {
      return window.sessionStorage.getItem(
        DASHBOARD_EDITOR_STORAGE_KEY
      ) === "1";
    } catch (_error) {
      return false;
    }
  }

  _rememberDashboardPath() {
    const path = window.location?.pathname || "";

    if (!this._isDashboardPath()) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        LAST_DASHBOARD_PATH_STORAGE_KEY,
        `${path}${window.location?.search || ""}`
      );
    } catch (_error) {
      // Remembering the route is optional.
    }
  }

  _startDashboardEditor() {
    if (this.dashboardEditorActive) {
      return;
    }

    this.dashboardEditorActive = true;
    this._syncDashboardToolbarButton();

    try {
      window.sessionStorage.setItem(
        DASHBOARD_EDITOR_STORAGE_KEY,
        "1"
      );
    } catch (_error) {
      // The editor still works for the current page session.
    }

    this.dashboardEditorClickHandler = (event) =>
      this._handleDashboardEditorCardClick(event);
    this.dashboardEditorPointerHandler = (event) =>
      this._handleDashboardEditorPointer(event);
    this.dashboardEditorScrollHandler = () =>
      this._positionDashboardEditorHighlight();
    this.dashboardEditorKeyHandler = (event) => {
      if (event.key === "Escape") {
        if (this.dashboardEditorSelectedCard) {
          this._clearDashboardEditorSelection();
        } else {
          this._stopDashboardEditor();
        }
      }
    };

    document.addEventListener(
      "click",
      this.dashboardEditorClickHandler,
      true
    );
    document.addEventListener(
      "pointerover",
      this.dashboardEditorPointerHandler,
      true
    );
    document.addEventListener(
      "keydown",
      this.dashboardEditorKeyHandler,
      true
    );
    window.addEventListener(
      "scroll",
      this.dashboardEditorScrollHandler,
      true
    );

    this._renderDashboardEditor();
    this._loadDashboardEditorSettings();
    this.glassLastScan = 0;
    this._syncLiquidGlassCards(true);
  }

  _renderDashboardEditor() {
    this.dashboardEditorRoot?.remove();
    this.dashboardEditorHighlight?.remove();

    const host = document.createElement("div");
    host.setAttribute("data-theme-studio-dashboard-editor", "");
    const root = host.attachShadow({ mode: "open" });

    root.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 2147483646;
          top: 72px;
          right: 16px;
          width: min(340px, calc(100vw - 24px));
          color: #f4f7f8;
          font: 13px/1.35 system-ui, sans-serif;
        }
        * { box-sizing: border-box; }
        .panel {
          max-height: calc(100vh - 88px);
          overflow: auto;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 14px;
          background: rgba(19,29,34,.97);
          box-shadow: 0 14px 38px rgba(0,0,0,.42);
        }
        header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,.14);
          background: #172329;
          cursor: grab;
          touch-action: none;
        }
        header.dragging { cursor: grabbing; }
        h2 { margin: 0; overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
        .close {
          width: 30px;
          height: 30px;
          padding: 0;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 50%;
          color: inherit;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
        }
        .card-position-control {
          display: grid;
          grid-template-columns: repeat(3, 44px);
          grid-template-rows: repeat(3, 44px);
          width: max-content;
          margin: 14px auto 16px;
        }
        .card-position-control button {
          width: 44px;
          height: 44px;
          padding: 0;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 12px;
          color: #f4f7f8;
          background: #24343c;
          font-size: 21px;
          line-height: 1;
          cursor: pointer;
        }
        .card-position-control button:hover,
        .card-position-control button:focus-visible {
          border-color: #26b2b3;
          color: #26b2b3;
          outline: none;
        }
        .card-position-control button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }
        .card-position-up { grid-column: 2; grid-row: 1; }
        .card-position-left { grid-column: 1; grid-row: 2; }
        .card-move {
          grid-column: 2;
          grid-row: 2;
          border-color: #26b2b3 !important;
          background: #168b8c !important;
          font-size: 24px !important;
          touch-action: none;
          cursor: grab;
        }
        .card-position-right { grid-column: 3; grid-row: 2; }
        .card-position-down { grid-column: 2; grid-row: 3; }
        .card-move.active { cursor: grabbing; color: #26b2b3; }
        .intro, form { padding: 13px 14px; }
        .intro { color: #c8d2d6; }
        .intro strong { color: #fff; }
        form[hidden] { display: none; }
        .card-target {
          margin: 0 0 12px;
          padding: 10px;
          border: 1px solid rgba(38,178,179,.45);
          border-radius: 8px;
          background: rgba(38,178,179,.1);
        }
        .card-target strong, .card-target span { display: block; }
        .card-target span { margin-top: 3px; color: #aebbc0; font-size: 11px; }
        label {
          display: block;
          margin-bottom: 9px;
          color: #c8d2d6;
          font-size: 11px;
        }
        input, select {
          width: 100%;
          min-height: 36px;
          margin-top: 4px;
          padding: 0 9px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 8px;
          color: #fff;
          background: #24343c;
        }
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 9px;
        }
        .selection-hint {
          margin: -2px 0 10px;
          color: #b8c4c7;
          font-size: 12px;
          line-height: 1.4;
        }
        .selection-hint kbd {
          display: inline-block;
          min-width: 24px;
          padding: 1px 5px;
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 5px;
          color: #fff;
          background: rgba(255,255,255,.08);
          font: inherit;
          font-weight: 700;
          text-align: center;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .actions button {
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 8px;
          color: #fff;
          background: #2d4049;
          font-weight: 700;
          cursor: pointer;
        }
        .actions .save {
          flex: 1;
          border-color: #26b2b3;
          background: #168b8c;
        }
        .actions .reset { color: #ffaaaa; }
        .actions button:disabled { opacity: .55; cursor: wait; }
        .status {
          min-height: 18px;
          margin: 10px 0 0;
          color: #b8c4c7;
          font-size: 11px;
        }
        .status.error { color: #ff8b8b; }
        .status.success { color: #72dc88; }
        @media (max-width: 600px) {
          :host {
            top: auto;
            right: 8px;
            bottom: 8px;
            left: 8px;
            width: auto;
          }
          .panel { max-height: min(72vh, 620px); }
        }
      </style>
      <section class="panel" role="dialog" aria-label="Theme Studio Karteneditor">
        <header>
          <h2>Theme Studio · Karteneditor</h2>
          <button class="close" type="button" aria-label="Bearbeitungsmodus beenden">×</button>
        </header>
        <div class="intro">
          <strong>Karte direkt auswählen</strong><br>
          Tippe oder klicke auf eine Karte. Danach kannst du die markierte Karte direkt ziehen.
          Mit STRG + Klick kannst du mehrere Karten auswählen.
          Normale Kartenaktionen sind während dieses Modus gesperrt.
        </div>
        <form hidden>
          <div class="card-target">
            <strong data-field="card-name">Ausgewählte Karte</strong>
            <span data-field="card-details">Die Regel gilt nur für diese Karteninstanz.</span>
          </div>
          <p class="selection-hint">
            Mehrere Karten auswählen: <kbd>Strg</kbd> gedrückt halten und weitere Karten anklicken.
            Auf dem Mac <kbd>⌘</kbd> verwenden.
          </p>
          <label>Gerät
            <select data-field="device">
              <option value="all">Alle Geräte</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Smartphone</option>
            </select>
          </label>
          <div class="card-position-control" role="group" aria-label="Kartenposition">
            <button class="card-position-up" data-card-nudge="0,-1" type="button" aria-label="Karte nach oben verschieben" disabled>↑</button>
            <button class="card-position-left" data-card-nudge="-1,0" type="button" aria-label="Karte nach links verschieben" disabled>←</button>
            <button class="card-move" type="button" title="Karte frei verschieben" aria-label="Karte frei verschieben" disabled>✥</button>
            <button class="card-position-right" data-card-nudge="1,0" type="button" aria-label="Karte nach rechts verschieben" disabled>→</button>
            <button class="card-position-down" data-card-nudge="0,1" type="button" aria-label="Karte nach unten verschieben" disabled>↓</button>
          </div>
          <div class="field-grid">
            ${this._dashboardEditorNumberField("padding", "Innenabstand", 0, 100)}
            ${this._dashboardEditorNumberField("width", "Breite", 40, 2000)}
            ${this._dashboardEditorNumberField("minHeight", "Mindesthöhe", 20, 2000)}
            ${this._dashboardEditorNumberField("columns", "Spaltenbreite", 1, 12, "Spalten")}
            ${this._dashboardEditorNumberField("opacity", "Deckkraft", 0, 100, "%")}
            ${this._dashboardEditorNumberField("fontSize", "Schriftgröße", 8, 48)}
            ${this._dashboardEditorNumberField("borderRadius", "Runde Ecken", 0, 60)}
          </div>
          <input data-field="offsetX" type="hidden">
          <input data-field="offsetY" type="hidden">
          <div class="actions">
            <button class="save" type="submit">Regel speichern</button>
            <button class="cancel" type="button">Andere Karte wählen</button>
            <button class="reset" type="button" disabled>Karte zurücksetzen</button>
          </div>
          <p class="status" role="status" aria-live="polite"></p>
        </form>
      </section>
    `;

    root.querySelector(".close").addEventListener("click", () => {
      this._stopDashboardEditor();
    });
    const header = root.querySelector("header");
    const cardMove = root.querySelector(".card-move");
    header.addEventListener("pointerdown", (event) => {
      this._startDashboardEditorPanelDrag(event);
    });
    header.addEventListener("pointermove", (event) => {
      this._moveDashboardEditorPanel(event);
    });
    header.addEventListener("pointerup", (event) => {
      this._stopDashboardEditorPanelDrag(event);
    });
    header.addEventListener("pointercancel", (event) => {
      this._stopDashboardEditorPanelDrag(event);
    });
    cardMove.addEventListener("pointerdown", (event) => {
      this._startDashboardEditorCardDrag(event);
    });
    cardMove.addEventListener("pointermove", (event) => {
      this._moveDashboardEditorCard(event);
    });
    cardMove.addEventListener("pointerup", (event) => {
      this._stopDashboardEditorCardDrag(event);
    });
    cardMove.addEventListener("pointercancel", (event) => {
      this._stopDashboardEditorCardDrag(event);
    });
    cardMove.addEventListener("keydown", (event) => {
      this._nudgeDashboardEditorCard(event);
    });
    root.querySelectorAll("[data-card-nudge]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const [horizontal, vertical] = button.dataset.cardNudge
          .split(",")
          .map(Number);
        this._nudgeDashboardEditorCardBy(
          horizontal,
          vertical,
          event.shiftKey ? 10 : 5
        );
      });
    });
    root.querySelector(".cancel").addEventListener("click", () => {
      this._clearDashboardEditorSelection();
    });
    root.querySelector(".reset").addEventListener("click", () => {
      this._resetDashboardEditorCard();
    });
    root.querySelector("form").addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (field && field !== "device") {
        this.dashboardEditorDirtyFields.add(field);
      }
      this._syncDashboardEditorResetButton();
      this._applyDashboardEditorPreview();
    });
    root.querySelector("form").addEventListener("change", (event) => {
      this._applyDashboardEditorPreview();
    });
    root.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      this._saveDashboardEditorRule();
    });

    const highlight = document.createElement("div");
    highlight.setAttribute("data-theme-studio-dashboard-highlight", "");
    Object.assign(highlight.style, {
      position: "fixed",
      zIndex: "2147483645",
      display: "none",
      border: "3px solid #26b2b3",
      borderRadius: "8px",
      boxShadow: "0 0 0 3px rgba(38,178,179,.28)",
      pointerEvents: "none",
      transition: "inset 80ms ease, width 80ms ease, height 80ms ease",
    });
    const directMoveHint = document.createElement("span");
    directMoveHint.setAttribute("data-theme-studio-direct-move-hint", "");
    directMoveHint.textContent = "✥ Karte ziehen";
    Object.assign(directMoveHint.style, {
      position: "absolute",
      left: "50%",
      top: "-17px",
      display: "none",
      transform: "translateX(-50%)",
      padding: "4px 9px",
      borderRadius: "999px",
      background: "#ffb300",
      color: "#111820",
      boxShadow: "0 3px 10px rgba(0,0,0,.35)",
      font: "700 11px/1 system-ui, sans-serif",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    });
    highlight.appendChild(directMoveHint);
    for (const eventName of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
      highlight.addEventListener(eventName, (event) => {
        if (!this.dashboardEditorSelectedCard) return;
        if (eventName === "pointerdown") this._startDashboardEditorCardDrag(event);
        if (eventName === "pointermove") this._moveDashboardEditorCard(event);
        if (eventName === "pointerup" || eventName === "pointercancel") {
          this._stopDashboardEditorCardDrag(event);
        }
      });
    }

    const gridGuide = document.createElement("div");
    gridGuide.setAttribute("data-theme-studio-dashboard-grid-guide", "");
    Object.assign(gridGuide.style, {
      position: "fixed",
      zIndex: "2147483642",
      inset: "0",
      display: "none",
      backgroundImage:
        "linear-gradient(rgba(38,178,179,.16) 1px, transparent 1px), "
        + "linear-gradient(90deg, rgba(38,178,179,.16) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
      pointerEvents: "none",
    });

    const originGuide = document.createElement("div");
    originGuide.setAttribute("data-theme-studio-dashboard-origin-guide", "");
    originGuide.textContent = "Ausgang";
    Object.assign(originGuide.style, {
      position: "fixed",
      zIndex: "2147483644",
      display: "none",
      border: "2px dashed rgba(255,179,0,.9)",
      borderRadius: "8px",
      background: "rgba(255,179,0,.08)",
      boxSizing: "border-box",
      padding: "4px 6px",
      color: "#ffca4b",
      font: "700 10px/1.2 system-ui, sans-serif",
      pointerEvents: "none",
    });

    const positionLabel = document.createElement("div");
    positionLabel.setAttribute("data-theme-studio-dashboard-position-label", "");
    Object.assign(positionLabel.style, {
      position: "fixed",
      zIndex: "2147483645",
      display: "none",
      maxWidth: "min(280px, calc(100vw - 16px))",
      padding: "6px 9px",
      border: "1px solid rgba(38,178,179,.9)",
      borderRadius: "8px",
      background: "rgba(12,25,30,.96)",
      color: "#ffffff",
      boxShadow: "0 5px 16px rgba(0,0,0,.38)",
      font: "600 12px/1.25 system-ui, sans-serif",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    });

    document.body.append(gridGuide, originGuide, host, highlight, positionLabel);
    this.dashboardEditorRoot = host;
    this.dashboardEditorHighlight = highlight;
    this.dashboardEditorOriginGuide = originGuide;
    this.dashboardEditorGridGuide = gridGuide;
    this.dashboardEditorPositionLabel = positionLabel;
  }

  _dashboardEditorNumberField(name, label, minimum, maximum, unit = "px") {
    return `
      <label>${label} (${unit})
        <input data-field="${name}" type="number" min="${minimum}" max="${maximum}" step="1" placeholder="unverändert">
      </label>
    `;
  }

  _startDashboardEditorPanelDrag(event) {
    if (
      event.button !== 0
      || event.target.closest?.("button")
      || !this.dashboardEditorRoot
    ) {
      return;
    }

    const rect = this.dashboardEditorRoot.getBoundingClientRect();
    this.dashboardEditorPanelDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("dragging");
    event.preventDefault();
  }

  _moveDashboardEditorPanel(event) {
    const drag = this.dashboardEditorPanelDrag;
    const host = this.dashboardEditorRoot;

    if (!drag || drag.pointerId !== event.pointerId || !host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, drag.left + event.clientX - drag.startX),
      Math.max(8, window.innerWidth - rect.width - 8)
    );
    const top = Math.min(
      Math.max(8, drag.top + event.clientY - drag.startY),
      Math.max(8, window.innerHeight - Math.min(rect.height, window.innerHeight - 16) - 8)
    );

    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
    host.style.right = "auto";
    host.style.bottom = "auto";
    event.preventDefault();
  }

  _stopDashboardEditorPanelDrag(event) {
    if (
      !this.dashboardEditorPanelDrag
      || this.dashboardEditorPanelDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.classList.remove("dragging");
    this.dashboardEditorPanelDrag = null;
  }

  _startDashboardEditorCardDrag(event) {
    if (event.button !== 0 || !this.dashboardEditorSelectedCard) {
      return;
    }

    const root = this.dashboardEditorRoot?.shadowRoot;
    const offsetX = root?.querySelector('[data-field="offsetX"]');
    const offsetY = root?.querySelector('[data-field="offsetY"]');

    if (!offsetX || !offsetY) {
      return;
    }

    this._prepareDashboardEditorDirectMoveDevice();

    this.dashboardEditorCardDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: Number(offsetX.value || 0),
      offsetY: Number(offsetY.value || 0),
      originRect: this.dashboardEditorSelectedCard.getBoundingClientRect(),
    };
    this._showDashboardEditorPlacementGuide(
      this.dashboardEditorCardDrag.originRect
    );
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("active");
    event.preventDefault();
    event.stopPropagation();
  }

  _prepareDashboardEditorDirectMoveDevice() {
    const root = this.dashboardEditorRoot?.shadowRoot;
    const device = root?.querySelector('[data-field="device"]');
    const currentDevice = this._dashboardEditorCurrentDevice();
    if (!device || device.value === currentDevice) return;

    device.value = currentDevice;
    this.dashboardEditorExistingRuleId = "";
    for (const entry of this.dashboardEditorSelectedCards) {
      this.dashboardEditorSelectedRuleIds.delete(entry.cardKey);
    }
    const status = root.querySelector(".status");
    if (status) {
      status.textContent = currentDevice === "mobile"
        ? "Direktes Verschieben wird als eigene Smartphone-Regel gespeichert."
        : currentDevice === "tablet"
          ? "Direktes Verschieben wird als eigene Tablet-Regel gespeichert."
          : "Direktes Verschieben wird als eigene Desktop-Regel gespeichert.";
      status.className = "status";
    }
  }

  _moveDashboardEditorCard(event) {
    const drag = this.dashboardEditorCardDrag;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const root = this.dashboardEditorRoot?.shadowRoot;
    const offsetX = root?.querySelector('[data-field="offsetX"]');
    const offsetY = root?.querySelector('[data-field="offsetY"]');

    if (!offsetX || !offsetY) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const horizontalDelta = Math.min(
      window.innerWidth - 8 - drag.originRect.right,
      Math.max(8 - drag.originRect.left, deltaX)
    );
    const verticalDelta = drag.originRect.height <= window.innerHeight - 16
      ? Math.min(
        window.innerHeight - 8 - drag.originRect.bottom,
        Math.max(8 - drag.originRect.top, deltaY)
      )
      : deltaY;
    offsetX.value = String(Math.min(500, Math.max(
      -500,
      Math.round(drag.offsetX + horizontalDelta)
    )));
    offsetY.value = String(Math.min(500, Math.max(
      -500,
      Math.round(drag.offsetY + verticalDelta)
    )));
    this.dashboardEditorDirtyFields.add("offsetX");
    this.dashboardEditorDirtyFields.add("offsetY");
    this._syncDashboardEditorResetButton();
    this._applyDashboardEditorPreview();
    this._updateDashboardEditorPlacementGuide();
    event.preventDefault();
    event.stopPropagation();
  }

  _stopDashboardEditorCardDrag(event) {
    if (
      !this.dashboardEditorCardDrag
      || this.dashboardEditorCardDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.classList.remove("active");
    this.dashboardEditorCardDrag = null;
    this._hideDashboardEditorPlacementGuide(1100);
    event.preventDefault();
    event.stopPropagation();
  }

  _nudgeDashboardEditorCard(event) {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];

    if (!direction || !this.dashboardEditorSelectedCard) {
      return;
    }

    const step = event.shiftKey ? 10 : 1;
    this._nudgeDashboardEditorCardBy(direction[0], direction[1], step);
    event.preventDefault();
  }

  _nudgeDashboardEditorCardBy(horizontal, vertical, step = 5) {
    if (!this.dashboardEditorSelectedCard) {
      return;
    }

    const root = this.dashboardEditorRoot?.shadowRoot;
    const offsetX = root?.querySelector('[data-field="offsetX"]');
    const offsetY = root?.querySelector('[data-field="offsetY"]');

    if (!offsetX || !offsetY) {
      return;
    }

    const originRect = this.dashboardEditorSelectedCard.getBoundingClientRect();
    this._showDashboardEditorPlacementGuide(originRect);
    offsetX.value = String(Math.min(500, Math.max(
      -500,
      Number(offsetX.value || 0) + horizontal * step
    )));
    offsetY.value = String(Math.min(500, Math.max(
      -500,
      Number(offsetY.value || 0) + vertical * step
    )));
    this.dashboardEditorDirtyFields.add("offsetX");
    this.dashboardEditorDirtyFields.add("offsetY");
    this._syncDashboardEditorResetButton();
    this._applyDashboardEditorPreview();
    this._updateDashboardEditorPlacementGuide();
    this._hideDashboardEditorPlacementGuide(1100);
  }

  _showDashboardEditorPlacementGuide(rect) {
    if (
      !rect
      || !this.dashboardEditorOriginGuide
      || !this.dashboardEditorGridGuide
      || !this.dashboardEditorPositionLabel
    ) {
      return;
    }

    window.clearTimeout(this.dashboardEditorGuideTimer);
    this.dashboardEditorGuideTimer = 0;
    Object.assign(this.dashboardEditorOriginGuide.style, {
      display: "block",
      left: `${Math.round(rect.left - 2)}px`,
      top: `${Math.round(rect.top - 2)}px`,
      width: `${Math.round(rect.width + 4)}px`,
      height: `${Math.round(rect.height + 4)}px`,
    });
    Object.assign(this.dashboardEditorGridGuide.style, {
      display: "block",
      backgroundPosition: `${Math.round(rect.left)}px ${Math.round(rect.top)}px`,
    });
    this.dashboardEditorPositionLabel.style.display = "block";
    this.dashboardEditorHighlight.style.boxShadow =
      "0 0 0 3px rgba(38,178,179,.32), 0 0 24px rgba(38,178,179,.4)";
    this.dashboardEditorHighlight.style.borderColor = "#26b2b3";
    this._updateDashboardEditorPlacementGuide();
  }

  _updateDashboardEditorPlacementGuide() {
    const card = this.dashboardEditorSelectedCard;
    const label = this.dashboardEditorPositionLabel;
    const root = this.dashboardEditorRoot?.shadowRoot;
    if (!card?.isConnected || !label || label.style.display === "none") return;

    const rect = card.getBoundingClientRect();
    const offsetX = Number(root?.querySelector('[data-field="offsetX"]')?.value || 0);
    const offsetY = Number(root?.querySelector('[data-field="offsetY"]')?.value || 0);
    const count = this.dashboardEditorSelectedCards.length;
    const targetText = count > 1 ? `${count} Karten` : "Zielposition";
    const signed = (value) => value > 0 ? `+${value}` : String(value);
    label.textContent = `${targetText} · X ${signed(offsetX)} px · Y ${signed(offsetY)} px`;
    if (this.dashboardEditorHighlight) {
      this.dashboardEditorHighlight.style.borderColor = "#26b2b3";
      this.dashboardEditorHighlight.style.boxShadow =
        "0 0 0 3px rgba(38,178,179,.32), 0 0 24px rgba(38,178,179,.4)";
    }

    const labelWidth = Math.min(280, Math.max(190, label.offsetWidth || 190));
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - labelWidth - 8)
    );
    const top = rect.top >= 42
      ? rect.top - 34
      : Math.min(window.innerHeight - 36, rect.bottom + 8);
    label.style.left = `${Math.round(left)}px`;
    label.style.top = `${Math.round(top)}px`;
  }

  _hideDashboardEditorPlacementGuide(delay = 0) {
    window.clearTimeout(this.dashboardEditorGuideTimer);
    const hide = () => {
      this.dashboardEditorGuideTimer = 0;
      if (this.dashboardEditorOriginGuide) {
        this.dashboardEditorOriginGuide.style.display = "none";
      }
      if (this.dashboardEditorGridGuide) {
        this.dashboardEditorGridGuide.style.display = "none";
      }
      if (this.dashboardEditorPositionLabel) {
        this.dashboardEditorPositionLabel.style.display = "none";
      }
      if (this.dashboardEditorHighlight) {
        this.dashboardEditorHighlight.style.boxShadow =
          "0 0 0 3px rgba(38,178,179,.28)";
      }
      this._positionDashboardEditorHighlight();
    };

    if (delay > 0) {
      this.dashboardEditorGuideTimer = window.setTimeout(hide, delay);
    } else {
      hide();
    }
  }

  async _loadDashboardEditorSettings() {
    const status = this.dashboardEditorRoot?.shadowRoot?.querySelector(
      ".status"
    );

    try {
      const result = await this._getHass()?.callWS({
        type: "theme_studio/get_settings",
      });

      if (!result) {
        throw new Error("Home Assistant ist noch nicht bereit.");
      }

      this.dashboardEditorSettings = {
        mode: result.mode,
        light: result.light,
        dark: result.dark,
        effects: result.effects,
      };
      this.dashboardEditorActiveProfileId = result.active_profile_id || "";
      this.dashboardEditorThemeActive = result.theme_studio_active !== false;

      if (status) {
        status.textContent = "Bereit – Karte im Dashboard anklicken.";
        status.className = "status";
      }

      if (this.dashboardEditorSelectedCard?.isConnected) {
        this._selectDashboardEditorCard(
          this.dashboardEditorSelectedCard
        );
      }
    } catch (error) {
      if (status) {
        status.textContent = `Einstellungen konnten nicht geladen werden: ${error.message || error}`;
        status.className = "status error";
      }
    }
  }

  _dashboardEditorCardFromEvent(event) {
    const path = event.composedPath?.() || [];

    if (path.includes(this.dashboardEditorRoot)) {
      return null;
    }

    return path.find((element) =>
      element?.localName === "ha-card"
      && !this._isHeadingCard(element)
      && !this._isInsideOverlay(element)
    ) || null;
  }

  _handleDashboardEditorPointer(event) {
    if (!this.dashboardEditorActive || this.dashboardEditorSelectedCard) {
      return;
    }

    const card = this._dashboardEditorCardFromEvent(event);

    if (card && card !== this.dashboardEditorHoveredCard) {
      this.dashboardEditorHoveredCard = card;
      this._positionDashboardEditorHighlight();
    } else if (!card && this.dashboardEditorHoveredCard) {
      this.dashboardEditorHoveredCard = null;
      this._positionDashboardEditorHighlight();
    }
  }

  _handleDashboardEditorCardClick(event) {
    if (!this.dashboardEditorActive) {
      return;
    }

    const card = this._dashboardEditorCardFromEvent(event);

    if (!card) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this._selectDashboardEditorCard(card, event.ctrlKey || event.metaKey);
  }

  _selectDashboardEditorCard(card, additive = false) {
    if (additive && this.dashboardEditorSelectedCard) {
      this._toggleDashboardEditorCard(card);
      return;
    }

    this._clearDashboardEditorLiveStyle();
    this.dashboardEditorSelectedCard = card;
    this.dashboardEditorHoveredCard = card;
    this.dashboardEditorSelectedTargets = this._markExpertCard(card);
    this.expertCardTargetsByCard.set(card, this.dashboardEditorSelectedTargets);
    this._positionDashboardEditorHighlight();

    const entityIds = String(
      card.getAttribute("data-theme-studio-entity") || ""
    ).split(/\s+/).filter(Boolean);
    const root = this.dashboardEditorRoot?.shadowRoot;
    const form = root?.querySelector("form");
    const intro = root?.querySelector(".intro");
    const status = root?.querySelector(".status");
    const nameOutput = root?.querySelector('[data-field="card-name"]');
    const detailsOutput = root?.querySelector('[data-field="card-details"]');

    if (!form || !nameOutput || !detailsOutput) {
      return;
    }

    const cardKey = card.getAttribute("data-theme-studio-card-key")
      || this._dashboardCardKey(card);
    const cardName = this._dashboardEditorCardName(card, entityIds);
    this.dashboardEditorSelectedCardKey = cardKey;
    this.dashboardEditorSelectedCardName = cardName;
    this.dashboardEditorSelectedEntityIds = entityIds;
    this.dashboardEditorSelectedCards = [{
      card,
      cardKey,
      cardName,
      entityIds,
      targets: this.dashboardEditorSelectedTargets,
    }];
    this.dashboardEditorSelectedRuleIds = new Map();
    root.querySelectorAll(".card-position-control button").forEach((button) => {
      button.disabled = false;
    });
    nameOutput.textContent = cardName;
    detailsOutput.textContent = entityIds.length > 0
      ? `Nur diese Karte · erkannt: ${entityIds.join(", ")}`
      : "Nur diese Karte · keine Entität erforderlich";
    root.querySelector(".save").disabled = !this.dashboardEditorSettings;
    intro.hidden = true;
    form.hidden = false;
    this._loadDashboardEditorRule(cardKey, entityIds);
  }

  _toggleDashboardEditorCard(card) {
    const cardKey = card.getAttribute("data-theme-studio-card-key")
      || this._dashboardCardKey(card);
    const currentIndex = this.dashboardEditorSelectedCards.findIndex(
      (entry) => entry.cardKey === cardKey
    );

    if (currentIndex === 0 && this.dashboardEditorSelectedCards.length === 1) {
      return;
    }

    this._clearDashboardEditorLiveStyle();

    if (currentIndex >= 0) {
      this.dashboardEditorSelectedCards.splice(currentIndex, 1);
      this.dashboardEditorSelectedRuleIds.delete(cardKey);
    } else {
      const entityIds = String(
        card.getAttribute("data-theme-studio-entity") || ""
      ).split(/\s+/).filter(Boolean);
      const targets = this._markExpertCard(card);
      this.expertCardTargetsByCard.set(card, targets);
      const { rule } = this._dashboardEditorFindRule(cardKey, entityIds);
      this.dashboardEditorSelectedCards.push({
        card,
        cardKey,
        cardName: this._dashboardEditorCardName(card, entityIds),
        entityIds,
        targets,
      });
      if (rule) {
        this.dashboardEditorSelectedRuleIds.set(cardKey, rule.id);
      }
    }

    const primary = this.dashboardEditorSelectedCards[0];
    this.dashboardEditorSelectedCard = primary.card;
    this.dashboardEditorSelectedCardKey = primary.cardKey;
    this.dashboardEditorSelectedCardName = primary.cardName;
    this.dashboardEditorSelectedEntityIds = primary.entityIds;
    this.dashboardEditorExistingRuleId =
      this.dashboardEditorSelectedRuleIds.get(primary.cardKey) || "";
    this.dashboardEditorSelectedTargets = Array.from(new Set(
      this.dashboardEditorSelectedCards.flatMap((entry) => entry.targets)
    ));

    if (this.dashboardEditorSelectedCards.length === 2 && currentIndex < 0) {
      this.dashboardEditorDirtyFields = new Set();
    }

    this._updateDashboardEditorSelectionLabel();
    if (this.dashboardEditorSelectedCards.length === 1) {
      this._loadDashboardEditorRule(primary.cardKey, primary.entityIds);
      this._positionDashboardEditorHighlight();
      return;
    }
    this._syncDashboardEditorResetButton();
    this._applyDashboardEditorPreview();
    this._positionDashboardEditorHighlight();
  }

  _updateDashboardEditorSelectionLabel() {
    const root = this.dashboardEditorRoot?.shadowRoot;
    const count = this.dashboardEditorSelectedCards.length;
    const nameOutput = root?.querySelector('[data-field="card-name"]');
    const detailsOutput = root?.querySelector('[data-field="card-details"]');
    const status = root?.querySelector(".status");

    if (!nameOutput || !detailsOutput || count === 0) {
      return;
    }

    if (count === 1) {
      const entry = this.dashboardEditorSelectedCards[0];
      nameOutput.textContent = entry.cardName;
      detailsOutput.textContent = entry.entityIds.length > 0
        ? `Nur diese Karte · erkannt: ${entry.entityIds.join(", ")}`
        : "Nur diese Karte · keine Entität erforderlich";
      return;
    }

    nameOutput.textContent = `${count} Karten ausgewählt`;
    detailsOutput.textContent = "STRG + Klick fügt Karten hinzu oder entfernt sie";
    if (status) {
      status.textContent = "Nur Werte, die du jetzt änderst, werden auf alle ausgewählten Karten angewendet.";
      status.className = "status";
    }
  }

  _dashboardEditorCardName(card, entityIds) {
    let current = card;

    for (let depth = 0; current && depth < 12; depth += 1) {
      for (const config of this._configCandidates(current)) {
        const name = config.name || config.title;

        if (typeof name === "string" && name.trim()) {
          return name.trim();
        }
      }

      if (current !== card && this._isDashboardLayoutElement(current)) {
        break;
      }

      current = current.parentElement || current.getRootNode?.()?.host || null;
    }

    const hass = this._getHass();
    const firstEntity = entityIds[0];
    return hass?.states?.[firstEntity]?.attributes?.friendly_name
      || firstEntity
      || "Ausgewählte Karte";
  }

  _loadDashboardEditorRule(cardKey, entityIds = []) {
    const { rule, migratesLegacyRule } = this._dashboardEditorFindRule(
      cardKey,
      entityIds
    );
    const root = this.dashboardEditorRoot?.shadowRoot;

    this.dashboardEditorExistingRuleId = rule?.id || "";
    if (rule) {
      this.dashboardEditorSelectedRuleIds.set(cardKey, rule.id);
    }

    if (!root) {
      return;
    }

    root.querySelector('[data-field="device"]').value = rule?.device
      || this._dashboardEditorCurrentDevice();

    this.dashboardEditorBaselineValues = this._dashboardEditorMeasuredValues();
    this.dashboardEditorDirtyFields = new Set();

    for (const field of [
      "padding",
      "width",
      "minHeight",
      "columns",
      "offsetX",
      "offsetY",
      "opacity",
      "fontSize",
      "borderRadius",
    ]) {
      const hasSavedValue = rule?.[field] !== null
        && rule?.[field] !== undefined;
      root.querySelector(`[data-field="${field}"]`).value = hasSavedValue
        ? rule[field]
        : this.dashboardEditorBaselineValues[field];
      if (hasSavedValue) {
        this.dashboardEditorDirtyFields.add(field);
      }
    }

    const status = root.querySelector(".status");
    status.textContent = migratesLegacyRule
      ? "Alte Entitätsregel geladen. Beim Speichern wird sie auf genau diese Karte begrenzt."
      : rule
        ? "Vorhandene Kartenregel geladen. Änderungen erscheinen sofort auf dieser Karte."
        : "Neue Regel nur für diese Karte. Änderungen erscheinen sofort.";
    status.className = "status";
    this._syncDashboardEditorResetButton();
    this._applyDashboardEditorPreview();
  }

  _dashboardEditorFindRule(cardKey, entityIds = []) {
    const rules = this.dashboardEditorSettings?.effects?.expertRules || [];
    const currentDevice = this._dashboardEditorCurrentDevice();
    let rule = rules.find((candidate) =>
      candidate.targetType === "card"
      && candidate.target === cardKey
      && candidate.device === currentDevice
    ) || rules.find((candidate) =>
      candidate.targetType === "card"
      && candidate.target === cardKey
      && candidate.device === "all"
    ) || null;
    let migratesLegacyRule = false;

    if (!rule) {
      const hass = this._getHass();
      rule = rules.find((candidate) => {
        if (
          candidate.targetType !== "entity"
          || !entityIds.includes(candidate.target)
        ) {
          return false;
        }

        const generatedName = hass?.states?.[candidate.target]
          ?.attributes?.friendly_name || candidate.target;
        return candidate.name === generatedName;
      }) || null;
      migratesLegacyRule = Boolean(rule);
    }

    return { rule, migratesLegacyRule };
  }

  _dashboardEditorMeasuredValues() {
    const card = this.dashboardEditorSelectedCard;
    const container = this.dashboardEditorSelectedTargets.find((target) =>
      target.hasAttribute?.("data-theme-studio-card-container")
    ) || card;

    if (!card || !container) {
      return {
        padding: 0,
        width: 40,
        minHeight: 20,
        columns: 1,
        offsetX: 0,
        offsetY: 0,
        opacity: 100,
        fontSize: 14,
        borderRadius: 0,
      };
    }

    const cardStyle = getComputedStyle(card);
    const containerStyle = getComputedStyle(container);
    const rect = card.getBoundingClientRect();
    const rounded = (value, fallback, minimum, maximum) => {
      const number = Number.parseFloat(value);
      return Number.isFinite(number)
        ? Math.min(maximum, Math.max(minimum, Math.round(number)))
        : fallback;
    };
    const columnText = `${containerStyle.gridColumnEnd} ${containerStyle.gridColumn}`;
    const columnMatch = columnText.match(/span\s+(\d+)/i);

    return {
      padding: rounded(cardStyle.paddingTop, 0, 0, 100),
      width: rounded(rect.width, 40, 40, 2000),
      minHeight: rounded(rect.height, 20, 20, 2000),
      columns: rounded(columnMatch?.[1], 1, 1, 12),
      offsetX: 0,
      offsetY: 0,
      opacity: rounded(Number.parseFloat(cardStyle.opacity) * 100, 100, 0, 100),
      fontSize: rounded(cardStyle.fontSize, 14, 8, 48),
      borderRadius: rounded(cardStyle.borderTopLeftRadius, 0, 0, 60),
    };
  }

  _dashboardEditorCurrentDevice() {
    const width = Math.max(
      document.documentElement?.clientWidth || 0,
      window.innerWidth || 0
    );

    if (width <= 600) return "mobile";
    if (width <= 1024) return "tablet";
    return "desktop";
  }

  _syncDashboardEditorResetButton() {
    const button = this.dashboardEditorRoot?.shadowRoot?.querySelector(".reset");
    if (button) {
      button.disabled = this.dashboardEditorSelectedRuleIds.size === 0
        && this.dashboardEditorDirtyFields.size === 0;
      button.textContent = this.dashboardEditorSelectedCards.length > 1
        ? "Auswahl zurücksetzen"
        : "Karte zurücksetzen";
    }
  }

  _dashboardEditorFormNumber(name) {
    const input = this.dashboardEditorRoot?.shadowRoot?.querySelector(
      `[data-field="${name}"]`
    );

    if (!input || input.value === "") {
      return null;
    }

    const value = Number(input.value);

    if (!input.checkValidity() || !Number.isInteger(value)) {
      throw new Error(`${input.parentElement.textContent.trim()}: ungültiger Wert.`);
    }

    return value;
  }

  _dashboardEditorRuleFromForm() {
    const root = this.dashboardEditorRoot.shadowRoot;
    const target = this.dashboardEditorSelectedCardKey;
    const name = this.dashboardEditorSelectedCardName || "Ausgewählte Karte";
    const rule = {
      id: this.dashboardEditorExistingRuleId || this._newDashboardEditorRuleId(),
      name: String(name).slice(0, 48),
      enabled: true,
      targetType: "card",
      target,
      device: root.querySelector('[data-field="device"]').value,
      margin: null,
      padding: this._dashboardEditorRuleValue("padding"),
      gap: null,
      width: this._dashboardEditorRuleValue("width"),
      minHeight: this._dashboardEditorRuleValue("minHeight"),
      columns: this._dashboardEditorRuleValue("columns"),
      offsetX: this._dashboardEditorRuleValue("offsetX"),
      offsetY: this._dashboardEditorRuleValue("offsetY"),
      opacity: this._dashboardEditorRuleValue("opacity"),
      fontSize: this._dashboardEditorRuleValue("fontSize"),
      borderRadius: this._dashboardEditorRuleValue("borderRadius"),
    };

    if (!target) {
      throw new Error("Die ausgewählte Karte konnte nicht eindeutig erkannt werden.");
    }

    if ([
      "padding", "width", "minHeight", "columns",
      "offsetX", "offsetY", "opacity", "fontSize", "borderRadius",
    ].every((field) => rule[field] === null)) {
      throw new Error("Bitte mindestens eine Änderung eintragen.");
    }

    return rule;
  }

  _dashboardEditorRuleValue(field) {
    return this.dashboardEditorDirtyFields.has(field)
      ? this._dashboardEditorFormNumber(field)
      : null;
  }

  _applyDashboardEditorPreview() {
    if (!this.dashboardEditorSelectedCard) {
      return;
    }

    let rule;

    try {
      rule = this._dashboardEditorRuleFromForm();
    } catch (_error) {
      return;
    }

    this._clearDashboardEditorLiveStyle();

    for (const target of this.dashboardEditorSelectedTargets) {
      target.setAttribute("data-theme-studio-dashboard-edit", "");
    }

    const visual = [];
    const placement = [];

    if (rule.padding !== null) {
      visual.push(`padding: ${rule.padding}px !important;`);
    }
    if (rule.minHeight !== null) {
      visual.push(`min-height: ${rule.minHeight}px !important;`);
    }
    if (rule.opacity !== null) {
      visual.push(`opacity: ${rule.opacity / 100} !important;`);
    }
    if (rule.fontSize !== null) {
      visual.push(`font-size: ${rule.fontSize}px !important;`);
      for (const variable of [
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
      ]) {
        visual.push(`${variable}: ${rule.fontSize}px !important;`);
      }
    }
    if (rule.borderRadius !== null) {
      visual.push(`border-radius: ${rule.borderRadius}px !important;`);
    }
    if (rule.margin !== null) {
      placement.push(`margin: ${rule.margin}px !important;`);
    }
    if (rule.width !== null) {
      placement.push(
        `width: min(${rule.width}px, 100%, calc(100vw - 24px)) !important;`
      );
      placement.push(
        "max-width: min(100%, calc(100vw - 24px)) !important;"
      );
      placement.push("box-sizing: border-box !important;");
    }
    if (rule.columns !== null) {
      placement.push(`grid-column: span ${rule.columns} !important;`);
    }
    if (rule.offsetX !== null || rule.offsetY !== null) {
      placement.push(`transform: translate(${rule.offsetX || 0}px, ${rule.offsetY || 0}px) !important;`);
    }
    const responsivePlacement = [];
    if (rule.device === "all" && rule.columns !== null) {
      responsivePlacement.push("grid-column: 1 / -1 !important;");
      responsivePlacement.push("justify-self: start !important;");
    }
    if (
      rule.device === "all"
      && rule.offsetX !== null
      && rule.offsetX !== 0
    ) {
      responsivePlacement.push(
        `transform: translate(0px, ${rule.offsetY || 0}px) !important;`
      );
    }
    const mobileFallback = responsivePlacement.length === 0 ? "" : `
      @media (max-width: 600px) {
        [data-theme-studio-card-container][data-theme-studio-dashboard-edit] {
          ${responsivePlacement.join("\n")}
        }
      }
    `;
    const css = `
      ha-card[data-theme-studio-dashboard-edit] {
        ${visual.join("\n")}
      }
      ha-card[data-theme-studio-dashboard-edit] * {
        ${rule.fontSize === null ? "" : `font-size: ${rule.fontSize}px !important;`}
      }
      [data-theme-studio-card-container][data-theme-studio-dashboard-edit] {
        ${placement.join("\n")}
      }
      ${mobileFallback}
    `;
    const roots = new Set(
      this.dashboardEditorSelectedTargets.map((target) => target.getRootNode?.())
    );

    for (const root of roots) {
      const destination = root?.nodeType === Node.DOCUMENT_NODE
        ? root.head
        : root;

      if (!destination?.appendChild) {
        continue;
      }

      const style = document.createElement("style");
      style.setAttribute("data-theme-studio-dashboard-live-style", "");
      style.textContent = css;
      destination.appendChild(style);
      this.dashboardEditorLiveStyles.add(style);
    }

    this._positionDashboardEditorHighlight();
  }

  async _saveDashboardEditorRule() {
    const root = this.dashboardEditorRoot?.shadowRoot;
    const status = root?.querySelector(".status");
    const saveButton = root?.querySelector(".save");

    if (!this.dashboardEditorSettings || !status || !saveButton) {
      return;
    }

    let rule;

    try {
      rule = this._dashboardEditorRuleFromForm();
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      return;
    }

    const settings = JSON.parse(JSON.stringify(this.dashboardEditorSettings));
    const rules = settings.effects.expertRules || [];
    const entries = this.dashboardEditorSelectedCards.length > 0
      ? this.dashboardEditorSelectedCards
      : [{
        cardKey: this.dashboardEditorSelectedCardKey,
        cardName: this.dashboardEditorSelectedCardName,
      }];
    const newRuleCount = entries.filter((entry) => {
      const ruleId = this.dashboardEditorSelectedRuleIds.get(entry.cardKey);
      return !rules.some((candidate) =>
        candidate.id === ruleId
        || (
          candidate.targetType === "card"
          && candidate.target === entry.cardKey
          && candidate.device === rule.device
        )
      );
    }).length;

    if (rules.length + newRuleCount > 64) {
      status.textContent = "Es können höchstens 64 Regeln gespeichert werden.";
      status.className = "status error";
      return;
    }

    const savedRuleIds = new Map();
    for (const entry of entries) {
      const knownRuleId = this.dashboardEditorSelectedRuleIds.get(entry.cardKey);
      const existingIndex = rules.findIndex((candidate) =>
        candidate.id === knownRuleId
        || (
          candidate.targetType === "card"
          && candidate.target === entry.cardKey
          && candidate.device === rule.device
        )
      );
      const existing = existingIndex >= 0 ? rules[existingIndex] : null;
      const savedRule = {
        ...(existing || rule),
        id: existing?.id || this._newDashboardEditorRuleId(),
        name: String(entry.cardName || "Ausgewählte Karte").slice(0, 48),
        enabled: true,
        targetType: "card",
        target: entry.cardKey,
        device: rule.device,
        margin: null,
        gap: null,
      };

      for (const field of [
        "padding", "width", "minHeight", "columns", "offsetX",
        "offsetY", "opacity", "fontSize", "borderRadius",
      ]) {
        if (this.dashboardEditorDirtyFields.has(field)) {
          savedRule[field] = rule[field];
        } else if (!existing) {
          savedRule[field] = null;
        }
      }

      if (existingIndex >= 0) {
        rules.splice(existingIndex, 1, savedRule);
      } else {
        rules.push(savedRule);
      }
      savedRuleIds.set(entry.cardKey, savedRule.id);
    }

    settings.effects.expertRules = rules;
    settings.effects.expertCssEnabled = true;
    saveButton.disabled = true;
    status.textContent = entries.length > 1
      ? `${entries.length} Kartenregeln werden gespeichert und angewendet …`
      : "Regel wird gespeichert und angewendet …";
    status.className = "status";

    try {
      const result = await this._getHass().callWS({
        type: "theme_studio/save_settings",
        settings,
        previous_theme_studio_active: this.dashboardEditorThemeActive,
        ...(this.dashboardEditorActiveProfileId
          ? { active_profile_id: this.dashboardEditorActiveProfileId }
          : {}),
      });

      this.dashboardEditorSettings = JSON.parse(JSON.stringify(result.settings));
      this.dashboardEditorSelectedRuleIds = savedRuleIds;
      this.dashboardEditorExistingRuleId = savedRuleIds.get(
        this.dashboardEditorSelectedCardKey
      ) || "";
      this.dashboardEditorThemeActive = true;
      this._clearDashboardEditorLiveStyle();
      status.textContent = entries.length > 1
        ? `${entries.length} Kartenregeln wurden gespeichert und angewendet.`
        : "Regel gespeichert und auf dem Dashboard angewendet.";
      status.className = "status success";
      this.themeComputedStyles = null;
      this.glassLastScan = 0;
      this._readThemeSettings();
      this._startStartupSync();
      this._syncDashboardEditorResetButton();
    } catch (error) {
      status.textContent = `Speichern fehlgeschlagen: ${error.message || error}`;
      status.className = "status error";
      this._applyDashboardEditorPreview();
    } finally {
      saveButton.disabled = false;
    }
  }

  async _resetDashboardEditorCard() {
    const root = this.dashboardEditorRoot?.shadowRoot;
    const status = root?.querySelector(".status");
    const resetButton = root?.querySelector(".reset");

    if (!this.dashboardEditorSettings || !status || !resetButton) {
      return;
    }

    if (this.dashboardEditorSelectedRuleIds.size === 0) {
      this._clearDashboardEditorLiveStyle();
      this._loadDashboardEditorRule(
        this.dashboardEditorSelectedCardKey,
        this.dashboardEditorSelectedEntityIds
      );
      this._updateDashboardEditorSelectionLabel();
      this._syncDashboardEditorResetButton();
      status.textContent = "Ungespeicherte Änderungen wurden verworfen.";
      status.className = "status success";
      return;
    }

    const selectionCount = this.dashboardEditorSelectedCards.length || 1;
    const confirmation = selectionCount > 1
      ? `Alle Anpassungen für ${selectionCount} ausgewählte Karten entfernen?`
      : "Alle Anpassungen für diese Karte entfernen?";
    if (!window.confirm(confirmation)) {
      return;
    }

    const settings = JSON.parse(JSON.stringify(this.dashboardEditorSettings));
    const rules = settings.effects.expertRules || [];
    const selectedRuleIds = new Set(this.dashboardEditorSelectedRuleIds.values());
    const selectedCardKeys = new Set(
      this.dashboardEditorSelectedCards.map((entry) => entry.cardKey)
    );
    settings.effects.expertRules = rules.filter((candidate) =>
      !selectedRuleIds.has(candidate.id)
      && !(
        candidate.targetType === "card"
        && selectedCardKeys.has(candidate.target)
      )
    );
    if (
      settings.effects.expertRules.length === 0
      && !String(settings.effects.expertCss || "").trim()
    ) {
      settings.effects.expertCssEnabled = false;
    }

    resetButton.disabled = true;
    status.textContent = "Kartenanpassungen werden entfernt …";
    status.className = "status";

    try {
      const result = await this._getHass().callWS({
        type: "theme_studio/save_settings",
        settings,
        previous_theme_studio_active: this.dashboardEditorThemeActive,
        ...(this.dashboardEditorActiveProfileId
          ? { active_profile_id: this.dashboardEditorActiveProfileId }
          : {}),
      });

      this.dashboardEditorSettings = JSON.parse(JSON.stringify(result.settings));
      this.dashboardEditorExistingRuleId = "";
      this.dashboardEditorSelectedRuleIds = new Map();
      this.dashboardEditorDirtyFields = new Set();
      this.dashboardEditorThemeActive = true;
      this._clearDashboardEditorLiveStyle();
      this.themeComputedStyles = null;
      this.glassLastScan = 0;
      this._readThemeSettings();
      this._startStartupSync();
      this._loadDashboardEditorRule(
        this.dashboardEditorSelectedCardKey,
        this.dashboardEditorSelectedEntityIds
      );
      if (selectionCount > 1) {
        this.dashboardEditorDirtyFields = new Set();
        this.dashboardEditorSelectedRuleIds = new Map();
        this.dashboardEditorExistingRuleId = "";
        this._updateDashboardEditorSelectionLabel();
        this._syncDashboardEditorResetButton();
      }
      status.textContent = selectionCount > 1
        ? `${selectionCount} Karten wurden auf ihre ursprüngliche Darstellung zurückgesetzt.`
        : "Karte wurde auf ihre ursprüngliche Darstellung zurückgesetzt.";
      status.className = "status success";
    } catch (error) {
      status.textContent = `Zurücksetzen fehlgeschlagen: ${error.message || error}`;
      status.className = "status error";
      this._syncDashboardEditorResetButton();
    }
  }

  _newDashboardEditorRuleId() {
    const bytes = new Uint8Array(6);

    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
  }

  _positionDashboardEditorHighlight() {
    const cards = this.dashboardEditorSelectedCards.length > 0
      ? this.dashboardEditorSelectedCards.map((entry) => entry.card)
      : [this.dashboardEditorHoveredCard].filter(Boolean);
    const highlights = [
      this.dashboardEditorHighlight,
      ...this.dashboardEditorExtraHighlights,
    ].filter(Boolean);

    while (highlights.length < cards.length && this.dashboardEditorHighlight) {
      const extra = this.dashboardEditorHighlight.cloneNode(false);
      document.body.appendChild(extra);
      this.dashboardEditorExtraHighlights.push(extra);
      highlights.push(extra);
    }

    while (this.dashboardEditorExtraHighlights.length > Math.max(0, cards.length - 1)) {
      this.dashboardEditorExtraHighlights.pop()?.remove();
    }

    highlights.forEach((highlight, index) => {
      const card = cards[index];
      if (!card?.isConnected) {
        highlight.style.display = "none";
        return;
      }

      const rect = card.getBoundingClientRect();
      highlight.style.display = "block";
      highlight.style.left = `${rect.left - 3}px`;
      highlight.style.top = `${rect.top - 3}px`;
      highlight.style.width = `${rect.width + 6}px`;
      highlight.style.height = `${rect.height + 6}px`;
      highlight.style.borderColor = this.dashboardEditorSelectedCards.length > 0
        ? "#ffb300"
        : "#26b2b3";
      const directlyMovable = index === 0
        && this.dashboardEditorSelectedCards.length > 0;
      highlight.style.pointerEvents = directlyMovable ? "auto" : "none";
      highlight.style.touchAction = directlyMovable ? "none" : "auto";
      highlight.style.cursor = directlyMovable ? "grab" : "default";
      const hint = highlight.querySelector?.("[data-theme-studio-direct-move-hint]");
      if (hint) hint.style.display = directlyMovable ? "block" : "none";
    });
  }

  _clearDashboardEditorLiveStyle() {
    for (const style of this.dashboardEditorLiveStyles) {
      style.remove();
    }

    for (const target of this.dashboardEditorSelectedTargets) {
      target.removeAttribute("data-theme-studio-dashboard-edit");
    }

    this.dashboardEditorLiveStyles.clear();
  }

  _clearDashboardEditorSelection() {
    this._hideDashboardEditorPlacementGuide();
    this._clearDashboardEditorLiveStyle();
    this.dashboardEditorSelectedCard = null;
    this.dashboardEditorSelectedCardKey = "";
    this.dashboardEditorSelectedCardName = "";
    this.dashboardEditorSelectedEntityIds = [];
    this.dashboardEditorHoveredCard = null;
    this.dashboardEditorSelectedTargets = [];
    this.dashboardEditorSelectedCards = [];
    this.dashboardEditorSelectedRuleIds = new Map();
    this.dashboardEditorExistingRuleId = "";
    this.dashboardEditorBaselineValues = {};
    this.dashboardEditorDirtyFields = new Set();
    this.dashboardEditorPanelDrag = null;
    this.dashboardEditorCardDrag = null;

    const root = this.dashboardEditorRoot?.shadowRoot;
    if (root) {
      root.querySelector("form").hidden = true;
      root.querySelector(".intro").hidden = false;
      root.querySelectorAll(".card-position-control button").forEach((button) => {
        button.disabled = true;
      });
      root.querySelector(".card-move").classList.remove("active");
      root.querySelector("header").classList.remove("dragging");
    }

    this._positionDashboardEditorHighlight();
  }

  _stopDashboardEditor(rescan = true) {
    if (!this.dashboardEditorActive && !this.dashboardEditorRoot) {
      return;
    }

    this._clearDashboardEditorSelection();
    document.removeEventListener(
      "click",
      this.dashboardEditorClickHandler,
      true
    );
    document.removeEventListener(
      "pointerover",
      this.dashboardEditorPointerHandler,
      true
    );
    document.removeEventListener(
      "keydown",
      this.dashboardEditorKeyHandler,
      true
    );
    window.removeEventListener(
      "scroll",
      this.dashboardEditorScrollHandler,
      true
    );

    this.dashboardEditorRoot?.remove();
    this.dashboardEditorHighlight?.remove();
    this.dashboardEditorOriginGuide?.remove();
    this.dashboardEditorGridGuide?.remove();
    this.dashboardEditorPositionLabel?.remove();
    for (const highlight of this.dashboardEditorExtraHighlights) {
      highlight.remove();
    }
    this.dashboardEditorExtraHighlights = [];
    this.dashboardEditorRoot = null;
    this.dashboardEditorHighlight = null;
    this.dashboardEditorOriginGuide = null;
    this.dashboardEditorGridGuide = null;
    this.dashboardEditorPositionLabel = null;
    this.dashboardEditorActive = false;
    this._syncDashboardToolbarButton();

    try {
      window.sessionStorage.removeItem(DASHBOARD_EDITOR_STORAGE_KEY);
    } catch (_error) {
      // Nothing else to clean up.
    }

    if (rescan) {
      this.glassLastScan = 0;
      this._syncLiquidGlassCards(true);
    }
  }

  _escapeDashboardEditorHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]);
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
      current._clearExpertCss?.();
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
