export class ThemeStudioDevicePreviewMixin {
  _openDevicePreview() {
    const overlay = this.shadowRoot.getElementById(
      "device-preview-overlay"
    );

    if (!overlay) {
      return;
    }

    this.devicePreviewReturnFocus = this.shadowRoot.activeElement;
    overlay.hidden = false;
    this._syncDevicePreviewControls();
    if (!this.devicePreviewDashboardsLoaded) {
      this.shadowRoot
        .getElementById("device-preview-frame")
        ?.replaceChildren();
      void this._loadDevicePreviewDashboards();
    } else {
      this._refreshDevicePreview();
    }
    this.shadowRoot
      .getElementById("device-preview-close")
      ?.focus({ preventScroll: true });
  }

  _closeDevicePreview() {
    const overlay = this.shadowRoot.getElementById(
      "device-preview-overlay"
    );

    if (!overlay || overlay.hidden) {
      return;
    }

    overlay.hidden = true;
    window.clearTimeout(this.devicePreviewThemeTimer);
    this.devicePreviewThemeTimer = 0;
    this.devicePreviewThemeRevision += 1;
    const frame = this.shadowRoot.getElementById("device-preview-frame");
    this._disposeDevicePreviewDashboard(
      frame?.querySelector(".device-preview-dashboard")
    );
    frame?.replaceChildren();
    this.devicePreviewReturnFocus?.focus?.({ preventScroll: true });
    this.devicePreviewReturnFocus = null;
  }

  _disposeDevicePreviewDashboard(dashboard) {
    if (!dashboard) {
      return;
    }

    dashboard._themeStudioReadOnlyCleanup?.();
    delete dashboard._themeStudioReadOnlyCleanup;
    try {
      dashboard.contentWindow?.stop?.();
    } catch (_error) {
      // A dashboard that is already unloading needs no further cleanup.
    }
  }

  _setDevicePreviewDevice(device) {
    if (!["desktop", "tablet", "phone"].includes(device)) {
      return;
    }

    this.devicePreviewDevice = device;
    this.devicePreviewOrientation = device === "desktop"
      ? "landscape"
      : "portrait";
    this._syncDevicePreviewControls();
    this._refreshDevicePreview();
  }

  _rotateDevicePreview() {
    if (this.devicePreviewDevice === "desktop") {
      return;
    }

    this.devicePreviewOrientation =
      this.devicePreviewOrientation === "portrait"
        ? "landscape"
        : "portrait";
    this._syncDevicePreviewControls();
    this._refreshDevicePreview();
  }

