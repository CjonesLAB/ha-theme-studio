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

Die Repository-Struktur ist für eine benutzerdefinierte HACS-Integration vorbereitet. HACS kann ausschließlich öffentliche GitHub-Repositorys verwenden. Solange das Repository privat ist, erfolgt die Installation manuell.

## Datenschutz

Theme Studio arbeitet lokal in Home Assistant und benötigt keinen externen Cloud-Dienst. Eigene Hintergrundbilder bleiben im lokalen Home-Assistant-Konfigurationsverzeichnis.

## Fehler melden

Fehler können später über den GitHub-Issue-Tracker gemeldet werden:

<https://github.com/CjonesLAB/ha-theme-studio/issues>

