const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../custom_components/theme_studio/frontend/theme-studio-panel.js'), 'utf8');
const start = source.indexOf('  async _saveAndApplySettings() {');
const end = source.indexOf('\n  _syncRecoveryButton()', start);
const method = new Function('return ({' + source.slice(start, end) + '})')()._saveAndApplySettings;
global.window = { setTimeout() {} };
async function scenario(change, fail = false) {
  let resolve, reject, submitted;
  const panel = {
    settings: { dark: { primaryColor: '#111111' }, effects: { cardEffects: [] } },
    appliedSettings: { previous: true }, activeProfileId: 'original', resets: 0,
    shadowRoot: { getElementById: () => ({}) },
    _hass: { callWS(message) {
      submitted = structuredClone(message.settings);
      return new Promise((yes, no) => { resolve = yes; reject = no; });
    } },
    _currentProfile: () => null, _cloneSettings: structuredClone,
    _resetHistory() { this.resets++; }, _syncUnsavedStatus() {},
    _syncRecoveryButton() {}, _setStatus() {}, _errorMessage: String,
  };
  const saving = method.call(panel);
  if (change === 'color') panel.settings.dark.primaryColor = '#222222';
  if (change === 'profile') panel.activeProfileId = 'another';
  if (fail) reject(new Error('Save failed'));
  else resolve({ settings: submitted, active_profile_id: 'original' });
  await saving;
  assert.equal(panel.settings.dark.primaryColor, change === 'color' ? '#222222' : '#111111');
  assert.equal(panel.resets, !change && !fail ? 1 : 0);
  if (fail) assert.deepEqual(panel.appliedSettings, { previous: true });
  else assert.deepEqual(panel.appliedSettings, submitted);
  if (change === 'profile') assert.equal(panel.activeProfileId, 'another');
}
(async () => {
  await scenario(''); await scenario('color'); await scenario('profile'); await scenario('color', true);
  console.log('4 save scenarios passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
