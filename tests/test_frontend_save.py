"""Run behavioral save tests against the actual panel method."""
from pathlib import Path
import subprocess


PANEL_SOURCE = (
    Path(__file__).parents[1]
    / "custom_components"
    / "theme_studio"
    / "frontend"
    / "theme-studio-panel.js"
).read_text(encoding="utf-8")


def test_edits_survive_inflight_save() -> None:
    subprocess.run(
        ["node", str(Path(__file__).with_name("frontend-save-race.cjs"))],
        check=True, capture_output=True, text=True, timeout=20,
    )


def test_profile_save_and_apply_share_effect_target_validation() -> None:
    """Incomplete effect targets are handled consistently by both actions."""

    save_profile = PANEL_SOURCE.split("async _saveProfile(", 1)[1].split(
        "async _renameProfile()", 1
    )[0]
    save_and_apply = PANEL_SOURCE.split(
        "async _saveAndApplySettings()", 1
    )[1].split("_syncRecoveryButton()", 1)[0]

    assert "if (!this._validateEffectTargets())" in save_profile
    assert "if (!this._validateEffectTargets())" in save_and_apply
    assert 'this._focusEffectTargetPicker(missing.searchId);' in PANEL_SOURCE
    assert 'field.classList.add("effect-target-required");' in PANEL_SOURCE
    assert 'searchInput.focus({ preventScroll: true });' in PANEL_SOURCE


def test_apply_saves_the_selected_profile_before_activation() -> None:
    """The primary action persists profile edits before saving active settings."""

    save_and_apply = PANEL_SOURCE.split(
        "async _saveAndApplySettings()", 1
    )[1].split("_syncRecoveryButton()", 1)[0]

    profile_save = 'await this._saveProfile({ announce: false })'
    active_save = 'type: "theme_studio/save_settings"'

    assert "const profileNeedsSave = !currentProfile" in save_and_apply
    assert profile_save in save_and_apply
    assert active_save in save_and_apply
    assert save_and_apply.index(profile_save) < save_and_apply.index(active_save)
    assert "if (!profileSaved)" in save_and_apply
    assert "this._focusProfileName();" in save_and_apply
