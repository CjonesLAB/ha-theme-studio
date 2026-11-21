const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");

const frontend = path.join(
  __dirname,
  "../custom_components/theme_studio/frontend"
);
const read = (name) => fs.readFileSync(path.join(frontend, name), "utf8");

const baseSource = read("theme-studio-card-base.js");
const loaderSource = read("theme-studio-device-cards.js");
const lightSource = read("theme-studio-light-card.js");
const powerSource = read("theme-studio-power-card.js");
const coverSource = read("theme-studio-cover-card.js");

for (const [name, source] of [
  ["light", lightSource],
  ["power", powerSource],
  ["cover", coverSource],
]) {
  assert.ok(
    source.includes("this._commitCardMarkup(`"),
    `${name} card must preserve Theme Studio presentation when live state updates rebuild its markup`
  );
}
assert.ok(
  baseSource.includes("persistentThemeStyles")
    && baseSource.includes("attribute.name.startsWith(\"data-theme-studio-\")"),
  "the shared card renderer must retain Theme Studio texture styles and presentation markers"
);
assert.ok(
  baseSource.includes("presentationStyle")
    && baseSource.includes('nextCard.setAttribute("style", presentationStyle)')
    && baseSource.includes("persistentThemeChildren"),
  "live entity updates must keep the active Theme Studio card shape and outline"
);
assert.ok(
  baseSource.includes(".card-header > .toggle { grid-column: 2;")
    && baseSource.includes("grid-template-columns: 38px minmax(0, 1fr);"),
  "mobile cards must move the toggle below the title so entity names remain readable"
);

