import {
  THEME_STUDIO_PRESETS,
  cloneThemeStudioPreset,
} from "./theme-studio-presets.js";


class ThemeStudioPanel extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.activeMode = "dark";
    this.selectedDesign = null;
    this.galleryOpen = true;

    this.settings = {
      light: {
        primaryColor: "#2f6fa3",
        backgroundColor: "#eef2f5",
        cardColor: "#ffffff",
        cardTextColor: "#1c1c1c",
        cardIconColor: "#2f6fa3",
        cardBorderColor: "#d5dde5",
        cardOpacity: 96,
        cardBorderWidth: 1,
        cardShadow: 16,
        borderRadius: 18,
        darkening: 10,
        background: "color",
        backgroundImage: "",
      },
      dark: {
        primaryColor: "#26b2b3",
        backgroundColor: "#101719",
        cardColor: "#182326",
        cardTextColor: "#ffffff",
        cardIconColor: "#26b2b3",
        cardBorderColor: "#26b2b3",
        cardOpacity: 92,
        cardBorderWidth: 0,
        cardShadow: 28,
        borderRadius: 18,
        darkening: 30,
        background: "color",
        backgroundImage: "",
      },
      effects: {
        effect: "none",
        motion: 35,
        glow: 35,
        cardEffects: [],
        cardIntensity: 55,
        energyEntities: [],
        energyWarning: 500,
        energyCritical: 2000,
        climateEntities: [],
        climateComfortMin: 19,
        climateComfortMax: 24,
        climateHot: 28,
        alertEntities: [],
        alertBatteryLow: 20,
      },
    };
  }

  get profile() {
    return this.settings[this.activeMode];
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._rendered) {
      this._render();
      this._rendered = true;
      this._loadSettings();
    }
  }

  set panel(panel) {
    this._panel = panel;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100%;
          color: var(--primary-text-color);
          background: var(--primary-background-color);
          font-family:
            var(--paper-font-body1_-_font-family, sans-serif);
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        [hidden] {
          display: none !important;
        }

        .mobile-navigation {
          display: none;
        }

        .page {
          max-width: 1260px;
          margin: 0 auto;
          padding: 18px 22px 30px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 18px;
        }

        .topbar h1 {
          margin: 0 0 4px;
          font-size: 28px;
          line-height: 1.1;
        }

        .topbar p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        .mode-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          min-width: 210px;
          padding: 4px;
          border-radius: 12px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow);
        }

        .mode-button {
          min-height: 38px;
          padding: 0 15px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--primary-text-color);
          font-size: 13px;
          font-weight: 600;
        }

        .mode-button.active {
          background: var(--primary-color);
          color: var(--text-primary-color, white);
        }

        .status {
          min-height: 18px;
          margin: -7px 0 12px;
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .status.success {
          color: var(--success-color, #43a047);
        }

        .status.error {
          color: var(--error-color, #db4437);
        }

        .builder-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(340px, 0.82fr);
          gap: 18px;
          align-items: start;
        }

        .panel {
          overflow: hidden;
          border-radius: 17px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow);
        }

        .panel-heading {
          padding: 16px 17px 12px;
        }

        .panel-heading h2 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .panel-heading p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .preset-gallery {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 0 14px 14px;
        }

        .preset-card {
          min-width: 0;
          padding: 7px;
          overflow: hidden;
          border: 2px solid var(--divider-color);
          border-radius: 14px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          text-align: left;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .preset-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary-color);
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.17);
        }

        .preset-preview {
          display: block;
          min-height: 105px;
          padding: 10px;
          overflow: hidden;
          border-radius: 10px;
          color: var(--design-text);
          background: var(--design-background);
        }

        .preset-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 9px;
          font-weight: 700;
        }

        .preset-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--design-accent);
          box-shadow: 0 0 8px var(--design-accent);
        }

        .preset-mini-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .preset-mini-card {
          display: block;
          min-height: 34px;
          padding: 6px;
          border: 1px solid var(--design-border);
          border-radius: var(--design-radius);
          background: var(--design-card);
          box-shadow: 0 4px 9px rgba(0, 0, 0, 0.12);
        }

        .preset-mini-line {
          display: block;
          width: 68%;
          height: 4px;
          margin-bottom: 5px;
          border-radius: 4px;
          background: var(--design-text);
          opacity: 0.65;
        }

        .preset-mini-value {
          display: block;
          width: 45%;
          height: 6px;
          border-radius: 4px;
          background: var(--design-accent);
        }

        .preset-info {
          display: block;
          padding: 8px 3px 2px;
        }

        .preset-name {
          display: block;
          margin-bottom: 2px;
          font-size: 13px;
          font-weight: 700;
        }

        .preset-description {
          display: block;
          overflow: hidden;
          color: var(--secondary-text-color);
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selected-design {
          padding: 0 14px 14px;
        }

        .selected-card {
          display: grid;
          grid-template-columns: 108px 1fr;
          gap: 13px;
          align-items: center;
          padding: 11px;
          border: 1px solid var(--divider-color);
          border-radius: 13px;
          background: var(--secondary-background-color);
        }

        .selected-thumbnail {
          height: 72px;
          border-radius: 10px;
          background: var(--selected-background);
          box-shadow: 0 5px 13px rgba(0, 0, 0, 0.15);
        }

        .selected-content {
          min-width: 0;
        }

        .selected-content h3 {
          margin: 0 0 3px;
          font-size: 16px;
        }

        .selected-content p {
          margin: 0 0 10px;
          color: var(--secondary-text-color);
          font-size: 11px;
        }

        .selected-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .small-button {
          min-height: 35px;
          padding: 0 12px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 600;
        }

        .small-button.secondary {
          border: 1px solid var(--divider-color);
          background: transparent;
          color: var(--primary-text-color);
        }

        .small-button.primary {
          border: 0;
          background: var(--primary-color);
          color: var(--text-primary-color, white);
        }

        .small-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        details {
          border-top: 1px solid var(--divider-color);
        }

        summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 48px;
          padding: 0 17px;
          font-size: 14px;
          font-weight: 700;
          list-style: none;
          cursor: pointer;
        }

        summary::-webkit-details-marker {
          display: none;
        }

        summary::after {
          content: "⌄";
          color: var(--secondary-text-color);
          font-size: 18px;
          transition: transform 0.15s ease;
        }

        details[open] summary::after {
          transform: rotate(180deg);
        }

        .details-content {
          padding: 0 17px 17px;
        }

        .color-presets {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .color-preset {
          width: 100%;
          max-width: 45px;
          aspect-ratio: 1;
          border: 3px solid transparent;
          border-radius: 50%;
        }

        .color-preset.active {
          border-color: var(--primary-text-color);
        }

        .field {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .field:last-child {
          margin-bottom: 0;
        }

        input[type="color"] {
          width: 46px;
          height: 32px;
          padding: 2px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: transparent;
        }

        input[type="range"] {
          width: 100%;
          accent-color: var(--primary-color);
        }

        select,
        input[type="number"] {
          width: 100%;
          min-height: 36px;
          padding: 0 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
          font-size: 11px;
        }

        .effect-field {
          margin: 12px 0;
        }

        .effect-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .energy-thresholds {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .energy-entity-list {
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid var(--divider-color);
          border-radius: 9px;
          background: var(--secondary-background-color);
        }

        .energy-entity-choice {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 9px;
          min-height: 38px;
          margin: 0 !important;
          padding: 7px 9px;
          border-bottom: 1px solid var(--divider-color);
          cursor: pointer;
        }

        .energy-entity-choice:last-child {
          border-bottom: 0;
        }

        .energy-entity-choice input {
          width: 17px;
          height: 17px;
          margin: 0;
          accent-color: var(--primary-color);
        }

        .energy-entity-name {
          display: block;
          font-size: 10px;
          line-height: 1.3;
        }

        .energy-empty {
          margin: 0;
          padding: 11px;
          color: var(--secondary-text-color);
          font-size: 10px;
        }

        .range-group {
          margin: 14px 0;
        }

        .range-group:last-child {
          margin-bottom: 0;
        }

        .range-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .range-value {
          color: var(--secondary-text-color);
          white-space: nowrap;
        }

        .background-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .background-option {
          min-height: 52px;
          border: 2px solid transparent;
          border-radius: 9px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          text-shadow: 0 1px 3px black;
          background-position: center;
          background-size: cover;
        }

        .background-option.active {
          border-color: var(--primary-color);
        }

        .background-color {
          background:
            linear-gradient(135deg, #102225, #1d3e42);
        }

        .background-waves {
          background:
            radial-gradient(
              circle at 20% 20%,
              #26b2b3 0,
              transparent 35%
            ),
            radial-gradient(
              circle at 80% 70%,
              #2f6fa3 0,
              transparent 40%
            ),
            #0b1214;
        }

        .background-aurora {
          background:
            linear-gradient(
              135deg,
              #07151d,
              #174f4f 45%,
              #552d6f
            );
        }

        .background-image-option {
          background:
            linear-gradient(135deg, #32363b, #17191c);
        }

        .effect-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }

        .effect-option {
          position: relative;
          min-height: 76px;
          padding: 10px;
          overflow: hidden;
          border: 2px solid transparent;
          border-radius: 10px;
          color: white;
          background: #151a20;
          text-align: left;
        }

        .effect-option.active {
          border-color: var(--primary-color);
        }

        .effect-option-title {
          position: relative;
          z-index: 2;
          display: block;
          margin-bottom: 3px;
          font-size: 12px;
          font-weight: 700;
        }

        .effect-option-description {
          position: relative;
          z-index: 2;
          display: block;
          max-width: 125px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 9px;
          line-height: 1.3;
        }

        .effect-none {
          background:
            linear-gradient(135deg, #252a31, #111418);
        }

        .effect-space-command {
          background:
            radial-gradient(
              circle at 78% 26%,
              rgba(91, 225, 255, 0.8) 0 2px,
              transparent 3px
            ),
            radial-gradient(
              circle at 66% 67%,
              rgba(255, 255, 255, 0.75) 0 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0 23px,
              rgba(80, 225, 255, 0.08) 24px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0 23px,
              rgba(80, 225, 255, 0.08) 24px
            ),
            linear-gradient(135deg, #06121d, #0b2639);
        }

        .effect-hint {
          margin: 10px 0 0;
          color: var(--secondary-text-color);
          font-size: 9px;
          line-height: 1.4;
        }

        .effect-subheading {
          margin: 18px 0 9px;
          color: var(--primary-text-color);
          font-size: 11px;
          font-weight: 700;
        }

        .effect-status-pulse {
          background:
            radial-gradient(
              circle at 82% 22%,
              rgba(69, 212, 131, 0.95) 0 3px,
              transparent 4px
            ),
            linear-gradient(135deg, #12211d, #102d3b);
          box-shadow:
            inset 0 0 0 1px rgba(69, 212, 131, 0.28);
        }

        .effect-energy-flow {
          background:
            linear-gradient(
              90deg,
              #45d483 0 24%,
              #f2d64b 24% 49%,
              #ff9f32 49% 74%,
              #ff3b4f 74% 100%
            );
        }

        .effect-climate-aura {
          background:
            linear-gradient(
              120deg,
              #4f9dff,
              #45d483 38%,
              #ff9f32 70%,
              #ff3b4f
            );
        }

        .effect-alert-focus {
          background:
            radial-gradient(
              circle at 82% 22%,
              rgba(255, 59, 79, 0.96) 0 4px,
              transparent 5px
            ),
            linear-gradient(135deg, #3c1820, #30140f 55%, #5a2813);
          box-shadow: inset 0 0 0 1px rgba(255, 159, 50, 0.38);
        }

        .upload-box {
          margin-top: 10px;
          padding: 11px;
          border: 1px dashed var(--divider-color);
          border-radius: 9px;
          text-align: center;
        }

        .upload-box p {
          margin: 0 0 8px;
          color: var(--secondary-text-color);
          font-size: 10px;
          line-height: 1.35;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--primary-color);
          color: var(--text-primary-color, white);
          font-size: 11px;
          font-weight: 600;
        }

        .upload-button.disabled {
          opacity: 0.65;
          pointer-events: none;
        }

        #background-file {
          display: none;
        }

        .file-name {
          min-height: 15px;
          margin-top: 5px;
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .editor-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 12px 17px 15px;
          border-top: 1px solid var(--divider-color);
        }

        .editor-action {
          min-height: 38px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 600;
        }

        .editor-action.secondary {
          border: 1px solid var(--divider-color);
          background: transparent;
          color: var(--primary-text-color);
        }

        .editor-action.primary {
          border: 0;
          background: var(--primary-color);
          color: var(--text-primary-color, white);
        }

        .editor-action:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .preview-panel {
          grid-column: 1 / -1;
          margin-top: 18px;
          padding: 12px;
          border-radius: 17px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow);
        }

        .preview {
          position: relative;
          min-height: 480px;
          padding: 21px;
          overflow: hidden;
          border-radius: 13px;
          color: var(--preview-top-text);
          background-color: var(--preview-background);
          background-image: var(--preview-image);
          background-position: center;
          background-size: cover;
        }

        .preview::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            rgba(0, 0, 0, var(--preview-darkening));
          pointer-events: none;
        }

        .preview-effect {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: none;
          pointer-events: none;
          opacity: var(--effect-preview-opacity, 0.35);
          background:
            radial-gradient(
              circle at 12% 19%,
              rgba(255, 255, 255, 0.8) 0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 34% 72%,
              rgba(80, 225, 255, 0.9) 0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 64% 25%,
              rgba(255, 255, 255, 0.75) 0 1px,
              transparent 2px
            ),
            radial-gradient(
              circle at 88% 66%,
              rgba(80, 225, 255, 0.85) 0 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0 63px,
              rgba(80, 225, 255, 0.07) 64px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0 63px,
              rgba(80, 225, 255, 0.07) 64px
            );
        }

        .preview-effect.space-command {
          display: block;
          animation:
            space-command-preview
            var(--effect-preview-duration, 12s)
            linear
            infinite;
        }

        @keyframes space-command-preview {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(-18px, 18px, 0);
          }
        }

        .preview-content {
          position: relative;
          z-index: 2;
        }

        @media (prefers-reduced-motion: reduce) {
          .preview-effect.space-command {
            animation: none;
          }

          .preview-card.status-pulse-demo {
            animation: none !important;
          }

          .preview-card.energy-flow-demo {
            animation: none !important;
          }

          .preview-card.climate-aura-demo {
            animation: none !important;
          }

          .preview-card.alert-focus-demo {
            animation: none !important;
          }
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .preview-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .preview-time {
          font-size: 17px;
          font-weight: 600;
        }

        .preview-mode {
          margin-bottom: 16px;
          opacity: 0.72;
          font-size: 11px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .preview-card {
          min-height: 150px;
          padding: 15px;
          color: var(--preview-card-text);
          background: var(--preview-card);
          border:
            var(--preview-border-width)
            solid
            var(--preview-border-color);
          border-radius: var(--preview-radius);
          box-shadow: var(--preview-shadow);
          backdrop-filter: blur(12px);
        }

        .preview-card.status-pulse-demo {
          animation:
            status-pulse-preview
            2.8s
            cubic-bezier(0.22, 1, 0.36, 1)
            infinite;
        }

        .preview-card.energy-flow-demo {
          animation:
            energy-flow-preview
            5s
            ease-in-out
            infinite;
        }

        .preview-card.climate-aura-demo {
          animation:
            climate-aura-preview
            6s
            ease-in-out
            infinite;
        }

        .preview-card.alert-focus-demo {
          animation:
            alert-focus-preview
            2.4s
            ease-in-out
            infinite;
        }

        @keyframes status-pulse-preview {
          0%,
          58%,
          100% {
            outline: 0 solid rgba(69, 212, 131, 0);
          }

          70% {
            outline:
              var(--card-pulse-width, 2px)
              solid
              rgba(69, 212, 131, 0.95);
            box-shadow:
              0 0
              var(--card-pulse-glow, 22px)
              rgba(69, 212, 131, 0.75);
          }
        }

        @keyframes energy-flow-preview {
          0%,
          100% {
            outline: 2px solid #45d483;
            box-shadow: 0 0 15px rgba(69, 212, 131, 0.6);
          }

          38% {
            outline: 2px solid #f2d64b;
            box-shadow: 0 0 20px rgba(242, 214, 75, 0.65);
          }

          68% {
            outline: 2px solid #ff9f32;
            box-shadow: 0 0 24px rgba(255, 159, 50, 0.7);
          }

          86% {
            outline: 3px solid #ff3b4f;
            box-shadow: 0 0 28px rgba(255, 59, 79, 0.75);
          }
        }

        @keyframes climate-aura-preview {
          0%,
          100% {
            outline: 2px solid #4f9dff;
            box-shadow: 0 0 18px rgba(79, 157, 255, 0.65);
          }

          35% {
            outline: 2px solid #45d483;
            box-shadow: 0 0 18px rgba(69, 212, 131, 0.65);
          }

          68% {
            outline: 2px solid #ff9f32;
            box-shadow: 0 0 24px rgba(255, 159, 50, 0.7);
          }

          86% {
            outline: 3px solid #ff3b4f;
            box-shadow: 0 0 28px rgba(255, 59, 79, 0.75);
          }
        }

        @keyframes alert-focus-preview {
          0%,
          100% {
            outline: 2px solid #ff9f32;
            box-shadow: 0 0 14px rgba(255, 159, 50, 0.55);
          }

          50% {
            outline: 3px solid #ff3b4f;
            box-shadow: 0 0 30px rgba(255, 59, 79, 0.82);
          }
        }

        .preview-card h3 {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 11px;
          font-size: 13px;
        }

        .preview-icon {
          width: 13px;
          height: 13px;
          flex: 0 0 13px;
          border-radius: 4px;
          background: var(--preview-icon);
        }

        .large-value {
          color: var(--preview-primary);
          font-size: 27px;
          font-weight: 700;
        }

        .secondary-text {
          margin-top: 5px;
          opacity: 0.72;
          font-size: 11px;
        }

        .switch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          font-size: 11px;
        }

        .fake-switch {
          position: relative;
          width: 38px;
          height: 22px;
          border-radius: 18px;
          background: var(--preview-primary);
        }

        .fake-switch::after {
          content: "";
          position: absolute;
          top: 3px;
          right: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
        }

        .chart {
          display: flex;
          align-items: end;
          gap: 5px;
          height: 76px;
          margin-top: 10px;
        }

        .bar {
          flex: 1;
          min-height: 11px;
          border-radius: 5px 5px 2px 2px;
          background: var(--preview-icon);
        }

        @media (max-width: 900px) {
          .mobile-navigation {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            min-height: 56px;
            padding:
              max(9px, env(safe-area-inset-top))
              15px
              9px;
            border-bottom: 1px solid var(--divider-color);
            background:
              var(
                --app-header-background-color,
                var(--primary-background-color)
              );
          }

          .mobile-back {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color:
              var(
                --app-header-text-color,
                var(--primary-text-color)
              );
            text-decoration: none;
            font-weight: 600;
          }

          .back-arrow {
            font-size: 24px;
          }

          .builder-grid {
            grid-template-columns: 1fr;
          }

          .preview-panel {
            grid-column: auto;
          }

          .preview-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 620px) {
          .page {
            padding: 13px;
          }

          .topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .mode-switcher {
            width: 100%;
          }

          .preset-gallery {
            grid-template-columns: 1fr;
          }

          .selected-card {
            grid-template-columns: 82px 1fr;
          }

          .selected-thumbnail {
            width: 82px;
            height: 60px;
          }

          .preview-grid {
            grid-template-columns: 1fr;
          }

          .editor-actions {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <nav class="mobile-navigation">
        <a class="mobile-back" href="/">
          <span class="back-arrow">‹</span>
          <span>Zur Übersicht</span>
        </a>
      </nav>

      <main class="page">
        <header class="topbar">
          <div>
            <h1>Theme Studio</h1>
            <p>
              Startdesign wählen und anschließend individuell anpassen.
            </p>
          </div>

          <div class="mode-switcher">
            <button
              class="mode-button"
              data-mode="light"
            >
              ☀ Hell
            </button>

            <button
              class="mode-button active"
              data-mode="dark"
            >
              ☾ Dunkel
            </button>
          </div>
        </header>

        <p id="status" class="status"></p>

        <section class="builder-grid">
          <div class="panel">
            <div class="panel-heading">
              <h2>Startdesign</h2>
              <p>
                Eine Vorlage für beide Farbmodi wählen.
              </p>
            </div>

            <div
              id="preset-gallery"
              class="preset-gallery"
            >
              ${this._presetGalleryMarkup()}
            </div>

            <div
              id="selected-design"
              class="selected-design"
              hidden
            >
              <div class="selected-card">
                <div
                  id="selected-thumbnail"
                  class="selected-thumbnail"
                ></div>

                <div class="selected-content">
                  <h3 id="selected-name"></h3>
                  <p id="selected-description"></p>

                  <div class="selected-actions">
                    <button
                      id="change-design-button"
                      class="small-button secondary"
                    >
                      Andere Vorlage
                    </button>

                    <button
                      id="quick-apply-button"
                      class="small-button primary"
                    >
                      Aktivieren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-heading">
              <h2>Feineinstellungen</h2>
              <p>
                Einstellungen für den oben gewählten Modus.
              </p>
            </div>

            <details open>
              <summary>Farben</summary>
              <div class="details-content">
                <div class="color-presets">
                  ${this._colorPreset("#26b2b3", "Türkis")}
                  ${this._colorPreset("#2f6fa3", "Blau")}
                  ${this._colorPreset("#7ac143", "Grün")}
                  ${this._colorPreset("#d95c5c", "Rot")}
                  ${this._colorPreset("#9b6fd3", "Violett")}
                </div>

                ${this._colorField(
                  "primary-color",
                  "Hauptfarbe"
                )}

                ${this._colorField(
                  "background-color",
                  "Hintergrundfarbe"
                )}
              </div>
            </details>

            <details>
              <summary>Karten</summary>
              <div class="details-content">
                ${this._colorField(
                  "card-color",
                  "Kartenfarbe"
                )}

                ${this._colorField(
                  "card-text-color",
                  "Textfarbe"
                )}

                ${this._colorField(
                  "card-icon-color",
                  "Symbolfarbe"
                )}

                ${this._colorField(
                  "card-border-color",
                  "Rahmenfarbe"
                )}

                ${this._rangeField(
                  "card-opacity",
                  "Kartendeckkraft",
                  30,
                  100
                )}

                ${this._rangeField(
                  "card-border-width",
                  "Rahmenstärke",
                  0,
                  6
                )}

                ${this._rangeField(
                  "card-shadow",
                  "Schattenstärke",
                  0,
                  50
                )}

                ${this._rangeField(
                  "border-radius",
                  "Runde Ecken",
                  0,
                  36
                )}
              </div>
            </details>

            <details>
              <summary>Hintergrund</summary>
              <div class="details-content">
                <div class="background-options">
                  <button
                    class="background-option background-color"
                    data-background="color"
                  >
                    Farbe
                  </button>

                  <button
                    class="background-option background-waves"
                    data-background="waves"
                  >
                    Wellen
                  </button>

                  <button
                    class="background-option background-aurora"
                    data-background="aurora"
                  >
                    Aurora
                  </button>

                  <button
                    id="image-option"
                    class="background-option background-image-option"
                    data-background="image"
                  >
                    Eigenes Bild
                  </button>
                </div>

                <div class="upload-box">
                  <p>
                    JPG, PNG oder WebP bis 5 MB.
                  </p>

                  <label
                    id="upload-label"
                    class="upload-button"
                    for="background-file"
                  >
                    Bild auswählen
                  </label>

                  <input
                    id="background-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  >

                  <div
                    id="file-name"
                    class="file-name"
                  ></div>
                </div>

                ${this._rangeField(
                  "darkening",
                  "Hintergrund abdunkeln",
                  0,
                  80
                )}
              </div>
            </details>

            <details>
              <summary>Dashboard-Effekte</summary>
              <div class="details-content">
                <div class="effect-subheading">
                  Hintergrundeffekt
                </div>

                <div class="effect-options">
                  <button
                    class="effect-option background-effect-option effect-none"
                    data-effect="none"
                  >
                    <span class="effect-option-title">
                      Kein Effekt
                    </span>
                    <span class="effect-option-description">
                      Ruhige Oberfläche ohne Animation
                    </span>
                  </button>

                  <button
                    class="effect-option background-effect-option effect-space-command"
                    data-effect="space-command"
                  >
                    <span class="effect-option-title">
                      Space Command
                    </span>
                    <span class="effect-option-description">
                      Sternenfeld, Raster und Lichtakzente
                    </span>
                  </button>

                </div>

                <div id="effect-controls">
                  ${this._rangeField(
                    "effect-motion",
                    "Bewegung",
                    0,
                    100
                  )}

                  ${this._rangeField(
                    "effect-glow",
                    "Leuchtstärke",
                    0,
                    100
                  )}
                </div>

                <div class="effect-subheading">
                  Karteneffekte (Mehrfachauswahl)
                </div>

                <div class="effect-options">
                  <button
                    class="effect-option card-effect-option effect-none"
                    data-card-effect="none"
                  >
                    <span class="effect-option-title">
                      Kein Karteneffekt
                    </span>
                    <span class="effect-option-description">
                      Alle Karteneffekte ausschalten
                    </span>
                  </button>

                  <button
                    class="effect-option card-effect-option effect-status-pulse"
                    data-card-effect="status-pulse"
                  >
                    <span class="effect-option-title">
                      Status Pulse
                    </span>
                    <span class="effect-option-description">
                      Farbiges Leuchten bei Zustandsänderungen
                    </span>
                  </button>

                  <button
                    class="effect-option card-effect-option effect-energy-flow"
                    data-card-effect="energy-flow"
                  >
                    <span class="effect-option-title">
                      Energy Flow
                    </span>
                    <span class="effect-option-description">
                      Verbrauchsabhängige Farben für Energiekarten
                    </span>
                  </button>

                  <button
                    class="effect-option card-effect-option effect-climate-aura"
                    data-card-effect="climate-aura"
                  >
                    <span class="effect-option-title">
                      Climate Aura
                    </span>
                    <span class="effect-option-description">
                      Temperatur und Luftfeuchtigkeit als Farbaura
                    </span>
                  </button>

                  <button
                    class="effect-option card-effect-option effect-alert-focus"
                    data-card-effect="alert-focus"
                  >
                    <span class="effect-option-title">
                      Alarm-Fokus
                    </span>
                    <span class="effect-option-description">
                      Warnfarben für Sicherheit, Zugänge und Batterien
                    </span>
                  </button>
                </div>

                <div id="card-effect-controls">
                  ${this._rangeField(
                    "card-effect-intensity",
                    "Effektstärke",
                    0,
                    100
                  )}
                </div>

                <div id="energy-flow-controls">
                  <div class="effect-field">
                    <label>
                      Leistungssensoren
                    </label>
                    <div
                      id="energy-entity-list"
                      class="energy-entity-list"
                    >
                      ${this._energyEntityChoices()}
                    </div>
                  </div>

                  <div class="energy-thresholds">
                    <div class="effect-field">
                      <label for="energy-warning">
                        Gelb ab (W)
                      </label>
                      <input
                        id="energy-warning"
                        type="number"
                        min="0"
                        max="999999"
                        step="10"
                      >
                    </div>

                    <div class="effect-field">
                      <label for="energy-critical">
                        Rot ab (W)
                      </label>
                      <input
                        id="energy-critical"
                        type="number"
                        min="1"
                        max="1000000"
                        step="10"
                      >
                    </div>
                  </div>
                </div>

                <div id="climate-aura-controls">
                  <div class="effect-field">
                    <label>
                      Klimasensoren
                    </label>
                    <div class="energy-entity-list">
                      ${this._climateEntityChoices()}
                    </div>
                  </div>

                  <div class="energy-thresholds">
                    <div class="effect-field">
                      <label for="climate-comfort-min">
                        Angenehm ab (°C)
                      </label>
                      <input
                        id="climate-comfort-min"
                        type="number"
                        min="-50"
                        max="99"
                        step="1"
                      >
                    </div>

                    <div class="effect-field">
                      <label for="climate-comfort-max">
                        Warm ab (°C)
                      </label>
                      <input
                        id="climate-comfort-max"
                        type="number"
                        min="-49"
                        max="100"
                        step="1"
                      >
                    </div>
                  </div>

                  <div class="effect-field">
                    <label for="climate-hot">
                      Heiß ab (°C)
                    </label>
                    <input
                      id="climate-hot"
                      type="number"
                      min="-48"
                      max="120"
                      step="1"
                    >
                  </div>
                </div>

                <div id="alert-focus-controls">
                  <div class="effect-field">
                    <label>
                      Alarm- und Statussensoren
                    </label>
                    <div class="energy-entity-list">
                      ${this._alertEntityChoices()}
                    </div>
                  </div>

                  <div class="effect-field">
                    <label for="alert-battery-low">
                      Batterie-Warnung unter (%)
                    </label>
                    <input
                      id="alert-battery-low"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                    >
                  </div>
                </div>

                <p class="effect-hint">
                  Beide Effekte gelten für den hellen und dunklen
                  Modus. Bei aktivierter Systemoption
                  „Bewegung reduzieren“ bleibt er automatisch aus.
                </p>
              </div>
            </details>

            <div class="editor-actions">
              <button
                id="reset-button"
                class="editor-action secondary"
              >
                Modus zurücksetzen
              </button>

              <button
                id="apply-button"
                class="editor-action primary"
              >
                Beide Modi anwenden
              </button>
            </div>
          </div>
        </section>

        <section class="preview-panel">
          <div id="preview" class="preview">
            <div
              id="preview-effect"
              class="preview-effect"
              aria-hidden="true"
            ></div>

            <div class="preview-content">
              <div class="preview-header">
                <h2>Mein Zuhause</h2>
                <div class="preview-time">17:36</div>
              </div>

              <div
                id="preview-mode"
                class="preview-mode"
              ></div>

              <div class="preview-grid">
                ${this._previewCard(
                  "Stromverbrauch",
                  `
                    <div class="large-value">846 W</div>
                    <div class="secondary-text">
                      Heute 8,4 kWh
                    </div>
                  `
                )}

                ${this._previewCard(
                  "Wohnzimmer",
                  `
                    <div class="switch-row">
                      <span>Deckenlicht</span>
                      <div class="fake-switch"></div>
                    </div>
                    <div class="switch-row">
                      <span>Stehlampe</span>
                      <div class="fake-switch"></div>
                    </div>
                  `
                )}

                ${this._previewCard(
                  "Temperatur",
                  `
                    <div class="large-value">22,4 °C</div>
                    <div class="secondary-text">
                      Luftfeuchtigkeit 48 %
                    </div>
                  `
                )}

                ${this._previewCard(
                  "Verlauf",
                  `
                    <div class="chart">
                      <div class="bar" style="height:38%"></div>
                      <div class="bar" style="height:52%"></div>
                      <div class="bar" style="height:47%"></div>
                      <div class="bar" style="height:73%"></div>
                      <div class="bar" style="height:59%"></div>
                      <div class="bar" style="height:86%"></div>
                    </div>
                  `
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    `;

    this._bindEvents();
    this._syncControls();
    this._updatePreview();
    this._syncPresetArea();
  }

  _presetGalleryMarkup() {
    return Object.values(THEME_STUDIO_PRESETS)
      .map((preset) => {
        const preview = preset.preview;

        return `
          <button
            class="preset-card"
            data-design="${preset.id}"
            style="
              --design-background:${preview.background};
              --design-card:${preview.card};
              --design-accent:${preview.accent};
              --design-text:${preview.text};
              --design-border:${preview.border};
              --design-radius:${preview.radius};
            "
          >
            <span class="preset-preview">
              <span class="preset-preview-header">
                <span>Mein Zuhause</span>
                <span class="preset-dot"></span>
              </span>

              <span class="preset-mini-grid">
                ${this._miniCardMarkup()}
                ${this._miniCardMarkup()}
                ${this._miniCardMarkup()}
                ${this._miniCardMarkup()}
              </span>
            </span>

            <span class="preset-info">
              <span class="preset-name">
                ${preset.name}
              </span>

              <span class="preset-description">
                ${preset.description}
              </span>
            </span>
          </button>
        `;
      })
      .join("");
  }

  _miniCardMarkup() {
    return `
      <span class="preset-mini-card">
        <span class="preset-mini-line"></span>
        <span class="preset-mini-value"></span>
      </span>
    `;
  }

  _colorPreset(color, title) {
    return `
      <button
        class="color-preset"
        data-color="${color}"
        title="${title}"
        style="background:${color}"
      ></button>
    `;
  }

  _colorField(id, label) {
    return `
      <div class="field">
        <label for="${id}">${label}</label>
        <input id="${id}" type="color">
      </div>
    `;
  }

  _rangeField(id, label, minimum, maximum) {
    return `
      <div class="range-group">
        <div class="range-head">
          <label for="${id}">${label}</label>
          <span
            id="${id}-value"
            class="range-value"
          ></span>
        </div>

        <input
          id="${id}"
          type="range"
          min="${minimum}"
          max="${maximum}"
        >
      </div>
    `;
  }

  _energyEntityChoices() {
    const states = this._hass?.states || {};

    const sensors = Object.entries(states)
      .filter(([entityId, stateObject]) => {
        const deviceClass = String(
          stateObject.attributes?.device_class || ""
        ).toLowerCase();

        const unit = String(
          stateObject.attributes
            ?.unit_of_measurement || ""
        ).toLowerCase();

        return (
          entityId.startsWith("sensor.")
          && (
            deviceClass === "power"
            || ["w", "kw", "mw"].includes(unit)
          )
        );
      })
      .map(([entityId, stateObject]) => ({
        entityId,
        name:
          stateObject.attributes?.friendly_name
          || entityId,
        unit:
          stateObject.attributes
            ?.unit_of_measurement || "",
      }))
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          "de"
        )
      );

    if (sensors.length === 0) {
      return `
        <p class="energy-empty">
          Keine Leistungssensoren gefunden.
        </p>
      `;
    }

    return sensors.map((sensor) => `
      <label class="energy-entity-choice">
        <input
          type="checkbox"
          class="energy-entity-checkbox"
          value="${this._escapeHtml(sensor.entityId)}"
        >
        <span class="energy-entity-name">
          ${this._escapeHtml(sensor.name)}
          ${sensor.unit
            ? `(${this._escapeHtml(sensor.unit)})`
            : ""}
        </span>
      </label>
    `).join("");
  }

  _climateEntityChoices() {
    const states = this._hass?.states || {};

    const sensors = Object.entries(states)
      .filter(([entityId, stateObject]) => {
        const deviceClass = String(
          stateObject.attributes?.device_class || ""
        ).toLowerCase();

        return (
          entityId.startsWith("sensor.")
          && ["temperature", "humidity"]
            .includes(deviceClass)
        );
      })
      .map(([entityId, stateObject]) => ({
        entityId,
        name:
          stateObject.attributes?.friendly_name
          || entityId,
        unit:
          stateObject.attributes
            ?.unit_of_measurement || "",
      }))
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          "de"
        )
      );

    if (sensors.length === 0) {
      return `
        <p class="energy-empty">
          Keine Temperatur- oder Feuchtigkeitssensoren gefunden.
        </p>
      `;
    }

    return sensors.map((sensor) => `
      <label class="energy-entity-choice">
        <input
          type="checkbox"
          class="climate-entity-checkbox"
          value="${this._escapeHtml(sensor.entityId)}"
        >
        <span class="energy-entity-name">
          ${this._escapeHtml(sensor.name)}
          ${sensor.unit
            ? `(${this._escapeHtml(sensor.unit)})`
            : ""}
        </span>
      </label>
    `).join("");
  }

  _alertEntityChoices() {
    const states = this._hass?.states || {};
    const alertClasses = new Set([
      "door",
      "window",
      "opening",
      "garage_door",
      "smoke",
      "gas",
      "carbon_monoxide",
      "moisture",
      "problem",
      "safety",
      "battery",
    ]);

    const entities = Object.entries(states)
      .filter(([entityId, stateObject]) => {
        const domain = entityId.split(".")[0];
        const deviceClass = String(
          stateObject.attributes?.device_class || ""
        ).toLowerCase();

        return (
          ["alarm_control_panel", "lock"].includes(domain)
          || (
            ["binary_sensor", "sensor", "cover"]
              .includes(domain)
            && alertClasses.has(deviceClass)
          )
        );
      })
      .map(([entityId, stateObject]) => ({
        entityId,
        name:
          stateObject.attributes?.friendly_name
          || entityId,
        deviceClass: String(
          stateObject.attributes?.device_class || ""
        ),
      }))
      .sort((first, second) =>
        first.name.localeCompare(second.name, "de")
      );

    if (entities.length === 0) {
      return `
        <p class="energy-empty">
          Keine passenden Alarm- oder Statussensoren gefunden.
        </p>
      `;
    }

    return entities.map((entity) => `
      <label class="energy-entity-choice">
        <input
          type="checkbox"
          class="alert-entity-checkbox"
          value="${this._escapeHtml(entity.entityId)}"
        >
        <span class="energy-entity-name">
          ${this._escapeHtml(entity.name)}
          ${entity.deviceClass
            ? `(${this._escapeHtml(entity.deviceClass)})`
            : ""}
        </span>
      </label>
    `).join("");
  }

  _escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _previewCard(title, content) {
    return `
      <div class="preview-card">
        <h3>
          <span class="preview-icon"></span>
          ${title}
        </h3>
        ${content}
      </div>
    `;
  }

  _bindEvents() {
    this.shadowRoot
      .querySelectorAll(".preset-card")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this._applyDesign(button.dataset.design);
        });
      });

    this.shadowRoot
      .getElementById("change-design-button")
      .addEventListener("click", () => {
        this.galleryOpen = true;
        this._syncPresetArea();
      });

    this.shadowRoot
      .querySelectorAll(".mode-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.activeMode = button.dataset.mode;
          this._clearStatus();
          this._syncControls();
          this._updatePreview();
        });
      });

    this.shadowRoot
      .querySelectorAll(".color-preset")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.profile.primaryColor =
            button.dataset.color;

          this.selectedDesign = null;
          this._clearStatus();
          this._syncControls();
          this._updatePreview();
        });
      });

    this._bindColor("primary-color", "primaryColor", true);
    this._bindColor("background-color", "backgroundColor");
    this._bindColor("card-color", "cardColor");
    this._bindColor("card-text-color", "cardTextColor");
    this._bindColor("card-icon-color", "cardIconColor");
    this._bindColor(
      "card-border-color",
      "cardBorderColor"
    );

    this._bindRange("card-opacity", "cardOpacity", "%");
    this._bindRange(
      "card-border-width",
      "cardBorderWidth",
      "px"
    );
    this._bindRange("card-shadow", "cardShadow", "");
    this._bindRange(
      "border-radius",
      "borderRadius",
      "px"
    );
    this._bindRange("darkening", "darkening", "%");

    this.shadowRoot
      .querySelectorAll(".background-effect-option")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.settings.effects.effect =
            button.dataset.effect;

          this._clearStatus();
          this._syncEffectControls();
          this._updatePreview();
        });
      });

    this._bindEffectRange(
      "effect-motion",
      "motion",
      "%"
    );

    this._bindEffectRange(
      "effect-glow",
      "glow",
      "%"
    );

    this.shadowRoot
      .querySelectorAll(".card-effect-option")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const effect = button.dataset.cardEffect;

          if (effect === "none") {
            this.settings.effects.cardEffects = [];
          } else {
            const selected = new Set(
              this.settings.effects.cardEffects
            );

            if (selected.has(effect)) {
              selected.delete(effect);
            } else {
              selected.add(effect);
            }

            this.settings.effects.cardEffects =
              Array.from(selected);
          }

          this._clearStatus();
          this._syncEffectControls();
          this._updatePreview();
        });
      });

    this._bindEffectRange(
      "card-effect-intensity",
      "cardIntensity",
      "%"
    );

    this.shadowRoot
      .querySelectorAll(".energy-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const selected = Array.from(
            this.shadowRoot.querySelectorAll(
              ".energy-entity-checkbox:checked"
            )
          );

          if (selected.length > 32) {
            checkbox.checked = false;
            this._setStatus(
              "Es können höchstens 32 Sensoren gewählt werden.",
              "error"
            );
            return;
          }

          this.settings.effects.energyEntities =
            selected.map((item) => item.value);

          this._clearStatus();
          this._updatePreview();
        });
      });

    this._bindEnergyNumber(
      "energy-warning",
      "energyWarning"
    );

    this._bindEnergyNumber(
      "energy-critical",
      "energyCritical"
    );

    this.shadowRoot
      .querySelectorAll(".climate-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const selected = Array.from(
            this.shadowRoot.querySelectorAll(
              ".climate-entity-checkbox:checked"
            )
          );

          if (selected.length > 32) {
            checkbox.checked = false;
            this._setStatus(
              "Es können höchstens 32 Klimasensoren gewählt werden.",
              "error"
            );
            return;
          }

          this.settings.effects.climateEntities =
            selected.map((item) => item.value);

          this._clearStatus();
          this._updatePreview();
        });
      });

    this._bindClimateNumber(
      "climate-comfort-min",
      "climateComfortMin"
    );

    this._bindClimateNumber(
      "climate-comfort-max",
      "climateComfortMax"
    );

    this._bindClimateNumber(
      "climate-hot",
      "climateHot"
    );

    this.shadowRoot
      .querySelectorAll(".alert-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const selected = Array.from(
            this.shadowRoot.querySelectorAll(
              ".alert-entity-checkbox:checked"
            )
          );

          if (selected.length > 64) {
            checkbox.checked = false;
            this._setStatus(
              "Es können höchstens 64 Alarm- und Statussensoren gewählt werden.",
              "error"
            );
            return;
          }

          this.settings.effects.alertEntities =
            selected.map((item) => item.value);

          this._clearStatus();
          this._updatePreview();
        });
      });

    this._bindSimpleNumber(
      "alert-battery-low",
      "alertBatteryLow"
    );

    this.shadowRoot
      .querySelectorAll(".background-option")
      .forEach((button) => {
        button.addEventListener("click", () => {
          if (
            button.dataset.background === "image"
            && !this.profile.backgroundImage
          ) {
            this._setStatus(
              "Bitte zuerst ein Bild auswählen.",
              "error"
            );
            return;
          }

          this.profile.background =
            button.dataset.background;

          this.selectedDesign = null;
          this._clearStatus();
          this._syncControls();
          this._updatePreview();
        });
      });

    this.shadowRoot
      .getElementById("background-file")
      .addEventListener("change", (event) => {
        this._uploadBackground(event);
      });

    this.shadowRoot
      .getElementById("reset-button")
      .addEventListener("click", () => {
        this._resetActiveMode();
      });

    this.shadowRoot
      .getElementById("apply-button")
      .addEventListener("click", () => {
        this._saveAndApplySettings();
      });

    this.shadowRoot
      .getElementById("quick-apply-button")
      .addEventListener("click", () => {
        this._saveAndApplySettings();
      });
  }

  _applyDesign(designId) {
    const effects = {
      ...this.settings.effects,
    };

    this.settings = {
      ...cloneThemeStudioPreset(designId),
      effects,
    };

    this.selectedDesign = designId;
    this.galleryOpen = false;

    this._syncPresetArea();
    this._syncControls();
    this._updatePreview();

    this._setStatus(
      `${THEME_STUDIO_PRESETS[designId].name} übernommen.`,
      "success"
    );
  }

  _syncPresetArea() {
    const gallery =
      this.shadowRoot.getElementById("preset-gallery");

    const selected =
      this.shadowRoot.getElementById(
        "selected-design"
      );

    gallery.hidden = !this.galleryOpen;
    selected.hidden = this.galleryOpen;

    if (
      this.galleryOpen
      || !this.selectedDesign
    ) {
      return;
    }

    const preset =
      THEME_STUDIO_PRESETS[this.selectedDesign];

    this.shadowRoot
      .getElementById("selected-name")
      .textContent = preset.name;

    this.shadowRoot
      .getElementById("selected-description")
      .textContent = preset.description;

    this.shadowRoot
      .getElementById("selected-thumbnail")
      .style.setProperty(
        "--selected-background",
        preset.preview.background
      );
  }

  _bindColor(elementId, settingName, syncPresets = false) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("input", (event) => {
        this.profile[settingName] = event.target.value;
        this.selectedDesign = null;

        if (syncPresets) {
          this._syncColorPresets();
        }

        this._clearStatus();
        this._updatePreview();
      });
  }

  _bindRange(elementId, settingName, suffix) {
    const input =
      this.shadowRoot.getElementById(elementId);

    const output =
      this.shadowRoot.getElementById(
        `${elementId}-value`
      );

    input.addEventListener("input", (event) => {
      const value = Number(event.target.value);

      this.profile[settingName] = value;
      this.selectedDesign = null;

      output.textContent = suffix
        ? `${value} ${suffix}`
        : `${value}`;

      this._clearStatus();
      this._updatePreview();
    });
  }

  _bindEffectRange(elementId, settingName, suffix) {
    const input =
      this.shadowRoot.getElementById(elementId);

    const output =
      this.shadowRoot.getElementById(
        `${elementId}-value`
      );

    input.addEventListener("input", (event) => {
      const value = Number(event.target.value);

      this.settings.effects[settingName] = value;

      output.textContent = `${value} ${suffix}`;

      this._clearStatus();
      this._updatePreview();
    });
  }

  _bindEnergyNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        const input = event.target;
        const minimum = Number(input.min);
        const maximum = Number(input.max);
        const parsedValue = Number(input.value);

        const value = Math.min(
          maximum,
          Math.max(
            minimum,
            Number.isFinite(parsedValue)
              ? parsedValue
              : minimum
          )
        );

        this.settings.effects[settingName] = value;

        if (
          this.settings.effects.energyCritical
          <= this.settings.effects.energyWarning
        ) {
          this.settings.effects.energyCritical =
            this.settings.effects.energyWarning + 1;
        }

        this._clearStatus();
        this._syncEffectControls();
        this._updatePreview();
      });
  }

  _bindClimateNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        const input = event.target;
        const minimum = Number(input.min);
        const maximum = Number(input.max);
        const parsedValue = Number(input.value);

        const value = Math.min(
          maximum,
          Math.max(
            minimum,
            Number.isFinite(parsedValue)
              ? parsedValue
              : minimum
          )
        );

        this.settings.effects[settingName] = value;

        if (
          this.settings.effects.climateComfortMax
          <= this.settings.effects.climateComfortMin
        ) {
          this.settings.effects.climateComfortMax =
            this.settings.effects.climateComfortMin + 1;
        }

        if (
          this.settings.effects.climateHot
          <= this.settings.effects.climateComfortMax
        ) {
          this.settings.effects.climateHot =
            this.settings.effects.climateComfortMax + 1;
        }

        this._clearStatus();
        this._syncEffectControls();
        this._updatePreview();
      });
  }

  _bindSimpleNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        const input = event.target;
        const minimum = Number(input.min);
        const maximum = Number(input.max);
        const parsedValue = Number(input.value);
        const value = Math.min(
          maximum,
          Math.max(
            minimum,
            Number.isFinite(parsedValue)
              ? parsedValue
              : minimum
          )
        );

        this.settings.effects[settingName] = value;
        this._clearStatus();
        this._syncEffectControls();
        this._updatePreview();
      });
  }

  async _loadSettings() {
    try {
      const saved =
        await this._hass.callWS({
          type: "theme_studio/get_settings",
        });

      this.settings = {
        light: {
          ...this.settings.light,
          ...saved.light,
        },
        dark: {
          ...this.settings.dark,
          ...saved.dark,
        },
        effects: {
          ...this.settings.effects,
          ...saved.effects,
        },
      };

      this._syncControls();
      this._updatePreview();
    } catch (error) {
      this._setStatus(
        "Die Einstellungen konnten nicht geladen werden.",
        "error"
      );
    }
  }

  async _uploadBackground(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      input.value = "";
      this._setStatus(
        "Bitte JPG, PNG oder WebP auswählen.",
        "error"
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      input.value = "";
      this._setStatus(
        "Das Bild darf höchstens 5 MB groß sein.",
        "error"
      );
      return;
    }

    const label =
      this.shadowRoot.getElementById("upload-label");

    label.classList.add("disabled");
    label.textContent = "Wird hochgeladen …";

    try {
      const dataUrl =
        await this._readFileAsDataUrl(file);

      const result =
        await this._hass.callWS({
          type: "theme_studio/upload_background",
          mode: this.activeMode,
          mime_type: file.type,
          content: dataUrl.split(",", 2)[1],
        });

      this.profile.backgroundImage = result.url;
      this.profile.background = "image";
      this.selectedDesign = null;

      this._syncControls();
      this._updatePreview();

      this._setStatus(
        "Bild hochgeladen. Bitte anwenden.",
        "success"
      );
    } catch (error) {
      this._setStatus(
        this._errorMessage(error),
        "error"
      );
    } finally {
      label.classList.remove("disabled");
      label.textContent = "Anderes Bild";
      input.value = "";
    }
  }

  _readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener(
        "load",
        () => resolve(reader.result)
      );

      reader.addEventListener(
        "error",
        () => reject(
          new Error("Datei konnte nicht gelesen werden.")
        )
      );

      reader.readAsDataURL(file);
    });
  }

  async _saveAndApplySettings() {
    if (
      this.settings.effects.cardEffects.includes("energy-flow")
      && this.settings.effects.energyEntities.length === 0
    ) {
      this._setStatus(
        "Bitte mindestens einen Leistungssensor auswählen.",
        "error"
      );
      return;
    }

    if (
      this.settings.effects.cardEffects.includes("climate-aura")
      && this.settings.effects.climateEntities.length === 0
    ) {
      this._setStatus(
        "Bitte mindestens einen Klimasensor auswählen.",
        "error"
      );
      return;
    }

    if (
      this.settings.effects.cardEffects.includes("alert-focus")
      && this.settings.effects.alertEntities.length === 0
    ) {
      this._setStatus(
        "Bitte mindestens einen Alarm- oder Statussensor auswählen.",
        "error"
      );
      return;
    }

    const buttons = [
      this.shadowRoot.getElementById("apply-button"),
      this.shadowRoot.getElementById(
        "quick-apply-button"
      ),
    ];

    buttons.forEach((button) => {
      button.disabled = true;
      button.textContent = "Wird aktiviert …";
    });

    try {
      const result =
        await this._hass.callWS({
          type: "theme_studio/save_settings",
          settings: this.settings,
        });

      this.settings = result.settings;

      this._setStatus(
        "Design gespeichert und aktiviert.",
        "success"
      );

      buttons.forEach((button) => {
        button.textContent = "Aktiviert ✓";
      });
    } catch (error) {
      this._setStatus(
        this._errorMessage(error),
        "error"
      );

      buttons.forEach((button) => {
        button.textContent = "Fehlgeschlagen";
      });
    }

    window.setTimeout(() => {
      buttons[0].disabled = false;
      buttons[0].textContent = "Beide Modi anwenden";

      buttons[1].disabled = false;
      buttons[1].textContent = "Aktivieren";
    }, 2200);
  }

  _syncControls() {
    this.shadowRoot
      .querySelectorAll(".mode-button")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.mode === this.activeMode
        );
      });

    const colors = {
      "primary-color": "primaryColor",
      "background-color": "backgroundColor",
      "card-color": "cardColor",
      "card-text-color": "cardTextColor",
      "card-icon-color": "cardIconColor",
      "card-border-color": "cardBorderColor",
    };

    Object.entries(colors).forEach(
      ([id, setting]) => {
        this.shadowRoot.getElementById(id).value =
          this.profile[setting];
      }
    );

    const ranges = {
      "card-opacity": ["cardOpacity", "%"],
      "card-border-width": ["cardBorderWidth", "px"],
      "card-shadow": ["cardShadow", ""],
      "border-radius": ["borderRadius", "px"],
      "darkening": ["darkening", "%"],
    };

    Object.entries(ranges).forEach(
      ([id, values]) => {
        const [setting, suffix] = values;
        const value = this.profile[setting];

        this.shadowRoot.getElementById(id).value = value;

        this.shadowRoot
          .getElementById(`${id}-value`)
          .textContent = suffix
            ? `${value} ${suffix}`
            : `${value}`;
      }
    );

    this.shadowRoot
      .getElementById("file-name")
      .textContent = this.profile.backgroundImage
        ? "Hintergrundbild gespeichert"
        : "";

    this.shadowRoot
      .getElementById("preview-mode")
      .textContent =
        this.activeMode === "light"
          ? "Vorschau: heller Modus"
          : "Vorschau: dunkler Modus";

    this._syncColorPresets();
    this._syncBackgroundSelection();
    this._syncImageOption();
    this._syncEffectControls();
  }

  _syncEffectControls() {
    this.shadowRoot
      .querySelectorAll(".background-effect-option")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.effect ===
            this.settings.effects.effect
        );
      });

    const ranges = {
      "effect-motion": "motion",
      "effect-glow": "glow",
    };

    Object.entries(ranges).forEach(
      ([elementId, settingName]) => {
        const value =
          this.settings.effects[settingName];

        this.shadowRoot
          .getElementById(elementId)
          .value = value;

        this.shadowRoot
          .getElementById(`${elementId}-value`)
          .textContent = `${value} %`;
      }
    );

    this.shadowRoot
      .getElementById("effect-controls")
      .hidden =
        this.settings.effects.effect === "none";

    this.shadowRoot
      .querySelectorAll(".card-effect-option")
      .forEach((button) => {
        const effect = button.dataset.cardEffect;

        button.classList.toggle(
          "active",
          effect === "none"
            ? this.settings.effects.cardEffects.length === 0
            : this.settings.effects.cardEffects.includes(effect)
        );
      });

    const cardIntensity =
      this.settings.effects.cardIntensity;

    this.shadowRoot
      .getElementById("card-effect-intensity")
      .value = cardIntensity;

    this.shadowRoot
      .getElementById("card-effect-intensity-value")
      .textContent = `${cardIntensity} %`;

    this.shadowRoot
      .getElementById("card-effect-controls")
      .hidden =
        this.settings.effects.cardEffects.length === 0;

    const energyEntities = new Set(
      this.settings.effects.energyEntities
    );

    this.shadowRoot
      .querySelectorAll(".energy-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.checked =
          energyEntities.has(checkbox.value);
      });

    this.shadowRoot
      .getElementById("energy-warning")
      .value = this.settings.effects.energyWarning;

    this.shadowRoot
      .getElementById("energy-critical")
      .value = this.settings.effects.energyCritical;

    this.shadowRoot
      .getElementById("energy-flow-controls")
      .hidden =
        !this.settings.effects.cardEffects
          .includes("energy-flow");

    const climateEntities = new Set(
      this.settings.effects.climateEntities
    );

    this.shadowRoot
      .querySelectorAll(".climate-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.checked =
          climateEntities.has(checkbox.value);
      });

    this.shadowRoot
      .getElementById("climate-comfort-min")
      .value = this.settings.effects.climateComfortMin;

    this.shadowRoot
      .getElementById("climate-comfort-max")
      .value = this.settings.effects.climateComfortMax;

    this.shadowRoot
      .getElementById("climate-hot")
      .value = this.settings.effects.climateHot;

    this.shadowRoot
      .getElementById("climate-aura-controls")
      .hidden =
        !this.settings.effects.cardEffects
          .includes("climate-aura");

    const alertEntities = new Set(
      this.settings.effects.alertEntities
    );

    this.shadowRoot
      .querySelectorAll(".alert-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.checked =
          alertEntities.has(checkbox.value);
      });

    this.shadowRoot
      .getElementById("alert-battery-low")
      .value = this.settings.effects.alertBatteryLow;

    this.shadowRoot
      .getElementById("alert-focus-controls")
      .hidden =
        !this.settings.effects.cardEffects
          .includes("alert-focus");
  }

  _syncColorPresets() {
    this.shadowRoot
      .querySelectorAll(".color-preset")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.color.toLowerCase() ===
            this.profile.primaryColor.toLowerCase()
        );
      });
  }

  _syncBackgroundSelection() {
    this.shadowRoot
      .querySelectorAll(".background-option")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.background ===
            this.profile.background
        );
      });
  }

  _syncImageOption() {
    const option =
      this.shadowRoot.getElementById("image-option");

    option.style.backgroundImage =
      this.profile.backgroundImage
        ? `linear-gradient(
            rgba(0, 0, 0, 0.25),
            rgba(0, 0, 0, 0.25)
          ),
          url("${this.profile.backgroundImage}")`
        : "";
  }

  _resetActiveMode() {
    const defaults =
      this.activeMode === "light"
        ? cloneThemeStudioPreset("design_1").light
        : cloneThemeStudioPreset("design_1").dark;

    this.settings[this.activeMode] = defaults;
    this.selectedDesign = null;

    this._clearStatus();
    this._syncControls();
    this._updatePreview();
  }

  _setStatus(message, type) {
    const status =
      this.shadowRoot.getElementById("status");

    status.textContent = message;
    status.className = "status";

    if (type) {
      status.classList.add(type);
    }
  }

  _clearStatus() {
    this._setStatus("", "");
  }

  _errorMessage(error) {
    return (
      error?.message ||
      error?.body?.message ||
      "Der Vorgang ist fehlgeschlagen."
    );
  }

  _hexToRgb(color) {
    const value = color.replace("#", "");

    return {
      red: parseInt(value.slice(0, 2), 16),
      green: parseInt(value.slice(2, 4), 16),
      blue: parseInt(value.slice(4, 6), 16),
    };
  }

  _rgba(color, opacity) {
    const rgb = this._hexToRgb(color);

    return (
      `rgba(${rgb.red}, ${rgb.green}, ` +
      `${rgb.blue}, ${opacity})`
    );
  }

  _backgroundImage() {
    if (
      this.profile.background === "image"
      && this.profile.backgroundImage
    ) {
      return `url("${this.profile.backgroundImage}")`;
    }

    if (this.profile.background === "waves") {
      return `
        radial-gradient(
          circle at 20% 20%,
          ${this.profile.primaryColor} 0,
          transparent 35%
        ),
        radial-gradient(
          circle at 80% 70%,
          #2f6fa3 0,
          transparent 40%
        )
      `;
    }

    if (this.profile.background === "aurora") {
      return `
        linear-gradient(
          135deg,
          ${this.profile.backgroundColor},
          ${this.profile.primaryColor} 48%,
          #552d6f
        )
      `;
    }

    return "none";
  }

  _cardShadow() {
    const strength = this.profile.cardShadow;

    if (strength === 0) {
      return "none";
    }

    const offset =
      Math.max(2, Math.round(strength / 4));

    const opacity =
      Math.min(0.45, 0.12 + strength / 150);

    return (
      `0 ${offset}px ${strength}px ` +
      `rgba(0, 0, 0, ${opacity})`
    );
  }

  _updatePreview() {
    const preview =
      this.shadowRoot.getElementById("preview");

    const previewEffect =
      this.shadowRoot.getElementById("preview-effect");

    previewEffect.className = "preview-effect";

    if (
      this.settings.effects.effect === "space-command"
    ) {
      previewEffect.classList.add("space-command");
    }

    const previewDuration =
      22 - this.settings.effects.motion * 0.17;

    preview.style.setProperty(
      "--effect-preview-duration",
      `${Math.max(5, previewDuration)}s`
    );

    preview.style.setProperty(
      "--effect-preview-opacity",
      0.12 + this.settings.effects.glow / 180
    );

    const previewCards =
      this.shadowRoot.querySelectorAll(".preview-card");

    previewCards.forEach((card) => {
      card.classList.remove("status-pulse-demo");
      card.classList.remove("energy-flow-demo");
      card.classList.remove("climate-aura-demo");
      card.classList.remove("alert-focus-demo");
    });

    if (
      this.settings.effects.cardEffects
        .includes("status-pulse")
      && previewCards[1]
    ) {
      previewCards[1].classList.add(
        "status-pulse-demo"
      );
    }

    if (
      this.settings.effects.cardEffects
        .includes("energy-flow")
      && previewCards[0]
    ) {
      previewCards[0].classList.add(
        "energy-flow-demo"
      );
    }

    if (
      this.settings.effects.cardEffects
        .includes("climate-aura")
      && previewCards[2]
    ) {
      previewCards[2].classList.add(
        "climate-aura-demo"
      );
    }

    if (
      this.settings.effects.cardEffects
        .includes("alert-focus")
      && previewCards[3]
    ) {
      previewCards[3].classList.add(
        "alert-focus-demo"
      );
    }

    const cardIntensity =
      this.settings.effects.cardIntensity / 100;

    preview.style.setProperty(
      "--card-pulse-width",
      `${1 + cardIntensity * 3}px`
    );

    preview.style.setProperty(
      "--card-pulse-glow",
      `${8 + cardIntensity * 28}px`
    );

    preview.style.setProperty(
      "--preview-primary",
      this.profile.primaryColor
    );

    preview.style.setProperty(
      "--preview-background",
      this.profile.backgroundColor
    );

    preview.style.setProperty(
      "--preview-card",
      this._rgba(
        this.profile.cardColor,
        this.profile.cardOpacity / 100
      )
    );

    preview.style.setProperty(
      "--preview-card-text",
      this.profile.cardTextColor
    );

    preview.style.setProperty(
      "--preview-icon",
      this.profile.cardIconColor
    );

    preview.style.setProperty(
      "--preview-border-color",
      this.profile.cardBorderColor
    );

    preview.style.setProperty(
      "--preview-border-width",
      `${this.profile.cardBorderWidth}px`
    );

    preview.style.setProperty(
      "--preview-radius",
      `${this.profile.borderRadius}px`
    );

    preview.style.setProperty(
      "--preview-shadow",
      this._cardShadow()
    );

    preview.style.setProperty(
      "--preview-darkening",
      this.profile.darkening / 100
    );

    preview.style.setProperty(
      "--preview-image",
      this._backgroundImage()
    );

    preview.style.setProperty(
      "--preview-top-text",
      this.activeMode === "light"
        ? "#1c1c1c"
        : "#ffffff"
    );
  }
}

if (!customElements.get("theme-studio-panel")) {
  customElements.define(
    "theme-studio-panel",
    ThemeStudioPanel
  );
}
