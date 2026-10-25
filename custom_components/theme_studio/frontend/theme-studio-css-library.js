export const CSS_LIBRARY_EXAMPLES = [
  {
    id: "compact-grid",
    category: "Layout",
    title: "Kompakte Rasterabstände",
    description: "Verringert freie Flächen zwischen erkannten Dashboard-Karten.",
    support: "Theme Studio getestet",
    preview: "compact",
    format: "css",
    insertable: true,
    code: `[data-theme-studio-layout] {
  gap: 6px !important;
}`,
  },
  {
    id: "rounded-cards",
    category: "Darstellung",
    title: "Stärker abgerundete Karten",
    description: "Gibt allen erkannten Karten deutlich rundere Ecken.",
    support: "Theme Studio getestet",
    preview: "rounded",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  border-radius: 28px !important;
}`,
  },
  {
    id: "soft-shadow",
    category: "Darstellung",
    title: "Weicher Kartenschatten",
    description: "Hebt Karten dezent vom Dashboard-Hintergrund ab.",
    support: "Theme Studio getestet",
    preview: "shadow",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24) !important;
}`,
  },
  {
    id: "glass-card",
    category: "Darstellung",
    title: "Dezente Glasoptik",
    description: "Erzeugt eine transparente Karte mit Hintergrundunschärfe.",
    support: "Theme Studio getestet",
    preview: "glass",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  background: rgba(28, 42, 48, 0.72) !important;
  backdrop-filter: blur(14px);
}`,
  },
  {
    id: "hover-lift",
    category: "Effekte",
    title: "Karte beim Überfahren anheben",
    description: "Bewegt Karten mit der Maus leicht nach oben.",
    support: "Theme Studio getestet",
    preview: "lift",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  transition: translate 160ms ease, box-shadow 160ms ease;
}

ha-card[data-theme-studio-card-key]:hover {
  translate: 0 -4px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28) !important;
}`,
  },
  {
    id: "entity-focus",
    category: "Gezielte Karte",
    title: "Eine Entitätskarte hervorheben",
    description: "Wirkt nur auf Karten mit der angegebenen Entität.",
    support: "Theme Studio getestet",
    preview: "focus",
    format: "css",
    insertable: true,
    code: `/* sensor.DEINE_ENTITAET ersetzen */
ha-card[data-theme-studio-entity~="sensor.DEINE_ENTITAET"] {
  outline: 2px solid var(--primary-color) !important;
  outline-offset: 2px;
}`,
  },
  {
    id: "mobile-compact",
    category: "Responsive",
    title: "Auf Smartphones kompakter",
    description: "Reduziert Kartenabstände und Innenabstände nur auf kleinen Displays.",
    support: "Theme Studio getestet",
    preview: "mobile",
    format: "css",
    insertable: true,
    code: `@media (max-width: 600px) {
  [data-theme-studio-layout] {
    gap: 4px !important;
  }

  ha-card[data-theme-studio-card-key] {
    padding: 6px !important;
  }
}`,
  },
  {
    id: "full-width-card",
    category: "Layout",
    title: "Karte über die gesamte Rasterbreite",
    description: "Spannt eine Karte mit eigener Karten-ID über alle verfügbaren Spalten.",
    support: "Theme Studio getestet",
    preview: "full-width",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
[data-theme-studio-card-container][data-theme-studio-id="DEINE_ID"] {
  grid-column: 1 / -1 !important;
  width: 100% !important;
}`,
  },
  {
    id: "two-column-card",
    category: "Layout",
    title: "Karte über zwei Spalten",
    description: "Lässt eine ausgewählte Karte in einem Raster zwei Spalten belegen.",
    support: "Theme Studio getestet",
    preview: "span-two",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
[data-theme-studio-card-container][data-theme-studio-id="DEINE_ID"] {
  grid-column: span 2 !important;
}`,
  },
  {
    id: "fixed-card-width",
    category: "Layout",
    title: "Feste Kartenbreite",
    description: "Begrenzt eine Karte auf eine feste Breite, ohne andere Karten zu verändern.",
    support: "Theme Studio getestet",
    preview: "fixed",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
[data-theme-studio-card-container][data-theme-studio-id="DEINE_ID"] {
  width: 280px !important;
  max-width: 100% !important;
}`,
  },
  {
    id: "minimum-card-height",
    category: "Layout",
    title: "Mindesthöhe für eine Karte",
    description: "Reserviert für eine bestimmte Entitätskarte eine gleichbleibende Mindesthöhe.",
    support: "Theme Studio getestet",
    preview: "tall",
    format: "css",
    insertable: true,
    code: `/* sensor.DEINE_ENTITAET ersetzen */
ha-card[data-theme-studio-entity~="sensor.DEINE_ENTITAET"] {
  min-height: 180px !important;
}`,
  },
  {
    id: "card-first",
    category: "Layout",
    title: "Karte an den Anfang setzen",
    description: "Sortiert eine Karte mit eigener ID im erkannten Raster nach vorne.",
    support: "Theme Studio getestet",
    preview: "first",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
[data-theme-studio-card-container][data-theme-studio-id="DEINE_ID"] {
  order: -1 !important;
}`,
  },
  {
    id: "compact-card-padding",
    category: "Layout",
    title: "Kompakter Karteninnenraum",
    description: "Reduziert den Innenabstand aller erkannten Karten.",
    support: "Theme Studio getestet",
    preview: "padding",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  padding: 6px !important;
}`,
  },
  {
    id: "borderless-cards",
    category: "Darstellung",
    title: "Kartenrahmen entfernen",
    description: "Entfernt Rahmen und Umriss von allen erkannten Karten.",
    support: "Theme Studio getestet",
    preview: "borderless",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  border: 0 !important;
  outline: 0 !important;
}`,
  },
  {
    id: "accent-border",
    category: "Darstellung",
    title: "Rahmen in Hauptfarbe",
    description: "Verwendet die aktuelle Hauptfarbe als gut sichtbaren Kartenrahmen.",
    support: "Theme Studio getestet",
    preview: "accent-border",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  border: 2px solid var(--primary-color) !important;
}`,
  },
  {
    id: "transparent-card",
    category: "Darstellung",
    title: "Halbtransparente Karte",
    description: "Reduziert die Deckkraft einer bestimmten Entitätskarte.",
    support: "Theme Studio getestet",
    preview: "opacity",
    format: "css",
    insertable: true,
    code: `/* sensor.DEINE_ENTITAET ersetzen */