async function importSource(source) {
  const encoded = Buffer.from(source).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

(async () => {
  globalThis.HTMLElement = class {
    attachShadow() {
      this.shadowRoot = {
        _hasChildren: false,
        hasChildNodes() { return this._hasChildren; },
        querySelectorAll() { return []; },
      };
      return this.shadowRoot;
    }
  };
  globalThis.customElements = { get: () => true, define() {} };
  globalThis.window = { customCards: [] };
  globalThis.document = { documentElement: { lang: "de" } };
  const testableBaseSource = baseSource.replace(
    /import \{[\s\S]*?\} from "\.\/theme-studio-locales\.js(?:\?v=[^"]+)?";/,
    `class ThemeStudioLocalizer {
      constructor(language) { this.language = language; }
      translate(value) { return value; }
      translateTree() {}
      observe() {}
      disconnect() {}
    }
    const themeStudioLanguage = () => "de";`
  );
  const helpers = await importSource(testableBaseSource);
  const lightModule = await import(`${pathToFileURL(path.join(frontend, "theme-studio-light-card.js")).href}?test=temperature-presets`);
  const coverModule = await import(`${pathToFileURL(path.join(frontend, "theme-studio-cover-card.js")).href}?test=motion-policy`);
  assert.equal(
    coverModule.learningRideFinishFailureMessage({
      code: "cover_learning_finish_failed",
      message: "No learning ride is active for this cover",
    }),
    "Die Lernfahrt wurde bereits durch den 60-Sekunden-Sicherheitsstopp beendet. Bitte neu starten.",
    "an expired learning ride must explain the server-side safety timeout"
  );
  assert.equal(
    coverModule.learningRideFinishFailureMessage(new Error("offline")),
    "Stopp oder Speicherung fehlgeschlagen. Bitte Not-Stopp drücken.",
    "other learning errors must retain the emergency-stop warning"
  );
  assert.equal(coverModule.readCoverPercent(null), null, "a missing backend position must stay unknown");
  assert.equal(coverModule.readCoverPercent(undefined), null, "an undefined backend position must stay unknown");
  assert.equal(coverModule.readCoverPercent(""), null, "an empty backend position must stay unknown");
  assert.equal(coverModule.readCoverPercent("   "), null, "a blank backend position must stay unknown");
  assert.equal(coverModule.readCoverPercent(false), null, "a boolean backend position must stay unknown");
  assert.equal(coverModule.readCoverPercent("63"), 63, "numeric backend positions must be accepted");
  assert.equal(coverModule.readCoverPercent(117), 100, "backend positions must be clamped safely");
  assert.equal(coverModule.readCoverPercent("invalid"), null, "invalid backend positions must stay unknown");
  const subscriptionConnection = {};
  const failedSubscription = {
    connection: subscriptionConnection,
    entity: "cover.terrace",
    at: 10_000,
  };
  assert.equal(
    coverModule.shouldThrottlePositionSubscriptionFailure(
      failedSubscription,
      subscriptionConnection,
      "cover.terrace",
      39_999
    ),
    true,
    "a failed position subscription must not be retried on every hass update"
  );
  assert.equal(
    coverModule.shouldThrottlePositionSubscriptionFailure(
      failedSubscription,
      subscriptionConnection,
      "cover.terrace",
      40_000
    ),
    false,
    "a failed position subscription may be retried after the cooldown"
  );
  assert.equal(
    coverModule.shouldThrottlePositionSubscriptionFailure(
      failedSubscription,
      {},
      "cover.terrace",
      20_000
    ),
    false,
    "a new Home Assistant connection must not inherit an old retry cooldown"
  );
  assert.equal(
    coverModule.shouldSuppressCoverMotionRestart(
      { motion_stopped: true },
      "opening"
    ),
    true,
    "a final backend position must suppress a delayed opening state"
  );
  assert.equal(
    coverModule.shouldSuppressCoverMotionRestart(
      { initial: true },
      "opening"
    ),
    false,
    "an initial subscription snapshot must not be mistaken for a motor stop"
  );
  assert.equal(
    coverModule.shouldSuppressCoverMotionRestart(
      { motion_stopped: true },
      "stopped"
    ),
    false,
    "a settled stopped state does not need restart suppression"
  );
  const fallbackStateA = { state: "stopped", attributes: {} };
  const fallbackStateB = { state: "opening", attributes: {} };
  assert.equal(
    coverModule.shouldRefreshCoverPositionFallback(
      fallbackStateA,
      fallbackStateB,
      false
    ),
    true,
    "a state change without a live subscription must refresh the backend fallback"
  );
  assert.equal(
    coverModule.shouldRefreshCoverPositionFallback(
      fallbackStateA,
      fallbackStateB,
      true
    ),
    false,
    "a live subscription must avoid redundant fallback polling"
  );
  assert.equal(
    coverModule.externalCoverMotionTransition("stopped", "opening", true),
    "start",
    "a wall-button opening state must register a backend safety timer"
  );
  assert.equal(
    coverModule.externalCoverMotionTransition("opening", "stopped", true),
    "stop",
    "pressing the same wall button again must cancel the backend timer"
  );
  assert.equal(
    coverModule.externalCoverMotionTransition("opening", "opening", true),
    "idle",
    "ordinary updates during a ride must not register duplicate timers"
  );
  assert.equal(
    coverModule.externalCoverMotionTransition("stopped", "opening", false),
    "idle",
    "covers without a confirmed timed setup must not call the timer backend"
  );
  assert.equal(
    coverModule.shouldRefreshCoverPositionFallback(
      fallbackStateA,
      { state: "opening", attributes: { current_position: 42 } },
      false
    ),
    false,
    "covers with native position feedback never need the estimate fallback"
  );
  const failedPositionSyncCard = new coverModule.ThemeStudioCoverCard();
  failedPositionSyncCard._config = { entity: "cover.terrace" };
  let failedPositionSyncCalls = 0;
  const failedPositionSyncConnection = {
    sendMessagePromise: () => {
      failedPositionSyncCalls += 1;
      return Promise.reject(new Error("offline"));
    },
  };
  failedPositionSyncCard._hass = {
    connection: failedPositionSyncConnection,
  };
  failedPositionSyncCard._renderPreservingDialog = () => {};
  await failedPositionSyncCard._syncBackendPosition();
  assert.equal(
    failedPositionSyncCard._positionSyncEntity,
    "",
    "a failed position_get must remain retryable"
  );
  assert.equal(
    failedPositionSyncCard._positionSyncConnection,
    null,
    "a failed position_get must not mark its connection as synchronized"
  );
  await failedPositionSyncCard._syncBackendPosition();
  assert.equal(
    failedPositionSyncCalls,
    1,
    "a failed position_get must be throttled instead of retrying on every render"
  );
  assert.equal(
    failedPositionSyncCard._positionSyncFailure?.connection,
    failedPositionSyncConnection,
    "a failed position_get must remember the failed connection"
  );
  failedPositionSyncCard._positionSyncFailure.at -= 30000;
  await failedPositionSyncCard._syncBackendPosition();
  assert.equal(
    failedPositionSyncCalls,
    2,
    "a failed position_get must become retryable after the cooldown"
  );

  const disconnectedPositionSyncCard = new coverModule.ThemeStudioCoverCard();
  disconnectedPositionSyncCard._config = { entity: "cover.terrace" };
  disconnectedPositionSyncCard._hass = {
    connection: { sendMessagePromise: () => Promise.resolve({ position: 42 }) },
  };
  let disconnectedPositionSyncRenders = 0;
  disconnectedPositionSyncCard._renderPreservingDialog = () => {
    disconnectedPositionSyncRenders += 1;
  };
  await disconnectedPositionSyncCard._syncBackendPosition();
  assert.equal(
    disconnectedPositionSyncRenders,
    0,
    "a completed position_get must not render a disconnected card"
  );
  const unknownStopCard = new coverModule.ThemeStudioCoverCard();
  unknownStopCard._config = { entity: "cover.terrace" };
  Object.defineProperty(unknownStopCard, "isConnected", { value: true });
  let positionEventHandler;
  unknownStopCard._hass = {
    states: { "cover.terrace": { state: "closing", attributes: {} } },
    connection: {
      subscribeMessage: (handler) => {
        positionEventHandler = handler;
        return Promise.resolve(() => {});
      },
    },
  };
  unknownStopCard._coverMotion = {
    direction: "closing",
    startPosition: 100,
    startedAt: performance.now(),
    seenMovingState: true,
  };
  let unknownStopRenders = 0;
  unknownStopCard._renderPreservingDialog = () => {
    unknownStopRenders += 1;
  };
  await unknownStopCard._subscribePositionUpdates();
  positionEventHandler({
    entity_id: "cover.terrace",
    position: null,
    motion_stopped: true,
    stop_failed: true,
  });
  assert.equal(
    unknownStopCard._coverMotion,
    null,
    "a backend safety stop must end the animation even when the position is unknown"
  );
  assert.equal(
    unknownStopCard._suppressStart,
    true,
    "an unknown safety stop must suppress a delayed moving state"
  );
  assert.equal(
    unknownStopRenders,
    1,
    "an unknown safety stop must refresh the card"
  );
  assert.equal(
    unknownStopCard._coverFeedback,
    "Stopp fehlgeschlagen. Bitte sofort am Wandschalter stoppen.",
    "a final safety-stop failure must visibly warn the user"
  );
  assert.equal(coverModule.coverMotionTransition({
    state: "stopped",
    hasMotion: true,
    seenMovingState: false,
    canEstimate: true,
  }), "continue", "a receiver without moving states must not cancel a backend-timed animation");
  assert.equal(coverModule.coverMotionTransition({
    state: "stopped",
    hasMotion: true,
    seenMovingState: true,
    canEstimate: true,
  }), "stop", "a real stopped transition after movement must stop the animation");
  assert.equal(coverModule.coverMotionTransition({
    state: "opening",
    hasMotion: false,
    estimatedPosition: 100,
    canEstimate: true,
  }), "idle", "a delayed opening state must not restart animation at the open endpoint");
  assert.equal(coverModule.coverMotionTransition({
    state: "closing",
    hasMotion: true,
    seenMovingState: true,
    motionDirection: "opening",
    canEstimate: true,
  }), "restart", "a physical direction reversal must restart the estimate in the reported direction");
  assert.equal(coverModule.coverMotionTransition({
    state: "opening",
    hasMotion: false,
    suppressStart: true,
    estimatedPosition: 40,
    canEstimate: true,
  }), "idle", "a stale moving state must not restart animation after a stop click");
  assert.deepEqual(
    lightModule.lightTemperaturePresets(2000, 6500),
    { minKelvin: 2000, maxKelvin: 6500, warmKelvin: 2700, coolKelvin: 6500 },
    "standard lamps must receive useful warm-white and cool-white targets"
  );
  assert.deepEqual(
    lightModule.lightTemperaturePresets(4000, 2200),
    { minKelvin: 2200, maxKelvin: 4000, warmKelvin: 2700, coolKelvin: 4000 },
    "presets must stay inside each lamp's actual Kelvin range"
  );
  assert.deepEqual(
    lightModule.lightTemperaturePresets(2800, 6200),
    { minKelvin: 2800, maxKelvin: 6200, warmKelvin: 2800, coolKelvin: 6200 },
    "an RGBWW light exposed as color_temp plus RGB must use its reported Kelvin limits"
  );
  assert.deepEqual(
    lightModule.lightWhiteChannelServiceData(["rgb", "white"], "warm", 100, 2700),
    { white: 255 },
    "a light with a dedicated WHITE mode must drive its W channel instead of mixing RGB"
  );
  assert.deepEqual(
    lightModule.lightWhiteChannelServiceData(["rgbw"], "warm", 50, 2700),
    { rgbw_color: [0, 0, 0, 128] },
    "RGBW lights must explicitly zero RGB and drive only W"
  );
  assert.deepEqual(
    lightModule.lightWhiteChannelServiceData(["rgbww"], "cool", 100, 6500),
    { rgbww_color: [0, 0, 0, 255, 0] },
    "RGBWW lights must address the cold-white channel directly"
  );
  assert.deepEqual(
    lightModule.lightWhiteChannelServiceData(["color_temp", "hs"], "warm", 100, 2700),
    { color_temp_kelvin: 2700 },
    "native color-temperature lights must continue using Kelvin"
  );

  const editor = new helpers.ThemeStudioEntityCardEditor("switch");
  editor.renderCount = 0;
  editor._render = function renderEditorOnce() {
    this.renderCount += 1;
    this.shadowRoot._hasChildren = true;
  };
  editor.hass = { states: {} };
  editor.hass = { states: { "switch.test": { state: "off" } } };
  assert.equal(
    editor.renderCount,
    1,
    "live Home Assistant updates must not rebuild and close an open entity picker"
  );

  assert.deepEqual(
    helpers.normalizeCardConfig(
      { entity: " light.wohnzimmer ", name: " Wohnzimmer ", compact: false },
      "light"
    ),
    { entity: "light.wohnzimmer", name: "Wohnzimmer", compact: false }
  );
  assert.ok(
    baseSource.includes("Name der Karte (optional)")
      && baseSource.includes("Leer lassen, um den Namen der Entität zu verwenden."),
    "the visual editor must offer a clearly labelled optional card name"
  );
  assert.ok(
    baseSource.includes('<input data-field="name" type="text"'),
    "the optional card name must use a reliably visible text input"
  );
  assert.ok(
    baseSource.includes('input[data-field="name"]'),
    "the visual editor must bind the native card-name input"
  );
  assert.ok(
    baseSource.includes('nameField.addEventListener("input"')
      && baseSource.includes("_setNameValue"),
    "typing a card name must update the visual configuration immediately"
  );
  editor._config = { entity: "switch.test" };
  editor._setNameValue("  Terrassen Tür  ");
  assert.equal(editor._config.name, "Terrassen Tür");
  editor._setNameValue("   ");
  assert.equal(Object.hasOwn(editor._config, "name"), false);
  assert.throws(
    () => helpers.normalizeCardConfig({ entity: "switch.waschmaschine" }, "light"),
    /light\./
  );
  assert.equal(
    helpers.readNumericAttribute(
      { attributes: { current_power_w: "428.4" } },
      ["power", "current_power_w"],
      0
    ),
    428.4
  );
  assert.equal(
    helpers.readNumericAttribute(
      { attributes: { current_power_w: "unavailable" } },
      ["power", "current_power_w"],
      7
    ),
    7
  );
  assert.equal(helpers.clampPercentage(117), 100);
  assert.equal(helpers.clampPercentage(-3), 0);
  const easywaveCover = {
    state: "stopped",
    attributes: { supported_features: 11, is_closed: null },
  };
  assert.equal(helpers.coverSupportsFeature(easywaveCover, helpers.COVER_FEATURES.OPEN), true);
  assert.equal(helpers.coverSupportsFeature(easywaveCover, helpers.COVER_FEATURES.CLOSE), true);
  assert.equal(helpers.coverSupportsFeature(easywaveCover, helpers.COVER_FEATURES.STOP), true);
  assert.equal(helpers.coverSupportsFeature(easywaveCover, helpers.COVER_FEATURES.SET_POSITION), false);
  assert.equal(helpers.canLearnCoverTravelTimes(easywaveCover), true);
  assert.equal(
    helpers.canLearnCoverTravelTimes({ attributes: { supported_features: 3 } }),
    false
  );
  assert.equal(helpers.canLearnCoverTravelTimes(null), false);
  assert.equal(helpers.readCoverPosition(easywaveCover), null);
  assert.equal(
    helpers.readCoverPosition({ attributes: { current_position: "63" } }),
    63
  );
  assert.equal(helpers.normalizeCoverTravelTime("24.6"), 24.6);
  assert.equal(helpers.normalizeCoverTravelTime(0), null);
  assert.equal(helpers.normalizeCoverTravelTime(9999), 600);
  assert.deepEqual(
    helpers.normalizeCoverAppearance({
      cover_material: "wood",
      cover_texture: "grain",
      cover_color: "#8A5A32",
    }),
    { material: "wood", texture: "grain", color: "#8a5a32" }
  );
  assert.deepEqual(
    helpers.normalizeCoverAppearance({
      cover_material: "unsupported",
      cover_texture: "sparkles",
      cover_color: "red; background:url(test)",
    }),
    { material: "theme", texture: "smooth", color: "" }
  );
  let compatibility = helpers.observeCoverCompatibilityTest({}, "stopped", "stopped");
  assert.deepEqual(compatibility, { opening: false, closing: false, stopped: false });
  compatibility = helpers.observeCoverCompatibilityTest(compatibility, "stopped", "opening");
  assert.deepEqual(compatibility, { opening: true, closing: false, stopped: false });
  compatibility = helpers.observeCoverCompatibilityTest(compatibility, "opening", "stopped");
  assert.deepEqual(compatibility, { opening: true, closing: false, stopped: true });
  compatibility = helpers.observeCoverCompatibilityTest(compatibility, "stopped", "closing");
  assert.deepEqual(compatibility, { opening: true, closing: true, stopped: true });
  assert.deepEqual(
    helpers.observeCoverCompatibilityTest({}, "opening", "unavailable"),
    { opening: false, closing: false, stopped: false }
  );
  assert.equal(helpers.isCoverCompatibilityConfirmed({
    cover_test_entity: "cover.easywave",
    cover_test_confirmed: true,
    cover_test_confirmed_at: "2026-11-19T12:00:00.000Z",
    cover_test_version: 1,
    cover_test_results: { opening: true, closing: true, stopped: true },
  }, "cover.easywave"), true);
  assert.equal(helpers.isCoverCompatibilityConfirmed({
    cover_test_entity: "cover.other",
    cover_test_confirmed: true,
    cover_test_confirmed_at: "2026-11-19T12:00:00.000Z",
    cover_test_version: 1,
    cover_test_results: { opening: true, closing: true, stopped: true },
  }, "cover.easywave"), false);
  assert.equal(helpers.isCoverCompatibilityConfirmed({
    cover_test_entity: "cover.easywave",
    cover_test_confirmed: true,
    cover_test_confirmed_at: "2026-11-19T12:00:00.000Z",
    cover_test_version: 1,
    cover_test_results: { opening: true, closing: false, stopped: true },
  }, "cover.easywave"), false);
  assert.equal(helpers.isCoverCompatibilityConfirmed({
    cover_test_entity: "cover.easywave",
    cover_test_confirmed: true,
    cover_test_version: 1,
    cover_test_results: { opening: true, closing: true, stopped: true },
  }, "cover.easywave"), false);
  assert.equal(helpers.calculateCoverPosition({ reportedPosition: 63 }), 63);
  assert.equal(helpers.calculateCoverPosition({ state: "closed", estimatedPosition: 70 }), 0);
  assert.equal(helpers.calculateCoverPosition({ state: "open", estimatedPosition: 20 }), 20);
  assert.equal(helpers.calculateCoverPosition({ isClosed: false, estimatedPosition: 45 }), 45);
  assert.equal(helpers.calculateCoverPosition({
    direction: "opening",
    estimatedPosition: 20,
    elapsedSeconds: 10,
    openingTime: 40,
  }), 45);
  assert.equal(helpers.calculateCoverPosition({
    direction: "closing",
    estimatedPosition: 80,
    elapsedSeconds: 10,
    closingTime: 40,
  }), 55);
  assert.equal(helpers.calculateCoverRemainingTravelTime("opening", 25, 40), 30);
  assert.equal(helpers.calculateCoverRemainingTravelTime("closing", 75, 40), 30);
  assert.equal(helpers.calculateCoverRemainingTravelTime("opening", 25, null), null);
  const relatedHass = {
    states: {
      "switch.powerplug1": { state: "on", attributes: { friendly_name: "PowerPlug1" } },
      "sensor.powerplug1_power": { state: "428.4", attributes: { device_class: "power", unit_of_measurement: "W" } },
      "sensor.powerplug1_voltage": { state: "231.8", attributes: { device_class: "voltage", unit_of_measurement: "V" } },
      "sensor.powerplug1_current": { state: "1.85", attributes: { device_class: "current", unit_of_measurement: "A" } },
      "sensor.powerplug1_power_factor": { state: "0.94", attributes: { device_class: "power_factor" } },
      "sensor.unrelated_power": { state: "900", attributes: { device_class: "power", unit_of_measurement: "W" } },
    },
    entities: {
      "switch.powerplug1": { device_id: "plug-device" },
      "sensor.powerplug1_power": { device_id: "plug-device" },
      "sensor.powerplug1_voltage": { device_id: "plug-device" },
      "sensor.powerplug1_current": { device_id: "plug-device" },
      "sensor.powerplug1_power_factor": { device_id: "plug-device" },
      "sensor.unrelated_power": { device_id: "other-device" },
    },
  };
  assert.equal(
    helpers.findRelatedSensor(relatedHass, "switch.powerplug1", {
      deviceClasses: ["power"], units: ["W"], suffixes: ["power"],
    }),
    "sensor.powerplug1_power"
  );
  for (const [deviceClass, unit, expected] of [
    ["voltage", "V", "sensor.powerplug1_voltage"],
    ["current", "A", "sensor.powerplug1_current"],
    ["power_factor", null, "sensor.powerplug1_power_factor"],
  ]) {
    assert.equal(
      helpers.findRelatedSensor(relatedHass, "switch.powerplug1", {
        deviceClasses: [deviceClass],
        ...(unit ? { units: [unit] } : {}),
      }),
      expected
    );
  }
  assert.equal(
    helpers.energyPeriodLabel({
      entityId: "sensor.powerplug1_energy",
      state: { attributes: { friendly_name: "PowerPlug1 Energie", state_class: "total_increasing" } },
    }),
    "Gesamt"
  );
  assert.equal(
    helpers.energyPeriodLabel({
      entityId: "sensor.powerplug1_energy_today",
      state: { attributes: { friendly_name: "PowerPlug1 Energie heute", state_class: "total_increasing" } },
    }),
    "Heute"
  );
  assert.equal(
    helpers.energyPeriodLabel({
      entityId: "",
      attributeNames: ["energy_today"],
    }),
    "Heute"
  );
  assert.equal(
    helpers.energyPeriodLabel({
      entityId: "sensor.powerplug1_tagesverbrauch",
      state: { attributes: { friendly_name: "PowerPlug1 Tagesverbrauch" } },
    }),
    "Heute"
  );

  assert.ok(
    loaderSource.includes('import "./theme-studio-light-card.js?v=0.11.2"')
      && loaderSource.includes('import "./theme-studio-power-card.js?v=0.11.2"')
      && loaderSource.includes('import "./theme-studio-cover-card.js?v=0.11.2"'),
    "the registered loader must import all three versioned cards"
  );

  for (const [source, element, type] of [
    [lightSource, "theme-studio-light-card", "custom:theme-studio-light-card"],
    [powerSource, "theme-studio-power-card", "custom:theme-studio-power-card"],
    [coverSource, "theme-studio-cover-card", "custom:theme-studio-cover-card"],
  ]) {
    assert.ok(source.includes(`customElements.define("${element}"`));
    assert.ok(source.includes(`type: "${type}"`));
    assert.ok(source.includes(`type: "${element}"`));
    assert.ok(source.includes("static getStubConfig("));
    assert.ok(source.includes("static getConfigElement()"));
    assert.ok(
      source.includes("getGridOptions()")
        && !source.includes("static getGridOptions()"),
      "Home Assistant must receive grid sizing from the card instance"
    );
    assert.ok(source.includes("getCardSize()"));
    assert.ok(
      source.includes("grid_options: { columns: 6, rows: 3 }"),
      "new cards must open Home Assistant's manual layout controls by default"
    );
    assert.ok(
      source.includes("theme_studio_layout_initialized: true"),
      "new cards must remember that their layout choice was initialized"
    );
    assert.ok(source.includes("<ha-card"));
    assert.ok(source.includes("<dialog"));
    assert.ok(source.includes("var(--primary-text-color"));
    assert.ok(source.includes("var(--secondary-text-color"));
    assert.ok(source.includes("var(--primary-color"));
    assert.ok(!source.includes("background: #"));
    assert.ok(!source.includes(".card-shell::before"));
    assert.ok(!source.includes(".card-shell::after"));
    assert.ok(
      source.includes('class="card-footer'),
      "all device cards must place their detail action in the same footer row"
    );
  }

  assert.ok(baseSource.includes("showModal()") && baseSource.includes("returnValue"));
  assert.ok(
    baseSource.includes("Im Reiter Layout kannst du Breite und Höhe frei wählen"),
    "the editor must explain where Home Assistant exposes manual sizing"
  );
  assert.ok(
    baseSource.includes("picker.includeDeviceClasses = definition?.deviceClasses")
      && baseSource.includes("picker.includeUnitOfMeasurement = definition?.units"),
    "optional sensor pickers must use Home Assistant's native device-class filters"
  );
  assert.ok(
    baseSource.includes("theme_studio_layout_initialized")
      && baseSource.includes("queueMicrotask")
      && baseSource.includes("columns: 6")
      && baseSource.includes("rows: 3"),
    "legacy cards must migrate once to Home Assistant's manual layout controls"
  );

  assert.ok(lightSource.includes('this._callService("light", "toggle")'));
  assert.ok(lightSource.includes('this._callService("light", "turn_on"'));
  assert.ok(lightSource.includes("brightness_pct"));
  assert.ok(lightSource.includes("color_temp_kelvin"));
  assert.ok(
    lightSource.includes('data-temperature-preset="warm"')
      && lightSource.includes('data-temperature-preset="cool"'),
    "the light dialog must offer direct Warmweiß and Kaltweiß choices"
  );
  assert.ok(
    lightSource.includes("WARM_WHITE_KELVIN")
      && lightSource.includes("COOL_WHITE_KELVIN")
      && lightSource.includes("_setTemperaturePreset"),
    "white presets must use bounded Kelvin targets and control the light"
  );
  assert.ok(
    lightSource.includes('data-light-control-view="white"')
      && lightSource.includes('data-light-control-view="color"')
      && lightSource.includes("_setLightControlView"),
    "color-capable lights must offer a persistent switch between white tones and color"
  );
  assert.ok(
    lightSource.includes("supportsWhiteTone")
      && lightSource.includes("supportsColorTemperature || supportsDedicatedWhite")
      && lightSource.includes('["white", "rgbw", "rgbww"]'),
    "white controls must use only native temperature or dedicated white-channel capabilities"
  );
  assert.ok(
    lightSource.includes('showWhiteControls = supportsWhiteTone && this._lightControlView === "white"')
      && lightSource.includes('showColorControls = supportsColor && this._lightControlView === "color"'),
    "the white and color panels must be interlocked so only one can be active"
  );
  assert.ok(lightSource.includes('class="color-wheel"'));
  assert.ok(lightSource.includes("data-color-wheel"));
  assert.ok(lightSource.includes("supported_color_modes"));
  assert.ok(lightSource.includes("hs_color"));
  assert.ok(!lightSource.includes("Schnelle Farben"));
  assert.ok(!lightSource.includes("data-rgb"));
  assert.ok(lightSource.includes(".light-dialog-body"));
  assert.ok(lightSource.includes(".light-control-grid"));
  assert.ok(lightSource.includes("width: min(220px, 52vw)"));
  assert.ok(lightSource.includes('class="card-footer light-footer"'));
  assert.ok(
    lightSource.includes('data-card-brightness')
      && lightSource.includes('<button class="detail-button"'),
    "the brightness control and Details action must share one footer row"
  );
  assert.ok(
    lightSource.includes('this._callService("light", "turn_off")')
      && lightSource.includes("brightness_pct: value"),
    "the compact brightness slider must control the light"
  );
  assert.ok(!lightSource.includes('<span class="card-footer-label">Farbe und Helligkeit</span>'));

  assert.ok(powerSource.includes('this._callService("switch", "toggle")'));
  assert.ok(powerSource.includes("findRelatedSensor"));
  assert.ok(powerSource.includes("_resolvedPowerEntity"));
  assert.ok(powerSource.includes('"current_power_w"'));
  assert.ok(powerSource.includes('"energy_today"'));
  assert.ok(powerSource.includes("energyPeriodLabel"));
  assert.ok(powerSource.includes("${energyLabel}"));
  assert.ok(powerSource.includes('"power_factor"'));
  for (const [field, deviceClass] of [
    ["power_entity", "power"],
    ["energy_entity", "energy"],
    ["voltage_entity", "voltage"],
    ["current_entity", "current"],
    ["power_factor_entity", "power_factor"],
  ]) {
    assert.ok(
      powerSource.includes(`key: "${field}"`)
        && powerSource.includes(`deviceClasses: ["${deviceClass}"]`),
      `${field} must only offer ${deviceClass} sensors`
    );
  }
  assert.ok(
    powerSource.includes("_resolvedVoltageEntity")
      && powerSource.includes("_resolvedCurrentEntity")
      && powerSource.includes("_resolvedPowerFactorEntity"),
    "the detail overlay must resolve all electrical measurement sensors"
  );

  assert.ok(coverSource.includes('this._callService("cover", service)'));
  assert.ok(coverSource.includes('service === "open_cover"'));
  assert.ok(coverSource.includes('service === "stop_cover"'));
  assert.ok(coverSource.includes('data-cover-action="close_cover"'));
  assert.ok(
    coverSource.includes('class="action-button direction"')
      && coverSource.includes(".action-button.direction")
      && coverSource.includes('class="direction-icon"')
      && coverSource.includes("stroke-linecap=\"round\"")
      && coverSource.includes("background:color-mix(in srgb, var(--primary-text-color) 10%, transparent)"),
    "cover direction arrows must remain clearly visible on every Theme Studio card background"
  );
  assert.ok(coverSource.includes('this._callService("cover", "set_cover_position"'));
  assert.ok(baseSource.includes("current_position"));
  assert.ok(coverSource.includes("current_tilt_position"));
  assert.ok(
    coverSource.includes("coverSupportsFeature")
      && coverSource.includes("COVER_FEATURES.SET_POSITION")
      && coverSource.includes("COVER_FEATURES.STOP"),
    "cover controls must follow the capabilities reported by Home Assistant"
  );
  assert.ok(
    coverSource.includes('state.state === "stopped"')
      && coverSource.includes("Geschätzter Öffnungsgrad")
      && coverSource.includes("_startVisualMotion"),
    "covers without position feedback must show an animated estimate instead of pretending to be closed"
  );
  assert.ok(
    coverSource.includes("Passive Aktor-Prüfung")
      && coverSource.includes("Theme Studio sendet während dieses Tests keine Fahrbefehle")
      && coverSource.includes("data-start-compatibility-test")
      && coverSource.includes("data-confirm-compatibility-test")
      && coverSource.includes("cover_test_confirmed_at"),
    "the cover editor must provide a passive, explicitly confirmed compatibility test"
  );
  assert.ok(
    !coverSource.includes("_callCoverService(")
      && !coverSource.includes("stopCoverAndConfirmTravelTime")
      && !coverSource.includes("Öffnungsfahrt starten"),
    "the compatibility test must never start or stop a motor"
  );
  assert.ok(
    coverSource.includes("opening_time") && coverSource.includes("closing_time"),
    "manual opening and closing times must be stored separately"
  );
  assert.ok(
    coverSource.includes("background:transparent;")
      && coverSource.includes('class="window-frame"')
      && !coverSource.includes('.window::after { content:""'),
    "the cover animation must leave card styling to Theme Studio while retaining a structural window frame"
  );
  assert.ok(
    coverSource.includes("Jalousie-Darstellung")
      && coverSource.includes("Aluminium")
      && coverSource.includes("Kunststoff")
      && coverSource.includes("Holz")
      && coverSource.includes("Vom Theme"),
    "the visual editor must offer theme-aware cover material choices"
  );
  assert.ok(
    coverSource.includes("--ts-cover-slat-color")
      && coverSource.includes("--ts-cover-slat-texture"),
    "cover material choices must only style the animated slats"
  );
  assert.ok(
    coverSource.includes('class="window-frame"')
      && coverSource.includes(".window-frame::before")
      && coverSource.includes(".window-frame::after")
      && coverSource.includes(".slats { position:absolute; inset:6px;"),
    "the cover visualization must keep a recognizable window frame visible when the slats are open"
  );
  assert.ok(
    !coverSource.includes("_motionStopTimer")
      && !coverSource.includes("window.setTimeout"),
    "the card must not own a browser stop timer"
  );
  assert.ok(
    coverSource.includes('type: "theme_studio/cover/timed_move"')
      && coverSource.includes('type: "theme_studio/cover/stop"')
      && coverSource.includes("sendMessagePromise"),
    "positionless confirmed covers must use the Home Assistant-side stop timer"
  );
  assert.ok(
    coverSource.includes("Laufzeiten automatisch einlernen")
      && coverSource.includes("Öffnungsfahrt einlernen")
      && coverSource.includes("Schließfahrt einlernen")
      && coverSource.includes("Endpunkt erreicht & stoppen")
      && coverSource.includes("Not-Stopp")
      && coverSource.includes('type: "theme_studio/cover/learning_start"')
      && coverSource.includes('type: "theme_studio/cover/learning_finish"'),
    "the cover editor must expose a backend-monitored learning ride"
  );
  assert.ok(
    coverSource.includes("COVER_POSITION_STORAGE_PREFIX")
      && coverSource.includes("readRememberedCoverPosition")
      && coverSource.includes("rememberCoverPosition")
      && coverSource.includes("localStorage.getItem")
      && coverSource.includes("localStorage.setItem"),
    "estimated cover positions must survive card recreation and layout changes"
  );
  assert.ok(
    coverSource.includes("rememberedEstimate !== null")
      && coverSource.includes("sameEntity")
      && coverSource.includes("this._rememberEstimatedPosition(position"),
    "a stale configured estimate must not replace the last known position for the same cover"
  );
  assert.ok(
    coverSource.includes('type: "theme_studio/cover/position_get"')
      && coverSource.includes('type: "theme_studio/cover/position_set"')
      && coverSource.includes("_syncBackendPosition")
      && coverSource.includes("_positionSyncGeneration"),
    "positionless covers must share their estimate through Home Assistant instead of browser storage alone"
  );
  assert.ok(
    coverSource.includes("full_duration: fullTravelTime")
      && coverSource.includes("fallback_position: startPosition")
      && !coverSource.includes("duration: Math.max(0.1, remaining)"),
    "the backend must calculate remaining travel from its shared position"
  );
  assert.ok(
    coverSource.includes("this._config.estimated_position = position")
      && coverSource.includes("rememberCoverPosition(ride.entity, position, true)"),
    "finishing a learning ride must synchronize the learned endpoint"
  );
  assert.ok(
    coverSource.includes("Home Assistant ist nicht verbunden. Bitte die Jalousie sofort am Wandschalter stoppen.")
      && coverSource.includes("_suppressStart")
      && coverSource.includes("motionDirection")
      && coverSource.includes("seenMovingState"),
    "disconnects and delayed state updates must not silently stop or freeze the safety UI"
  );
  assert.ok(
    coverSource.includes("Zum erneuten Bestätigen bitte die passive Prüfung neu starten.")
      && coverSource.includes("event.target.checked = false"),
    "the compatibility checkbox must immediately reflect a rejected confirmation"
  );
  assert.ok(
    coverSource.includes("Position konnte nicht gespeichert werden.")
      && coverSource.includes("Stopp fehlgeschlagen. Bitte sofort am Wandschalter stoppen."),
    "position sync and emergency stop failures must be visible to the user"
  );
  assert.ok(
    coverSource.includes("this._learningEpoch")
      && coverSource.includes("epoch !== this._learningEpoch")
      && !coverSource.includes("if (this._learningBusy) return;"),
    "an emergency stop must invalidate pending learning responses instead of being blocked by them"
  );
  assert.ok(
    coverSource.includes("this._learningCommandEntity")
      && coverSource.includes('type: "theme_studio/cover/stop"')
      && coverSource.includes("disconnectedCallback()"),
    "closing the editor during a pending or active learning ride must request a stop"
  );
  assert.ok(
    coverSource.includes("this._coverMotion = null")
      && coverSource.includes('this._positionSyncEntity = ""')
      && coverSource.includes("_lastHassConnection"),
    "reconnects must reload the shared backend estimate without polling on every state update"
  );
  assert.ok(
    coverSource.includes('type: "theme_studio/cover/subscribe_position"')
      && coverSource.includes("subscribeMessage")
      && coverSource.includes("_positionSubscriptionPendingConnection")
      && coverSource.includes("_positionSubscriptionFailed")
      && coverSource.includes("_lastHassConnection"),
    "backend position changes must use one stable, non-admin-compatible subscription per connection"
  );
  assert.ok(
    coverSource.includes("event?.elapsed")
      && !coverSource.includes("event?.started_at")
      && !coverSource.includes("Date.now() / 1000"),
    "cover animation synchronization must not compare the browser clock with the Home Assistant server clock"
  );
  assert.ok(
    coverSource.includes("get hass() { return this._hass; }")
      && coverSource.includes("this._learningBusy = false")
      && coverSource.includes("this._suppressStart = false"),
    "reused editors and entity changes must not retain stale busy or motion state"
  );
  assert.ok(
    coverSource.includes("const configuredEstimate = readCoverPercent(config.estimated_position)")
      && coverSource.includes("const tilt = readCoverPercent(state.attributes?.current_tilt_position)"),
    "empty configured estimates and tilt values must remain unknown"
  );
  assert.ok(
    coverSource.includes("Befehl fehlgeschlagen.")
      && coverSource.includes("_runCoverCommand"),
    "position, preset and tilt command failures must be handled visibly"
  );
  assert.ok(
    coverSource.includes("data-sync-position")
      && coverSource.includes("Als geschlossen markieren")
      && coverSource.includes("Als geöffnet markieren"),
    "users must be able to safely resynchronize a position without moving the motor"
  );
  assert.ok(
    coverSource.includes("delete this._config.cover_test_confirmed")
      && coverSource.includes("if (!event.target.checked)"),
    "a previously granted compatibility confirmation must be revocable"
  );

  console.log("Theme Studio device card checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
