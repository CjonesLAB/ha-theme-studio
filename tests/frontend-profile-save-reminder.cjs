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

const equalityStart = source.indexOf("  _settingsEqual(first, second) {");
const equalityEnd = source.indexOf("\n  _portableProfileSettings", equalityStart);
assert.ok(equalityStart > 0 && equalityEnd > equalityStart, "settings comparison missing");

const equality = new Function(
  `return class {${source.slice(equalityStart, equalityEnd)}}`
)().prototype._settingsEqual;

const dirtyStart = source.indexOf("  _hasUnsavedProfileChanges() {");
const dirtyEnd = source.indexOf("\n  _syncProfileSaveReminder()", dirtyStart);
assert.ok(dirtyStart > 0 && dirtyEnd > dirtyStart, "profile baseline helpers missing");
const ReminderPanel = new Function(
  `return class {
    _cloneSettings(value) { return structuredClone(value); }
    ${source.slice(dirtyStart, dirtyEnd)}
    ${source.slice(equalityStart, equalityEnd)}
  }`
)();

const syncStart = source.indexOf("  _syncProfileSaveReminder() {");
const syncEnd = source.indexOf("\n  _showProfileSaveSuccess()", syncStart);
assert.ok(syncStart > 0 && syncEnd > syncStart, "reminder synchronization missing");
const syncReminder = new Function(
  `return class {${source.slice(syncStart, syncEnd)}}`
)().prototype._syncProfileSaveReminder;

const first = {
  mode: "dark",
  dark: { primaryColor: "#112233", cardOpacity: 92 },
  effects: { cardEffects: ["status-pulse"], motion: 35 },
};
const reordered = {
  effects: { motion: 35, cardEffects: ["status-pulse"] },
  dark: { cardOpacity: 92, primaryColor: "#112233" },
  mode: "dark",
};
const changed = structuredClone(reordered);
changed.dark.primaryColor = "#334455";

assert.equal(equality(first, reordered), true, "key order must not create a false reminder");
assert.equal(equality(first, changed), false, "a real design change must be detected");

const panel = new ReminderPanel();
const nameInput = { value: "Abend" };
panel.shadowRoot = { getElementById: () => nameInput };
panel.settings = structuredClone(first);
assert.equal(
  panel._hasUnsavedProfileChanges(),
  false,
  "opening the panel without a baseline must never pulse"
);
panel._setProfileEditBaseline();
assert.equal(
  panel._hasUnsavedProfileChanges(),
  false,
  "the freshly loaded state must not pulse"
);
panel.settings.dark.primaryColor = "#334455";
assert.equal(
  panel._hasUnsavedProfileChanges(),
  true,
  "a user change after loading must pulse"
);
panel.settings = structuredClone(first);
assert.equal(
  panel._hasUnsavedProfileChanges(),
  false,
  "returning to the loaded state must stop the reminder"
);

global.window = {
  clearTimeout() {},
  setTimeout() { return 1; },
};
let reminderAdds = 0;
const saveButton = {
  dataset: {},
  offsetWidth: 100,
  title: "",
  classList: {
    add(name) { if (name === "profile-save-reminder") reminderAdds += 1; },
    remove() {},
  },
};
const syncContext = {
  shadowRoot: { getElementById: () => saveButton },
  profileSaveReminderTimer: null,
  _hasUnsavedProfileChanges: () => true,
  _translate: (value) => value,
};
syncReminder.call(syncContext);
syncReminder.call(syncContext);
assert.equal(
  reminderAdds,
  1,
  "rechecking the dirty state, including after Apply design, must not restart the orange pulse"
);

assert.ok(
  source.includes("0 0 0 5px #43a047"),
  "save confirmation must use a fixed green independent of the active theme"
);
assert.ok(
  source.includes("animation: profile-save-success 680ms ease-in-out 1"),
  "save confirmation must pulse exactly once"
);
assert.ok(
  source.includes('saveButton.dataset.profileNeedsSave === "true"'),
  "the reminder must remember whether the profile was already dirty"
);
assert.ok(
  source.includes("} else if (!wasNeedsSave) {"),
  "the orange pulse must only start when the profile first becomes dirty"
);
assert.ok(
  source.includes("}, 2200);"),
  "the orange animation class must be removed after the short reminder"
);
assert.ok(
  source.includes("async _saveAndApplySettings() {\n    this._stopProfileSaveReminderPulse();"),
  "Apply design must stop an orange reminder that is still running"
);
assert.ok(
  source.includes("this._resetHistory();\n        this._setProfileEditBaseline();"),
  "the normalized Apply design response must become the clean profile baseline"
);

console.log("Profile save reminder checks passed.");
