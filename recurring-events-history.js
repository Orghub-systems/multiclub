/* ORG HUB — historia nawigacji dla pokrętła wydarzeń cyklicznych */
(function installRecurringEventsHistory_() {
  "use strict";

  if (window.__orgHubRecurringEventsHistoryV1) return;
  window.__orgHubRecurringEventsHistoryV1 = true;

  const OVERLAY_ID = "eventRepeatWheelOverlay";
  const HISTORY_FLAG = "orgHubRepeatWheel";
  const HISTORY_MODAL = "eventRepeatWheelOverlay";

  let openerButton = null;
  let bodyOverflowBeforeOpen = "";

  function getOverlay_() {
    return document.getElementById(OVERLAY_ID);
  }

  function isOverlayOpen_() {
    const overlay = getOverlay_();

    return !!(
      overlay &&
      !overlay.classList.contains("hidden") &&
      window.getComputedStyle(overlay).display !== "none"
    );
  }

  function currentStateHasWheel_() {
    try {
      return !!(
        history.state &&
        history.state[HISTORY_FLAG] === true
      );
    } catch (error) {
      return false;
    }
  }

  function pushWheelHistory_() {
    if (currentStateHasWheel_()) return;

    let baseState = {};

    try {
      if (history.state && typeof history.state === "object") {
        baseState = Object.assign({}, history.state);
      }
    } catch (error) {
      baseState = {};
    }

    try {
      history.pushState(
        Object.assign({}, baseState, {
          [HISTORY_FLAG]: true,
          modal: HISTORY_MODAL
        }),
        "",
        location.href
      );
    } catch (error) {
      console.warn("Nie udało się dodać historii pokrętła:", error);
    }
  }

  function closeOverlayFromBack_() {
    const overlay = getOverlay_();
    if (!overlay || overlay.classList.contains("hidden")) return false;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = bodyOverflowBeforeOpen;

    document.querySelectorAll(".event-repeat-wheel-button").forEach(function(button) {
      button.setAttribute("aria-expanded", "false");
    });

    if (openerButton && document.contains(openerButton)) {
      try {
        openerButton.focus({ preventScroll: true });
      } catch (error) {
        openerButton.focus();
      }
    }

    openerButton = null;
    return true;
  }

  function ensureOverlayObserver_() {
    const overlay = getOverlay_();
    if (!overlay || overlay.__orgHubRepeatWheelHistoryObserverV1) return;

    overlay.__orgHubRepeatWheelHistoryObserverV1 = true;

    const observer = new MutationObserver(function() {
      if (
        overlay.classList.contains("hidden") &&
        currentStateHasWheel_()
      ) {
        history.back();
      }
    });

    observer.observe(overlay, {
      attributes: true,
      attributeFilter: ["class", "style", "aria-hidden"]
    });
  }

  document.addEventListener("click", function(event) {
    const button = event.target.closest
      ? event.target.closest(".event-repeat-wheel-button")
      : null;

    if (!button || button.disabled) return;

    openerButton = button;
    bodyOverflowBeforeOpen = document.body.style.overflow;

    window.setTimeout(function() {
      ensureOverlayObserver_();

      if (isOverlayOpen_()) {
        pushWheelHistory_();
      }
    }, 0);
  }, true);

  window.addEventListener("popstate", function() {
    if (isOverlayOpen_()) {
      closeOverlayFromBack_();
    }
  });
})();
