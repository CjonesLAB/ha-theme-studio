# Theme Studio for Home Assistant

Theme Studio ist eine benutzerdefinierte Home-Assistant-Integration zum Erstellen, Vorschauen und direkten Anwenden eigener Oberflächendesigns.

> Entwicklungsstand: **0.1.0**  
> Theme Studio befindet sich noch in einer frühen Entwicklungsphase. Vor Updates sollte ein Home-Assistant-Backup erstellt werden.

## Funktionen

- getrennte Einstellungen für hellen und dunklen Modus
- vier Startdesigns als Ausgangspunkt
- anpassbare Haupt-, Hintergrund-, Karten-, Text-, Symbol- und Rahmenfarben
- Kartenradius, Deckkraft, Rahmen und Schatten
- Farbverläufe sowie eigene Hintergrundbilder
- Dashboard-Hintergrundeffekt „Space Command“
- kombinierbare Karteneffekte:
  - Status Pulse
  - Energy Flow
  - Climate Aura
  - Alarm-Fokus
- Mehrfachauswahl geeigneter Leistungs-, Klima-, Alarm- und Statussensoren
- Speicherung der Einstellungen in Home Assistant
- Erzeugung und direkte Aktivierung eines echten Home-Assistant-Themes
- responsive Bedienung auf Desktop, Tablet und Smartphone

## Screenshots

### Theme Studio und Dashboard

![Theme Studio mit Startdesigns, Feineinstellungen und Vorschau](docs/images/theme-studio-overview.png)

![Home-Assistant-Dashboard mit Aurora-Hintergrund und Karteneffekten](docs/images/dashboard-aurora.png)

### Feineinstellungen

| Farben und Karten | Kartendesign |
| --- | --- |
| ![Farben und Karteneinstellungen](docs/images/fine-settings-overview.png) | ![Geöffnete Karteneinstellungen](docs/images/fine-settings-cards.png) |

| Hintergrund | Dashboard-Effekte |
| --- | --- |
| ![Hintergrundauswahl und eigener Bild-Upload](docs/images/fine-settings-background.png) | ![Dashboard- und Karteneffekte mit Sensorauswahl](docs/images/dashboard-effects.png) |

## Manuelle Installation

1. Den Ordner `custom_components/theme_studio` in das Home-Assistant-Konfigurationsverzeichnis kopieren:

   ```text
   /config/custom_components/theme_studio
   ```

2. In `/config/configuration.yaml` das Laden von Themes und des Effektmoduls eintragen:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /theme_studio_files/theme-studio-effects.js
   ```

3. Die Konfiguration prüfen und Home Assistant neu starten:

   ```bash
   ha core check
   ha core restart
   ```

4. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** nach **Theme Studio** suchen und die Integration hinzufügen.

5. Danach erscheint **Theme Studio** in der Seitenleiste.

## Aktualisierung

Bei einer manuellen Aktualisierung den vollständigen Ordner `custom_components/theme_studio` ersetzen, Home Assistant neu starten und den Browsercache leeren.

- Desktop: `Strg + F5`
- Companion App: App vollständig schließen und erneut öffnen

## Erzeugte Daten

Theme Studio erzeugt beziehungsweise verwaltet folgende lokale Dateien:

```text
/config/themes/theme_studio.yaml
/config/www/theme_studio/
/config/.storage/theme_studio.settings
```

Diese benutzerspezifischen Dateien gehören nicht zum GitHub-Repository.

## HACS

Theme Studio kann als benutzerdefiniertes Repository über HACS installiert werden:

1. In HACS den Bereich **Integrationen** öffnen.
2. Oben rechts das Drei-Punkte-Menü öffnen und **Benutzerdefinierte Repositorys** auswählen.
3. Als Repository-URL `https://github.com/CjonesLAB/ha-theme-studio` eintragen.
4. Als Kategorie **Integration** auswählen und das Repository hinzufügen.
5. **Theme Studio** in HACS öffnen und herunterladen.
6. Home Assistant neu starten und anschließend unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** nach **Theme Studio** suchen.

## Datenschutz

Theme Studio arbeitet lokal in Home Assistant und benötigt keinen externen Cloud-Dienst. Eigene Hintergrundbilder bleiben im lokalen Home-Assistant-Konfigurationsverzeichnis.

## Lizenz

Theme Studio wird unter der [MIT-Lizenz](LICENSE) veröffentlicht.

## Fehler melden

Fehler können später über den GitHub-Issue-Tracker gemeldet werden:

<https://github.com/CjonesLAB/ha-theme-studio/issues>
