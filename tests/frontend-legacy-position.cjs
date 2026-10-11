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

const start = source.indexOf("  _disableLegacyPositionRules() {");
const end = source.indexOf("\n  _expertCssError(", start);
assert.ok(start > 0 && end > start, "legacy position helper missing");

const disableLegacyPositions = new Function(
  `return class {${source.slice(start, end)}}`
)().prototype._disableLegacyPositionRules;

const originalRules = [
  {
    id: "legacy",
    name: "Existing style",
    enabled: true,
    width: 246,
    padding: 8,
    borderRadius: 26,
    offsetX: 40,
    offsetY: -12,
  },
  {
    id: "stable",
    name: "No position",
    enabled: false,
    width: 320,
    padding: 4,
    borderRadius: 18,
    offsetX: null,
    offsetY: null,
  },
];

function createPanel(confirmResult) {
  const calls = [];
  return {
    settings: { effects: { expertRules: structuredClone(originalRules) } },
    _confirm: () => confirmResult,
    _recordHistory: () => calls.push("history"),
    _renderExpertRules: () => calls.push("render"),
    _syncLegacyPositionNotice: () => calls.push("notice"),
    _finishSettingsChange: () => calls.push("finish"),
    _setStatus: (message, type) => calls.push(["status", message, type]),
    calls,
  };
}

const cancelled = createPanel(false);
disableLegacyPositions.call(cancelled);
assert.deepEqual(cancelled.settings.effects.expertRules, originalRules);
assert.deepEqual(cancelled.calls, []);

const accepted = createPanel(true);
disableLegacyPositions.call(accepted);
const affected = accepted.settings.effects.expertRules[0];
const stable = accepted.settings.effects.expertRules[1];

assert.equal(affected.offsetX, null);
assert.equal(affected.offsetY, null);
assert.equal(affected.width, 246);
assert.equal(affected.padding, 8);
assert.equal(affected.borderRadius, 26);
assert.deepEqual(stable, originalRules[1]);
assert.equal(accepted.calls.filter((entry) => entry === "history").length, 1);
assert.equal(accepted.calls.filter((entry) => entry === "render").length, 1);
assert.equal(accepted.calls.filter((entry) => entry === "notice").length, 1);
assert.equal(accepted.calls.filter((entry) => entry === "finish").length, 1);
assert.equal(accepted.calls.at(-1)[0], "status");
assert.equal(accepted.calls.at(-1)[2], "success");

console.log("Legacy position migration preserves all non-position profile data.");