ha-card[data-theme-studio-entity~="sensor.DEINE_ENTITAET"] {
  opacity: 0.72 !important;
}`,
  },
  {
    id: "grayscale-card",
    category: "Effekte",
    title: "Karte in Graustufen",
    description: "Entfernt die Farben einer bestimmten Karte, ohne sie auszublenden.",
    support: "Theme Studio getestet",
    preview: "grayscale",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
ha-card[data-theme-studio-id="DEINE_ID"] {
  filter: grayscale(1);
}`,
  },
  {
    id: "saturated-card",
    category: "Effekte",
    title: "Farben einer Karte verstärken",
    description: "Erhöht Farbsättigung und Kontrast einer bestimmten Karte.",
    support: "Theme Studio getestet",
    preview: "saturate",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
ha-card[data-theme-studio-id="DEINE_ID"] {
  filter: saturate(1.35) contrast(1.08);
}`,
  },
  {
    id: "colored-glow",
    category: "Effekte",
    title: "Farbiges Kartenleuchten",
    description: "Erzeugt einen weichen Leuchtrand in der aktuellen Hauptfarbe.",
    support: "Theme Studio getestet",
    preview: "glow",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary-color) 65%, transparent) !important;
}`,
  },
  {
    id: "hover-zoom",
    category: "Effekte",
    title: "Karte beim Überfahren vergrößern",
    description: "Vergrößert Karten beim Überfahren leicht und flüssig.",
    support: "Theme Studio getestet",
    preview: "zoom",
    format: "css",
    insertable: true,
    code: `ha-card[data-theme-studio-card-key] {
  transition: scale 160ms ease;
}

ha-card[data-theme-studio-card-key]:hover {
  scale: 1.025;
}`,
  },
  {
    id: "tilted-card",
    category: "Effekte",
    title: "Eine Karte leicht drehen",
    description: "Dreht nur die Karte mit der angegebenen eigenen Karten-ID.",
    support: "Theme Studio getestet",
    preview: "tilt",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
ha-card[data-theme-studio-id="DEINE_ID"] {
  rotate: -2deg;
}`,
  },
  {
    id: "pulse-card",
    category: "Animation",
    title: "Sanft pulsierende Warnkarte",
    description: "Pulsiert dezent und bleibt bei aktivierter Bewegungsreduktion ruhig.",
    support: "Experimentell",
    preview: "pulse",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
@keyframes theme-studio-warning-pulse {
  50% { opacity: 0.68; }
}

@media (prefers-reduced-motion: no-preference) {
  ha-card[data-theme-studio-id="DEINE_ID"] {
    animation: theme-studio-warning-pulse 1.8s ease-in-out infinite;
  }
}`,
  },
  {
    id: "larger-card-text",
    category: "Typografie",
    title: "Größere Kartenschrift",
    description: "Vergrößert geerbte Texte innerhalb einer bestimmten Karte.",
    support: "Experimentell",
    preview: "text-large",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
ha-card[data-theme-studio-id="DEINE_ID"] {
  font-size: 18px !important;
}`,
  },
  {
    id: "card-text-contrast",
    category: "Typografie",
    title: "Kontrastreiche Kartentexte",
    description: "Setzt die verbreiteten Home-Assistant-Textvariablen nur für eine Karte.",
    support: "Experimentell",
    preview: "contrast",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
ha-card[data-theme-studio-id="DEINE_ID"] {
  --primary-text-color: #ffffff;
  --secondary-text-color: #d9e4e8;
}`,
  },
  {
    id: "hide-entity-card",
    category: "Sichtbarkeit",
    title: "Bestimmte Entitätskarte ausblenden",
    description: "Entfernt eine Entitätskarte samt belegtem Rasterplatz aus der Ansicht.",
    support: "Theme Studio getestet",
    preview: "hidden-card",
    format: "css",
    insertable: true,
    code: `/* sensor.DEINE_ENTITAET ersetzen */
[data-theme-studio-card-container][data-theme-studio-entity~="sensor.DEINE_ENTITAET"] {
  display: none !important;
}`,
  },
  {
    id: "mobile-hide-card",
    category: "Sichtbarkeit",
    title: "Karte nur auf Smartphones ausblenden",
    description: "Blendet eine Karte ausschließlich auf Displays bis 600 Pixel Breite aus.",
    support: "Theme Studio getestet",
    preview: "mobile-hidden",
    format: "css",
    insertable: true,
    code: `/* DEINE_ID durch die Karten-ID ersetzen */
@media (max-width: 600px) {
  [data-theme-studio-card-container][data-theme-studio-id="DEINE_ID"] {
    display: none !important;
  }
}`,
  },
  {
    id: "tablet-spacing",
    category: "Responsive",
    title: "Eigene Abstände für Tablets",
    description: "Verwendet zwischen 601 und 1024 Pixeln einen eigenen Rasterabstand.",
    support: "Theme Studio getestet",
    preview: "tablet",
    format: "css",
    insertable: true,
    code: `@media (min-width: 601px) and (max-width: 1024px) {
  [data-theme-studio-layout] {
    gap: 8px !important;
  }
}`,
  },
  {
    id: "state-colors",
    category: "Home-Assistant-Theme",
    title: "Zustandsfarben für Lichter",
    description: "Offizielles Theme-Beispiel für aktive und inaktive Licht-Entitäten.",
    support: "Offizielles Home-Assistant-Theme",
    preview: "states",
    format: "yaml",
    insertable: false,
    code: `frontend:
  themes:
    Mein Theme:
      state-light-active-color: "#ffd54f"
      state-light-inactive-color: "#78909c"`,
  },
  {
    id: "theme-colors",
    category: "Home-Assistant-Theme",
    title: "Primär- und Akzentfarbe",
    description: "Offizielles Theme-Beispiel für die zentralen Oberflächenfarben.",
    support: "Offizielles Home-Assistant-Theme",
    preview: "colors",
    format: "yaml",
    insertable: false,
    code: `frontend:
  themes:
    Mein Theme:
      primary-color: "#26b2b3"
      accent-color: "#ff9800"`,
  },
  {
    id: "binary-sensor-colors",
    category: "Home-Assistant-Theme",
    title: "Zustandsfarben für Binärsensoren",
    description: "Offizielles Theme-Beispiel für aktive und inaktive Binärsensoren.",
    support: "Offizielles Home-Assistant-Theme",
    preview: "binary-states",
    format: "yaml",
    insertable: false,
    code: `frontend:
  themes:
    Mein Theme:
      state-binary_sensor-active-color: "#ef5350"
      state-binary_sensor-inactive-color: "#66bb6a"`,
  },
  {
    id: "light-dark-modes",
    category: "Home-Assistant-Theme",
    title: "Eigene Farben für Hell und Dunkel",
    description: "Offizielles Theme-Beispiel mit getrennten Einstellungen für beide Modi.",
    support: "Offizielles Home-Assistant-Theme",
    preview: "light-dark",
    format: "yaml",
    insertable: false,
    code: `frontend:
  themes:
    Mein Theme:
      primary-color: "#26b2b3"
      modes:
        light:
          primary-color: "#1976d2"
        dark:
          primary-color: "#80cbc4"`,
  },
  {
    id: "dashboard-background",
    category: "Home-Assistant-Theme",
    title: "Dashboard-Hintergrundbild",
    description: "Theme-Beispiel für ein lokales Bild im Home-Assistant-Dashboard.",
    support: "Offizielles Home-Assistant-Theme",
    preview: "background",
    format: "yaml",
    insertable: false,
    code: `frontend:
  themes:
    Mein Theme:
      lovelace-background: >-
        center / cover no-repeat fixed
        url('/local/mein-hintergrund.jpg')`,
  },
];
