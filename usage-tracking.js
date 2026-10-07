(function () {
  "use strict";

  const ROOT_VIEWS = new Set([
    "playerMenuView",
    "trainerPanelView",
    "adminPanelView"
  ]);

  let appOpenTracked = false;

  function usageSession_() {
    try {
      if (typeof loadAppSession_ === "function") {
        return loadAppSession_();
      }
    } catch (e) {}

    try {
      const raw = localStorage.getItem("orghub_app_session_v1");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function usageModuleForView_(viewId) {
    const id = String(viewId || "");
    if (!id) return "";

    if (/^(homeView|playerLineupView|trainerWydarzenia|trainerDodajWydarzenie|trainerLineupEditorView|adminEvents|adminEvent)/i.test(id)) {
      return "events";
    }
    if (/^(platnosci|adminObslugaPlatnosciView|adminPlatnosciZawodnikowView|adminPaymentsView|adminSystemPrzelewyView|adminPaymentList)/i.test(id)) {
      return "payments";
    }
    if (/^(statsView|playerStatsMonthView|adminStatsView)$/i.test(id)) {
      return "statistics";
    }
    if (/^(trainerZawodnicyView|trainerZawodnikView|adminZawodnicyView|adminZawodnik|adminTrenerzyView|adminTrener)/i.test(id)) {
      return "members";
    }
    if (/^(adminGroupsView|adminGrupyView)/i.test(id)) {
      return "groups";
    }
    if (/Raport/i.test(id)) {
      return "reports";
    }
    if (/Notifications|manualPush/i.test(id)) {
      return "notifications";
    }
    if (/Settings|Features/i.test(id)) {
      return "settings";
    }
    if (/Document/i.test(id)) {
      return "documents";
    }
    if (/Assistant/i.test(id)) {
      return "assistant";
    }

    return "";
  }

  function usageCurrentView_() {
    try {
      return String(currentView || "").trim();
    } catch (e) {
      return "";
    }
  }

  function usageTrack_(eventType, moduleName, viewId, sessionOverride) {
    try {
      const session = sessionOverride || usageSession_();
      const clubKey = String(
        session?.clubId ||
        (typeof clubId !== "undefined" ? clubId : "") ||
        window.clubId ||
        ""
      ).trim().toLowerCase();
      const token = String(session?.sessionToken || "").trim();

      if (!clubKey || !token) return;

      const endpoint = new URL(CORE_URL);
      endpoint.searchParams.set("action", "usageTrack");

      const body = new URLSearchParams();
      body.set("clubId", clubKey);
      body.set("sessionToken", token);
      body.set("eventType", String(eventType || ""));
      if (moduleName) body.set("module", String(moduleName));
      if (viewId) body.set("viewId", String(viewId));
      if (window.APP_BUILD) body.set("clientBuild", String(window.APP_BUILD));

      fetch(endpoint.toString(), {
        method: "POST",
        body,
        keepalive: true,
        cache: "no-store"
      }).catch(function () {});
    } catch (e) {}
  }

  function usageTrackView_(viewId) {
    const id = String(viewId || "").trim();
    if (!id) return;

    if (ROOT_VIEWS.has(id)) {
      if (!appOpenTracked) {
        appOpenTracked = true;
        usageTrack_("app_open", "", id);
      }
      return;
    }

    const moduleName = usageModuleForView_(id);
    if (moduleName) {
      usageTrack_("module_open", moduleName, id);
    }
  }

  /*
   * Jeżeli zwykłe goToView() wskazuje ekran, który już znajduje się
   * niżej w stosie aplikacji, jest to powrót, a nie nowe wejście.
   *
   * Stare widoki trenera i administratora mają jeszcze przyciski typu:
   *   goToView("trainerPanelView")
   *   goToView("trainerWydarzeniaView")
   *
   * Bez tego zabezpieczenia taki "Powrót" dopisywał kolejny wpis
   * do historii i sprzętowa cofajka Androida zachowywała się jak
   * cofanie po stronach WWW.
   */
  function navigationBackToExistingView_(viewId, options) {
    const target = String(viewId || "").trim();
    if (!target) return false;

    const opts =
      options && typeof options === "object"
        ? options
        : {};

    // Jawne przejścia routera zachowują dotychczasową semantykę.
    if (opts.replace || opts.resetStack || opts.fromHistory) {
      return false;
    }

    const stack = Array.isArray(window.__appViewStack)
      ? window.__appViewStack.map(function (id) {
          return String(id || "").trim();
        })
      : [];

    if (stack.length < 2) return false;

    const current = usageCurrentView_();
    const lastIndex = stack.length - 1;

    // Nie ingerujemy w niesynchronizowany stos.
    if (!current || stack[lastIndex] !== current) {
      return false;
    }

    // Szukamy celu wyłącznie poniżej bieżącego ekranu.
    let targetIndex = -1;
    for (let i = lastIndex - 1; i >= 0; i--) {
      if (stack[i] === target) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex < 0) return false;

    const distance = lastIndex - targetIndex;
    if (distance < 1) return false;

    try {
      history.go(-distance);
      return true;
    } catch (e) {
      return false;
    }
  }

  function hookNavigation_() {
    if (typeof window.goToView === "function" && !window.goToView.__usageTrackingHooked) {
      const originalGoToView = window.goToView;
      window.goToView = function (viewId, options) {
        if (navigationBackToExistingView_(viewId, options)) {
          return;
        }

        const result = originalGoToView.apply(this, arguments);
        usageTrackView_(viewId);
        return result;
      };
      window.goToView.__usageTrackingHooked = true;
    }

    if (typeof window.showViewFromHistory === "function" && !window.showViewFromHistory.__usageTrackingHooked) {
      const originalShowViewFromHistory = window.showViewFromHistory;
      window.showViewFromHistory = function (viewId) {
        const result = originalShowViewFromHistory.apply(this, arguments);
        usageTrackView_(viewId);
        return result;
      };
      window.showViewFromHistory.__usageTrackingHooked = true;
    }
  }

  function hookLogin_() {
    if (typeof window.zaloguj !== "function" || window.zaloguj.__usageTrackingHooked) return;

    const originalLogin = window.zaloguj;
    window.zaloguj = async function () {
      const before = usageSession_();
      const beforeToken = String(before?.sessionToken || "");
      const beforeValidatedAt = String(before?.validatedAt || "");

      const result = await originalLogin.apply(this, arguments);

      const after = usageSession_();
      const afterToken = String(after?.sessionToken || "");
      const afterValidatedAt = String(after?.validatedAt || "");
      const viewId = usageCurrentView_();

      if (
        afterToken &&
        ROOT_VIEWS.has(viewId) &&
        (afterToken !== beforeToken || afterValidatedAt !== beforeValidatedAt)
      ) {
        usageTrack_("login", "", viewId, after);
      }

      return result;
    };
    window.zaloguj.__usageTrackingHooked = true;
  }

  hookNavigation_();
  hookLogin_();

  setTimeout(function () {
    hookNavigation_();
    hookLogin_();

    const session = usageSession_();
    const viewId = usageCurrentView_();
    if (session?.sessionToken && ROOT_VIEWS.has(viewId)) {
      usageTrackView_(viewId);
    }
  }, 0);
})();

(function loadPaymentTransferRouting_() {
  "use strict";

  if (document.querySelector('script[data-orghub-payment-transfer-routing="1"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/payment-transfer-routing.js?v=1";
  script.async = false;
  script.dataset.orghubPaymentTransferRouting = "1";
  document.head.appendChild(script);
})();

(function loadOrghubAssistant_() {
  "use strict";

  if (document.querySelector('script[data-orghub-assistant="1"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/assistant-front.js?v=1";
  script.async = false;
  script.dataset.orghubAssistant = "1";
  document.head.appendChild(script);
})();
