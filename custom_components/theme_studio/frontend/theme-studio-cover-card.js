import {
  COMMON_CARD_STYLES,
  COVER_FEATURES,
  ThemeStudioCardBase,
  ThemeStudioEntityCardEditor,
  calculateCoverPosition,
  clampPercentage,
  coverSupportsFeature,
  escapeHtml,
  friendlyName,
  isCoverCompatibilityConfirmed,
  normalizeCoverAppearance,
  normalizeCoverTravelTime,
  normalizeCardConfig,
  observeCoverCompatibilityTest,
  readCoverPosition,
  translateThemeStudioText,
} from "./theme-studio-card-base.js?v=0.11.1";

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

export function readCoverPercent(value) {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? clampPercentage(number) : null;
}

function learningRideExpired(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  return code === "cover_learning_finish_failed"
    && message.includes("No learning ride is active");
}

export function learningRideFinishFailureMessage(error) {
  return learningRideExpired(error)
    ? "Die Lernfahrt wurde bereits durch den 60-Sekunden-Sicherheitsstopp beendet. Bitte neu starten."
    : "Stopp oder Speicherung fehlgeschlagen. Bitte Not-Stopp drücken.";
}

export function shouldThrottlePositionSubscriptionFailure(
  failure,
  connection,
  entityId,
  now = Date.now(),
  cooldown = 30000
) {
  return Boolean(
    failure
    && failure.connection === connection
    && failure.entity === entityId
    && now - failure.at < cooldown
  );
}

export function shouldSuppressCoverMotionRestart(event, state) {
  return event?.motion_stopped === true
    && ["opening", "closing"].includes(String(state || ""));
}

export function shouldRefreshCoverPositionFallback(
  previousState,
  nextState,
  subscriptionActive
) {
  return Boolean(
    !subscriptionActive
    && nextState
    && previousState !== nextState
    && readCoverPosition(nextState) === null
  );
}

export function coverMotionTransition({
  state = "",
  hasMotion = false,
  seenMovingState = false,
  motionDirection = "",
  suppressStart = false,
  canEstimate = false,
  estimatedPosition = 50,
} = {}) {
  const moving = ["opening", "closing"].includes(state);
  if (hasMotion) {
    if (moving) {
      return seenMovingState && motionDirection && motionDirection !== state
        ? "restart"
        : "continue";
    }
    if (!canEstimate || seenMovingState) return "stop";
    return "continue";
  }
  if (!moving || !canEstimate || suppressStart) return "idle";
  const atTarget = (state === "opening" && estimatedPosition >= 100)
    || (state === "closing" && estimatedPosition <= 0);
  return atTarget ? "idle" : "start";
}

class ThemeStudioCoverCardEditor extends ThemeStudioEntityCardEditor {
  constructor() {
    super("cover");
    this._compatibilityTest = null;
    this._lastObservedCoverState = "";
    this._learningRide = null;
    this._learningBusy = false;
    this._learningEpoch = 0;
    this._learningCommandEntity = "";
  }

  disconnectedCallback() {
    const entityId = String(this._learningRide?.entity || this._learningCommandEntity || "");
    this._learningEpoch += 1;
    this._learningRide = null;
    this._learningCommandEntity = "";
    this._learningBusy = false;
    if (entityId) {
      const stopRequest = this._hass?.connection?.sendMessagePromise?.({
        type: "theme_studio/cover/stop",
        entity_id: entityId,
      });
      stopRequest?.catch?.(() => {});
    }
    this._compatibilityTest = null;
    super.disconnectedCallback();
  }

  get hass() { return this._hass; }

