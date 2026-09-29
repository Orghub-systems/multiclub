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

  function hookNavigation_() {
    if (typeof window.goToView === "function" && !window.goToView.__usageTrackingHooked) {
      const originalGoToView = window.goToView;
      window.goToView = function (viewId) {
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
