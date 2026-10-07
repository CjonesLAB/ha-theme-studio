# Theme Studio 0.8.3 - User Guide

**English** | [Deutsch](BENUTZERHANDBUCH.de.md) | [Français](GUIDE_UTILISATEUR.fr.md) | [Español](GUIA_USUARIO.es.md)

[Download PDF](../downloads/theme-studio-user-guide-en.pdf) | [Latest release](https://github.com/CjonesLAB/ha-theme-studio/releases/latest) | [Report an issue](https://github.com/CjonesLAB/ha-theme-studio/issues)

This guide explains Theme Studio from installation through visual dashboard design and safe management of existing card rules. It applies to version **0.8.3**.

> Always create a complete Home Assistant backup before installation, updates, or major design changes.

![Theme Studio 0.8.0 with profiles, fine-tuning, and dashboard preview](../images/theme-studio-overview-v080.png)

## Contents

1. Requirements and compatibility
2. Installation
3. First start and interface
4. Community Gallery
5. Custom design profiles
6. Colors, cards, navigation, and background
7. Dashboard and card effects
8. Expert mode and legacy position rules
9. Apply, undo, restore, and reset
10. JSON import, export, and publication
11. Per-user settings, data, and privacy
12. Updating
13. Troubleshooting and recommended workflow

## 1. Requirements and compatibility

Theme Studio is a custom Home Assistant integration. Administrator rights are required for installation. A regular user account is sufficient for day-to-day design work afterward.

Theme Studio generates a real Home Assistant theme, so colors and compatible theme variables can affect many pages. Card effects and Expert CSS require the normal **Lovelace card structure**.

> **Important limitation:** Fully custom dashboards or custom panels that render their own HTML or web-component structure are not supported by card effects or Expert CSS. Base theme colors may still work, but effects cannot be guaranteed.

Also note:

- Dashboard effects are disabled in Home Assistant settings under `/config` and inside dialogs.
- The system setting **Reduce motion** automatically disables animated effects.
- Expert rules may need adjustment after a Home Assistant update.
- The interface is responsive on desktop, tablet, and phone.

## 2. Installation

### 2.1 Recommended: install through HACS

1. Open **Integrations** in HACS.
2. Open the top-right three-dot menu and select **Custom repositories**.
3. Enter `https://github.com/CjonesLAB/ha-theme-studio` as the repository.
4. Select **Integration** as the category and add it.
5. Open **Theme Studio** and download the latest version.
6. Restart Home Assistant.
7. Open **Settings -> Devices & services -> Add integration**.
8. Search for **Theme Studio** and add it.

Theme Studio then appears in the sidebar. Its dashboard-effects module is registered automatically; no `frontend.extra_module_url` entry is required.

### 2.2 Manual installation

1. Download the installation package from the latest GitHub release.
2. Copy the included `theme_studio` folder to `/config/custom_components/theme_studio`.
3. Make sure themes are enabled in `/config/configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

4. Check the configuration and restart Home Assistant.
5. Add Theme Studio under **Settings -> Devices & services**.

After installation or an update, hard-refresh the browser with `Ctrl + F5`. Fully close and reopen the Companion App.

## 3. First start and interface

Open Theme Studio from the Home Assistant sidebar. The main actions are shown at the top:

- **Undo / Redo:** correct unapplied editing steps.
- **Apply design:** save current values, generate the theme, and activate it for the current user.
- **Restore last design:** switch back to the automatically saved previous state.
- **Version badge:** displays the installed Theme Studio version.

The page has three main areas:

1. **Community Gallery** for reviewed designs.
2. **My design profiles** for storing and sharing complete designs.
3. **Fine-tuning** for colors, cards, navigation, background, and effects.

The preview reacts immediately. The real Home Assistant theme changes only after **Apply design**. A visible notice indicates unapplied changes or profile changes that have not yet been saved.

## 4. Community Gallery

The gallery loads reviewed designs from [ha-theme-studio.com](https://ha-theme-studio.com/). Each preview shows a compact dashboard and follows the fixed Light or Dark mode of the design.

To use a gallery design:

1. Select **Refresh** when needed.
2. Browse with the arrow buttons or a swipe gesture.
3. Select **Import with one click** on the desired design.
4. Select the imported profile under **My design profiles**.
5. Press **Apply design**.

Gallery profiles are validated again before storage. The creator's local image paths are not imported because those image files do not exist on your installation.

## 5. Custom design profiles

A profile is exactly **one Light or one Dark design**. Theme Studio does not generate an automatic counterpart inside the same profile.

### Create a profile

1. Enter a unique name.
2. Choose **Light** or **Dark**.
3. Select **Create new design**.
4. Customize it in Fine-tuning.
5. Select **Save profile**, then **Apply design**.

### Manage profiles

- **Load:** copy profile values into the editor.
- **Update profile:** write current changes into the selected profile.
- **Rename:** change only the profile name.
- **Duplicate:** create an independent copy.
- **Delete:** remove the profile; the active theme remains until another design is applied.

Up to 64 independent designs can be stored. The most recently applied profile is selected automatically the next time Theme Studio opens.

## 6. Colors, cards, navigation, and background

### 6.1 Colors

The **Colors** section provides a primary color, preset accents, and background colors. Color swatches open the native picker. Verify text contrast in both the preview and the real dashboard before final use.

### 6.2 Cards

![Card settings with Standard, Liquid Glass, and Tech Frame](../images/fine-settings-cards-tech-frame-v063.png)

Three card styles are available:

- **Standard:** classic Home Assistant cards without glass filtering.
- **Liquid Glass:** transparent cards with blur, saturation, and light reflections. Conflicting material values are controlled automatically.
- **Tech Frame:** asymmetric corner cuts with a closed outline, configurable glow, border, and shadow.

Depending on the style, you can adjust radius or corner cut, card color, text and icon color, border color, opacity, border width, shadow, blur, and glow.

### 6.3 Navigation

![Navigation with header, sidebar, and selected item](../images/fine-settings-navigation-v044.png)

Header and sidebar can use custom background, text, icon, and accent colors. The active menu item can be highlighted separately. Test the result with the sidebar expanded and collapsed.

### 6.4 Background

![Background selection and image library](../images/fine-settings-background-library-v044.png)

Choose a solid color, gradient, or custom image. The image library supports up to 24 JPG, PNG, or WebP files.

- Only administrators can add, rename, or delete shared images.
- Every user can select an available shared image for a private design.
- Images used by the active design or a saved profile are protected from accidental deletion.
- **Darken background** helps keep text readable over bright images.

## 7. Dashboard and card effects

![Dashboard effects with entity search and multiple selection](../images/dashboard-effects-entity-selection-v044.png)

### Background effect

**Space Command** adds a star field and light accents. It works in Light and Dark mode but stays disabled when the system setting **Reduce motion** is active.

### Card effects

Card effects are applied only to selected entities:

- **Status Pulse:** pulsing emphasis for state values.
- **Energy Flow:** consumption-based styling for power sensors with warning and critical thresholds.
- **Climate Aura:** temperature- or humidity-based accent colors.
- **Alert Focus:** prominent marking for alarm, problem, and battery sensors.

Search by friendly name, entity ID, or device class, then select multiple entities. **Disable all card effects** removes all assignments.

Theme Studio may not detect an entity inside cards that do not expose a standard Lovelace structure. These effects are unavailable in fully custom dashboards.

## 8. Expert mode and legacy position rules

Expert mode is located under **Dashboard effects**. It is optional, experimental, and private to the current user.

> **Transition in 0.8.3:** Direct card editing and movement have been retired because pixel-based positioning was not reliable across different devices. Use Home Assistant’s dashboard editor for card order, sections, size, and layout. Theme Studio no longer shows a dashboard toolbar icon or a mobile card mode.

Existing visual rules remain available and can be enabled, disabled, edited, duplicated, or deleted. New horizontal or vertical position offsets can no longer be created.

### 8.1 Disable legacy position adjustments

Theme Studio detects rules created by older versions that contain X/Y offsets and displays **Legacy position rules detected**.

1. Review the affected design before changing it.
2. Select **Disable all position adjustments**.
3. Confirm the prompt.
4. Apply the design.

Only the horizontal and vertical offsets are removed. Padding, width, minimum height, column span, opacity, font size, rounded corners, target, and device restriction remain unchanged. The saved rules are not deleted.

### 8.2 Manage card layout

Open Home Assistant’s native dashboard editor to move cards, change sections, or adjust the layout. This keeps the dashboard responsive and uses Home Assistant’s supported layout rules on desktop, tablet, and phone.

### 8.3 Advanced rules and raw CSS

The advanced rule builder can target all cards, a specific entity, a custom card ID, or a directly selected card. Add a unique ID to card YAML when needed:

```yaml
theme_studio_id: energy
```

The optional raw CSS area is intended for experienced users. `@import`, remote/data URLs, and executable legacy CSS constructs are rejected. Invalid rules can move, cover, or disable cards; resetting or disabling the affected rule is the safest recovery path.

## 9. Apply, undo, restore, and reset

- **Undo / Redo** affects current edits in the open editor.
- **Update profile** saves changes into the selected profile.
- **Apply design** generates, stores, and activates the theme for the current user.
- Before each application, the current active state is saved as a recovery point.
- **Restore last design** swaps the active state with that recovery point, allowing you to move between both states.
- **Restore Home Assistant default** disables Theme Studio for the current user and returns appearance selection to Home Assistant **Auto**. Profiles and background images remain stored.

If the preview is correct but the real dashboard is unchanged, **Apply design** was usually not selected or the browser needs a hard refresh.

## 10. JSON import, export, and publication

### Export

**Export JSON** creates a portable profile containing colors plus card, navigation, and background settings.

It intentionally excludes:

- local background-image files and local paths
- dashboard and card effects
- selected entities
- Expert CSS and visual CSS rules

These values are installation- or user-specific and could target the wrong elements on another system.

### Import

1. Select **Import JSON**.
2. Choose a file up to 1 MB.
3. Review the validated import preview.
4. Explicitly confirm the import.
5. Select the new profile and press **Apply design**.

### Publish a design

Upload an exported profile through **Submit design** at [ha-theme-studio.com](https://ha-theme-studio.com/). Sign-in uses GitHub. Every submission is reviewed before it appears in the public gallery.

## 11. Per-user settings, data, and privacy

Since version 0.7.0, every Home Assistant user has private settings, profiles, active design, Expert rules, and recovery points. The shared image library remains administrator-managed.

Theme Studio stores data locally in Home Assistant, including:

```text
/config/themes/theme_studio.yaml
/config/www/theme_studio/
/config/.storage/theme_studio.settings
/config/.storage/theme_studio.profiles
/config/.storage/theme_studio.backgrounds
```

Only the optional Community Gallery connects to `ha-theme-studio.com` over HTTPS. Credentials, entity states, and local background images are not transmitted. Home Assistant diagnostics contain technical status and anonymous counts only, not colors, profile names, entity IDs, or credentials.

## 12. Updating

### HACS

1. Install the update in HACS.
2. Restart Home Assistant.
3. Hard-refresh with `Ctrl + F5`, or restart the Companion App.

### Manual

Replace the complete `/config/custom_components/theme_studio` folder with the folder from the new release. Do not mix individual files from different versions. Restart Home Assistant and the frontend afterward.

Normal updates do not overwrite saved profiles or per-user settings. A backup is still strongly recommended.

## 13. Troubleshooting and recommended workflow

| Problem | Solution |
| --- | --- |
| Theme Studio is missing from the sidebar | Add the integration under **Settings -> Devices & services**, then restart Home Assistant. |
| Changes appear only in the preview | Select **Apply design**. |
| Old UI remains after an update | Hard-refresh with `Ctrl + F5`; fully close the Companion App. |
| Effects are missing | Use a Lovelace dashboard, choose compatible entities, and check **Reduce motion**. |
| Effects are missing in a custom dashboard | Fully custom dashboards and custom panels are unsupported for effects and Expert mode. |
| Card-editor icon is missing | Enable Expert mode and open an actual Lovelace dashboard. |
| A CSS rule affects several cards | Select the card directly or use a unique `theme_studio_id`. |
| A card jumps or becomes unusable | Reset or disable the affected rule. |
| A background image cannot be deleted | It is still used by the active design or a saved profile. |
| Imported profile has no effects or CSS | This is expected; JSON profiles contain portable design values only. |

Recommended order for a new design:

1. Create a backup.
2. Create a profile with a fixed Light or Dark mode.
3. Set base colors and navigation.
4. Select the card style and background.
5. Save the profile and apply the design.
6. Assign effects to a small number of suitable entities.
7. Use Expert mode last and edit cards individually or in small groups.
8. Update the profile after each major change.

For support, include the Home Assistant version, Theme Studio version, platform, dashboard type, and relevant log messages. Report issues through the [GitHub issue tracker](https://github.com/CjonesLAB/ha-theme-studio/issues).
