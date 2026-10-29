const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "../custom_components/theme_studio/frontend/theme-studio-panel.js"
  ),
  "utf8"
);
const locales = fs.readFileSync(
  path.join(
    __dirname,
    "../custom_components/theme_studio/frontend/theme-studio-locales.js"
  ),
  "utf8"
);
const websocket = fs.readFileSync(
  path.join(
    __dirname,
    "../custom_components/theme_studio/websocket.py"
  ),
  "utf8"
);

assert.ok(
  source.includes('id="device-preview-overlay"'),
  "the device preview overlay must be rendered"
);
assert.ok(
  source.includes('data-device-preview-device="desktop"')
    && source.includes('data-device-preview-device="tablet"')
    && source.includes('data-device-preview-device="phone"'),
  "desktop, tablet and phone formats must be available"
);
assert.ok(
  !source.includes('data-device-preview-source="design"')
    && !source.includes('data-device-preview-source="dashboard"'),
  "the obsolete preview source switch must not be rendered"
);
assert.ok(
  source.includes("_rotateDevicePreview()"),
  "tablet and phone previews must support orientation changes"
);
assert.ok(
  source.includes("if (!this.devicePreviewDashboardsLoaded)")
    && source.includes("void this._loadDevicePreviewDashboards();")
    && !source.includes("source.cloneNode(true)"),
  "opening the overlay must immediately load the real dashboard"
);
assert.ok(
  source.includes('document.createElement("iframe")')
    && source.includes("_protectDevicePreviewDashboard(dashboard")
    && source.includes('"action",')
    && source.includes('"click",'),
  "the real dashboard must be embedded as a read-only view"
);
assert.ok(
  source.includes(".device-preview-dashboard {")
    && source.includes("pointer-events: auto;"),
  "the embedded dashboard must retain native wheel and touch scrolling"
);
assert.ok(
  source.includes('.device-preview-frame[data-preview-source="dashboard"][data-device="desktop"]')
    && source.includes('aspect-ratio: auto;'),
  "the desktop dashboard must use the full available overlay area"
);
assert.ok(
  source.includes('"theme-studio-last-dashboard-path"'),
  "the real dashboard preview must reuse the last visited dashboard path"
);
assert.ok(
  source.includes('id="device-preview-dashboard-select"')
    && source.includes('type: "lovelace/config"'),
  "users must be able to select an exact Lovelace dashboard view"
);
assert.ok(
  source.includes("Object.entries(this._hass?.panels || {})")
    && !source.includes("Object.entries(this.hass?.panels || {})"),
  "dashboard choices must use the Home Assistant instance stored by the panel"
);
assert.ok(
  source.includes('id="device-preview-profile-select"')
    && source.includes("selectedProfile?.settings || this.settings")
    && source.includes("this.devicePreviewProfileId = event.target.value"),
  "saved designs must be selectable without replacing the editor state"
);
assert.ok(
  source.includes('id="device-preview-apply"')
    && source.includes("await this._saveAndApplySettings()")
    && source.includes("if (succeeded) {")
    && source.includes("this._closeDevicePreview();"),
  "the selected design must be applicable and close the preview after success"
);
assert.ok(
  source.includes('theme_studio_preview')
    && source.includes('"theme-studio-preview-dashboard-path"'),
  "the embedded preview must not overwrite the selected dashboard path"
);
assert.ok(
  source.includes('type: "theme_studio/preview_theme"')
    && source.includes('target.style.setProperty(property, String(value))'),
  "the real dashboard must receive the currently selected design variables"
);
assert.ok(
  source.includes("this.devicePreviewThemeCache = new Map()")
    && source.includes("this.devicePreviewThemeCache.size > 8")
    && source.includes("requestRevision !== this.devicePreviewThemeRevision")
    && source.includes("_themeStudioReadOnlyCleanup"),
  "preview requests, cache entries and iframe listeners must remain bounded"
);
assert.ok(
  websocket.includes('"theme_studio/preview_theme"')
    && websocket.includes("build_effect_values(settings, active_profile_id)")
    && websocket.includes("build_mode_values(settings[mode], mode)"),
  "the backend must build transient preview variables without saving a theme"
);
const previewCommand = websocket.slice(
  websocket.indexOf('): "theme_studio/preview_theme"'),
  websocket.indexOf('): "theme_studio/save_settings"')
);
assert.ok(
  previewCommand.includes("@websocket_api.require_admin")
    && !previewCommand.includes("async_save_user_state(")
    && !previewCommand.includes("write_theme_file("),
  "the transient preview must remain admin-only and must not persist data"
);
assert.ok(
  source.includes('event.key === "Escape"'),
  "the modal preview must close with Escape"
);
assert.ok(
  source.includes("this.devicePreviewReturnFocus?.focus?."),
  "closing the preview must restore keyboard focus"
);
assert.ok(
  source.includes("das echte Dashboard bleibt unverändert"),
  "the overlay must explain that it does not alter the dashboard"
);
assert.equal(
  (locales.match(/"Gerätevorschau":/g) || []).length,
  3,
  "the device preview must be translated in every bundled language"
);

console.log("Device preview overlay checks passed.");