  set hass(hass) {
    const entityId = String(this._config?.entity || "");
    const previousState = this._lastObservedCoverState;
    const nextState = String(hass?.states?.[entityId]?.state || "");
    super.hass = hass;
    this._lastObservedCoverState = nextState;
    if (!this._compatibilityTest || !entityId || this._compatibilityTest.entity !== entityId) return;
    this._compatibilityTest.results = observeCoverCompatibilityTest(
      this._compatibilityTest.results,
      previousState,
      nextState
    );
    this._updateCompatibilityControls();
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
        .learning-times { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .learning-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .learning-actions .wide { grid-column:1 / -1; }
        .learning-ride { display:grid; gap:10px; padding-top:12px; border-top:1px solid var(--divider-color); }
        .learning-section label { display:grid; gap:6px; }
        .learning-section input { width:100%; min-height:40px; padding:8px 10px; border:1px solid var(--divider-color); border-radius:8px; color:var(--primary-text-color); background:var(--card-background-color); }
        .learning-section button { min-height:40px; padding:8px 10px; border:1px solid var(--divider-color); border-radius:9px; color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color) 6%, transparent); cursor:pointer; }
        .learning-section button.primary { border-color:var(--primary-color); }
        .learning-section button.danger { color:var(--warning-color, #ff9800); border-color:color-mix(in srgb, var(--warning-color, #ff9800) 55%, var(--divider-color)); }
        .learning-section button:disabled { cursor:not-allowed; opacity:.5; }
        .learning-section a { color:var(--primary-color); }
        .compatibility-list { display:grid; gap:7px; margin:0; padding:0; list-style:none; }
        .compatibility-list li { display:flex; align-items:center; gap:8px; color:var(--secondary-text-color); font-size:.82rem; }
        .compatibility-list [data-result-icon] { display:inline-grid; place-items:center; width:1.4rem; height:1.4rem; border:1px solid var(--divider-color); border-radius:50%; font-weight:800; }
        .compatibility-list li.complete { color:var(--primary-text-color); }
        .compatibility-list li.complete [data-result-icon] { border-color:var(--success-color, #4caf50); color:var(--success-color, #4caf50); }
        .confirmation { display:flex !important; grid-template-columns:none; align-items:flex-start; gap:9px !important; color:var(--primary-text-color); font-size:.82rem; line-height:1.4; }
        .confirmation input { width:auto; min-height:auto; margin-top:2px; }
        .measurement-status { min-height:1.2em; color:var(--primary-text-color) !important; font-weight:650; }
        @media (max-width:520px) { .learning-times, .learning-actions { grid-template-columns:1fr; } .learning-actions .wide { grid-column:auto; } }
      </style>
      <h3>Laufzeiten manuell eintragen</h3>
      <p>Die Werte steuern die geschätzte Positionsanzeige und den überwachten Stopp durch Home Assistant. Der Stopp läuft auch bei geschlossenem Dashboard weiter.</p>
      <div class="learning-times">
        <label><span>Öffnen (Sekunden)</span><input data-travel-time="opening_time" type="number" min="0.1" max="600" step="0.1" value="${this._config.opening_time || ""}"></label>
        <label><span>Schließen (Sekunden)</span><input data-travel-time="closing_time" type="number" min="0.1" max="600" step="0.1" value="${this._config.closing_time || ""}"></label>
      </div>
      <div class="learning-ride">
        <h3>Laufzeiten automatisch einlernen</h3>
        <p>Fahre zuerst in die gegenüberliegende Endlage. Starte dann die Lernfahrt und drücke am Ziel „Endpunkt erreicht & stoppen“. Home Assistant misst die Zeit und stoppt den Motor. Nach spätestens 60 Sekunden greift der Sicherheitsstopp.</p>
        <div class="learning-actions">
          <button class="primary" type="button" data-learning-start="opening">Öffnungsfahrt einlernen</button>
          <button class="primary" type="button" data-learning-start="closing">Schließfahrt einlernen</button>
          <button class="wide" type="button" data-learning-finish>Endpunkt erreicht & stoppen</button>
          <button class="wide danger" type="button" data-learning-emergency>Not-Stopp</button>
        </div>
        <p class="learning-ride-status" role="status" aria-live="assertive">Keine Lernfahrt aktiv.</p>
      </div>
      <h3>Passive Aktor-Prüfung</h3>
      <p>Bringe die Jalousie zunächst mit dem Wandschalter in eine mittlere Position. Starte dann die Prüfung und betätige am Wandschalter nacheinander Auf, Stopp, Ab und Stopp.</p>
      <p><strong>Theme Studio sendet während dieses Tests keine Fahrbefehle.</strong> Es beobachtet ausschließlich die von Home Assistant gemeldeten Zustände.</p>
      <p><a href="https://www.home-assistant.io/integrations/cover/" target="_blank" rel="noopener noreferrer">Home-Assistant-Cover-Dokumentation</a></p>
      <button class="primary" type="button" data-start-compatibility-test>Passive Prüfung starten</button>
      <ul class="compatibility-list" aria-label="Erkannte Zustände">
        <li data-test-result="opening"><span data-result-icon>–</span><span>Öffnen erkannt</span></li>
        <li data-test-result="closing"><span data-result-icon>–</span><span>Schließen erkannt</span></li>
        <li data-test-result="stopped"><span data-result-icon>–</span><span>Stopp erkannt</span></li>
      </ul>
      <p class="measurement-status" role="status" aria-live="polite">Die passive Prüfung wurde noch nicht gestartet.</p>
      <label class="confirmation"><input type="checkbox" data-confirm-compatibility-test disabled><span>Ich bestätige, dass die Jalousie bei Auf, Stopp und Ab wie erwartet reagiert hat.</span></label>
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
    section.querySelectorAll("[data-learning-start]").forEach((button) => {
      button.addEventListener("click", () => this._startLearningRide(button.dataset.learningStart));
    });
    section.querySelector("[data-learning-finish]")?.addEventListener("click", () => this._finishLearningRide());
    section.querySelector("[data-learning-emergency]")?.addEventListener("click", () => this._stopLearningRide());
    section.querySelector("[data-start-compatibility-test]")?.addEventListener("click", () => {
      const entityId = String(this._config?.entity || "");
      if (!entityId || !this._hass?.states?.[entityId]) {
        this._updateCompatibilityControls("Bitte zuerst eine Jalousie-Entität auswählen.");
        return;
      }
      this._compatibilityTest = {
        entity: entityId,
        results: { opening: false, closing: false, stopped: false },
      };
      this._lastObservedCoverState = String(this._hass.states[entityId].state || "");
      this._updateCompatibilityControls("Prüfung läuft. Bitte jetzt den Wandschalter betätigen.");
    });
    section.querySelector("[data-confirm-compatibility-test]")?.addEventListener("change", (event) => {
      if (!event.target.checked) {
        delete this._config.cover_test_confirmed;
        delete this._config.cover_test_confirmed_at;
        this._emitConfig();
        this._updateCompatibilityControls("Bestätigung aufgehoben. Zeit- und Lernfahrten sind gesperrt.");
        return;
      }
      if (!this._compatibilityTest) {
        event.target.checked = false;
        this._updateCompatibilityControls("Zum erneuten Bestätigen bitte die passive Prüfung neu starten.");
        return;
      }
      const results = this._compatibilityTest.results;
      if (![results.opening, results.closing, results.stopped].every(Boolean)) return;
      this._config.cover_test_entity = this._compatibilityTest.entity;
      this._config.cover_test_version = 1;
      this._config.cover_test_results = { ...results };
      this._config.cover_test_confirmed = true;
      this._config.cover_test_confirmed_at = new Date().toISOString();
      this._emitConfig();
      this._updateCompatibilityControls("Prüfung und Bestätigung wurden in der Kartenkonfiguration gespeichert.");
    });
    this._updateCompatibilityControls();
    this._updateLearningRideControls();
  }

  _canUseLearningRide() {
    const entityId = String(this._config?.entity || "");
    const state = this._hass?.states?.[entityId];
    return Boolean(
      entityId
      && state
      && coverSupportsFeature(state, COVER_FEATURES.STOP)
      && isCoverCompatibilityConfirmed(this._config, entityId)
    );
  }

  async _startLearningRide(direction) {
    if (this._learningBusy) {
      this._updateLearningRideControls("Bitte warten, der vorherige Vorgang wird noch verarbeitet.");
      return;
    }
    if (this._learningRide) {
      this._updateLearningRideControls("Eine Lernfahrt läuft bereits. Bitte am Endpunkt stoppen.");
      return;
    }
    if (!this._canUseLearningRide()) {
      this._updateLearningRideControls("Bitte zuerst die passive Aktor-Prüfung vollständig bestätigen.");
      return;
    }
    const connection = this._hass?.connection;
    const entityId = String(this._config?.entity || "");
    if (!connection?.sendMessagePromise || !entityId) {
      this._updateLearningRideControls("Home Assistant ist nicht verbunden. Es wurde keine Fahrt gestartet.");
      return;
    }
    this._learningBusy = true;
    const epoch = this._learningEpoch;
    this._learningCommandEntity = entityId;
    this._updateLearningRideControls("Fahrbefehl wird gesendet …");
    try {
      await connection.sendMessagePromise({
        type: "theme_studio/cover/learning_start",
        entity_id: entityId,
        direction,
      });
      if (epoch !== this._learningEpoch) return;
      this._learningRide = { entity: entityId, direction };
      this._updateLearningRideControls(
        `${direction === "opening" ? "Öffnungsfahrt" : "Schließfahrt"} läuft. Am Endpunkt sofort stoppen.`
      );
    } catch (_error) {
      if (epoch !== this._learningEpoch) return;
      this._updateLearningRideControls("Lernfahrt konnte nicht gestartet werden.");
    } finally {
      if (epoch === this._learningEpoch) {
        this._learningBusy = false;
        this._learningCommandEntity = "";
        this._updateLearningRideControls(null);
      }
    }
  }

  async _finishLearningRide() {
    if (this._learningBusy || !this._learningRide) return;
    const ride = this._learningRide;
    const connection = this._hass?.connection;
    if (!connection?.sendMessagePromise) {
      this._updateLearningRideControls("Home Assistant ist nicht verbunden. Bitte die Jalousie sofort am Wandschalter stoppen.");
      return;
    }
    this._learningBusy = true;
    const epoch = this._learningEpoch;
    this._learningCommandEntity = ride.entity;
    this._updateLearningRideControls("Motor wird gestoppt …");
    try {
      const result = await connection.sendMessagePromise({
        type: "theme_studio/cover/learning_finish",
        entity_id: ride.entity,
      });
      if (epoch !== this._learningEpoch) return;
      const duration = normalizeCoverTravelTime(result?.duration);
      if (duration === null) throw new Error("Ungültige Messzeit");
      const learnedPosition = readCoverPercent(result?.position);
      const position = learnedPosition ?? (ride.direction === "opening" ? 100 : 0);
      const field = ride.direction === "opening" ? "opening_time" : "closing_time";
      this._config[field] = duration;
      this._config.estimated_position = position;
      rememberCoverPosition(ride.entity, position, true);
      this._learningRide = null;
      this._emitConfig();
      this._updateLearningRideControls(
        `${ride.direction === "opening" ? "Öffnungszeit" : "Schließzeit"} gespeichert: ${duration.toFixed(1).replace(".", ",")} Sekunden.`
      );
    } catch (error) {
      if (epoch !== this._learningEpoch) return;
      if (learningRideExpired(error)) this._learningRide = null;
      this._updateLearningRideControls(learningRideFinishFailureMessage(error));
    } finally {
      if (epoch === this._learningEpoch) {
        this._learningBusy = false;
        this._learningCommandEntity = "";
        this._updateLearningRideControls(null);
      }
    }
  }

  async _stopLearningRide() {
    const entityId = String(this._learningRide?.entity || this._learningCommandEntity || this._config?.entity || "");
    const connection = this._hass?.connection;
    if (!connection?.sendMessagePromise || !entityId) {
      this._updateLearningRideControls("Home Assistant ist nicht verbunden. Bitte die Jalousie sofort am Wandschalter stoppen.");
      return;
    }
    const epoch = ++this._learningEpoch;
    this._learningBusy = true;
    this._learningCommandEntity = entityId;
    this._updateLearningRideControls("Not-Stopp wird gesendet …");
    try {
      await connection.sendMessagePromise({
        type: "theme_studio/cover/stop",
        entity_id: entityId,
      });
      if (epoch !== this._learningEpoch) return;
      this._learningRide = null;
      this._updateLearningRideControls("Motor gestoppt. Es wurde keine neue Laufzeit gespeichert.");
    } catch (_error) {
      if (epoch !== this._learningEpoch) return;
      this._updateLearningRideControls("Stopp fehlgeschlagen. Bitte die Jalousie sofort am Wandschalter stoppen.");
    } finally {
      if (epoch === this._learningEpoch) {
        this._learningBusy = false;
        this._learningCommandEntity = "";
        this._updateLearningRideControls(null);
      }
    }
  }

  _updateLearningRideControls(message = "") {
    const status = this.shadowRoot?.querySelector(".learning-ride-status");
    if (!status) return;
    const available = this._canUseLearningRide();
    const active = Boolean(this._learningRide);
    this.shadowRoot.querySelectorAll("[data-learning-start]").forEach((button) => {
      button.disabled = this._learningBusy || active || !available;
    });
    const finish = this.shadowRoot.querySelector("[data-learning-finish]");
    const emergency = this.shadowRoot.querySelector("[data-learning-emergency]");
    if (finish) finish.disabled = this._learningBusy || !active;
    if (emergency) emergency.disabled = !active && !available;
    if (message === null) return;
    if (message) status.textContent = translateThemeStudioText(message, this._hass);
    else if (active) {
      status.textContent = `${this._learningRide.direction === "opening" ? "Öffnungsfahrt" : "Schließfahrt"} läuft. Am Endpunkt sofort stoppen.`;
    } else if (!available) {
      status.textContent = "Lernfahrt erst nach bestätigter passiver Aktor-Prüfung verfügbar.";
    }
  }

  _emitConfig() {
    const entityId = String(this._config?.entity || "");
    if (this._config?.cover_test_entity && this._config.cover_test_entity !== entityId) {
      delete this._config.cover_test_entity;
      delete this._config.cover_test_version;
      delete this._config.cover_test_results;
      delete this._config.cover_test_confirmed;
      delete this._config.cover_test_confirmed_at;
      this._compatibilityTest = null;
    }
    super._emitConfig();
  }

  _updateCompatibilityControls(message = "") {
    const status = this.shadowRoot?.querySelector(".measurement-status");
    const confirmation = this.shadowRoot?.querySelector("[data-confirm-compatibility-test]");
    if (!status || !confirmation) return;
    const storedResults = this._config?.cover_test_entity === this._config?.entity
      ? this._config?.cover_test_results
      : null;
    const results = this._compatibilityTest?.results || storedResults || {
      opening: false,
      closing: false,
      stopped: false,
    };
    for (const key of ["opening", "closing", "stopped"]) {
      const row = this.shadowRoot?.querySelector(`[data-test-result="${key}"]`);
      if (!row) continue;
      row.classList.toggle("complete", Boolean(results[key]));
      const icon = row.querySelector("[data-result-icon]");
      if (icon) icon.textContent = results[key] ? "✓" : "–";
    }
    const complete = [results.opening, results.closing, results.stopped].every(Boolean);
    confirmation.disabled = !complete;
    confirmation.checked = Boolean(
      complete
      && this._config?.cover_test_confirmed
      && this._config?.cover_test_entity === this._config?.entity
    );
    this._updateLearningRideControls();
    if (message) status.textContent = translateThemeStudioText(message, this._hass);
    else if (confirmation.checked && this._config?.cover_test_confirmed_at) {
      const timestamp = new Date(this._config.cover_test_confirmed_at);
      status.textContent = `${translateThemeStudioText("Bestätigt am", this._hass)} ${Number.isNaN(timestamp.getTime()) ? this._config.cover_test_confirmed_at : timestamp.toLocaleString()}.`;
    } else if (this._compatibilityTest && complete) {
      status.textContent = "Alle Zustände wurden erkannt. Bitte das Ergebnis ausdrücklich bestätigen.";
    } else if (this._compatibilityTest) {
      status.textContent = "Prüfung läuft. Bitte jetzt den Wandschalter betätigen.";
    } else if (!this._config?.entity) {
      status.textContent = "Bitte zuerst eine Jalousie-Entität auswählen.";
    } else {
      status.textContent = "Die passive Prüfung wurde noch nicht gestartet.";
    }
  }
}

export class ThemeStudioCoverCard extends ThemeStudioCardBase {
  constructor() {
    super();
    this._estimatedPosition = 50;
    this._coverMotion = null;
    this._motionTimer = null;
    this._positionSyncEntity = "";
    this._positionSyncPending = false;
    this._positionSyncConnection = null;
    this._positionSyncGeneration = 0;
    this._positionSyncFailure = null;
    this._suppressStart = false;
    this._coverFeedback = "";
    this._motionCommandEpoch = 0;
    this._positionSubscription = null;
    this._positionSubscriptionConnection = null;
    this._positionSubscriptionPendingConnection = null;
    this._positionSubscriptionFailed = null;
    this._positionSubscriptionEntity = "";
    this._positionSubscriptionEpoch = 0;
    this._lastHassConnection = null;
  }

  connectedCallback() {
    super.connectedCallback?.();
    this._subscribePositionUpdates();
  }

  disconnectedCallback() {
    if (this._coverMotion) {
      this._rememberEstimatedPosition(this._currentVisualPosition(), true);
    }
    this._coverMotion = null;
    this._positionSyncEntity = "";
    this._positionSyncConnection = null;
    this._positionSyncFailure = null;
    this._positionSyncGeneration += 1;
    this._unsubscribePositionUpdates();
    super.disconnectedCallback();
    this._clearMotionTimer();
  }

  set hass(hass) {
    const entityId = String(this._config?.entity || "");
    const previousState = this._hass?.states?.[entityId];
    const nextState = hass?.states?.[entityId];
    const nextConnection = hass?.connection ?? null;
    const connectionChanged = this._lastHassConnection !== nextConnection;
    const subscriptionActive = this._positionSubscriptionConnection === nextConnection
      && this._positionSubscriptionEntity === entityId;
    const fallbackRefreshNeeded = shouldRefreshCoverPositionFallback(
      previousState,
      nextState,
      subscriptionActive
    );
    this._lastHassConnection = nextConnection;
    if (connectionChanged || fallbackRefreshNeeded) {
      this._positionSyncEntity = "";
      this._positionSyncConnection = null;
      this._positionSyncGeneration += 1;
    }
    super.hass = hass;
    this._subscribePositionUpdates();
  }

  get hass() { return this._hass; }

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
    const configuredEstimate = readCoverPercent(config.estimated_position);
    const appearance = normalizeCoverAppearance(config);
    const normalizedConfig = normalizeCardConfig(config, "cover");
    const compatibilityConfirmed = isCoverCompatibilityConfirmed(config, normalizedConfig.entity);
    const sameEntity = Boolean(this._config?.entity && this._config.entity === normalizedConfig.entity);
    const rememberedEstimate = readRememberedCoverPosition(normalizedConfig.entity);
    if (rememberedEstimate !== null) {
      this._estimatedPosition = rememberedEstimate;
    } else if (!sameEntity) {
      this._estimatedPosition = configuredEstimate ?? 50;
    }
    if (!sameEntity) {
      this._coverFeedback = "";
      this._coverMotion = null;
      this._suppressStart = false;
      this._motionCommandEpoch += 1;
      this._clearMotionTimer();
      this._unsubscribePositionUpdates();
    }
    this._config = {
      ...normalizedConfig,
      ...(normalizeCoverTravelTime(config.opening_time) !== null
        ? { opening_time: normalizeCoverTravelTime(config.opening_time) }
        : {}),
      ...(normalizeCoverTravelTime(config.closing_time) !== null
        ? { closing_time: normalizeCoverTravelTime(config.closing_time) }
        : {}),
      ...(configuredEstimate !== null
        ? { estimated_position: configuredEstimate }
        : {}),
      ...(appearance.material !== "theme" ? {
        cover_material: appearance.material,
        cover_texture: appearance.texture,
      } : {}),
      ...(appearance.color ? { cover_color: appearance.color } : {}),
      ...(compatibilityConfirmed ? {
        cover_test_entity: normalizedConfig.entity,
        cover_test_version: 1,
        cover_test_results: { opening: true, closing: true, stopped: true },
        cover_test_confirmed: true,
        cover_test_confirmed_at: String(config.cover_test_confirmed_at || "").slice(0, 64),
      } : {}),
    };
    if (this._positionSyncEntity !== normalizedConfig.entity) {
      this._positionSyncEntity = "";
      this._positionSyncGeneration += 1;
    }
    this._renderPreservingDialog();
    this._subscribePositionUpdates();
  }

  render() {
    if (!this._config) return this._missingCard("Jalousie-Entität auswählen");
    const state = this.stateObj;
    if (!state) return this._missingCard("Jalousie-Entität nicht gefunden");
    const position = readCoverPosition(state);
    if (position !== null) this._rememberEstimatedPosition(position);
    else if (state.state === "closed" || state.attributes?.is_closed === true) this._rememberEstimatedPosition(0);
    const visualPosition = this._currentVisualPosition(state, position);
    const tilt = readCoverPercent(state.attributes?.current_tilt_position);
    const canOpen = coverSupportsFeature(state, COVER_FEATURES.OPEN);
    const canClose = coverSupportsFeature(state, COVER_FEATURES.CLOSE);
    const canStop = coverSupportsFeature(state, COVER_FEATURES.STOP);
    const canSetPosition = coverSupportsFeature(state, COVER_FEATURES.SET_POSITION);
    const canSetTilt = coverSupportsFeature(state, COVER_FEATURES.SET_TILT_POSITION);
    const unavailable = ["unavailable", "unknown"].includes(state.state);
    const moving = ["opening", "closing"].includes(state.state);
    const positionless = position === null;
    if (positionless && !this._coverMotion) this._syncBackendPosition();
    const compatibilityConfirmed = isCoverCompatibilityConfirmed(
      this._config,
      this._config.entity
    );
    const canTimedOpen = canStop && compatibilityConfirmed
      && normalizeCoverTravelTime(this._config.opening_time) !== null;
    const canTimedClose = canStop && compatibilityConfirmed
      && normalizeCoverTravelTime(this._config.closing_time) !== null;
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
    const openDisabled = unavailable || (positionless && !canTimedOpen);
    const closeDisabled = unavailable || (positionless && !canTimedClose);
    const compactActions = [
      canOpen ? `<button class="action-button direction" data-cover-action="open_cover" aria-label="Öffnen" ${openDisabled ? 'disabled title="Laufzeit und bestätigte Stopp-Prüfung erforderlich"' : ""}><svg class="direction-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg></button>` : "",
      canStop ? `<button class="action-button stop" data-cover-action="stop_cover" aria-label="Stoppen" ${unavailable ? "disabled" : ""}>■</button>` : "",
      canClose ? `<button class="action-button direction" data-cover-action="close_cover" aria-label="Schließen" ${closeDisabled ? 'disabled title="Laufzeit und bestätigte Stopp-Prüfung erforderlich"' : ""}><svg class="direction-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14m5.5-5.5L12 19l-5.5-5.5"/></svg></button>` : "",
    ].filter(Boolean).join("");
    const dialogActions = [
      canOpen ? `<button class="action-button" data-cover-action="open_cover" ${openDisabled ? "disabled" : ""}>Öffnen</button>` : "",
      canStop ? `<button class="action-button stop" data-cover-action="stop_cover" ${unavailable ? "disabled" : ""}>Stopp</button>` : "",
      canClose ? `<button class="action-button" data-cover-action="close_cover" ${closeDisabled ? "disabled" : ""}>Schließen</button>` : "",
    ].filter(Boolean).join("");
    const positionControls = canSetPosition ? `
      <div class="range-row"><div class="range-label"><span>Geschlossen</span><output>${displayPosition}</output><span>Offen</span></div><input data-position type="range" min="0" max="100" value="${position ?? 0}" style="--range-value:${position ?? 0}%" aria-label="Öffnungsgrad"></div>
      <section class="dialog-section"><h4>Schnellpositionen</h4><div class="preset-grid">${[0, 25, 50, 100].map((value) => `<button class="choice-button" data-position-preset="${value}">${value} %</button>`).join("")}</div></section>
    ` : `<div class="position-sync"><p class="capability-note">Dieser Empfänger meldet keine genaue Position. Zeitfahrten sind erst nach eingetragener Laufzeit und bestätigter Stopp-Prüfung verfügbar.</p><div class="sync-grid"><button class="choice-button" data-sync-position="0">Als geschlossen markieren</button><button class="choice-button" data-sync-position="100">Als geöffnet markieren</button></div></div>`;
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
        .sync-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
        .capability-note { margin:0; color:var(--secondary-text-color); font-size:.78rem; line-height:1.45; }
        .cover-feedback { margin:0; color:var(--error-color, #db4437); font-size:.78rem; line-height:1.4; }
        .cover-feedback:empty { display:none; }
        .action-button:disabled { cursor:not-allowed; opacity:.45; }
        @media (max-width:560px) { .cover-stage { grid-template-columns:1fr; } .large-window { min-height:190px; } }
      </style>
      <ha-card>
        <div class="card-shell">
          <div class="card-header"><div class="entity-icon">${COVER_ICON}</div><div class="entity-copy"><h3 class="entity-name">${name}</h3><p class="entity-state"><span class="state-dot ${state.state === "closed" ? "off" : ""}"></span>${escapeHtml(stateLabel)}</p></div></div>
          <div class="cover-grid"><div class="position-copy"><span class="position-number" data-position-copy>${displayPosition}</span><span class="position-caption">${position === null ? "Geschätzter Öffnungsgrad" : "Öffnungsgrad"}</span></div><div class="window ${appearanceClass}"${appearanceStyle} aria-hidden="true"><div class="window-frame"><span class="window-glass"></span></div><div class="slats">${slats}</div></div></div>
          <p class="cover-feedback" data-cover-feedback role="status" aria-live="polite">${escapeHtml(this._coverFeedback)}</p>
          <div class="card-footer"><div class="quick-actions">${compactActions}</div><button class="detail-button" data-open-details>Details</button></div>
        </div>
      </ha-card>
      <dialog aria-label="${name} steuern">
        <div class="dialog-shell"><header class="dialog-header"><div class="entity-icon">${COVER_ICON}</div><div class="dialog-title"><h3>${name}</h3><p>${escapeHtml(stateLabel)}</p></div><button class="icon-button" data-close-dialog aria-label="Schließen">✕</button></header>
          <div class="dialog-body"><section class="cover-stage"><div class="window large-window ${appearanceClass}"${appearanceStyle} aria-hidden="true"><div class="window-frame"><span class="window-glass"></span></div><div class="slats">${slats}</div></div><div class="dialog-section"><h4>Steuerung</h4>${positionControls}<div class="quick-actions">${dialogActions}</div><p class="cover-feedback" data-cover-feedback>${escapeHtml(this._coverFeedback)}</p></div></section>
            ${tiltControls}
          </div><footer class="dialog-actions"><button data-close-dialog>Fertig</button></footer></div>
      </dialog>
    `);
    this._bindBaseEvents();
    this.shadowRoot.querySelectorAll("[data-cover-action]").forEach((button) => button.addEventListener("click", () => {
      const service = button.dataset.coverAction;
      if (service === "stop_cover") {
        const commandEpoch = ++this._motionCommandEpoch;
        this._suppressStart = true;
        this._showCoverFeedback("");
        this._stopVisualMotion();
        const stopRequest = Promise.resolve().then(() => (
          this._canEstimateMotion()
            ? this._callTimedCoverStop()
            : this._callService("cover", "stop_cover")
        ));
        stopRequest
          .then((result) => {
            if (commandEpoch !== this._motionCommandEpoch) return;
            const stoppedPosition = readCoverPercent(result?.position);
            if (stoppedPosition !== null) {
              this._rememberEstimatedPosition(stoppedPosition, true);
              this._updateMotionVisual();
            }
          }, () => {
            if (commandEpoch !== this._motionCommandEpoch) return;
            this._suppressStart = false;
            this._showCoverFeedback("Stopp fehlgeschlagen. Bitte sofort am Wandschalter stoppen.");
          });
        return;
      }
      this._suppressStart = false;
      this._showCoverFeedback("");
      const commandEpoch = ++this._motionCommandEpoch;
      const direction = service === "open_cover" ? "opening" : "closing";
      const moveRequest = Promise.resolve().then(() => (
        this._canEstimateMotion()
          ? this._callTimedCoverMove(direction)
          : this._callService("cover", service)
      ));
      moveRequest
        .then((result) => {
          if (commandEpoch !== this._motionCommandEpoch) return;
          if (this._canEstimateMotion() && result?.moved !== false) {
            if (this._coverMotion?.direction !== direction) {
              this._startVisualMotion(direction, result?.position);
            }
          }
        }, () => {
          if (commandEpoch !== this._motionCommandEpoch) return;
          this._stopVisualMotion();
          this._showCoverFeedback("Fahrt konnte nicht gestartet werden.");
        });
    }));
    this.shadowRoot.querySelector("[data-position]")?.addEventListener("change", (event) => this._runCoverCommand(() => this._callService("cover", "set_cover_position", { position: clampPercentage(event.target.value) })));
    this.shadowRoot.querySelectorAll("[data-position-preset]").forEach((button) => button.addEventListener("click", () => this._runCoverCommand(() => this._callService("cover", "set_cover_position", { position: Number(button.dataset.positionPreset) }))));
    this.shadowRoot.querySelectorAll("[data-sync-position]").forEach((button) => button.addEventListener("click", () => this._setBackendPosition(Number(button.dataset.syncPosition))));
    this.shadowRoot.querySelector("[data-tilt]")?.addEventListener("change", (event) => this._runCoverCommand(() => this._callService("cover", "set_cover_tilt_position", { tilt_position: clampPercentage(event.target.value) })));
    if (!moving) this._suppressStart = false;
    const motionTransition = coverMotionTransition({
      state: state.state,
      hasMotion: Boolean(this._coverMotion),
      seenMovingState: Boolean(this._coverMotion?.seenMovingState),
      motionDirection: this._coverMotion?.direction,
      suppressStart: this._suppressStart,
      canEstimate: this._canEstimateMotion(),
      estimatedPosition: this._estimatedPosition,
    });
    if (motionTransition === "start") {
      this._startVisualMotion(state.state, this._estimatedPosition, true);
    } else if (motionTransition === "restart") {
      const reversedPosition = this._currentVisualPosition();
      this._stopVisualMotion();
      this._startVisualMotion(state.state, reversedPosition, true);
    } else if (motionTransition === "continue") {
      if (this._coverMotion.direction === state.state) this._coverMotion.seenMovingState = true;
      if (this._motionTimer === null) this._startMotionTimer();
      this._updateMotionVisual();
    } else if (motionTransition === "stop") {
      this._stopVisualMotion();
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

  _canEstimateMotion() {
    return readCoverPosition(this.stateObj) === null
      && isCoverCompatibilityConfirmed(this._config, this._config?.entity);
  }

  _callTimedCoverMove(direction) {
    const connection = this._hass?.connection;
    if (!connection?.sendMessagePromise) {
      return Promise.reject(new Error("Home Assistant ist nicht verbunden."));
    }
    const startPosition = this._currentVisualPosition();
    const fullTravelTime = direction === "opening"
      ? this._config?.opening_time
      : this._config?.closing_time;
    if (normalizeCoverTravelTime(fullTravelTime) === null) {
      return Promise.reject(new Error("Bitte zuerst eine gültige Laufzeit eintragen."));
    }
    return connection.sendMessagePromise({
      type: "theme_studio/cover/timed_move",
      entity_id: this._config.entity,
      direction,
      full_duration: fullTravelTime,
      fallback_position: startPosition,
    });
  }

  _callTimedCoverStop() {
    const connection = this._hass?.connection;
    if (!connection?.sendMessagePromise) {
      return Promise.reject(new Error("Home Assistant ist nicht verbunden."));
    }
    return connection.sendMessagePromise({
      type: "theme_studio/cover/stop",
      entity_id: this._config.entity,
    });
  }

  async _syncBackendPosition() {
    const entityId = String(this._config?.entity || "");
    const connection = this._hass?.connection;
    if (!entityId || this._positionSyncPending
      || (this._positionSyncEntity === entityId && this._positionSyncConnection === connection)
      || !connection?.sendMessagePromise) return;
    if (shouldThrottlePositionSubscriptionFailure(
      this._positionSyncFailure,
      connection,
      entityId
    )) return;
    this._positionSyncPending = true;
    const generation = ++this._positionSyncGeneration;
    let requestSucceeded = false;
    try {
      const result = await connection.sendMessagePromise({
        type: "theme_studio/cover/position_get",
        entity_id: entityId,
      });
      requestSucceeded = true;
      if (generation === this._positionSyncGeneration) {
        this._positionSyncFailure = null;
      }
      const backendPosition = readCoverPercent(result?.position);
      if (generation === this._positionSyncGeneration && backendPosition !== null) {
        this._rememberEstimatedPosition(backendPosition, true);
      }
    } catch (_error) {
      if (generation === this._positionSyncGeneration) {
        this._positionSyncFailure = {
          connection,
          entity: entityId,
          at: Date.now(),
        };
      }
    } finally {
      if (generation === this._positionSyncGeneration && requestSucceeded) {
        this._positionSyncEntity = entityId;
        this._positionSyncConnection = connection;
      }
      this._positionSyncPending = false;
      if (this.isConnected) this._renderPreservingDialog();
    }
  }

  async _setBackendPosition(position) {
    const connection = this._hass?.connection;
    if (!connection?.sendMessagePromise) {
      this._showCoverFeedback("Position konnte nicht gespeichert werden.");
      return;
    }
    const generation = ++this._positionSyncGeneration;
    try {
      const result = await connection.sendMessagePromise({
        type: "theme_studio/cover/position_set",
        entity_id: this._config.entity,
        position: clampPercentage(position),
      });
      if (generation !== this._positionSyncGeneration) return;
      this._rememberEstimatedPosition(readCoverPercent(result?.position) ?? position, true);
      this._positionSyncEntity = this._config.entity;
      this._positionSyncConnection = connection;
      this._renderPreservingDialog();
    } catch (_error) {
      this._showCoverFeedback("Position konnte nicht gespeichert werden.");
    }
  }

  async _subscribePositionUpdates() {
    const connection = this._hass?.connection;
    const entityId = String(this._config?.entity || "");
    const state = this._hass?.states?.[entityId];
    if (!connection?.subscribeMessage || !entityId || readCoverPosition(state) !== null) {
      this._unsubscribePositionUpdates();
      return;
    }
    if ((this._positionSubscriptionConnection === connection
        && this._positionSubscriptionEntity === entityId)
      || (this._positionSubscriptionPendingConnection === connection
        && this._positionSubscriptionEntity === entityId)) return;
    if (shouldThrottlePositionSubscriptionFailure(
      this._positionSubscriptionFailed,
      connection,
      entityId
    )) return;
    this._unsubscribePositionUpdates();
    const epoch = ++this._positionSubscriptionEpoch;
    this._positionSubscriptionPendingConnection = connection;
    this._positionSubscriptionEntity = entityId;
    try {
      const unsubscribe = await connection.subscribeMessage((event) => {
        const eventEntityId = String(event?.entity_id || "");
        const position = readCoverPercent(event?.position);
        if (eventEntityId !== this._config?.entity) return;
        if (event?.motion_stopped === true && position === null) {
          const visualPosition = this._currentVisualPosition();
          this._coverMotion = null;
          this._clearMotionTimer();
          this._suppressStart = shouldSuppressCoverMotionRestart(
            event,
            this._hass?.states?.[eventEntityId]?.state
          );
          this._estimatedPosition = visualPosition;
          if (event?.stop_failed === true) {
            this._showCoverFeedback("Stopp fehlgeschlagen. Bitte sofort am Wandschalter stoppen.");
          }
          this._renderPreservingDialog();
          return;
        }
        if (position === null) return;
        if (event?.moving === true && ["opening", "closing"].includes(event?.direction)) {
          const elapsed = Number(event?.elapsed);
          const elapsedSeconds = Number.isFinite(elapsed)
            ? Math.max(0, elapsed)
            : 0;
          this._startVisualMotion(event.direction, position, false, elapsedSeconds);
          return;
        }
        this._coverMotion = null;
        this._clearMotionTimer();
        this._suppressStart = shouldSuppressCoverMotionRestart(
          event,
          this._hass?.states?.[eventEntityId]?.state
        );
        this._rememberEstimatedPosition(position, true);
        this._positionSyncEntity = eventEntityId;
        this._positionSyncConnection = connection;
        this._renderPreservingDialog();
      }, {
        type: "theme_studio/cover/subscribe_position",
        entity_id: entityId,
      });
      if (epoch !== this._positionSubscriptionEpoch || !this.isConnected) {
        await Promise.resolve(unsubscribe?.());
        return;
      }
      this._positionSubscription = unsubscribe;
      this._positionSubscriptionConnection = connection;
      this._positionSubscriptionEntity = entityId;
      this._positionSubscriptionFailed = null;
    } catch (_error) {
      if (epoch === this._positionSubscriptionEpoch) {
        this._positionSubscription = null;
        this._positionSubscriptionConnection = null;
        this._positionSubscriptionFailed = {
          connection,
          entity: entityId,
          at: Date.now(),
        };
      }
    } finally {
      if (epoch === this._positionSubscriptionEpoch) {
        this._positionSubscriptionPendingConnection = null;
      }
    }
  }

  _unsubscribePositionUpdates() {
    this._positionSubscriptionEpoch += 1;
    const unsubscribe = this._positionSubscription;
    this._positionSubscription = null;
    this._positionSubscriptionConnection = null;
    this._positionSubscriptionPendingConnection = null;
    this._positionSubscriptionEntity = "";
    if (typeof unsubscribe === "function") {
      Promise.resolve(unsubscribe()).catch(() => {});
    }
  }

  _startVisualMotion(
    direction,
    sharedStartPosition = null,
    alreadyMoving = false,
    elapsedSeconds = 0
  ) {
    const sharedPosition = readCoverPercent(sharedStartPosition);
    const startPosition = sharedPosition ?? this._currentVisualPosition();
    this._rememberEstimatedPosition(startPosition);
    this._coverMotion = {
      direction,
      startPosition,
      startedAt: performance.now() - Math.max(0, Number(elapsedSeconds) || 0) * 1000,
      seenMovingState: alreadyMoving,
    };
    this._startMotionTimer();
    this._updateMotionVisual();
  }

  _startMotionTimer() {
    this._clearMotionTimer();
    this._motionTimer = window.setInterval(() => this._updateMotionVisual(), 100);
  }

  _stopVisualMotion() {
    this._rememberEstimatedPosition(this._currentVisualPosition(), true);
    this._coverMotion = null;
    this._clearMotionTimer();
    this._updateMotionVisual();
  }

  _updateMotionVisual() {
    const calculatedPosition = this._currentVisualPosition();
    const position = Number.isFinite(calculatedPosition)
      ? clampPercentage(calculatedPosition)
      : this._estimatedPosition;
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
    const safePosition = readCoverPercent(position);
    if (safePosition === null) return;
    this._estimatedPosition = safePosition;
    rememberCoverPosition(this._config?.entity, this._estimatedPosition, persistImmediately);
  }

  _showCoverFeedback(message) {
    this._coverFeedback = translateThemeStudioText(message, this._hass);
    this.shadowRoot?.querySelectorAll("[data-cover-feedback]").forEach((element) => {
      element.textContent = this._coverFeedback;
    });
  }

  _runCoverCommand(command) {
    this._showCoverFeedback("");
    return Promise.resolve().then(command).catch(() => {
      this._showCoverFeedback("Befehl fehlgeschlagen.");
    });
  }

  _clearMotionTimer() {
    if (this._motionTimer !== null) window.clearInterval(this._motionTimer);
    this._motionTimer = null;
  }

}

if (!customElements.get("theme-studio-cover-card-editor")) customElements.define("theme-studio-cover-card-editor", ThemeStudioCoverCardEditor);
if (!customElements.get("theme-studio-cover-card")) customElements.define("theme-studio-cover-card", ThemeStudioCoverCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "theme-studio-cover-card")) {
  window.customCards.push({ type: "theme-studio-cover-card", name: translateThemeStudioText("Theme Studio Jalousie"), description: translateThemeStudioText("Kompakte Jalousiekarte mit visueller Position"), preview: true });
}
