# Theme Studio for Home Assistant

[English](README.md) | [Deutsch](docs/README.de.md) | [Français](docs/README.fr.md) | [Español](docs/README.es.md)

Theme Studio is a custom Home Assistant integration for creating, previewing, and directly applying your own interface designs.

> Current development version: **0.5.2**
>
> Theme Studio is still in an early stage of development. Create a Home Assistant backup before installing or updating it.

## Features

- separate settings for light and dark mode
- generate a matching light or dark mode from the mode currently being edited
- save, load, rename, duplicate, and delete custom design profiles
- correct design changes with Undo and Redo
- visible notice for unapplied changes
- automatic recovery point before applying a design
- restore the last active design with one click, even after a restart
- automatic user interface in German, English, French, or Spanish
- keyboard-accessible controls, visible focus indicators, and an accessible import dialog
- privacy-preserving Home Assistant diagnostics containing technical status and counts only
- action bar remains visible while scrolling for applying changes and switching modes
- export portable JSON profiles without local entity assignments or background-image paths
- validate and sanitize JSON files on the server before importing them
- clear import preview showing retained design settings and removed local content
- display the installed Theme Studio version directly in the panel
- browse verified community designs as complete mini-dashboard previews in light and dark mode and import them as a local profile with one click
- single-row community gallery showing three designs on desktop, with arrow controls and swipe navigation for additional designs
- submit custom designs to [ha-theme-studio.com](https://ha-theme-studio.com/) for review and publication in the community gallery
- configurable primary, background, card, text, icon, and border colors
- separate header and sidebar design for each color mode
- custom navigation background, text, icon, and selected-item colors
- configurable card radius, opacity, border width, and shadow
- gradients and a library for multiple custom background images
- select, rename, and safely delete background images
- **Space Command** dashboard background effect
- freely combinable card effects:
  - **Status Pulse** for selected entities
  - **Energy Flow** for power sensors with warning and critical thresholds
  - **Climate Aura** for temperature and humidity sensors
  - **Alert Focus** for alarm, problem, and battery sensors
- search and multiple selection in every entity list
- selected-entity count
- persistent storage of effect entity selections
- persistent storage of all settings in Home Assistant
- generation and direct activation of a real Home Assistant theme
- safe return to the original Home Assistant default design
- responsive operation on desktop, tablet, and smartphone

## Screenshots

### Theme Studio with Community Gallery and dashboard preview

![Theme Studio 0.5.2 with Community Gallery, design profiles, fine-tuning, and dashboard preview](docs/images/theme-studio-community-overview-v052.png)

### Fine-tuning

| Colors and cards | Navigation |
| --- | --- |
| ![Color and card settings](docs/images/fine-settings-colors-cards-v044.png) | ![Customize header, sidebar, and active navigation](docs/images/fine-settings-navigation-v044.png) |

| Background and image library | Dashboard effects and entity selection |
| --- | --- |
| ![Background selection, upload, and image library](docs/images/fine-settings-background-library-v044.png) | ![Dashboard and card effects with searchable multiple selection](docs/images/dashboard-effects-entity-selection-v044.png) |

## Publish your own design

Custom design profiles can be submitted directly to [ha-theme-studio.com](https://ha-theme-studio.com/) for inclusion in the community gallery. Export the profile from Theme Studio as a portable JSON file, sign in to the website with a GitHub account, and upload it through **Submit design**. Local background-image paths, dashboard effects, and entity assignments are not exported. When importing locally, Theme Studio first displays a validated preview and only saves the profile after explicit confirmation. Every submission is reviewed before publication to keep the public gallery organized and consistently high quality.

## Installation through HACS

Theme Studio can be installed as a custom repository through HACS:

1. Open **Integrations** in HACS.
2. Open the three-dot menu in the top-right corner and select **Custom repositories**.
3. Enter `https://github.com/CjonesLAB/ha-theme-studio` as the repository URL.
4. Select **Integration** as the category and add the repository.
5. Open **Theme Studio** in HACS and download the current version.
6. Restart Home Assistant.
7. Go to **Settings → Devices & services → Add integration**, search for **Theme Studio**, and add the integration.

Theme Studio will then appear in the sidebar.

## Manual installation

1. Copy the `custom_components/theme_studio` directory from the current release to Home Assistant:

   ```text
   /config/custom_components/theme_studio
   ```

2. Enable themes and the effect module in `/config/configuration.yaml`:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /theme_studio_files/theme-studio-effects.js
   ```

3. Check the configuration and restart Home Assistant:

   ```bash
   ha core check
   ha core restart
   ```

4. Go to **Settings → Devices & services → Add integration**, search for **Theme Studio**, and add the integration.

5. Theme Studio will then appear in the sidebar.

## Usage

1. Open **Theme Studio** from the sidebar.
2. Choose a verified design in the **Community Gallery** and select **Import with one click**, or load one of your own profiles.
3. Switch between light and dark mode at the top.
4. Adjust colors, cards, navigation, and the background in the fine-tuning section.
5. Enable the desired effects under **Dashboard effects**.
6. Filter entity lists by name, entity ID, or device class and select multiple suitable entities.
7. Optionally enter a name under **My design profiles** and save the complete design as a reusable profile.
8. Use the permanently visible **Apply both modes** button to save the settings and activate the theme.

**Restore Home Assistant default** disables Theme Studio for light and dark mode and activates the original Home Assistant design. Saved design profiles and background images are retained.

Before applying a changed design, Theme Studio automatically saves the currently active state. **Restore last design** can reactivate this state even after a restart. The state replaced during restoration becomes the new recovery point, allowing you to switch between both states.

Saved profiles can be loaded, updated, renamed, duplicated, or deleted. The profile most recently activated with **Apply both modes** is selected automatically the next time Theme Studio opens. **Export JSON** saves the portable visual settings, which can be loaded into another Theme Studio installation with **Import JSON**. Installation-specific dashboard effects, entity assignments, and local background-image paths are intentionally excluded.

The integrated Community Gallery only displays previously reviewed and published designs from [ha-theme-studio.com](https://ha-theme-studio.com). Every preview represents a complete compact Home Assistant dashboard with header, sidebar, cards, navigation, background, and active card effects. Preview cards follow the light/dark selection at the top. During import, Home Assistant validates the profile again and then stores it in the local design profiles. The creator's background-image paths are not imported because the corresponding local image does not exist on your system.

Up to 24 JPG, PNG, or WebP files can be managed under **Background → Image library**. Existing Theme Studio images are detected automatically. An image used by the active design or a saved profile is protected against accidental deletion.

Card effects are only applied to the selected entities. This keeps large dashboards clear and avoids unnecessary effects.

## Updating

### Through HACS

Install the update in HACS and restart Home Assistant afterward.

### Manually

Replace the complete `custom_components/theme_studio` directory with the files from the new release and restart Home Assistant.

After every update, reload the Home Assistant interface completely:

- Desktop: `Ctrl + F5`
- Companion App: close the app completely and reopen it

The current version is available on the [Releases page](https://github.com/CjonesLAB/ha-theme-studio/releases/latest).

## Automated tests

For every push and pull request, GitHub automatically checks:

- syntax of all Python and JavaScript files
- safe sanitization of portable profile imports
- removal of local background-image paths, effects, and entity assignments
- rejection of damaged settings and recovery data
- persistent storage and mutual swapping of two recovery points
- sanitization, sorting, and limiting of saved design profiles
- safe validation and caching of public gallery data
- detection, listing, and protection of local background images
- migration of older settings and effect formats

The tests run directly against Home Assistant 2026.8.1 and do not require a complete Home Assistant test instance.

Run the tests locally with Python 3.14:

```bash
python -m pip install --requirement requirements_test.txt
python -m pytest
```

## Generated data

Theme Studio creates or manages the following local files:

```text
/config/themes/theme_studio.yaml
/config/www/theme_studio/
/config/.storage/theme_studio.settings
/config/.storage/theme_studio.profiles
/config/.storage/theme_studio.backgrounds
```

These user-specific files are not part of the GitHub repository and are not overwritten by updates.

## Privacy

Design editing, theme generation, profiles, and custom background images remain local in Home Assistant. To display and import the optional Community Gallery, Home Assistant establishes an HTTPS connection to `ha-theme-studio.com`. Technically necessary connection data, such as the IP address, may be recorded in server logs. Home Assistant credentials, entity states, and local background images are not transmitted.

The diagnostic download available through Home Assistant intentionally contains no colors, design values, entity IDs, profile names, background names or paths, credentials, or stored designs. It reports only the Theme Studio version, storage format versions, storage validity, feature availability, and anonymous counts. Open **Settings → Devices & services → Theme Studio → Download diagnostics** to create the file for a support request.

## Reporting issues

Report bugs and improvement suggestions through the [GitHub issue tracker](https://github.com/CjonesLAB/ha-theme-studio/issues).

Whenever possible, include your Home Assistant version, Theme Studio version, platform, and relevant log messages.

## License

Theme Studio is released under the [MIT License](LICENSE).
