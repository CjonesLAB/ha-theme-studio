import {
  ThemeStudioLocalizer,
  themeStudioLanguage,
} from "./theme-studio-locales.js?v=0.5.4";

class ThemeStudioPanel extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.activeMode = "dark";
    this.profiles = [];
    this.profileLimit = 32;
    this.activeProfileId = "";
    this.persistedActiveProfileId = "";
    this.communityDesigns = [];
    this.communityGalleryLoaded = false;
    this.communityGalleryLoading = false;
    this.backgrounds = [];
    this.backgroundLimit = 24;
    this.undoHistory = [];
    this.redoHistory = [];
    this.historyLimit = 50;
    this.historyCoalesceKey = "";
    this.appliedSettings = null;
    this.integrationVersion = "";
    this.pendingProfileImport = null;
    this.importPreviewReturnFocus = null;
    this.recoveryAvailable = false;
    this.themeStudioActive = true;
    this.localizer = null;

    this.settings = {
      light: {
        primaryColor: "#2f6fa3",
        backgroundColor: "#eef2f5",
        cardColor: "#ffffff",
        cardTextColor: "#1c1c1c",
        cardIconColor: "#2f6fa3",
        cardBorderColor: "#d5dde5",
        headerBackgroundColor: "#eef2f5",
        headerTextColor: "#1c1c1c",
        sidebarBackgroundColor: "#eef2f5",
        sidebarTextColor: "#1c1c1c",
        sidebarIconColor: "#5f6b72",
        sidebarSelectedColor: "#2f6fa3",
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
        headerBackgroundColor: "#101719",
        headerTextColor: "#ffffff",
        sidebarBackgroundColor: "#101719",
        sidebarTextColor: "#ffffff",
        sidebarIconColor: "#b8c4c7",
        sidebarSelectedColor: "#26b2b3",
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
        pulseEntities: [],
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
      this.localizer = new ThemeStudioLocalizer(
        themeStudioLanguage(hass)
      );
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
          color: var(--primary-text-color, #1c1c1c);
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

        :where(
          button,
          a,
          input,
          select,
          summary,
          [tabindex]
        ):focus-visible {
          outline: 3px solid var(--primary-color, #03a9f4);
          outline-offset: 3px;
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
          position: sticky;
          top: 0;
          z-index: 130;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 8px;
          padding: 10px 0;
          background: var(--primary-background-color);
          box-shadow: 0 10px 18px -18px rgba(0, 0, 0, 0.7);
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

        .version-badge {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          margin-top: 7px;
          padding: 0 8px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          color: var(--secondary-text-color);
          font-size: 10px;
          font-weight: 700;
        }

        .mode-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          min-width: 210px;
          padding: 4px;
          border-radius: 12px;
          background: var(--card-background-color, #ffffff);
          box-shadow: var(--ha-card-box-shadow);
        }

        .topbar-actions {
          display: flex;
          flex: 0 0 auto;
          align-items: stretch;
          gap: 9px;
        }

        .history-actions {
          display: grid;
          grid-template-columns: 38px 38px;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          background: var(--card-background-color, #ffffff);
          box-shadow: var(--ha-card-box-shadow);
        }

        .history-button {
          min-height: 38px;
          padding: 0;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--primary-text-color, #1c1c1c);
          font-size: 20px;
          font-weight: 700;
        }

        .history-button:hover:not(:disabled) {
          background: var(--secondary-background-color, #eeeeee);
        }

        .history-button:disabled {
          cursor: default;
          opacity: 0.35;
        }

        .top-apply-button {
          min-height: 46px;
          padding: 0 18px;
          border: 0;
          border-radius: 12px;
          background: var(--primary-color, #03a9f4);
          color: var(--text-primary-color, white);
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: var(--ha-card-box-shadow);
        }

        .top-pair-button {
          min-height: 46px;
          padding: 0 16px;
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          background: var(--card-background-color, #ffffff);
          color: var(--primary-text-color, #1c1c1c);
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: var(--ha-card-box-shadow);
        }

        .top-pair-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .top-apply-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .mode-button {
          min-height: 38px;
          padding: 0 15px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--primary-text-color, #1c1c1c);
          font-size: 13px;
          font-weight: 600;
        }

        .mode-button.active {
          background: var(--primary-color, #03a9f4);
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

        .unsaved-indicator {
          min-height: 18px;
          margin: -10px 0 12px;
          color: var(--warning-color, #f9a825);
          font-size: 12px;
          font-weight: 600;
        }

        .builder-grid {
          display: grid;
          grid-template-columns:
            minmax(360px, 0.78fr)
            minmax(520px, 1.35fr);
          gap: 18px;
          align-items: start;
        }

        .builder-controls {
          display: grid;
          min-width: 0;
          gap: 18px;
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

        .profile-panel {
          margin-bottom: 18px;
        }

        .profile-content {
          display: grid;
          grid-template-columns: minmax(170px, 0.8fr) minmax(190px, 1fr);
          gap: 10px;
          padding: 0 17px 16px;
        }

        .profile-field {
          display: grid;
          gap: 5px;
        }

        .profile-field label {
          color: var(--secondary-text-color);
          font-size: 11px;
          font-weight: 600;
        }

        .profile-field input,
        .profile-field select {
          min-height: 39px;
          padding: 0 11px;
          border: 1px solid var(--divider-color);
          border-radius: 9px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }

        .profile-actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .profile-button,
        .profile-import-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 35px;
          padding: 0 12px;
          border: 1px solid var(--divider-color);
          border-radius: 9px;
          background: transparent;
          color: var(--primary-text-color);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .profile-button.primary {
          border-color: transparent;
          background: var(--primary-color);
          color: var(--text-primary-color, white);
        }

        .profile-button.danger {
          color: var(--error-color, #db4437);
        }

        .profile-button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .profile-import-label input,
        #background-file {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .profile-import-label:has(input:focus-visible),
        .upload-button:has(+ #background-file:focus-visible) {
          outline: 3px solid var(--primary-color, #03a9f4);
          outline-offset: 3px;
        }

        .profile-hint {
          grid-column: 1 / -1;
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 10px;
        }

        .import-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.62);
          backdrop-filter: blur(5px);
        }

        .import-preview-dialog {
          width: min(680px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          border: 1px solid var(--divider-color);
          border-radius: 18px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.36);
        }

        .import-preview-header,
        .import-preview-body,
        .import-preview-actions {
          padding: 18px 20px;
        }

        .import-preview-header {
          border-bottom: 1px solid var(--divider-color);
        }

        .import-preview-header h2 {
          margin: 0 0 4px;
          font-size: 21px;
        }

        .import-preview-header p,
        .import-preview-body p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .import-preview-body {
          display: grid;
          gap: 16px;
        }

        .import-preview-modes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .import-preview-mode {
          overflow: hidden;
          border: 1px solid var(--divider-color);
          border-radius: 13px;
        }

        .import-preview-colors {
          position: relative;
          min-height: 158px;
          padding: 38px 12px 12px 68px;
          background: var(--import-background);
          color: var(--import-text);
        }

        .import-preview-colors::before {
          position: absolute;
          inset: 0 auto 0 0;
          width: 56px;
          background: var(--import-sidebar);
          content: "";
        }

        .import-preview-colors::after {
          position: absolute;
          inset: 0 0 auto 0;
          height: 27px;
          background: var(--import-header);
          content: "";
        }

        .import-preview-mini-title {
          position: relative;
          z-index: 1;
          display: block;
          margin-bottom: 9px;
          font-size: 10px;
        }

        .import-preview-mini-cards {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .import-preview-mini-card {
          min-height: 38px;
          border: var(--import-border-width) solid var(--import-border);
          border-radius: var(--import-radius);
          background: var(--import-card);
          box-shadow: 0 4px var(--import-shadow-blur) rgba(0, 0, 0, 0.2);
        }

        .import-preview-mini-card::before,
        .import-preview-mini-card::after {
          display: block;
          height: 4px;
          margin: 9px 8px 0;
          border-radius: 99px;
          background: var(--import-text);
          opacity: 0.7;
          content: "";
        }

        .import-preview-mini-card::after {
          width: 48%;
          margin-top: 5px;
          background: var(--import-primary);
          opacity: 1;
        }

        .import-preview-mode strong {
          display: block;
          padding: 10px 12px;
          font-size: 12px;
        }

        .import-preview-facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .import-preview-fact {
          padding: 11px 12px;
          border-radius: 11px;
          background: var(--secondary-background-color);
          font-size: 11px;
        }

        .import-preview-fact strong {
          display: block;
          margin-bottom: 3px;
        }

        .import-preview-notices {
          margin: 0;
          padding-left: 20px;
          color: var(--secondary-text-color);
          font-size: 11px;
        }

        .import-preview-notices li + li {
          margin-top: 5px;
        }

        .import-preview-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          border-top: 1px solid var(--divider-color);
        }

        .community-panel {
          margin-bottom: 18px;
        }

        .community-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .community-heading-actions {
          display: flex;
          flex: 0 0 auto;
          gap: 7px;
        }

        .community-link {
          text-decoration: none;
        }

        .community-state {
          padding: 4px 17px 17px;
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .community-state.error {
          color: var(--error-color, #db4437);
        }

        .community-grid {
          display: grid;
          overflow: auto hidden;
          grid-auto-columns: calc((100% - 22px) / 3);
          grid-auto-flow: column;
          gap: 11px;
          margin: 0 17px;
          padding: 0 0 17px;
          overscroll-behavior-inline: contain;
          scroll-behavior: smooth;
          scroll-snap-type: inline mandatory;
          scrollbar-width: none;
          touch-action: pan-x pan-y;
        }

        .community-grid::-webkit-scrollbar {
          display: none;
        }

        .community-slider-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 0 17px 10px;
        }

        .community-slider-button {
          display: inline-flex;
          width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid var(--divider-color);
          border-radius: 50%;
          background: transparent;
          color: var(--primary-text-color);
          font-size: 19px;
          line-height: 1;
        }

        .community-slider-button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .community-slider-position {
          min-width: 72px;
          color: var(--secondary-text-color);
          font-size: 10px;
          text-align: center;
        }

        .community-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--divider-color);
          border-radius: 14px;
          background: var(--secondary-background-color);
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .community-preview {
          position: relative;
          min-height: 180px;
          overflow: hidden;
          background: var(--community-background);
          color: var(--community-text);
        }

        .community-mini-header {
          display: flex;
          height: 24px;
          align-items: center;
          gap: 6px;
          padding: 0 8px;
          background: var(--community-header-background);
          color: var(--community-header-text);
          font-size: 7px;
        }

        .community-mini-header strong {
          flex: 1;
          font-size: 8px;
        }

        .community-mini-shell {
          display: grid;
          min-height: 156px;
          grid-template-columns: 57px minmax(0, 1fr);
        }

        .community-mini-sidebar {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 7px 5px;
          background: var(--community-sidebar-background);
          color: var(--community-sidebar-text);
          font-size: 6px;
        }

        .community-mini-sidebar strong {
          overflow: hidden;
          margin: 0 2px 3px;
          font-size: 6px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .community-mini-nav {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px;
          border-radius: 4px;
        }

        .community-mini-nav span {
          color: var(--community-sidebar-icon);
          font-size: 7px;
        }

        .community-mini-nav.active {
          background: var(--community-sidebar-selected-soft);
          color: var(--community-sidebar-selected);
        }

        .community-mini-nav.active span {
          color: var(--community-sidebar-selected);
        }

        .community-mini-dashboard {
          position: relative;
          min-width: 0;
          padding: 7px;
          background: var(--community-dashboard-background);
          background-position: center;
          background-size: cover;
        }

        .community-mini-dashboard::after {
          position: absolute;
          z-index: 0;
          inset: 0;
          background: rgba(0, 0, 0, var(--community-darkening));
          content: "";
          pointer-events: none;
        }

        .community-mini-dashboard.space-command::before {
          position: absolute;
          z-index: 1;
          inset: 0;
          background-image:
            linear-gradient(rgba(80, 225, 255, 0.09) 1px, transparent 1px),
            linear-gradient(90deg, rgba(80, 225, 255, 0.09) 1px, transparent 1px);
          background-size: 16px 16px;
          content: "";
          pointer-events: none;
        }

        .community-mini-title,
        .community-mini-cards {
          position: relative;
          z-index: 2;
        }

        .community-mini-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 8px;
          font-weight: 700;
        }

        .community-mini-title small {
          font-size: 6px;
          font-weight: 600;
        }

        .community-mini-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }

        .community-mini-card {
          min-width: 0;
          min-height: 52px;
          padding: 6px;
          border:
            var(--community-border-width)
            solid
            var(--community-border);
          border-radius: var(--community-radius);
          background: var(--community-card);
          box-shadow:
            0 2px var(--community-shadow-blur)
            rgba(0, 0, 0, 0.34);
          color: var(--community-text);
        }

        .community-mini-card-title {
          display: flex;
          overflow: hidden;
          align-items: center;
          gap: 3px;
          font-size: 6px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .community-mini-icon {
          color: var(--community-icon);
          font-size: 7px;
        }

        .community-mini-value {
          margin-top: 6px;
          color: var(--community-primary);
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }

        .community-mini-detail {
          margin-top: 4px;
          font-size: 5px;
          opacity: 0.72;
        }

        .community-mini-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 5px;
        }

        .community-mini-switch {
          width: 17px;
          height: 8px;
          padding: 1px;
          border-radius: 999px;
          background: var(--community-primary);
        }

        .community-mini-switch::after {
          display: block;
          width: 6px;
          height: 6px;
          margin-left: auto;
          border-radius: 50%;
          background: #ffffff;
          content: "";
        }

        .community-mini-bars {
          display: flex;
          height: 26px;
          align-items: end;
          gap: 3px;
          margin-top: 5px;
        }

        .community-mini-bars span {
          flex: 1;
          border-radius: 2px 2px 0 0;
          background: var(--community-primary);
        }

        .community-mini-card.energy-flow {
          box-shadow: 0 0 8px rgba(255, 181, 0, var(--community-effect-alpha));
        }

        .community-mini-card.status-pulse {
          box-shadow: 0 0 8px rgba(69, 212, 131, var(--community-effect-alpha));
        }

        .community-mini-card.climate-aura {
          box-shadow: 0 0 8px rgba(79, 157, 255, var(--community-effect-alpha));
        }

        .community-mini-card.alert-focus {
          box-shadow: 0 0 9px rgba(255, 59, 79, var(--community-effect-alpha));
        }

        .community-mode-label {
          position: absolute;
          z-index: 3;
          right: 7px;
          bottom: 5px;
          padding: 2px 4px;
          border-radius: 999px;
          background: var(--community-card);
          color: var(--community-text);
          font-size: 5px;
          opacity: 0.82;
        }

        .community-card-content {
          display: flex;
          min-height: 145px;
          flex: 1;
          flex-direction: column;
          gap: 7px;
          padding: 12px;
        }

        .community-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .community-badge {
          padding: 3px 7px;
          border-radius: 999px;
          background: var(--primary-background-color);
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .community-card h3 {
          margin: 0;
          font-size: 15px;
        }

        .community-summary {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.4;
        }

        .community-meta {
          margin-top: auto;
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .community-import-button {
          width: 100%;
          margin-top: 2px;
        }

        .community-import-button[aria-busy="true"] {
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
          max-height: 148px;
          overflow-y: auto;
          overscroll-behavior: contain;
          border: 1px solid var(--divider-color);
          border-radius: 9px;
          background: var(--secondary-background-color);
          scrollbar-gutter: stable;
        }

        .entity-picker-tools {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
        }

        .entity-search {
          width: 100%;
          min-height: 36px;
          padding: 0 10px;
          border: 1px solid var(--divider-color);
          border-radius: 9px;
          outline: none;
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
          font-size: 11px;
        }

        .entity-search:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color);
        }

        .entity-selection-count {
          min-width: 62px;
          color: var(--secondary-text-color);
          font-size: 10px;
          text-align: right;
          white-space: nowrap;
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

        .file-name {
          min-height: 15px;
          margin-top: 5px;
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .background-upload-name {
          width: 100%;
          min-height: 34px;
          margin-bottom: 8px;
          padding: 0 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font-size: 11px;
        }

        .background-library-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 15px 0 8px;
        }

        .background-library-heading h4 {
          margin: 0;
          font-size: 11px;
        }

        .background-library-count {
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .background-library {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .background-library-empty {
          grid-column: 1 / -1;
          margin: 0;
          padding: 14px 9px;
          border: 1px dashed var(--divider-color);
          border-radius: 9px;
          color: var(--secondary-text-color);
          font-size: 10px;
          text-align: center;
        }

        .background-library-card {
          min-width: 0;
          overflow: hidden;
          border: 2px solid transparent;
          border-radius: 10px;
          background: var(--secondary-background-color);
        }

        .background-library-card.active {
          border-color: var(--primary-color);
        }

        .background-select-button {
          display: block;
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--primary-text-color);
          text-align: left;
        }

        .background-library-preview {
          display: block;
          min-height: 72px;
          background-color: #101719;
          background-position: center;
          background-size: cover;
        }

        .background-library-name {
          display: block;
          overflow: hidden;
          padding: 7px 8px 3px;
          font-size: 10px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .background-library-size {
          display: block;
          padding: 0 8px 7px;
          color: var(--secondary-text-color);
          font-size: 8px;
        }

        .background-library-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid var(--divider-color);
        }

        .background-library-action {
          min-height: 29px;
          border: 0;
          background: transparent;
          color: var(--secondary-text-color);
          font-size: 9px;
        }

        .background-library-action +
        .background-library-action {
          border-left: 1px solid var(--divider-color);
        }

        .background-library-action.danger {
          color: var(--error-color, #db4437);
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

        .editor-action.restore-default {
          grid-column: 1 / -1;
          border: 1px solid var(--warning-color, #ff9800);
          background: transparent;
          color: var(--warning-color, #ff9800);
        }

        .editor-action:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .preview-panel {
          position: sticky;
          top: var(--theme-studio-preview-sticky-top, 82px);
          min-width: 0;
          align-self: start;
          padding: 12px;
          border-radius: 17px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow);
        }

        .preview {
          position: relative;
          display: flex;
          height: min(620px, calc(100vh - 36px));
          min-height: 480px;
          flex-direction: column;
          overflow: hidden;
          border-radius: 13px;
          background: var(--preview-background);
        }

        .preview-app-header {
          position: relative;
          z-index: 4;
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          min-height: 48px;
          padding: 0 17px;
          color: var(--preview-header-text);
          background: var(--preview-header-background);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.16);
        }

        .preview-app-header-left,
        .preview-app-header-actions {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .preview-menu-icon,
        .preview-header-action {
          font-size: 17px;
          line-height: 1;
        }

        .preview-app-title {
          font-size: 14px;
          font-weight: 700;
        }

        .preview-app-body {
          display: grid;
          grid-template-columns: 145px minmax(0, 1fr);
          min-height: 0;
          flex: 1 1 auto;
        }

        .preview-sidebar {
          position: relative;
          z-index: 3;
          padding: 13px 9px;
          color: var(--preview-sidebar-text);
          background: var(--preview-sidebar-background);
        }

        .preview-sidebar-brand {
          margin: 2px 8px 12px;
          font-size: 11px;
          font-weight: 700;
          opacity: 0.84;
        }

        .preview-sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 0 9px;
          border-radius: 8px;
          color: var(--preview-sidebar-text);
          font-size: 10px;
          font-weight: 600;
        }

        .preview-sidebar-item.active {
          color: var(--preview-sidebar-selected);
          background: var(--preview-sidebar-active-background);
        }

        .preview-sidebar-icon {
          width: 18px;
          color: var(--preview-sidebar-icon);
          font-size: 14px;
          text-align: center;
        }

        .preview-sidebar-item.active
        .preview-sidebar-icon {
          color: var(--preview-sidebar-selected);
        }

        .preview-dashboard {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 21px;
          overflow: hidden;
          color: var(--preview-top-text);
          background-color: var(--preview-background);
          background-image: var(--preview-image);
          background-position: center;
          background-size: cover;
        }

        .preview-dashboard::before {
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
          .community-grid {
            scroll-behavior: auto;
          }

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
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
          .topbar {
            top: 56px;
            margin: 0 -2px 12px;
            padding: 7px 2px;
          }

          .topbar-intro {
            display: none;
          }

          .topbar-actions {
            width: 100%;
            flex-wrap: nowrap;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
          }

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
            z-index: 90;
            order: -1;
            padding: 8px;
          }

          .preview {
            height: 360px;
            min-height: 0;
          }

          .preview-grid {
            grid-template-columns: 1fr 1fr;
          }

          .community-grid {
            grid-auto-columns: calc((100% - 11px) / 2);
          }
        }

        @media (max-width: 620px) {
          .page {
            padding: 13px;
          }

          .topbar {
            top: 56px;
            margin: 0 -1px 10px;
            padding: 6px 1px;
          }

          .mode-switcher {
            min-width: 132px;
            padding: 3px;
          }

          .topbar-actions {
            display: flex;
            width: 100%;
            gap: 6px;
          }

          .history-actions {
            grid-template-columns: 30px 30px;
            flex: 0 0 68px;
            padding: 3px;
          }

          .history-button,
          .mode-button {
            min-height: 32px;
          }

          .mode-button {
            padding: 0 7px;
            font-size: 11px;
          }

          .top-apply-button,
          .top-pair-button {
            min-height: 38px;
            padding: 0 10px;
            font-size: 11px;
          }

          .preview-panel {
            padding: 5px;
            border-radius: 12px;
          }

          .preview {
            height: 210px;
            border-radius: 9px;
          }

          .preview-app-header {
            min-height: 31px;
            padding: 0 9px;
          }

          .preview-app-header-actions {
            display: none;
          }

          .preview-menu-icon {
            font-size: 13px;
          }

          .preview-app-title {
            font-size: 10px;
          }

          .preview-app-body {
            grid-template-columns: 1fr;
          }

          .preview-sidebar {
            display: none;
          }

          .preview-dashboard {
            padding: 6px 8px;
          }

          .preview-header {
            margin-bottom: 4px;
          }

          .preview-header h2 {
            font-size: 12px;
          }

          .preview-time {
            font-size: 10px;
          }

          .preview-mode {
            display: none;
          }

          .preview-grid {
            grid-template-columns: 1fr 1fr;
            gap: 4px;
          }

          .preview-card {
            min-height: 62px;
            padding: 5px 6px;
            border-radius: min(var(--preview-radius), 9px);
            backdrop-filter: blur(7px);
          }

          .preview-card h3 {
            gap: 4px;
            margin-bottom: 3px;
            font-size: 8px;
          }

          .preview-icon {
            width: 7px;
            height: 7px;
            flex-basis: 7px;
            border-radius: 2px;
          }

          .large-value {
            font-size: 14px;
          }

          .secondary-text {
            margin-top: 1px;
            font-size: 7px;
          }

          .switch-row {
            margin-top: 2px;
            font-size: 7px;
          }

          .fake-switch {
            width: 22px;
            height: 12px;
          }

          .fake-switch::after {
            top: 2px;
            right: 2px;
            width: 8px;
            height: 8px;
          }

          .chart {
            gap: 2px;
            height: 26px;
            margin-top: 2px;
          }

          .editor-actions {
            grid-template-columns: 1fr;
          }

          .profile-content {
            grid-template-columns: 1fr;
          }

          .profile-actions > * {
            flex: 1 1 calc(50% - 7px);
          }

          .import-preview-overlay {
            padding: 10px;
          }

          .import-preview-dialog {
            max-height: calc(100vh - 20px);
          }

          .import-preview-header,
          .import-preview-body,
          .import-preview-actions {
            padding: 14px;
          }

          .import-preview-modes,
          .import-preview-facts,
          .import-preview-actions {
            grid-template-columns: 1fr;
          }

          .topbar-actions {
            flex-wrap: nowrap;
          }

          .history-actions {
            flex: 0 0 68px;
          }

          .community-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .community-heading-actions {
            width: 100%;
          }

          .community-heading-actions > * {
            flex: 1;
          }

          .community-grid {
            grid-auto-columns: 100%;
            margin-inline: 13px;
            padding: 0 0 13px;
          }

          .community-slider-controls {
            justify-content: center;
            padding: 0 13px 10px;
          }
        }
      </style>

      <nav class="mobile-navigation" aria-label="Mobile Navigation">
        <a class="mobile-back" href="/">
          <span class="back-arrow" aria-hidden="true">‹</span>
          <span>Zur Übersicht</span>
        </a>
      </nav>

      <main class="page">
        <header class="topbar">
          <div class="topbar-intro">
            <h1>Theme Studio</h1>
            <p>
              Community-Design wählen oder individuell gestalten.
            </p>
            <span id="version-badge" class="version-badge">
              Version wird geladen …
            </span>
          </div>

          <div class="topbar-actions">
            <div class="history-actions" aria-label="Änderungsverlauf">
              <button
                id="undo-button"
                class="history-button"
                type="button"
                title="Letzte Änderung rückgängig machen"
                aria-label="Rückgängig"
                disabled
              >↶</button>
              <button
                id="redo-button"
                class="history-button"
                type="button"
                title="Änderung wiederholen"
                aria-label="Wiederholen"
                disabled
              >↷</button>
            </div>

            <div
              class="mode-switcher"
              role="group"
              aria-label="Vorschaumodus"
            >
              <button
                class="mode-button"
                data-mode="light"
                type="button"
                aria-pressed="false"
              >
                ☀ Hell
              </button>

              <button
                class="mode-button active"
                data-mode="dark"
                type="button"
                aria-pressed="true"
              >
                ☾ Dunkel
              </button>
            </div>

            <button
              id="apply-button"
              class="top-apply-button"
              type="button"
            >
              Beide Modi anwenden
            </button>

            <button
              id="generate-counterpart-button"
              class="top-pair-button"
              type="button"
              title="Erzeugt aus dem gewählten Modus einen farblich passenden Gegenmodus"
            >
              Passenden Hellmodus erzeugen
            </button>

            <button
              id="restore-last-button"
              class="top-pair-button"
              type="button"
              title="Aktiviert das zuletzt gesicherte Design"
              disabled
            >
              Letztes Design wiederherstellen
            </button>
          </div>
        </header>

        <p
          id="status"
          class="status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        ></p>
        <p
          id="unsaved-indicator"
          class="unsaved-indicator"
          role="status"
          aria-live="polite"
          hidden
        >
          ● Nicht angewendete Änderungen
        </p>

        <div
          id="import-preview-overlay"
          class="import-preview-overlay"
          hidden
        >
          <section
            class="import-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-preview-title"
            aria-describedby="import-preview-subtitle"
          >
            <header class="import-preview-header">
              <h2 id="import-preview-title">Import prüfen</h2>
              <p id="import-preview-subtitle"></p>
            </header>
            <div id="import-preview-body" class="import-preview-body"></div>
            <footer class="import-preview-actions">
              <button
                id="import-preview-cancel"
                class="profile-button"
                type="button"
              >
                Abbrechen
              </button>
              <button
                id="import-preview-confirm"
                class="profile-button primary"
                type="button"
              >
                Profil importieren
              </button>
            </footer>
          </section>
        </div>

        <section class="panel community-panel">
          <div class="panel-heading community-heading">
            <div>
              <h2>Community-Galerie</h2>
              <p>
                Geprüfte Designs ansehen und direkt als Profil importieren.
              </p>
            </div>

            <div class="community-heading-actions">
              <button
                id="community-refresh-button"
                class="profile-button"
                type="button"
              >
                Aktualisieren
              </button>
              <a
                class="profile-button community-link"
                href="https://ha-theme-studio.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Galerie öffnen
              </a>
            </div>
          </div>

          <div
            id="community-state"
            class="community-state"
          >
            Galerie wird geladen …
          </div>

          <div
            id="community-slider-controls"
            class="community-slider-controls"
            hidden
          >
            <button
              id="community-slider-previous"
              class="community-slider-button"
              type="button"
              aria-label="Vorherige Designs anzeigen"
            >
              ‹
            </button>
            <span
              id="community-slider-position"
              class="community-slider-position"
              aria-live="polite"
            ></span>
            <button
              id="community-slider-next"
              class="community-slider-button"
              type="button"
              aria-label="Weitere Designs anzeigen"
            >
              ›
            </button>
          </div>

          <div
            id="community-grid"
            class="community-grid"
            hidden
          ></div>
        </section>

        <section class="panel profile-panel">
          <div class="panel-heading">
            <h2>Eigene Designprofile</h2>
            <p>
              Komplette Designs speichern, laden oder weitergeben.
            </p>
          </div>

          <div class="profile-content">
            <div class="profile-field">
              <label for="profile-select">
                Gespeichertes Profil
              </label>
              <select id="profile-select">
                <option value="">
                  Neues Profil anlegen
                </option>
              </select>
            </div>

            <div class="profile-field">
              <label for="profile-name">
                Profilname
              </label>
              <input
                id="profile-name"
                type="text"
                maxlength="48"
                placeholder="Zum Beispiel: Abend"
                autocomplete="off"
              >
            </div>

            <div class="profile-actions">
              <button
                id="profile-save-button"
                class="profile-button primary"
                type="button"
              >
                Profil speichern
              </button>

              <button
                id="profile-rename-button"
                class="profile-button"
                type="button"
                disabled
              >
                Umbenennen
              </button>

              <button
                id="profile-duplicate-button"
                class="profile-button"
                type="button"
                disabled
              >
                Duplizieren
              </button>

              <button
                id="profile-export-button"
                class="profile-button"
                type="button"
                disabled
              >
                JSON exportieren
              </button>

              <label class="profile-import-label">
                JSON importieren
                <input
                  id="profile-import-file"
                  type="file"
                  accept="application/json,.json"
                >
              </label>

              <button
                id="profile-delete-button"
                class="profile-button danger"
                type="button"
                disabled
              >
                Löschen
              </button>
            </div>

            <p class="profile-hint">
              Es können bis zu 32 Profile gespeichert werden.
              Eigene Hintergrundbilder werden als lokaler Pfad,
              nicht als Bilddatei exportiert.
            </p>
          </div>
        </section>

        <section class="builder-grid">
          <div class="builder-controls">
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
              <summary>Navigation</summary>
              <div class="details-content">
                <div class="effect-subheading">
                  Kopfzeile
                </div>

                ${this._colorField(
                  "header-background-color",
                  "Hintergrundfarbe"
                )}

                ${this._colorField(
                  "header-text-color",
                  "Text- und Symbolfarbe"
                )}

                <div class="effect-subheading">
                  Seitenleiste
                </div>

                ${this._colorField(
                  "sidebar-background-color",
                  "Hintergrundfarbe"
                )}

                ${this._colorField(
                  "sidebar-text-color",
                  "Textfarbe"
                )}

                ${this._colorField(
                  "sidebar-icon-color",
                  "Symbolfarbe"
                )}

                ${this._colorField(
                  "sidebar-selected-color",
                  "Aktive Navigation"
                )}

                <p class="effect-hint">
                  Die Einstellungen gelten getrennt für den
                  oben ausgewählten hellen oder dunklen Modus.
                </p>
              </div>
            </details>

            <details>
              <summary>Hintergrund</summary>
              <div class="details-content">
                <div class="background-options">
                  <button
                    class="background-option background-color"
                    data-background="color"
                    type="button"
                    aria-pressed="false"
                  >
                    Farbe
                  </button>

                  <button
                    class="background-option background-waves"
                    data-background="waves"
                    type="button"
                    aria-pressed="false"
                  >
                    Wellen
                  </button>

                  <button
                    class="background-option background-aurora"
                    data-background="aurora"
                    type="button"
                    aria-pressed="false"
                  >
                    Aurora
                  </button>

                  <button
                    id="image-option"
                    class="background-option background-image-option"
                    data-background="image"
                    type="button"
                    aria-pressed="false"
                  >
                    Eigenes Bild
                  </button>
                </div>

                <div class="upload-box">
                  <p>
                    JPG, PNG oder WebP bis 5 MB.
                  </p>

                  <input
                    id="background-upload-name"
                    class="background-upload-name"
                    type="text"
                    maxlength="48"
                    placeholder="Bildname (optional)"
                    autocomplete="off"
                  >

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

                <div class="background-library-heading">
                  <h4>Bildbibliothek</h4>
                  <span
                    id="background-library-count"
                    class="background-library-count"
                  >
                    0 von 24 Bildern
                  </span>
                </div>

                <div
                  id="background-library"
                  class="background-library"
                ></div>

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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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
                    type="button"
                    aria-pressed="false"
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

                <div id="status-pulse-controls">
                  <div class="effect-field">
                    <label>
                      Entitäten für Status Pulse
                    </label>
                    ${this._entitySearchField(
                      "pulse-entity-search",
                      "pulse-entity-list",
                      "pulse-entity-count",
                      "Entität suchen …"
                    )}
                    <div
                      id="pulse-entity-list"
                      class="energy-entity-list"
                    >
                      ${this._pulseEntityChoices()}
                      <p class="energy-empty entity-filter-empty" hidden>
                        Keine passende Entität gefunden.
                      </p>
                    </div>
                  </div>
                </div>

                <div id="energy-flow-controls">
                  <div class="effect-field">
                    <label>
                      Leistungssensoren
                    </label>
                    ${this._entitySearchField(
                      "energy-entity-search",
                      "energy-entity-list",
                      "energy-entity-count",
                      "Leistungssensor suchen …"
                    )}
                    <div
                      id="energy-entity-list"
                      class="energy-entity-list"
                    >
                      ${this._energyEntityChoices()}
                      <p class="energy-empty entity-filter-empty" hidden>
                        Kein passender Leistungssensor gefunden.
                      </p>
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
                    ${this._entitySearchField(
                      "climate-entity-search",
                      "climate-entity-list",
                      "climate-entity-count",
                      "Klimasensor suchen …"
                    )}
                    <div
                      id="climate-entity-list"
                      class="energy-entity-list"
                    >
                      ${this._climateEntityChoices()}
                      <p class="energy-empty entity-filter-empty" hidden>
                        Kein passender Klimasensor gefunden.
                      </p>
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
                    ${this._entitySearchField(
                      "alert-entity-search",
                      "alert-entity-list",
                      "alert-entity-count",
                      "Alarm- oder Statussensor suchen …"
                    )}
                    <div
                      id="alert-entity-list"
                      class="energy-entity-list"
                    >
                      ${this._alertEntityChoices()}
                      <p class="energy-empty entity-filter-empty" hidden>
                        Keine passende Entität gefunden.
                      </p>
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
                id="restore-default-button"
                class="editor-action restore-default"
                type="button"
              >
                Home-Assistant-Standard wiederherstellen
              </button>
            </div>
            </div>
          </div>

          <aside class="preview-panel">
          <div
            id="preview"
            class="preview"
            role="img"
            aria-label="Dashboard-Vorschau im dunklen Modus"
          >
            <div class="preview-app-header">
              <div class="preview-app-header-left">
                <span class="preview-menu-icon">☰</span>
                <span class="preview-app-title">Übersicht</span>
              </div>

              <div class="preview-app-header-actions">
                <span class="preview-header-action">＋</span>
                <span class="preview-header-action">⌕</span>
                <span class="preview-header-action">⋮</span>
              </div>
            </div>

            <div class="preview-app-body">
              <aside class="preview-sidebar">
                <div class="preview-sidebar-brand">
                  Home Assistant
                </div>

                <div class="preview-sidebar-item active">
                  <span class="preview-sidebar-icon">⌂</span>
                  <span class="preview-sidebar-label">Übersicht</span>
                </div>

                <div class="preview-sidebar-item">
                  <span class="preview-sidebar-icon">◇</span>
                  <span class="preview-sidebar-label">Karte</span>
                </div>

                <div class="preview-sidebar-item">
                  <span class="preview-sidebar-icon">⚡</span>
                  <span class="preview-sidebar-label">Energie</span>
                </div>

                <div class="preview-sidebar-item">
                  <span class="preview-sidebar-icon">◷</span>
                  <span class="preview-sidebar-label">Verlauf</span>
                </div>

                <div class="preview-sidebar-item">
                  <span class="preview-sidebar-icon">⚙</span>
                  <span class="preview-sidebar-label">Einstellungen</span>
                </div>
              </aside>

              <div class="preview-dashboard">
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
            </div>
          </div>
          </aside>
        </section>
      </main>
    `;

    this._bindEvents();
    this._setupStickyOffsets();
    this._syncControls();
    this._updatePreview();
    this._renderProfileOptions();
    this._renderBackgroundLibrary();
    this.localizer?.observe(this.shadowRoot);
  }

  disconnectedCallback() {
    this.localizer?.disconnect();
  }

  connectedCallback() {
    if (this._rendered) {
      this.localizer?.observe(this.shadowRoot);
    }
  }

  _translate(value) {
    return this.localizer?.translate(value) || value;
  }

  _confirm(message) {
    return window.confirm(this._translate(message));
  }

  _prompt(message, defaultValue = "") {
    return window.prompt(
      this._translate(message),
      defaultValue
    );
  }

  _colorPreset(color, title) {
    return `
      <button
        class="color-preset"
        data-color="${color}"
        title="${title}"
        type="button"
        aria-label="Hauptfarbe ${title} wählen"
        aria-pressed="false"
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

  _entitySearchField(searchId, listId, countId, placeholder) {
    return `
      <div class="entity-picker-tools">
        <input
          id="${searchId}"
          class="entity-search"
          type="search"
          placeholder="${placeholder}"
          aria-label="${placeholder}"
          aria-controls="${listId}"
          autocomplete="off"
        >
        <span
          id="${countId}"
          class="entity-selection-count"
          aria-live="polite"
        ></span>
      </div>
    `;
  }

  _pulseEntityChoices() {
    const states = this._hass?.states || {};
    const entities = Object.entries(states)
      .filter(([entityId]) =>
        /^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId)
      )
      .map(([entityId, stateObject]) => ({
        entityId,
        name:
          stateObject.attributes?.friendly_name
          || entityId,
        domain: entityId.split(".")[0],
      }))
      .sort((first, second) =>
        first.name.localeCompare(second.name, "de")
      );

    if (entities.length === 0) {
      return `
        <p class="energy-empty">
          Keine Entitäten gefunden.
        </p>
      `;
    }

    return entities.map((entity) => `
      <label
        class="energy-entity-choice"
        data-entity-search="${this._entitySearchValue(
          entity.name,
          entity.entityId,
          entity.domain
        )}"
      >
        <input
          type="checkbox"
          class="pulse-entity-checkbox"
          value="${this._escapeHtml(entity.entityId)}"
        >
        <span class="energy-entity-name">
          ${this._escapeHtml(entity.name)}
          (${this._escapeHtml(entity.entityId)})
        </span>
      </label>
    `).join("");
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
      <label
        class="energy-entity-choice"
        data-entity-search="${this._entitySearchValue(
          sensor.name,
          sensor.entityId,
          sensor.unit
        )}"
      >
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
      <label
        class="energy-entity-choice"
        data-entity-search="${this._entitySearchValue(
          sensor.name,
          sensor.entityId,
          sensor.unit
        )}"
      >
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
      <label
        class="energy-entity-choice"
        data-entity-search="${this._entitySearchValue(
          entity.name,
          entity.entityId,
          entity.deviceClass
        )}"
      >
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

  _entitySearchValue(...values) {
    return this._escapeHtml(
      values
        .join(" ")
        .toLocaleLowerCase("de")
    );
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

  _setupStickyOffsets() {
    const topbar = this.shadowRoot.querySelector(".topbar");

    if (!topbar) {
      return;
    }

    const updateOffset = () => {
      const stickyTop = Number.parseFloat(
        getComputedStyle(topbar).top
      ) || 0;
      const previewTop = Math.ceil(
        stickyTop + topbar.getBoundingClientRect().height + 8
      );

      this.style.setProperty(
        "--theme-studio-preview-sticky-top",
        `${previewTop}px`
      );
    };

    this._stickyOffsetObserver?.disconnect();
    this._stickyOffsetObserver = new ResizeObserver(updateOffset);
    this._stickyOffsetObserver.observe(topbar);
    requestAnimationFrame(updateOffset);
  }

  _bindEvents() {
    this.shadowRoot
      .getElementById("undo-button")
      .addEventListener("click", () => this._undoSettings());

    this.shadowRoot
      .getElementById("redo-button")
      .addEventListener("click", () => this._redoSettings());

    this.shadowRoot
      .getElementById("community-refresh-button")
      .addEventListener("click", () => {
        this._loadCommunityGallery(true);
      });

    const communityGrid = this.shadowRoot.getElementById(
      "community-grid"
    );

    this.shadowRoot
      .getElementById("community-slider-previous")
      .addEventListener("click", () => {
        this._moveCommunitySlider(-1);
      });

    this.shadowRoot
      .getElementById("community-slider-next")
      .addEventListener("click", () => {
        this._moveCommunitySlider(1);
      });

    communityGrid.addEventListener("scroll", () => {
      this._updateCommunitySlider();
    }, { passive: true });

    this._communitySliderObserver = new ResizeObserver(() => {
      this._updateCommunitySlider();
    });
    this._communitySliderObserver.observe(communityGrid);

    communityGrid
      .addEventListener("click", (event) => {
        const button = event.target.closest(
          ".community-import-button"
        );

        if (!button || button.disabled) {
          return;
        }

        this._importCommunityDesign(
          button.dataset.designId,
          button
        );
      });

    this.shadowRoot
      .getElementById("profile-select")
      .addEventListener("change", (event) => {
        this._loadProfileSelection(event.target.value);
      });

    this.shadowRoot
      .getElementById("profile-save-button")
      .addEventListener("click", () => {
        this._saveProfile();
      });

    this.shadowRoot
      .getElementById("profile-rename-button")
      .addEventListener("click", () => {
        this._renameProfile();
      });

    this.shadowRoot
      .getElementById("profile-duplicate-button")
      .addEventListener("click", () => {
        this._duplicateProfile();
      });

    this.shadowRoot
      .getElementById("profile-export-button")
      .addEventListener("click", () => {
        this._exportProfile();
      });

    this.shadowRoot
      .getElementById("profile-import-file")
      .addEventListener("change", (event) => {
        this._importProfile(event);
      });

    this.shadowRoot
      .getElementById("import-preview-cancel")
      .addEventListener("click", () => {
        this._closeImportPreview();
      });

    this.shadowRoot
      .getElementById("import-preview-confirm")
      .addEventListener("click", () => {
        this._confirmProfileImport();
      });

    this.shadowRoot
      .getElementById("import-preview-overlay")
      .addEventListener("click", (event) => {
        if (event.target.id === "import-preview-overlay") {
          this._closeImportPreview();
        }
      });

    this.shadowRoot
      .getElementById("import-preview-overlay")
      .addEventListener("keydown", (event) => {
        this._handleImportPreviewKeydown(event);
      });

    this.shadowRoot
      .getElementById("profile-delete-button")
      .addEventListener("click", () => {
        this._deleteProfile();
      });

    this.shadowRoot
      .querySelectorAll(".mode-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.activeMode = button.dataset.mode;
          this._clearStatus();
          this._syncControls();
          this._updatePreview();
          this._renderCommunityGallery();
        });
      });

    this.shadowRoot
      .getElementById("generate-counterpart-button")
      .addEventListener("click", () => {
        this._generateCounterpartMode();
      });

    this.shadowRoot
      .querySelectorAll(".color-preset")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this._recordHistory();
          this.profile.primaryColor =
            button.dataset.color;

          this._syncControls();
          this._updatePreview();
          this._finishSettingsChange();
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
    this._bindColor(
      "header-background-color",
      "headerBackgroundColor"
    );
    this._bindColor(
      "header-text-color",
      "headerTextColor"
    );
    this._bindColor(
      "sidebar-background-color",
      "sidebarBackgroundColor"
    );
    this._bindColor(
      "sidebar-text-color",
      "sidebarTextColor"
    );
    this._bindColor(
      "sidebar-icon-color",
      "sidebarIconColor"
    );
    this._bindColor(
      "sidebar-selected-color",
      "sidebarSelectedColor"
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
          this._recordHistory();
          this.settings.effects.effect =
            button.dataset.effect;

          this._syncEffectControls();
          this._updatePreview();
          this._finishSettingsChange();
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
          this._recordHistory();
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

          this._syncEffectControls();
          this._updatePreview();
          this._finishSettingsChange();
        });
      });

    this._bindEffectRange(
      "card-effect-intensity",
      "cardIntensity",
      "%"
    );

    this._bindEntityPicker({
      searchId: "pulse-entity-search",
      listId: "pulse-entity-list",
      countId: "pulse-entity-count",
      checkboxClass: "pulse-entity-checkbox",
      settingName: "pulseEntities",
      maximum: 64,
      maximumMessage:
        "Es können höchstens 64 Pulse-Entitäten gewählt werden.",
    });

    this._bindEntityPicker({
      searchId: "energy-entity-search",
      listId: "energy-entity-list",
      countId: "energy-entity-count",
      checkboxClass: "energy-entity-checkbox",
      settingName: "energyEntities",
      maximum: 32,
      maximumMessage:
        "Es können höchstens 32 Sensoren gewählt werden.",
    });

    this._bindEnergyNumber(
      "energy-warning",
      "energyWarning"
    );

    this._bindEnergyNumber(
      "energy-critical",
      "energyCritical"
    );

    this._bindEntityPicker({
      searchId: "climate-entity-search",
      listId: "climate-entity-list",
      countId: "climate-entity-count",
      checkboxClass: "climate-entity-checkbox",
      settingName: "climateEntities",
      maximum: 32,
      maximumMessage:
        "Es können höchstens 32 Klimasensoren gewählt werden.",
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

    this._bindEntityPicker({
      searchId: "alert-entity-search",
      listId: "alert-entity-list",
      countId: "alert-entity-count",
      checkboxClass: "alert-entity-checkbox",
      settingName: "alertEntities",
      maximum: 64,
      maximumMessage:
        "Es können höchstens 64 Alarm- und Statussensoren gewählt werden.",
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

          this._recordHistory();
          this.profile.background =
            button.dataset.background;

          this._syncControls();
          this._updatePreview();
          this._finishSettingsChange();
        });
      });

    this.shadowRoot
      .getElementById("background-file")
      .addEventListener("change", (event) => {
        this._uploadBackground(event);
      });

    this.shadowRoot
      .getElementById("background-library")
      .addEventListener("click", (event) => {
        const button = event.target.closest("button");

        if (!button) {
          return;
        }

        const backgroundId = button.dataset.backgroundId;

        if (button.classList.contains("background-select-button")) {
          this._selectLibraryBackground(backgroundId);
        } else if (button.dataset.action === "rename") {
          this._renameBackground(backgroundId);
        } else if (button.dataset.action === "delete") {
          this._deleteBackground(backgroundId);
        }
      });

    this.shadowRoot
      .getElementById("apply-button")
      .addEventListener("click", () => {
        this._saveAndApplySettings();
      });

    this.shadowRoot
      .getElementById("restore-last-button")
      .addEventListener("click", () => {
        this._restoreLastDesign();
      });

    this.shadowRoot
      .getElementById("restore-default-button")
      .addEventListener("click", () => {
        this._restoreHomeAssistantDefault();
      });
  }

  _cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings));
  }

  _recordHistory(coalesceKey = "") {
    if (coalesceKey && this.historyCoalesceKey === coalesceKey) {
      return;
    }

    this.undoHistory.push(this._cloneSettings(this.settings));

    if (this.undoHistory.length > this.historyLimit) {
      this.undoHistory.shift();
    }

    this.redoHistory = [];
    this.historyCoalesceKey = coalesceKey;
    this._syncHistoryControls();
  }

  _endHistoryCoalescing(coalesceKey) {
    if (this.historyCoalesceKey === coalesceKey) {
      this.historyCoalesceKey = "";
    }
  }

  _resetHistory() {
    this.undoHistory = [];
    this.redoHistory = [];
    this.historyCoalesceKey = "";
    this._syncHistoryControls();
  }

  _replaceEditorSettings(settings) {
    this.settings = this._cloneSettings(settings);
    this._resetHistory();
    this._syncControls();
    this._updatePreview();
    this._syncUnsavedStatus();
  }

  _finishSettingsChange() {
    this.historyCoalesceKey = "";
    this._syncHistoryControls();
    this._syncUnsavedStatus();
  }

  _undoSettings() {
    const previous = this.undoHistory.pop();

    if (!previous) {
      return;
    }

    this.redoHistory.push(this._cloneSettings(this.settings));
    this.settings = previous;
    this.historyCoalesceKey = "";
    this._syncControls();
    this._updatePreview();
    this._syncHistoryControls();
    this._syncUnsavedStatus();
  }

  _redoSettings() {
    const next = this.redoHistory.pop();

    if (!next) {
      return;
    }

    this.undoHistory.push(this._cloneSettings(this.settings));
    this.settings = next;
    this.historyCoalesceKey = "";
    this._syncControls();
    this._updatePreview();
    this._syncHistoryControls();
    this._syncUnsavedStatus();
  }

  _syncHistoryControls() {
    const undoButton = this.shadowRoot?.getElementById("undo-button");
    const redoButton = this.shadowRoot?.getElementById("redo-button");

    if (undoButton) {
      undoButton.disabled = this.undoHistory.length === 0;
    }

    if (redoButton) {
      redoButton.disabled = this.redoHistory.length === 0;
    }
  }

  _hasUnsavedSettings() {
    return this.appliedSettings !== null
      && !this._settingsEqual(this.settings, this.appliedSettings);
  }

  _syncUnsavedStatus() {
    const indicator = this.shadowRoot?.getElementById(
      "unsaved-indicator"
    );

    if (indicator) {
      indicator.hidden = !this._hasUnsavedSettings();
    }
  }

  _settingsEqual(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  _portableProfileSettings(settings) {
    const portable = this._cloneSettings(settings);

    for (const mode of ["light", "dark"]) {
      if (
        portable[mode].background === "image"
        || portable[mode].backgroundImage
      ) {
        portable[mode].background = "color";
        portable[mode].backgroundImage = "";
      }
    }

    portable.effects = {
      effect: "none",
      motion: 35,
      glow: 35,
      cardEffects: [],
      cardIntensity: 55,
      pulseEntities: [],
      energyEntities: [],
      energyWarning: 500,
      energyCritical: 2000,
      climateEntities: [],
      climateComfortMin: 19,
      climateComfortMax: 24,
      climateHot: 28,
      alertEntities: [],
      alertBatteryLow: 20,
    };

    return portable;
  }

  _generateCounterpartMode() {
    const sourceMode = this.activeMode;
    const targetMode = sourceMode === "dark" ? "light" : "dark";
    const sourceLabel = sourceMode === "dark" ? "Dunkelmodus" : "Hellmodus";
    const targetLabel = targetMode === "dark" ? "Dunkelmodus" : "Hellmodus";

    if (
      !this._confirm(
        `${targetLabel} aus dem aktuellen ${sourceLabel} erzeugen? ` +
        `Die bisherigen Einstellungen des ${targetLabel} werden ersetzt.`
      )
    ) {
      return;
    }

    this._recordHistory();
    this.settings[targetMode] = this._deriveCounterpartMode(
      this.settings[sourceMode],
      targetMode
    );
    this.activeMode = targetMode;
    this._syncControls();
    this._updatePreview();
    this._renderCommunityGallery();
    this._setStatus(
      `${targetLabel} wurde passend aus dem ${sourceLabel} erzeugt. ` +
      "Profil anschließend speichern oder aktualisieren.",
      "success"
    );
  }

  _deriveCounterpartMode(source, targetMode) {
    const light = targetMode === "light";
    const white = "#ffffff";
    const black = "#000000";
    const primary = light
      ? this._mixColors(source.primaryColor, white, 0.08)
      : this._mixColors(source.primaryColor, white, 0.14);
    const backgroundColor = light
      ? this._mixColors(source.backgroundColor, white, 0.72)
      : this._mixColors(source.backgroundColor, black, 0.78);
    const cardColor = light
      ? this._mixColors(source.cardColor, white, 0.76)
      : this._mixColors(source.cardColor, black, 0.72);
    const headerBackgroundColor = light
      ? this._mixColors(source.headerBackgroundColor, white, 0.8)
      : this._mixColors(source.headerBackgroundColor, black, 0.8);
    const sidebarBackgroundColor = light
      ? this._mixColors(source.sidebarBackgroundColor, white, 0.78)
      : this._mixColors(source.sidebarBackgroundColor, black, 0.8);
    const textColor = light
      ? this._mixColors(source.primaryColor, black, 0.72)
      : "#f5f7fa";
    const secondaryTextColor = light
      ? this._mixColors(source.primaryColor, black, 0.58)
      : this._mixColors(source.primaryColor, white, 0.7);

    return {
      primaryColor: primary,
      backgroundColor,
      cardColor,
      cardTextColor: textColor,
      cardIconColor: primary,
      cardBorderColor: light
        ? this._mixColors(primary, white, 0.3)
        : primary,
      headerBackgroundColor,
      headerTextColor: textColor,
      sidebarBackgroundColor,
      sidebarTextColor: textColor,
      sidebarIconColor: secondaryTextColor,
      sidebarSelectedColor: primary,
      cardOpacity: light
        ? Math.max(82, Number(source.cardOpacity) || 92)
        : Math.max(78, Number(source.cardOpacity) || 92),
      cardBorderWidth: Number(source.cardBorderWidth) || 0,
      cardShadow: Number(source.cardShadow) || 0,
      borderRadius: Number(source.borderRadius) || 0,
      darkening: light
        ? Math.round((Number(source.darkening) || 0) * 0.35)
        : Math.max(24, Number(source.darkening) || 0),
      background: source.background,
      backgroundImage: source.backgroundImage || "",
    };
  }

  _communityPreviewBackground(mode) {
    if (mode.background_type === "waves") {
      return `
        radial-gradient(
          circle at 18% 24%,
          ${mode.primary} 0,
          transparent 36%
        ),
        radial-gradient(
          circle at 82% 72%,
          #2f6fa3 0,
          transparent 42%
        ),
        ${mode.background}
      `;
    }

    if (mode.background_type === "aurora") {
      return `
        linear-gradient(
          128deg,
          ${mode.background} 8%,
          ${mode.primary} 48%,
          #684a8f 100%
        )
      `;
    }

    return mode.background;
  }

  _communityCardMarkup(design) {
    const preview = design.preview || {};
    const modes = preview.modes || {};
    const fallbackMode = {
      primary: preview.primary || "#26b2b3",
      background: preview.background || "#101719",
      card: preview.card || "#182326",
      text: preview.text || "#ffffff",
      icon: preview.primary || "#26b2b3",
      border: preview.border || "#26b2b3",
      header_background: preview.background || "#101719",
      header_text: preview.text || "#ffffff",
      sidebar_background: preview.background || "#101719",
      sidebar_text: preview.text || "#ffffff",
      sidebar_icon: preview.text || "#b8c4c7",
      sidebar_selected: preview.primary || "#26b2b3",
      opacity: Number(preview.opacity) || 92,
      border_width: Number(preview.border_width) || 0,
      shadow: 20,
      radius: Number(preview.radius) || 18,
      darkening: 0,
      background_type: "color",
    };
    const mode = modes[this.activeMode] || fallbackMode;
    const effects = preview.effects || {};
    const cardEffects = Array.isArray(effects.card_effects)
      ? effects.card_effects
      : [];
    const effectClass = (name) =>
      cardEffects.includes(name) ? name : "";
    const backgroundEffect =
      effects.background === "space-command"
        ? "space-command"
        : "";
    const opacity = Math.min(
      1,
      Math.max(0.2, (Number(mode.opacity) || 92) / 100)
    );
    const effectAlpha = Math.min(
      0.9,
      Math.max(0.2, (Number(effects.intensity) || 55) / 100)
    );
    const downloads = Number(design.downloads) || 0;

    return `
      <article class="community-card">
        <div
          class="community-preview"
          role="img"
          aria-label="Farbvorschau für ${this._escapeHtml(design.title)}"
          style="
            --community-background:${this._escapeHtml(mode.background)};
            --community-dashboard-background:${this._escapeHtml(this._communityPreviewBackground(mode))};
            --community-card:${this._escapeHtml(this._rgba(mode.card, opacity))};
            --community-primary:${this._escapeHtml(mode.primary)};
            --community-text:${this._escapeHtml(mode.text)};
            --community-icon:${this._escapeHtml(mode.icon)};
            --community-border:${this._escapeHtml(mode.border)};
            --community-border-width:${Number(mode.border_width) || 0}px;
            --community-radius:${Math.round((Number(mode.radius) || 0) * 0.45)}px;
            --community-shadow-blur:${Math.round((Number(mode.shadow) || 0) * 0.28)}px;
            --community-darkening:${Math.min(0.8, Math.max(0, (Number(mode.darkening) || 0) / 100))};
            --community-header-background:${this._escapeHtml(mode.header_background)};
            --community-header-text:${this._escapeHtml(mode.header_text)};
            --community-sidebar-background:${this._escapeHtml(mode.sidebar_background)};
            --community-sidebar-text:${this._escapeHtml(mode.sidebar_text)};
            --community-sidebar-icon:${this._escapeHtml(mode.sidebar_icon)};
            --community-sidebar-selected:${this._escapeHtml(mode.sidebar_selected)};
            --community-sidebar-selected-soft:${this._escapeHtml(this._rgba(mode.sidebar_selected, 0.18))};
            --community-effect-alpha:${effectAlpha};
          "
        >
          <div class="community-mini-header">
            <span>☰</span>
            <strong>Übersicht</strong>
            <span>＋</span>
            <span>⋮</span>
          </div>
          <div class="community-mini-shell">
            <aside class="community-mini-sidebar">
              <strong>Home Assistant</strong>
              <div class="community-mini-nav active">
                <span>⌂</span> Übersicht
              </div>
              <div class="community-mini-nav">
                <span>◇</span> Karte
              </div>
              <div class="community-mini-nav">
                <span>ϟ</span> Energie
              </div>
              <div class="community-mini-nav">
                <span>⚙</span> Einstellungen
              </div>
            </aside>
            <section class="community-mini-dashboard ${backgroundEffect}">
              <div class="community-mini-title">
                <span>Mein Zuhause</span>
                <small>17:36</small>
              </div>
              <div class="community-mini-cards">
                <div class="community-mini-card ${effectClass("energy-flow")}">
                  <div class="community-mini-card-title">
                    <span class="community-mini-icon">●</span>
                    Stromverbrauch
                  </div>
                  <div class="community-mini-value">846 W</div>
                  <div class="community-mini-detail">Heute 8,4 kWh</div>
                </div>
                <div class="community-mini-card ${effectClass("status-pulse")}">
                  <div class="community-mini-card-title">
                    <span class="community-mini-icon">●</span>
                    Wohnzimmer
                  </div>
                  <div class="community-mini-switch-row">
                    Deckenlicht
                    <span class="community-mini-switch"></span>
                  </div>
                  <div class="community-mini-switch-row">
                    Stehlampe
                    <span class="community-mini-switch"></span>
                  </div>
                </div>
                <div class="community-mini-card ${effectClass("climate-aura")}">
                  <div class="community-mini-card-title">
                    <span class="community-mini-icon">●</span>
                    Temperatur
                  </div>
                  <div class="community-mini-value">22,4 °C</div>
                  <div class="community-mini-detail">Luftfeuchtigkeit 48 %</div>
                </div>
                <div class="community-mini-card ${effectClass("alert-focus")}">
                  <div class="community-mini-card-title">
                    <span class="community-mini-icon">●</span>
                    Verlauf
                  </div>
                  <div class="community-mini-bars">
                    <span style="height:38%"></span>
                    <span style="height:55%"></span>
                    <span style="height:47%"></span>
                    <span style="height:78%"></span>
                    <span style="height:62%"></span>
                    <span style="height:92%"></span>
                  </div>
                </div>
              </div>
              <span class="community-mode-label">
                ${this.activeMode === "light" ? "Hell" : "Dunkel"}
              </span>
            </section>
          </div>
        </div>

        <div class="community-card-content">
          <div class="community-badges">
            <span class="community-badge">
              ${this._escapeHtml(design.category || "Design")}
            </span>
            ${design.license ? `
              <span class="community-badge">
                ${this._escapeHtml(design.license)}
              </span>
            ` : ""}
          </div>

          <h3>${this._escapeHtml(design.title)}</h3>
          <p class="community-summary">
            ${this._escapeHtml(design.summary || "Keine Beschreibung")}
          </p>
          <div class="community-meta">
            @${this._escapeHtml(design.author || "Community")}
            · ${downloads.toLocaleString("de-DE")} Downloads
          </div>

          <button
            class="profile-button primary community-import-button"
            type="button"
            data-design-id="${this._escapeHtml(design.id)}"
          >
            Mit einem Klick importieren
          </button>
        </div>
      </article>
    `;
  }

  _communitySliderMetrics() {
    const grid = this.shadowRoot.getElementById("community-grid");
    const card = grid.querySelector(".community-card");

    if (!card || grid.hidden) {
      return null;
    }

    const style = getComputedStyle(grid);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const step = card.getBoundingClientRect().width + gap;
    const usableWidth =
      grid.clientWidth - paddingLeft - paddingRight;
    const visible = Math.max(
      1,
      Math.round((usableWidth + gap) / step)
    );
    const count = this.communityDesigns.length;
    const maximumIndex = Math.max(0, count - visible);
    const index = Math.min(
      maximumIndex,
      Math.max(0, Math.round(grid.scrollLeft / step))
    );

    return {
      grid,
      step,
      visible,
      count,
      maximumIndex,
      index,
    };
  }

  _updateCommunitySlider() {
    const controls = this.shadowRoot.getElementById(
      "community-slider-controls"
    );
    const previous = this.shadowRoot.getElementById(
      "community-slider-previous"
    );
    const next = this.shadowRoot.getElementById(
      "community-slider-next"
    );
    const position = this.shadowRoot.getElementById(
      "community-slider-position"
    );
    const metrics = this._communitySliderMetrics();

    if (!metrics || metrics.count <= metrics.visible) {
      controls.hidden = true;
      return;
    }

    controls.hidden = false;
    previous.disabled = metrics.index === 0;
    next.disabled = metrics.index >= metrics.maximumIndex;
    position.textContent =
      `${metrics.index + 1}–` +
      `${Math.min(metrics.count, metrics.index + metrics.visible)} ` +
      `von ${metrics.count}`;
  }

  _moveCommunitySlider(direction) {
    const metrics = this._communitySliderMetrics();

    if (!metrics) {
      return;
    }

    const targetIndex = Math.min(
      metrics.maximumIndex,
      Math.max(0, metrics.index + direction)
    );

    metrics.grid.scrollTo({
      left: targetIndex * metrics.step,
      behavior: "smooth",
    });
  }

  _renderCommunityGallery(errorMessage = "") {
    const state =
      this.shadowRoot.getElementById("community-state");
    const grid =
      this.shadowRoot.getElementById("community-grid");
    const refresh = this.shadowRoot.getElementById(
      "community-refresh-button"
    );
    const sliderControls = this.shadowRoot.getElementById(
      "community-slider-controls"
    );

    refresh.disabled = this.communityGalleryLoading;

    if (this.communityGalleryLoading) {
      state.className = "community-state";
      state.textContent = "Galerie wird geladen …";
      state.hidden = false;
      sliderControls.hidden = true;
      grid.hidden = true;
      return;
    }

    if (errorMessage) {
      state.className = "community-state error";
      state.textContent = errorMessage;
      state.hidden = false;
      sliderControls.hidden = true;
      grid.hidden = true;
      return;
    }

    if (this.communityDesigns.length === 0) {
      state.className = "community-state";
      state.textContent = this.communityGalleryLoaded
        ? "Aktuell sind keine veröffentlichten Designs verfügbar."
        : "Galerie wird geladen …";
      state.hidden = false;
      sliderControls.hidden = true;
      grid.hidden = true;
      return;
    }

    state.hidden = true;
    grid.innerHTML = this.communityDesigns
      .map((design) => this._communityCardMarkup(design))
      .join("");
    grid.hidden = false;
    grid.scrollLeft = 0;
    requestAnimationFrame(() => this._updateCommunitySlider());
  }

  async _loadCommunityGallery(force = false) {
    if (
      this.communityGalleryLoading
      || (this.communityGalleryLoaded && !force)
    ) {
      return;
    }

    this.communityGalleryLoading = true;
    this._renderCommunityGallery();

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/get_gallery_designs",
        refresh: force,
      });

      this.communityDesigns = Array.isArray(result.designs)
        ? result.designs
        : [];
      this.communityGalleryLoaded = true;
      this.communityGalleryLoading = false;
      this._renderCommunityGallery();
    } catch (error) {
      this.communityGalleryLoading = false;
      this._renderCommunityGallery(
        `Galerie konnte nicht geladen werden: ${this._errorMessage(error)}`
      );
    }
  }

  async _importCommunityDesign(designId, button) {
    const design = this.communityDesigns.find(
      (item) => item.id === designId
    );

    if (!design) {
      this._setStatus(
        "Das gewählte Galerie-Design wurde nicht gefunden.",
        "error"
      );
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Wird importiert …";

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/import_gallery_design",
        design_id: design.id,
        name: design.title,
      });

      this.profiles = result.profiles;
      this.activeProfileId = result.profile.id;
      this._replaceEditorSettings(result.profile.settings);
      this._renderProfileOptions();
      this._setStatus(
        `${result.profile.name} wurde aus der Galerie importiert und als Profil gespeichert.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = originalText;
    }
  }

  _currentProfile() {
    return this.profiles.find(
      (profile) => profile.id === this.activeProfileId
    ) || null;
  }

  _profileName() {
    return this.shadowRoot
      .getElementById("profile-name")
      .value
      .trim()
      .replace(/\s+/g, " ");
  }

  _renderProfileOptions() {
    const select =
      this.shadowRoot.getElementById("profile-select");
    const nameInput =
      this.shadowRoot.getElementById("profile-name");
    const currentProfile = this._currentProfile();

    select.innerHTML = `
      <option value="">Neues Profil anlegen</option>
      ${this.profiles.map((profile) => `
        <option value="${this._escapeHtml(profile.id)}">
          ${this._escapeHtml(profile.name)}
        </option>
      `).join("")}
    `;

    if (currentProfile) {
      select.value = currentProfile.id;
      nameInput.value = currentProfile.name;
    } else {
      this.activeProfileId = "";
      select.value = "";
    }

    this._syncProfileControls();
  }

  _syncProfileControls(busy = false) {
    const hasProfile = Boolean(this._currentProfile());
    const saveButton =
      this.shadowRoot.getElementById("profile-save-button");

    saveButton.textContent = hasProfile
      ? "Profil aktualisieren"
      : "Profil speichern";

    [
      "profile-rename-button",
      "profile-duplicate-button",
      "profile-export-button",
      "profile-delete-button",
    ].forEach((id) => {
      this.shadowRoot.getElementById(id).disabled =
        busy || !hasProfile;
    });

    saveButton.disabled = busy;
    this.shadowRoot.getElementById("profile-select").disabled =
      busy;
    this.shadowRoot.getElementById("profile-name").disabled =
      busy;
    this.shadowRoot.getElementById("profile-import-file").disabled =
      busy;
  }

  _loadProfileSelection(profileId) {
    this.activeProfileId = profileId;
    const profile = this._currentProfile();
    const nameInput =
      this.shadowRoot.getElementById("profile-name");

    if (!profile) {
      this.activeProfileId = "";
      nameInput.value = "";
      this._syncProfileControls();
      this._setStatus(
        "Name eingeben und das aktuelle Design als neues Profil speichern.",
        ""
      );
      return;
    }

    this._replaceEditorSettings(profile.settings);
    nameInput.value = profile.name;

    this._syncProfileControls();
    this._setStatus(
      `${profile.name} geladen. Zum Aktivieren „Beide Modi anwenden“ drücken.`,
      "success"
    );
  }

  async _loadProfiles() {
    try {
      const result = await this._hass.callWS({
        type: "theme_studio/get_profiles",
      });

      this.profiles = Array.isArray(result.profiles)
        ? result.profiles
        : [];
      this.profileLimit = Number(result.maximum) || 32;

      const currentThemeIsThemeStudio =
        this._hass.themes?.theme === "Theme Studio";
      const persistedProfile = currentThemeIsThemeStudio
        ? this.profiles.find(
          (profile) => profile.id === this.persistedActiveProfileId
        )
        : null;
      const matchingProfile = currentThemeIsThemeStudio
        ? this.profiles.find(
          (profile) => this._settingsEqual(
            profile.settings,
            this.settings
          )
        )
        : null;

      this.activeProfileId = (
        persistedProfile || matchingProfile
      )?.id || "";
      this._renderProfileOptions();
    } catch (error) {
      this._setStatus(
        `Designprofile konnten nicht geladen werden: ${this._errorMessage(error)}`,
        "error"
      );
    }
  }

  async _saveProfile() {
    const name = this._profileName();

    if (!name) {
      this._setStatus("Bitte einen Profilnamen eingeben.", "error");
      return;
    }

    const currentProfile = this._currentProfile();
    const message = {
      type: "theme_studio/save_profile",
      name,
      settings: this._cloneSettings(this.settings),
    };

    if (currentProfile) {
      message.profile_id = currentProfile.id;
    }

    this._syncProfileControls(true);

    try {
      const result = await this._hass.callWS(message);
      this.profiles = result.profiles;
      this.activeProfileId = result.profile.id;
      this._renderProfileOptions();
      this._setStatus(
        currentProfile
          ? `${result.profile.name} wurde aktualisiert.`
          : `${result.profile.name} wurde gespeichert.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      this._syncProfileControls();
    }
  }

  async _renameProfile() {
    const currentProfile = this._currentProfile();
    const name = this._profileName();

    if (!currentProfile || !name) {
      this._setStatus(
        "Bitte ein Profil wählen und einen Namen eingeben.",
        "error"
      );
      return;
    }

    this._syncProfileControls(true);

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/save_profile",
        profile_id: currentProfile.id,
        name,
        settings: this._cloneSettings(currentProfile.settings),
      });

      this.profiles = result.profiles;
      this.activeProfileId = result.profile.id;
      this._renderProfileOptions();
      this._setStatus(
        `Profil wurde in ${result.profile.name} umbenannt.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      this._syncProfileControls();
    }
  }

  async _duplicateProfile() {
    const currentProfile = this._currentProfile();

    if (!currentProfile) {
      return;
    }

    const copyLabel = {
      en: "Copy",
      es: "Copia",
      fr: "Copie",
    }[this.localizer?.language] || "Kopie";
    const copyName = `${currentProfile.name} ${copyLabel}`.slice(0, 48);
    this._syncProfileControls(true);

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/save_profile",
        name: copyName,
        settings: this._cloneSettings(currentProfile.settings),
      });

      this.profiles = result.profiles;
      this.activeProfileId = result.profile.id;
      this._replaceEditorSettings(result.profile.settings);
      this._renderProfileOptions();
      this._setStatus(
        `${result.profile.name} wurde angelegt.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      this._syncProfileControls();
    }
  }

  _exportProfile() {
    const profile = this._currentProfile();

    if (!profile) {
      return;
    }

    const exportData = {
      format: "theme-studio-profile",
      version: 1,
      name: profile.name,
      exported_at: new Date().toISOString(),
      settings: this._portableProfileSettings(profile.settings),
    };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = profile.name
      .toLocaleLowerCase("de")
      .replace(/[^a-z0-9äöüß]+/gi, "-")
      .replace(/^-|-$/g, "") || "theme-studio-profil";

    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);

    this._setStatus(
      `${profile.name} wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert.`,
      "success"
    );
    this._finishSettingsChange();
  }

  async _importProfile(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 1024 * 1024) {
      input.value = "";
      this._setStatus(
        "Die Profildatei darf höchstens 1 MB groß sein.",
        "error"
      );
      return;
    }

    this._syncProfileControls(true);

    try {
      const imported = JSON.parse(await file.text());
      const preview = await this._hass.callWS({
        type: "theme_studio/preview_profile_import",
        profile: imported,
      });

      this.pendingProfileImport = {
        name: preview.name,
        settings: preview.settings,
        notices: Array.isArray(preview.notices)
          ? preview.notices
          : [],
        summary: preview.summary || {},
        formatVersion: preview.format_version,
        filename: file.name,
      };
      this._openImportPreview();
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      input.value = "";
      this._syncProfileControls();
    }
  }

  _openImportPreview() {
    const pending = this.pendingProfileImport;

    if (!pending) {
      return;
    }

    const overlay = this.shadowRoot.getElementById(
      "import-preview-overlay"
    );
    const subtitle = this.shadowRoot.getElementById(
      "import-preview-subtitle"
    );
    const body = this.shadowRoot.getElementById(
      "import-preview-body"
    );
    const summary = pending.summary;
    const notices = pending.notices.length > 0
      ? pending.notices
      : [
        "Keine lokalen Hintergrundbild-Pfade oder Entitätszuordnungen gefunden.",
      ];

    subtitle.textContent =
      `„${pending.name}“ aus ${pending.filename}`;
    body.innerHTML = `
      <div class="import-preview-modes">
        ${this._importPreviewMode(
          "Hellmodus",
          pending.settings.light
        )}
        ${this._importPreviewMode(
          "Dunkelmodus",
          pending.settings.dark
        )}
      </div>
      <div class="import-preview-facts">
        <div class="import-preview-fact">
          <strong>Profilformat</strong>
          Theme Studio ${this._escapeHtml(pending.formatVersion)}
        </div>
        <div class="import-preview-fact">
          <strong>Übernommen</strong>
          Farben, Karten, Navigation und Hintergrundeinstellungen
        </div>
        <div class="import-preview-fact">
          <strong>Nicht übernommen</strong>
          Lokale Bildpfade, Dashboard-Effekte und Entitätszuordnungen
        </div>
        <div class="import-preview-fact">
          <strong>Speicherung</strong>
          Erst nach Bestätigung als neues lokales Profil
        </div>
      </div>
      <div>
        <p><strong>Prüfergebnis</strong></p>
        <ul class="import-preview-notices">
          ${notices.map((notice) => `
            <li>${this._escapeHtml(notice)}</li>
          `).join("")}
        </ul>
      </div>
    `;
    this.importPreviewReturnFocus = this.shadowRoot.activeElement;
    overlay.hidden = false;
    this.shadowRoot.getElementById(
      "import-preview-confirm"
    ).focus();
  }

  _handleImportPreviewKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this._closeImportPreview();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = this.shadowRoot.querySelector(
      ".import-preview-dialog"
    );
    const focusable = Array.from(dialog.querySelectorAll(
      "button:not([disabled]), a[href], input:not([disabled]), "
      + "select:not([disabled]), textarea:not([disabled]), "
      + "[tabindex]:not([tabindex='-1'])"
    ));

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.shadowRoot.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey
      && this.shadowRoot.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  _importPreviewMode(label, mode) {
    const opacity = Math.min(
      1,
      Math.max(0.3, Number(mode.cardOpacity) / 100)
    );
    const borderWidth = Math.max(
      0,
      Math.min(3, Number(mode.cardBorderWidth) || 0)
    );
    const radius = Math.max(
      0,
      Math.min(16, Math.round((Number(mode.borderRadius) || 0) * 0.45))
    );
    const shadow = Math.max(
      0,
      Math.min(14, Math.round((Number(mode.cardShadow) || 0) * 0.28))
    );

    return `
      <div class="import-preview-mode">
        <div
          class="import-preview-colors"
          style="
            --import-background:${this._escapeHtml(mode.backgroundColor)};
            --import-card:${this._escapeHtml(this._rgba(mode.cardColor, opacity))};
            --import-primary:${this._escapeHtml(mode.primaryColor)};
            --import-text:${this._escapeHtml(mode.cardTextColor)};
            --import-border:${this._escapeHtml(mode.cardBorderColor)};
            --import-border-width:${borderWidth}px;
            --import-radius:${radius}px;
            --import-shadow-blur:${shadow}px;
            --import-header:${this._escapeHtml(mode.headerBackgroundColor)};
            --import-sidebar:${this._escapeHtml(mode.sidebarBackgroundColor)};
          "
        >
          <span class="import-preview-mini-title">Mein Zuhause</span>
          <div class="import-preview-mini-cards">
            <span class="import-preview-mini-card"></span>
            <span class="import-preview-mini-card"></span>
            <span class="import-preview-mini-card"></span>
            <span class="import-preview-mini-card"></span>
          </div>
        </div>
        <strong>${label}</strong>
      </div>
    `;
  }

  _closeImportPreview() {
    const returnFocus = this.importPreviewReturnFocus;

    this.pendingProfileImport = null;
    this.importPreviewReturnFocus = null;
    this.shadowRoot.getElementById(
      "import-preview-overlay"
    ).hidden = true;

    if (returnFocus instanceof HTMLElement) {
      returnFocus.focus();
    }
  }

  async _confirmProfileImport() {
    const pending = this.pendingProfileImport;

    if (!pending) {
      return;
    }

    const confirmButton = this.shadowRoot.getElementById(
      "import-preview-confirm"
    );
    confirmButton.disabled = true;
    confirmButton.textContent = "Wird importiert …";
    this._syncProfileControls(true);

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/save_profile",
        name: pending.name,
        settings: pending.settings,
      });

      this.profiles = result.profiles;
      this.activeProfileId = result.profile.id;
      this._replaceEditorSettings(result.profile.settings);
      this._renderProfileOptions();
      this._closeImportPreview();
      this._setStatus(
        `${result.profile.name} wurde geprüft und importiert. Zum Aktivieren „Beide Modi anwenden“ drücken.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = "Profil importieren";
      this._syncProfileControls();
    }
  }

  async _deleteProfile() {
    const profile = this._currentProfile();

    if (
      !profile
      || !this._confirm(
        `Profil „${profile.name}“ wirklich löschen?`
      )
    ) {
      return;
    }

    this._syncProfileControls(true);

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/delete_profile",
        profile_id: profile.id,
      });

      this.profiles = result.profiles;
      this.activeProfileId = "";
      this.shadowRoot.getElementById("profile-name").value = "";
      this._renderProfileOptions();
      this._setStatus(
        `${profile.name} wurde gelöscht. Das aktuelle Design bleibt erhalten.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    } finally {
      this._syncProfileControls();
    }
  }

  _bindColor(elementId, settingName, syncPresets = false) {
    const input = this.shadowRoot.getElementById(elementId);
    const historyKey = `color:${elementId}`;

    input.addEventListener("input", (event) => {
        this._recordHistory(historyKey);
        this.profile[settingName] = event.target.value;
        if (syncPresets) {
          this._syncColorPresets();
        }

        this._updatePreview();
        this._syncUnsavedStatus();
      });

    input.addEventListener("change", () => {
      this._endHistoryCoalescing(historyKey);
      this._syncHistoryControls();
    });
  }

  _bindRange(elementId, settingName, suffix) {
    const input =
      this.shadowRoot.getElementById(elementId);

    const output =
      this.shadowRoot.getElementById(
        `${elementId}-value`
      );
    const historyKey = `range:${elementId}`;

    input.addEventListener("input", (event) => {
      this._recordHistory(historyKey);
      const value = Number(event.target.value);

      this.profile[settingName] = value;
      output.textContent = suffix
        ? `${value} ${suffix}`
        : `${value}`;

      this._updatePreview();
      this._syncUnsavedStatus();
    });

    input.addEventListener("change", () => {
      this._endHistoryCoalescing(historyKey);
      this._syncHistoryControls();
    });
  }

  _bindEffectRange(elementId, settingName, suffix) {
    const input =
      this.shadowRoot.getElementById(elementId);

    const output =
      this.shadowRoot.getElementById(
        `${elementId}-value`
      );
    const historyKey = `effect-range:${elementId}`;

    input.addEventListener("input", (event) => {
      this._recordHistory(historyKey);
      const value = Number(event.target.value);

      this.settings.effects[settingName] = value;

      output.textContent = `${value} ${suffix}`;

      this._updatePreview();
      this._syncUnsavedStatus();
    });

    input.addEventListener("change", () => {
      this._endHistoryCoalescing(historyKey);
      this._syncHistoryControls();
    });
  }

  _bindEntityPicker({
    searchId,
    listId,
    countId,
    checkboxClass,
    settingName,
    maximum,
    maximumMessage,
  }) {
    const searchInput =
      this.shadowRoot.getElementById(searchId);
    const list = this.shadowRoot.getElementById(listId);
    const selector = `.${checkboxClass}`;
    const checkboxes = Array.from(
      this.shadowRoot.querySelectorAll(selector)
    );
    const choices = Array.from(
      list.querySelectorAll(".energy-entity-choice")
    );
    const emptyMessage =
      list.querySelector(".entity-filter-empty");
    let pendingFilterFrame = 0;

    const updateCount = () => {
      const selected = checkboxes.reduce(
        (count, checkbox) => count + Number(checkbox.checked),
        0
      );
      this.shadowRoot.getElementById(countId).textContent =
        `${selected} gewählt`;
    };

    const filterChoices = () => {
      const query = searchInput.value
        .trim()
        .toLocaleLowerCase("de");
      let visibleChoices = 0;

      choices.forEach((choice) => {
        const visible =
          !query
          || choice.dataset.entitySearch.includes(query);
        choice.hidden = !visible;

        if (visible) {
          visibleChoices += 1;
        }
      });

      if (emptyMessage) {
        emptyMessage.hidden =
          choices.length === 0 || visibleChoices > 0;
      }
    };

    searchInput.addEventListener("input", () => {
      if (pendingFilterFrame) {
        cancelAnimationFrame(pendingFilterFrame);
      }

      pendingFilterFrame = requestAnimationFrame(() => {
        pendingFilterFrame = 0;
        filterChoices();
      });
    });

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const beforeChange = this._cloneSettings(this.settings);
        const selected = checkboxes.filter(
          (item) => item.checked
        );

        if (selected.length > maximum) {
          checkbox.checked = false;
          this._setStatus(maximumMessage, "error");
          updateCount();
          return;
        }

        this.undoHistory.push(beforeChange);
        if (this.undoHistory.length > this.historyLimit) {
          this.undoHistory.shift();
        }
        this.redoHistory = [];
        this.settings.effects[settingName] =
          selected.map((item) => item.value);

        updateCount();
        this._updatePreview();
        this._finishSettingsChange();
      });
    });

    updateCount();
  }

  _bindEnergyNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        this._recordHistory();
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

        this._syncEffectControls();
        this._updatePreview();
        this._finishSettingsChange();
      });
  }

  _bindClimateNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        this._recordHistory();
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

        this._syncEffectControls();
        this._updatePreview();
        this._finishSettingsChange();
      });
  }

  _bindSimpleNumber(elementId, settingName) {
    this.shadowRoot
      .getElementById(elementId)
      .addEventListener("change", (event) => {
        this._recordHistory();
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
        this._syncEffectControls();
        this._updatePreview();
        this._finishSettingsChange();
      });
  }

  async _loadSettings() {
    await this._loadIntegrationInfo();

    try {
      const saved =
        await this._hass.callWS({
          type: "theme_studio/get_settings",
        });

      this.persistedActiveProfileId =
        typeof saved.active_profile_id === "string"
          ? saved.active_profile_id
          : "";
      this.recoveryAvailable = saved.recovery_available === true;
      this.themeStudioActive = saved.theme_studio_active !== false;

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

      this.appliedSettings = this._cloneSettings(this.settings);
      this._resetHistory();

      this._syncControls();
      this._updatePreview();
      this._syncRecoveryButton();
    } catch (error) {
      this._setStatus(
        "Die Einstellungen konnten nicht geladen werden.",
        "error"
      );
    }

    await this._loadBackgrounds();
    await this._loadProfiles();
    await this._loadCommunityGallery();
  }

  async _loadIntegrationInfo() {
    const badge = this.shadowRoot.getElementById("version-badge");

    try {
      const info = await this._hass.callWS({
        type: "theme_studio/get_info",
      });
      this.integrationVersion = typeof info.version === "string"
        ? info.version
        : "";
      badge.textContent = this.integrationVersion
        ? `Version ${this.integrationVersion}`
        : "Version unbekannt";
    } catch (error) {
      badge.textContent = "Version unbekannt";
    }
  }

  _backgroundById(backgroundId) {
    return this.backgrounds.find(
      (background) => background.id === backgroundId
    ) || null;
  }

  _backgroundPath(url) {
    return String(url || "").split("?", 1)[0];
  }

  _formatFileSize(size) {
    const bytes = Number(size) || 0;

    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  _renderBackgroundLibrary() {
    const library =
      this.shadowRoot.getElementById("background-library");
    const count = this.shadowRoot.getElementById(
      "background-library-count"
    );

    count.textContent =
      `${this.backgrounds.length} von ${this.backgroundLimit} Bildern`;

    if (this.backgrounds.length === 0) {
      library.innerHTML = `
        <p class="background-library-empty">
          Noch keine eigenen Bilder gespeichert.
        </p>
      `;
      return;
    }

    const selectedPath = this._backgroundPath(
      this.profile.backgroundImage
    );

    library.innerHTML = this.backgrounds.map((background) => {
      const active = selectedPath === this._backgroundPath(background.url);

      return `
        <article class="background-library-card${active ? " active" : ""}">
          <button
            class="background-select-button"
            data-background-id="${this._escapeHtml(background.id)}"
            title="${this._escapeHtml(background.name)} auswählen"
            type="button"
            aria-pressed="${active}"
          >
            <span
              class="background-library-preview"
              style="background-image:url('${background.url}')"
            ></span>
            <span class="background-library-name">
              ${this._escapeHtml(background.name)}
            </span>
            <span class="background-library-size">
              ${this._formatFileSize(background.size)}
            </span>
          </button>
          <div class="background-library-actions">
            <button
              class="background-library-action"
              data-action="rename"
              data-background-id="${this._escapeHtml(background.id)}"
              type="button"
            >
              Umbenennen
            </button>
            <button
              class="background-library-action danger"
              data-action="delete"
              data-background-id="${this._escapeHtml(background.id)}"
              type="button"
            >
              Löschen
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  async _loadBackgrounds() {
    try {
      const result = await this._hass.callWS({
        type: "theme_studio/get_backgrounds",
      });

      this.backgrounds = Array.isArray(result.backgrounds)
        ? result.backgrounds
        : [];
      this.backgroundLimit = Number(result.maximum) || 24;
      this._renderBackgroundLibrary();
    } catch (error) {
      this._setStatus(
        `Bildbibliothek konnte nicht geladen werden: ${this._errorMessage(error)}`,
        "error"
      );
    }
  }

  _selectLibraryBackground(backgroundId) {
    const background = this._backgroundById(backgroundId);

    if (!background) {
      return;
    }

    this._recordHistory();
    this.profile.backgroundImage = background.url;
    this.profile.background = "image";
    this._syncControls();
    this._updatePreview();
    this._setStatus(
      `${background.name} ausgewählt. Bitte beide Modi anwenden.`,
      "success"
    );
    this._finishSettingsChange();
  }

  async _renameBackground(backgroundId) {
    const background = this._backgroundById(backgroundId);

    if (!background) {
      return;
    }

    const name = this._prompt(
      "Neuer Name des Hintergrundbildes:",
      background.name
    )?.trim().replace(/\s+/g, " ");

    if (!name || name === background.name) {
      return;
    }

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/rename_background",
        background_id: background.id,
        name,
      });

      this.backgrounds = result.backgrounds;
      this._renderBackgroundLibrary();
      this._setStatus(
        `Bild wurde in ${name} umbenannt.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
    }
  }

  async _deleteBackground(backgroundId) {
    const background = this._backgroundById(backgroundId);

    if (!background) {
      return;
    }

    const backgroundPath = this._backgroundPath(background.url);
    const usedInEditor = ["light", "dark"].some(
      (mode) => this._backgroundPath(
        this.settings[mode].backgroundImage
      ) === backgroundPath
    );

    if (usedInEditor) {
      this._setStatus(
        "Dieses Bild ist im aktuellen Editor ausgewählt. "
          + "Bitte zuerst für beide Modi ein anderes Bild "
          + "oder eine Farbe wählen.",
        "error"
      );
      return;
    }

    if (!this._confirm(`Bild „${background.name}“ wirklich löschen?`)) {
      return;
    }

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/delete_background",
        background_id: background.id,
      });

      this.backgrounds = result.backgrounds;
      this._renderBackgroundLibrary();
      this._setStatus(
        `${background.name} wurde dauerhaft gelöscht.`,
        "success"
      );
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
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
    const nameInput = this.shadowRoot.getElementById(
      "background-upload-name"
    );

    label.classList.add("disabled");
    label.textContent = "Wird hochgeladen …";

    try {
      const dataUrl =
        await this._readFileAsDataUrl(file);

      const result =
        await this._hass.callWS({
          type: "theme_studio/upload_background",
          mode: this.activeMode,
          name: (
            nameInput.value.trim()
            || file.name.replace(/\.[^.]+$/, "")
            || "Eigenes Hintergrundbild"
          ).slice(0, 48),
          mime_type: file.type,
          content: dataUrl.split(",", 2)[1],
        });

      this._recordHistory();
      this.profile.backgroundImage = result.url;
      this.profile.background = "image";
      this.backgrounds = result.backgrounds;
      nameInput.value = "";

      this._syncControls();
      this._updatePreview();

      this._setStatus(
        "Bild hochgeladen. Bitte anwenden.",
        "success"
      );
      this._finishSettingsChange();
    } catch (error) {
      this._setStatus(
        this._errorMessage(error),
        "error"
      );
    } finally {
      label.classList.remove("disabled");
      label.textContent = "Bild hinzufügen";
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
      this.settings.effects.cardEffects.includes("status-pulse")
      && this.settings.effects.pulseEntities.length === 0
    ) {
      this._setStatus(
        "Bitte mindestens eine Entität für Status Pulse auswählen.",
        "error"
      );
      return;
    }

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

    const button =
      this.shadowRoot.getElementById("apply-button");

    button.disabled = true;
    button.textContent = "Wird aktiviert …";

    const submittedSettings = this._cloneSettings(this.settings);
    const submittedProfileId = this.activeProfileId;
    try {
      const result =
        await this._hass.callWS({
          type: "theme_studio/save_settings",
          settings: submittedSettings,
          previous_theme_studio_active: this.themeStudioActive,
          ...(this._currentProfile()
            ? { active_profile_id: this.activeProfileId }
            : {}),
        });

      const editorChanged = JSON.stringify(this.settings) !== JSON.stringify(submittedSettings)
        || this.activeProfileId !== submittedProfileId;
      if (!editorChanged) {
        this.settings = result.settings;
        this._resetHistory();
      }
      this.appliedSettings = this._cloneSettings(result.settings);
      this.persistedActiveProfileId =
        result.active_profile_id || "";
      this.recoveryAvailable = result.recovery_available === true;
      this.themeStudioActive = true;
      this._syncUnsavedStatus();
      this._syncRecoveryButton();

      this._setStatus(
        "Design gespeichert und aktiviert.",
        "success"
      );

      button.textContent = "Aktiviert ✓";
    } catch (error) {
      this._setStatus(
        this._errorMessage(error),
        "error"
      );

      button.textContent = "Fehlgeschlagen";
    }

    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = "Beide Modi anwenden";
    }, 2200);
  }

  _syncRecoveryButton() {
    const button = this.shadowRoot?.getElementById(
      "restore-last-button"
    );

    if (!button) {
      return;
    }

    button.disabled = !this.recoveryAvailable;
    button.title = this.recoveryAvailable
      ? "Aktiviert das zuletzt gesicherte Design"
      : "Noch kein vorheriges Design gespeichert";
  }

  async _restoreLastDesign() {
    if (!this.recoveryAvailable) {
      return;
    }

    const confirmed = this._confirm(
      "Das zuletzt gesicherte Design wird aktiviert.\n\n"
      + "Der aktuelle Stand bleibt als Wiederherstellungspunkt erhalten. "
      + "Fortfahren?"
    );

    if (!confirmed) {
      return;
    }

    const button = this.shadowRoot.getElementById(
      "restore-last-button"
    );
    button.disabled = true;
    button.textContent = "Wird wiederhergestellt …";

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/restore_last_design",
        current_theme_studio_active: this.themeStudioActive,
      });

      this.settings = this._cloneSettings(result.settings);
      this.appliedSettings = this._cloneSettings(result.settings);
      this.persistedActiveProfileId = result.active_profile_id || "";
      this.activeProfileId = this.persistedActiveProfileId;
      this.recoveryAvailable = result.recovery_available === true;
      this.themeStudioActive = result.theme_studio_active === true;
      this._resetHistory();
      this._renderProfileOptions();
      this._syncControls();
      this._updatePreview();
      this._syncUnsavedStatus();

      this._setStatus(
        this.themeStudioActive
          ? "Das zuletzt gesicherte Design wurde aktiviert."
          : "Der zuvor gesicherte Home-Assistant-Standard wurde aktiviert.",
        "success"
      );
      button.textContent = "Wiederhergestellt ✓";
    } catch (error) {
      this._setStatus(this._errorMessage(error), "error");
      button.textContent = "Wiederherstellung fehlgeschlagen";
    }

    window.setTimeout(() => {
      button.textContent = "Letztes Design wiederherstellen";
      this._syncRecoveryButton();
    }, 2600);
  }

  async _restoreHomeAssistantDefault() {
    const confirmed = this._confirm(
      "Das originale Home-Assistant-Standarddesign wird für "
      + "den hellen und dunklen Modus aktiviert.\n\n"
      + "Deine Theme-Studio-Profile und Hintergrundbilder "
      + "bleiben erhalten. Fortfahren?"
    );

    if (!confirmed) {
      return;
    }

    const button = this.shadowRoot.getElementById(
      "restore-default-button"
    );

    button.disabled = true;
    button.textContent = "Standarddesign wird aktiviert …";

    try {
      const result = await this._hass.callWS({
        type: "theme_studio/restore_default_theme",
        current_theme_studio_active: this.themeStudioActive,
      });

      this.persistedActiveProfileId = "";
      this.activeProfileId = "";
      this.recoveryAvailable = result.recovery_available === true;
      this.themeStudioActive = false;
      this._renderProfileOptions();
      this._syncRecoveryButton();

      this._setStatus(
        "Das originale Home-Assistant-Standarddesign ist aktiv. "
        + "Deine Theme-Studio-Daten wurden beibehalten.",
        "success"
      );

      button.textContent = "Home-Assistant-Standard aktiv ✓";
    } catch (error) {
      this._setStatus(
        this._errorMessage(error),
        "error"
      );

      button.textContent = "Wiederherstellung fehlgeschlagen";
    }

    window.setTimeout(() => {
      button.disabled = false;
      button.textContent =
        "Home-Assistant-Standard wiederherstellen";
    }, 2600);
  }

  _syncControls() {
    this.shadowRoot
      .querySelectorAll(".mode-button")
      .forEach((button) => {
        const active = button.dataset.mode === this.activeMode;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

    const counterpartButton = this.shadowRoot.getElementById(
      "generate-counterpart-button"
    );

    counterpartButton.textContent =
      this.activeMode === "dark"
        ? "Passenden Hellmodus erzeugen"
        : "Passenden Dunkelmodus erzeugen";

    const colors = {
      "primary-color": "primaryColor",
      "background-color": "backgroundColor",
      "card-color": "cardColor",
      "card-text-color": "cardTextColor",
      "card-icon-color": "cardIconColor",
      "card-border-color": "cardBorderColor",
      "header-background-color": "headerBackgroundColor",
      "header-text-color": "headerTextColor",
      "sidebar-background-color": "sidebarBackgroundColor",
      "sidebar-text-color": "sidebarTextColor",
      "sidebar-icon-color": "sidebarIconColor",
      "sidebar-selected-color": "sidebarSelectedColor",
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

    const selectedBackground = this.backgrounds.find(
      (background) => this._backgroundPath(background.url)
        === this._backgroundPath(this.profile.backgroundImage)
    );

    this.shadowRoot
      .getElementById("file-name")
      .textContent = selectedBackground
        ? `Ausgewählt: ${selectedBackground.name}`
        : this.profile.backgroundImage
          ? "Hintergrundbild ausgewählt"
          : "";

    this.shadowRoot
      .getElementById("preview-mode")
      .textContent =
        this.activeMode === "light"
          ? "Vorschau: heller Modus"
          : "Vorschau: dunkler Modus";

    this.shadowRoot
      .getElementById("preview")
      .setAttribute(
        "aria-label",
        this.activeMode === "light"
          ? "Dashboard-Vorschau im hellen Modus"
          : "Dashboard-Vorschau im dunklen Modus"
      );

    this._syncColorPresets();
    this._syncBackgroundSelection();
    this._syncImageOption();
    this._renderBackgroundLibrary();
    this._syncEffectControls();
  }

  _syncEffectControls() {
    this.shadowRoot
      .querySelectorAll(".background-effect-option")
      .forEach((button) => {
        const active = button.dataset.effect ===
          this.settings.effects.effect;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
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
        const active = effect === "none"
          ? this.settings.effects.cardEffects.length === 0
          : this.settings.effects.cardEffects.includes(effect);

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
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

    const pulseEntities = new Set(
      this.settings.effects.pulseEntities
    );

    this.shadowRoot
      .querySelectorAll(".pulse-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.checked =
          pulseEntities.has(checkbox.value);
      });

    this._syncEntitySelectionCount(
      "pulse-entity-checkbox",
      "pulse-entity-count"
    );

    this.shadowRoot
      .getElementById("status-pulse-controls")
      .hidden =
        !this.settings.effects.cardEffects
          .includes("status-pulse");

    const energyEntities = new Set(
      this.settings.effects.energyEntities
    );

    this.shadowRoot
      .querySelectorAll(".energy-entity-checkbox")
      .forEach((checkbox) => {
        checkbox.checked =
          energyEntities.has(checkbox.value);
      });

    this._syncEntitySelectionCount(
      "energy-entity-checkbox",
      "energy-entity-count"
    );

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

    this._syncEntitySelectionCount(
      "climate-entity-checkbox",
      "climate-entity-count"
    );

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

    this._syncEntitySelectionCount(
      "alert-entity-checkbox",
      "alert-entity-count"
    );

    this.shadowRoot
      .getElementById("alert-battery-low")
      .value = this.settings.effects.alertBatteryLow;

    this.shadowRoot
      .getElementById("alert-focus-controls")
      .hidden =
        !this.settings.effects.cardEffects
          .includes("alert-focus");
  }

  _syncEntitySelectionCount(checkboxClass, countId) {
    const count = this.shadowRoot.querySelectorAll(
      `.${checkboxClass}:checked`
    ).length;
    const output = this.shadowRoot.getElementById(countId);

    if (output) {
      output.textContent = `${count} gewählt`;
    }
  }

  _syncColorPresets() {
    this.shadowRoot
      .querySelectorAll(".color-preset")
      .forEach((button) => {
        const active = button.dataset.color.toLowerCase() ===
          this.profile.primaryColor.toLowerCase();

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
  }

  _syncBackgroundSelection() {
    this.shadowRoot
      .querySelectorAll(".background-option")
      .forEach((button) => {
        const active = button.dataset.background ===
          this.profile.background;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
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

  _setStatus(message, type) {
    const status =
      this.shadowRoot.getElementById("status");

    status.textContent = this._translate(message);
    status.className = "status";
    status.setAttribute(
      "role",
      type === "error" ? "alert" : "status"
    );
    status.setAttribute(
      "aria-live",
      type === "error" ? "assertive" : "polite"
    );

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
      this._translate("Der Vorgang ist fehlgeschlagen.")
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

  _mixColors(firstColor, secondColor, secondWeight) {
    const first = this._hexToRgb(firstColor);
    const second = this._hexToRgb(secondColor);
    const weight = Math.min(1, Math.max(0, secondWeight));
    const channel = (firstValue, secondValue) =>
      Math.round(firstValue * (1 - weight) + secondValue * weight)
        .toString(16)
        .padStart(2, "0");

    return (
      `#${channel(first.red, second.red)}` +
      `${channel(first.green, second.green)}` +
      `${channel(first.blue, second.blue)}`
    );
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
      "--preview-header-background",
      this.profile.headerBackgroundColor
    );

    preview.style.setProperty(
      "--preview-header-text",
      this.profile.headerTextColor
    );

    preview.style.setProperty(
      "--preview-sidebar-background",
      this.profile.sidebarBackgroundColor
    );

    preview.style.setProperty(
      "--preview-sidebar-text",
      this.profile.sidebarTextColor
    );

    preview.style.setProperty(
      "--preview-sidebar-icon",
      this.profile.sidebarIconColor
    );

    preview.style.setProperty(
      "--preview-sidebar-selected",
      this.profile.sidebarSelectedColor
    );

    preview.style.setProperty(
      "--preview-sidebar-active-background",
      this._rgba(this.profile.sidebarSelectedColor, 0.14)
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