  _syncDevicePreviewControls() {
    const frame = this.shadowRoot.getElementById("device-preview-frame");
    const rotate = this.shadowRoot.getElementById("device-preview-rotate");

    if (!frame || !rotate) {
      return;
    }

    frame.dataset.device = this.devicePreviewDevice;
    frame.dataset.orientation = this.devicePreviewOrientation;
    frame.dataset.previewSource = "dashboard";
    frame.dataset.loadingLabel = this._translate("Dashboard wird geladen …");
    rotate.hidden = this.devicePreviewDevice === "desktop";
    rotate.textContent = this._translate(
      this.devicePreviewOrientation === "portrait"
        ? "↻ Querformat"
        : "↻ Hochformat"
    );

    this.shadowRoot
      .querySelectorAll("[data-device-preview-device]")
      .forEach((button) => {
        const active = button.dataset.devicePreviewDevice ===
          this.devicePreviewDevice;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

    const note = this.shadowRoot.getElementById("device-preview-note");
    if (note) {
      note.textContent = this._translate(
        "Schreibgeschützte Ansicht des gewählten Designs auf deinem echten Dashboard. Schalter und Karten können hier nicht bedient werden."
      );
    }

    const picker = this.shadowRoot.getElementById(
      "device-preview-dashboard-picker"
    );
    if (picker) {
      picker.hidden = false;
    }

    const profilePicker = this.shadowRoot.getElementById(
      "device-preview-profile-picker"
    );
    if (profilePicker) {
      profilePicker.hidden = false;
    }
    const applyButton = this.shadowRoot.getElementById(
      "device-preview-apply"
    );
    if (applyButton) {
      applyButton.hidden = false;
    }
    this._renderDevicePreviewProfileOptions();
  }

  _renderDevicePreviewProfileOptions() {
    const select = this.shadowRoot.getElementById(
      "device-preview-profile-select"
    );
    if (!select) {
      return;
    }

    const selectedExists = this.profiles.some(
      (profile) => profile.id === this.devicePreviewProfileId
    );
    if (!selectedExists) {
      this.devicePreviewProfileId = "";
    }

    select.replaceChildren(new Option(
      this._translate("Aktuelles Design"),
      ""
    ));
    this.profiles.forEach((profile) => {
      select.append(new Option(
        this._profileDisplayLabel(profile),
        profile.id
      ));
    });
    select.value = this.devicePreviewProfileId;
  }

  async _applyDevicePreviewSelection() {
    const button = this.shadowRoot.getElementById(
      "device-preview-apply"
    );
    if (!button || button.disabled) {
      return;
    }

    const selectedProfile = this.profiles.find(
      (profile) => profile.id === this.devicePreviewProfileId
    );

    button.disabled = true;
    button.textContent = this._translate("Wird aktiviert …");

    if (selectedProfile) {
      this.activeProfileId = selectedProfile.id;
      this._replaceEditorSettings(selectedProfile.settings);
      this._renderProfileOptions(false);
    }

    const succeeded = await this._saveAndApplySettings();
    if (succeeded) {
      this._closeDevicePreview();
      return;
    }

    button.disabled = false;
    button.textContent = this._translate("Design anwenden");
  }

  async _loadDevicePreviewDashboards() {
    if (
      this.devicePreviewDashboardsLoaded
      || this.devicePreviewDashboardsLoading
    ) {
      return;
    }

    const select = this.shadowRoot.getElementById(
      "device-preview-dashboard-select"
    );
    if (!select) {
      return;
    }

    this.devicePreviewDashboardsLoading = true;
    select.disabled = true;
    select.replaceChildren(new Option(
      this._translate("Dashboard wird geladen …"),
      ""
    ));

    const options = [];
    const panels = Object.entries(this._hass?.panels || {})
      .filter(([, panel]) => panel?.component_name === "lovelace");

    for (const [panelKey, panel] of panels) {
      const basePath = String(panel?.url_path || panelKey || "lovelace")
        .replace(/^\/+|\/+$/g, "");
      const panelTitle = panel?.title || panel?.config?.title || basePath;
      let config = null;

      try {
        const request = { type: "lovelace/config" };
        if (basePath !== "lovelace") {
          request.url_path = basePath;
        }
        config = await this._hass.callWS(request);
      } catch (_error) {
        try {
          config = await this._hass.callWS({
            type: "lovelace/config",
            url_path: basePath,
          });
        } catch (_fallbackError) {
          config = null;
        }
      }

      const views = Array.isArray(config?.views) ? config.views : [];
      if (!views.length) {
        options.push({
          path: `/${basePath}`,
          label: panelTitle,
        });
        continue;
      }

      views.forEach((view, index) => {
        const viewPath = String(view?.path ?? index).replace(/^\/+|\/+$/g, "");
        const viewTitle = view?.title || viewPath || `${index + 1}`;
        options.push({
          path: `/${basePath}/${viewPath}`,
          label: `${panelTitle} · ${viewTitle}`,
        });
      });
    }

    const uniqueOptions = [...new Map(
      options.map((option) => [option.path, option])
    ).values()];
    const remembered = this._rememberedDevicePreviewDashboardPath();
    let rememberedPath = remembered;
    try {
      rememberedPath = new URL(
        remembered || "/",
        window.location.origin
      ).pathname;
    } catch (_error) {
      rememberedPath = remembered;
    }
    const selected = uniqueOptions.find((option) =>
      option.path === rememberedPath
    ) || uniqueOptions[0];

    select.replaceChildren();
    if (!uniqueOptions.length) {
      select.append(new Option(
        this._translate("Keine Dashboard-Ansicht gefunden"),
        ""
      ));
    } else {
      uniqueOptions.forEach((option) => {
        select.append(new Option(option.label, option.path));
      });
      this.devicePreviewDashboardPath = selected.path;
      select.value = selected.path;
      this._storeDevicePreviewDashboardPath(selected.path);
    }

    select.disabled = !uniqueOptions.length;
    this.devicePreviewDashboardsLoading = false;
    this.devicePreviewDashboardsLoaded = true;

    this._refreshDevicePreview(true);
  }

  _rememberedDevicePreviewDashboardPath() {
    try {
      return window.sessionStorage.getItem(
        "theme-studio-preview-dashboard-path"
      ) || window.sessionStorage.getItem(
        "theme-studio-last-dashboard-path"
      ) || "";
    } catch (_error) {
      return "";
    }
  }

  _storeDevicePreviewDashboardPath(path) {
    try {
      window.sessionStorage.setItem(
        "theme-studio-preview-dashboard-path",
        path
      );
    } catch (_error) {
      // Remembering the explicitly selected preview is optional.
    }
  }

  _dashboardPreviewPath() {
    const remembered = this.devicePreviewDashboardPath
      || this._rememberedDevicePreviewDashboardPath();

    if (remembered.startsWith("/") && !remembered.startsWith("/theme-studio")) {
      return remembered;
    }

    const panels = this._hass?.panels || {};
    const preferred = this._hass?.defaultPanel
      || this._hass?.config?.default_panel
      || "lovelace";
    const preferredPanel = panels[preferred];
    const panel = preferredPanel?.component_name === "lovelace"
      ? preferredPanel
      : Object.values(panels).find((candidate) =>
        candidate?.component_name === "lovelace"
      );
    const path = panel?.url_path || "lovelace";

    return `/${String(path).replace(/^\/+/, "")}`;
  }

  _scheduleDevicePreviewTheme(dashboard, delay = 100) {
    window.clearTimeout(this.devicePreviewThemeTimer);
    this.devicePreviewThemeTimer = window.setTimeout(() => {
      this.devicePreviewThemeTimer = 0;
      void this._applyDevicePreviewTheme(dashboard);
    }, delay);
  }

  _protectDevicePreviewDashboard(dashboard, dashboardDocument) {
    if (dashboard.dataset.readOnlyGuard === "1") {
      return;
    }

    const preventInteraction = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const blockedEvents = [
      "action",
      "auxclick",
      "click",
      "dblclick",
      "submit",
      "change",
      "input",
    ];
    blockedEvents.forEach((eventName) => {
      dashboardDocument.addEventListener(
        eventName,
        preventInteraction,
        true
      );
    });
    dashboard._themeStudioReadOnlyCleanup = () => {
      blockedEvents.forEach((eventName) => {
        dashboardDocument.removeEventListener(
          eventName,
          preventInteraction,
          true
        );
      });
    };
    dashboard.dataset.readOnlyGuard = "1";
  }

  async _applyDevicePreviewTheme(dashboard) {
    if (
      !dashboard?.isConnected
      || !this._hass?.callWS
    ) {
      return;
    }

    let documentRoot;
    let body;
    let homeAssistant;
    try {
      const dashboardDocument = dashboard.contentDocument;
      documentRoot = dashboardDocument?.documentElement;
      body = dashboardDocument?.body;
      homeAssistant = dashboardDocument?.querySelector("home-assistant");
    } catch (_error) {
      dashboard.dataset.themePreview = "failed";
      return;
    }

    if (!documentRoot || !homeAssistant) {
      const attempts = Number(dashboard.dataset.themePreviewAttempts || 0);
      if (attempts < 12) {
        dashboard.dataset.themePreviewAttempts = String(attempts + 1);
        this._scheduleDevicePreviewTheme(dashboard, 150);
      } else {
        dashboard.dataset.themePreview = "failed";
      }
      return;
    }

    this._protectDevicePreviewDashboard(
      dashboard,
      homeAssistant.ownerDocument
    );

    const selectedProfile = this.profiles.find(
      (profile) => profile.id === this.devicePreviewProfileId
    );
    const previewSettings = selectedProfile?.settings || this.settings;
    const previewProfileId = selectedProfile?.id || this.activeProfileId || "";
    const signature = JSON.stringify([
      previewProfileId,
      previewSettings,
    ]);

    if (
      dashboard.dataset.themePreview === "ready"
      && dashboard._themeStudioPreviewSignature === signature
    ) {
      return;
    }

    const requestRevision = ++this.devicePreviewThemeRevision;

    let preview = this.devicePreviewThemeCache.get(signature);
    if (!preview) {
      try {
        preview = await this._hass.callWS({
          type: "theme_studio/preview_theme",
          settings: this._cloneSettings(previewSettings),
          active_profile_id: previewProfileId,
        });
      } catch (_error) {
        if (requestRevision === this.devicePreviewThemeRevision) {
          dashboard.dataset.themePreview = "failed";
        }
        return;
      }

      this.devicePreviewThemeCache.set(signature, preview);
      if (this.devicePreviewThemeCache.size > 8) {
        const oldest = this.devicePreviewThemeCache.keys().next().value;
        this.devicePreviewThemeCache.delete(oldest);
      }
    }

    if (
      !dashboard.isConnected
      || requestRevision !== this.devicePreviewThemeRevision
    ) {
      return;
    }

    const values = preview?.values || {};
    const targets = [documentRoot, body, homeAssistant].filter(Boolean);
    const properties = new Set(
      Object.keys(values).map((key) =>
        key.startsWith("--") ? key : `--${key}`
      )
    );
    const previousProperties = dashboard._themeStudioPreviewProperties
      || new Set();
    previousProperties.forEach((property) => {
      if (!properties.has(property)) {
        targets.forEach((target) => target.style.removeProperty(property));
      }
    });
    targets.forEach((target) => {
      Object.entries(values).forEach(([key, value]) => {
        const property = key.startsWith("--") ? key : `--${key}`;
        target.style.setProperty(property, String(value));
      });
      target.style.setProperty(
        "color-scheme",
        preview?.mode === "light" ? "light" : "dark"
      );
    });

    dashboard._themeStudioPreviewProperties = properties;
    dashboard._themeStudioPreviewSignature = signature;
    dashboard.dataset.themePreview = "ready";
  }

  _refreshDevicePreview(force = false) {
    const overlay = this.shadowRoot.getElementById(
      "device-preview-overlay"
    );
    const frame = this.shadowRoot.getElementById("device-preview-frame");

    if (!overlay || overlay.hidden || !frame) {
      return;
    }

    const current = frame.querySelector(".device-preview-dashboard");
    const path = this._dashboardPreviewPath();

    if (!force && current?.dataset.dashboardPath === path) {
      this._scheduleDevicePreviewTheme(current);
      return;
    }

    const dashboard = document.createElement("iframe");
    const previewUrl = new URL(path, window.location.origin);
    previewUrl.searchParams.set("theme_studio_preview", "1");
    dashboard.className = "device-preview-dashboard";
    dashboard.dataset.dashboardPath = path;
    dashboard.src = `${previewUrl.pathname}${previewUrl.search}`;
    dashboard.title = this._translate("Echtes Dashboard – schreibgeschützt");
    dashboard.tabIndex = -1;
    dashboard.setAttribute("aria-hidden", "true");
    dashboard.addEventListener("load", () => {
      dashboard.classList.add("loaded");
      this._scheduleDevicePreviewTheme(dashboard, 0);
    }, { once: true });
    this._disposeDevicePreviewDashboard(current);
    frame.replaceChildren(dashboard);
  }

  _handleDevicePreviewKeydown(event) {
    const overlay = this.shadowRoot.getElementById(
      "device-preview-overlay"
    );

    if (!overlay || overlay.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this._closeDevicePreview();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = [...overlay.querySelectorAll(
      "button:not([hidden]):not(:disabled), select:not([hidden]):not(:disabled)"
    )].filter((element) => element.offsetParent !== null);

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.shadowRoot.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.shadowRoot.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
