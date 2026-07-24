/* ORG HUB — wydarzenia cykliczne: dodawanie, edycja i pokrętło 0–30 */
(function installRecurringEventsFront_() {
  "use strict";

  if (window.__orgHubRecurringEventsFrontV4) return;
  window.__orgHubRecurringEventsFrontV4 = true;

  const MIN_REPEAT_DAYS = 0;
  const MAX_REPEAT_DAYS = 30;
  const WHEEL_ITEM_HEIGHT = 40;
  const WHEEL_MODAL_ID = "eventRepeatWheelOverlay";

  let activeWheelInput = null;
  let activeWheelButton = null;
  let wheelScrollTimer = null;
  let previousBodyOverflow = "";

  function normalizedRepeatDays_(value) {
    const numberValue = Number(value);

    if (
      !Number.isInteger(numberValue) ||
      numberValue < MIN_REPEAT_DAYS ||
      numberValue > MAX_REPEAT_DAYS
    ) {
      return 0;
    }

    return numberValue;
  }

  function installStyles_() {
    if (document.getElementById("orgHubRecurringEventsStyle")) return;

    const style = document.createElement("style");
    style.id = "orgHubRecurringEventsStyle";
    style.textContent = `
      #trainerDodajWydarzenieView .event-repeat-row,
      #trainerEditPopup .event-repeat-edit-row {
        position: relative;
        overflow: visible;
      }

      #trainerEditPopup .event-repeat-edit-row {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
        padding-left: 16px;
        white-space: nowrap;
        font-family: "MS Shell Dlg 2", sans-serif;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.25;
      }

      [data-repeat-wheel-hidden="1"] {
        display: none !important;
      }

      .event-repeat-wheel-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        min-width: 64px;
        height: 34px;
        margin: 0;
        padding: 0 8px;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid #555;
        background: #1b1b1b;
        color: #fff;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        text-align: center;
        cursor: pointer;
        touch-action: manipulation;
      }

      .event-repeat-wheel-button::after {
        content: "↕";
        margin-left: 5px;
        font-size: 11px;
        opacity: .65;
      }

      .event-repeat-wheel-button:focus-visible {
        outline: 2px solid rgba(255,255,255,.75);
        outline-offset: 2px;
      }

      .event-repeat-wheel-overlay {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0,0,0,.42);
        box-sizing: border-box;
      }

      .event-repeat-wheel-overlay.hidden {
        display: none;
      }

      .event-repeat-wheel-card {
        width: 132px;
        padding: 12px 10px 10px;
        box-sizing: border-box;
        border: 1px solid #4c4c4c;
        border-radius: 18px;
        background: #171717;
        box-shadow: 0 16px 42px rgba(0,0,0,.65);
        color: #fff;
        text-align: center;
      }

      .event-repeat-wheel-title,
      .event-repeat-wheel-suffix {
        font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        font-size: 12px;
        font-weight: 700;
        opacity: .76;
      }

      .event-repeat-wheel-title { margin-bottom: 5px; }
      .event-repeat-wheel-suffix { margin-top: 5px; }

      .event-repeat-wheel-window {
        position: relative;
        height: 168px;
        overflow: hidden;
        border-radius: 12px;
        background: #101010;
      }

      .event-repeat-wheel-list {
        position: relative;
        z-index: 2;
        height: 168px;
        margin: 0;
        padding: 64px 0;
        box-sizing: border-box;
        overflow-y: auto;
        overscroll-behavior: contain;
        scroll-snap-type: y mandatory;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }

      .event-repeat-wheel-list::-webkit-scrollbar {
        display: none;
      }

      .event-repeat-wheel-option {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 40px;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: #fff;
        font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        font-size: 18px;
        font-weight: 500;
        opacity: .38;
        transform: scale(.88);
        transition: opacity .12s ease, transform .12s ease, font-size .12s ease;
        scroll-snap-align: center;
        cursor: pointer;
      }

      .event-repeat-wheel-option.selected {
        font-size: 25px;
        font-weight: 800;
        opacity: 1;
        transform: scale(1);
      }

      .event-repeat-wheel-selection {
        position: absolute;
        z-index: 1;
        left: 8px;
        right: 8px;
        top: 64px;
        height: 40px;
        border-top: 1px solid rgba(255,255,255,.24);
        border-bottom: 1px solid rgba(255,255,255,.24);
        background: rgba(255,255,255,.055);
        pointer-events: none;
      }

      .event-repeat-wheel-done {
        width: 100%;
        min-height: 34px;
        margin: 9px 0 0;
        padding: 7px 10px;
        border: 1px solid #444;
        border-radius: 10px;
        background: #252525;
        color: #fff;
        font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
    `;

    document.head.appendChild(style);
  }

  function wheelButtonId_(inputId) {
    return inputId + "WheelButton";
  }

  function updateWheelButton_(input) {
    if (!input) return;

    const button = document.getElementById(wheelButtonId_(input.id));
    if (!button) return;

    const value = normalizedRepeatDays_(input.value);
    button.textContent = String(value);
    button.setAttribute("aria-label", "Powtarzaj co " + value + " dni");
  }

  function ensureHiddenRepeatInput_(current, inputId) {
    const currentValue = normalizedRepeatDays_(current && current.value);
    let input = current;

    if (!input || input.tagName !== "INPUT" || input.type !== "hidden") {
      input = document.createElement("input");
      input.type = "hidden";
      input.id = inputId;
      input.value = String(currentValue);
      input.dataset.repeatWheelHidden = "1";

      if (current && current.parentNode) {
        current.replaceWith(input);
      }
    } else {
      input.value = String(currentValue);
      input.dataset.repeatWheelHidden = "1";
    }

    return input;
  }

  function ensureWheelButton_(input) {
    if (!input || !input.parentNode) return null;

    const buttonId = wheelButtonId_(input.id);
    let button = document.getElementById(buttonId);

    if (!button) {
      button = document.createElement("button");
      button.id = buttonId;
      button.type = "button";
      button.className = "event-repeat-wheel-button";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", function() {
        if (!button.disabled) openWheel_(input, button);
      });

      input.insertAdjacentElement("afterend", button);
    }

    updateWheelButton_(input);
    return button;
  }

  function ensureAddRepeatControl_() {
    const current = document.getElementById("eventRepeatDays");
    if (!current) return null;

    const input = ensureHiddenRepeatInput_(current, "eventRepeatDays");
    ensureWheelButton_(input);
    return input;
  }

  function ensureEditRepeatControl_() {
    const existing = document.getElementById("editEventRepeatDays");

    if (existing) {
      const input = ensureHiddenRepeatInput_(existing, "editEventRepeatDays");
      ensureWheelButton_(input);
      return input;
    }

    const eventTypeInput = document.getElementById("editEventRodzaj");
    if (!eventTypeInput || !eventTypeInput.parentNode) return null;

    const row = document.createElement("div");
    row.className = "full-btn alt event-repeat-row event-repeat-edit-row";

    const startText = document.createElement("span");
    startText.textContent = "Powtarzaj co";

    const input = document.createElement("input");
    input.type = "hidden";
    input.id = "editEventRepeatDays";
    input.value = "0";
    input.dataset.repeatWheelHidden = "1";

    const endText = document.createElement("span");
    endText.textContent = "dni";

    row.appendChild(startText);
    row.appendChild(input);
    row.appendChild(endText);

    eventTypeInput.insertAdjacentElement("afterend", row);
    ensureWheelButton_(input);
    return input;
  }

  function ensureWheelOverlay_() {
    let overlay = document.getElementById(WHEEL_MODAL_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = WHEEL_MODAL_ID;
    overlay.className = "event-repeat-wheel-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="event-repeat-wheel-card" role="dialog" aria-modal="true" aria-label="Wybierz liczbę dni">
        <div class="event-repeat-wheel-title">Powtarzaj co</div>
        <div class="event-repeat-wheel-window">
          <div id="eventRepeatWheelList" class="event-repeat-wheel-list"></div>
          <div class="event-repeat-wheel-selection" aria-hidden="true"></div>
        </div>
        <div class="event-repeat-wheel-suffix">dni</div>
        <button id="eventRepeatWheelDone" class="event-repeat-wheel-done" type="button">Gotowe</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const list = overlay.querySelector("#eventRepeatWheelList");
    const done = overlay.querySelector("#eventRepeatWheelDone");

    for (let value = MIN_REPEAT_DAYS; value <= MAX_REPEAT_DAYS; value += 1) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "event-repeat-wheel-option";
      option.dataset.value = String(value);
      option.textContent = String(value);
      option.addEventListener("click", function() {
        scrollWheelToValue_(value, true);
      });
      list.appendChild(option);
    }

    list.addEventListener("scroll", function() {
      if (wheelScrollTimer) clearTimeout(wheelScrollTimer);

      setActiveWheelValue_(wheelValueFromScroll_());

      wheelScrollTimer = setTimeout(function() {
        scrollWheelToValue_(wheelValueFromScroll_(), true);
      }, 90);
    }, { passive: true });

    done.addEventListener("click", requestCloseWheel_);

    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) requestCloseWheel_();
    });

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && isWheelOpen_()) {
        requestCloseWheel_();
      }
    });

    return overlay;
  }

  function wheelValueFromScroll_() {
    const list = ensureWheelOverlay_().querySelector("#eventRepeatWheelList");
    if (!list) return 0;

    const index = Math.round(list.scrollTop / WHEEL_ITEM_HEIGHT);

    return Math.min(
      MAX_REPEAT_DAYS,
      Math.max(MIN_REPEAT_DAYS, index + MIN_REPEAT_DAYS)
    );
  }

  function updateWheelSelectedClasses_(value) {
    ensureWheelOverlay_()
      .querySelectorAll(".event-repeat-wheel-option")
      .forEach(function(option) {
        const selected = Number(option.dataset.value) === Number(value);
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-selected", selected ? "true" : "false");
      });
  }

  function setActiveWheelValue_(value) {
    const normalized = normalizedRepeatDays_(value);

    if (activeWheelInput) {
      activeWheelInput.value = String(normalized);
      activeWheelInput.dispatchEvent(new Event("change", { bubbles: true }));
      updateWheelButton_(activeWheelInput);
    }

    updateWheelSelectedClasses_(normalized);
  }

  function scrollWheelToValue_(value, smooth) {
    const list = ensureWheelOverlay_().querySelector("#eventRepeatWheelList");
    if (!list) return;

    const normalized = normalizedRepeatDays_(value);

    list.scrollTo({
      top: (normalized - MIN_REPEAT_DAYS) * WHEEL_ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto"
    });

    setActiveWheelValue_(normalized);
  }

  function isWheelOpen_() {
    const overlay = document.getElementById(WHEEL_MODAL_ID);

    return !!(
      overlay &&
      !overlay.classList.contains("hidden") &&
      window.getComputedStyle(overlay).display !== "none"
    );
  }

  function closeWheelDirect_() {
    const overlay = document.getElementById(WHEEL_MODAL_ID);
    if (!overlay || overlay.classList.contains("hidden")) return false;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;

    if (activeWheelButton) {
      activeWheelButton.setAttribute("aria-expanded", "false");

      try {
        activeWheelButton.focus({ preventScroll: true });
      } catch (error) {
        activeWheelButton.focus();
      }
    }

    activeWheelInput = null;
    activeWheelButton = null;
    return true;
  }

  function pushWheelHistory_() {
    if (
      history.state &&
      String(history.state.modal || "") === WHEEL_MODAL_ID
    ) {
      return;
    }

    if (typeof window.pushPaymentModalHistoryState_ === "function") {
      window.pushPaymentModalHistoryState_(WHEEL_MODAL_ID);
      return;
    }

    try {
      history.pushState(
        Object.assign({}, history.state || {}, { modal: WHEEL_MODAL_ID }),
        "",
        location.pathname + location.search
      );
    } catch (error) {
      console.warn("Nie udało się dodać historii pokrętła:", error);
    }
  }

  function openWheel_(input, button) {
    if (isWheelOpen_()) return;

    const overlay = ensureWheelOverlay_();

    activeWheelInput = input;
    activeWheelButton = button;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");

    pushWheelHistory_();

    const value = normalizedRepeatDays_(input.value);

    requestAnimationFrame(function() {
      scrollWheelToValue_(value, false);
      const done = overlay.querySelector("#eventRepeatWheelDone");
      if (done) done.focus({ preventScroll: true });
    });
  }

  function requestCloseWheel_() {
    if (!isWheelOpen_()) return;

    if (
      history.state &&
      String(history.state.modal || "") === WHEEL_MODAL_ID
    ) {
      try {
        history.back();
        return;
      } catch (error) {}
    }

    closeWheelDirect_();
  }

  /*
   * Ten listener korzysta z tego samego history.state.modal co pozostałe popupy.
   * Faza capture wykonuje go przed głównym routerem aplikacji. Dzięki temu
   * sprzętowa cofajka Androida zamyka pokrętło i nie cofa widoku w tle.
   */
  window.addEventListener("popstate", function(event) {
    if (!isWheelOpen_()) return;

    if (
      event.state &&
      String(event.state.modal || "") === WHEEL_MODAL_ID
    ) {
      return;
    }

    closeWheelDirect_();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }, true);

  function setWheelDisabled_(inputId, disabled) {
    const button = document.getElementById(wheelButtonId_(inputId));
    if (!button) return;

    button.disabled = !!disabled;
    button.style.opacity = disabled ? "0.55" : "";
    button.style.pointerEvents = disabled ? "none" : "";
    button.style.filter = disabled ? "grayscale(0.25)" : "";
  }

  function setEditRepeatDays_(value) {
    const input = ensureEditRepeatControl_();
    if (!input) return;

    input.value = String(normalizedRepeatDays_(value));
    updateWheelButton_(input);
  }

  function readEditRepeatDays_() {
    const input = ensureEditRepeatControl_();
    const value = input ? Number(input.value || 0) : 0;

    if (
      !Number.isInteger(value) ||
      value < MIN_REPEAT_DAYS ||
      value > MAX_REPEAT_DAYS
    ) {
      const msg = document.getElementById("editEventMsg");
      if (msg) msg.textContent = "❌ Wybierz liczbę dni od 0 do 30.";
      throw new Error("Nieprawidłowa liczba dni powtarzania.");
    }

    return value;
  }

  function extractRepeatDays_(value, depth) {
    const level = Number(depth || 0);
    if (level > 4 || value == null || typeof value !== "object") return null;

    const repeatKeys = {
      repeatdays: true,
      repeat_days: true,
      powtarzajcodni: true,
      powtarzaj_co_dni: true,
      cyklicznoscdni: true,
      cyklicznosc_dni: true
    };

    const entries = Object.entries(value);

    for (let index = 0; index < entries.length; index += 1) {
      const key = String(entries[index][0] || "")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      if (repeatKeys[key]) {
        return normalizedRepeatDays_(entries[index][1]);
      }
    }

    for (let index = 0; index < entries.length; index += 1) {
      const nested = entries[index][1];

      if (nested && typeof nested === "object") {
        const result = extractRepeatDays_(nested, level + 1);
        if (result !== null) return result;
      }
    }

    return null;
  }

  function normalizeAction_(action) {
    return String(action || "")
      .trim()
      .replace(/[_-]/g, "")
      .toLowerCase();
  }

  function patchAddEventSubmit_() {
    const original = window.wyslijNoweWydarzenie;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsV4) return true;

    async function wrappedAddEventSubmit_() {
      const input = ensureAddRepeatControl_();
      const selectedValue = input ? String(input.value || "0") : "0";

      /*
       * Istniejąca funkcja dodawania traktuje pustą wartość jako brak
       * cykliczności. Dla użytkownika pokazujemy 0.
       */
      if (input && selectedValue === "0") {
        input.value = "";
      }

      try {
        return await original.apply(this, arguments);
      } finally {
        const currentInput = ensureAddRepeatControl_();
        const addView = document.getElementById("trainerDodajWydarzenieView");

        if (!currentInput) return;

        const submitted =
          !!addView && addView.classList.contains("hidden");

        currentInput.value = submitted ? "0" : selectedValue;
        updateWheelButton_(currentInput);
      }
    }

    wrappedAddEventSubmit_.__orgHubRecurringEventsV4 = true;
    window.wyslijNoweWydarzenie = wrappedAddEventSubmit_;
    return true;
  }

  function patchApiClubGet_() {
    const original = window.apiClubGet;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsV4) return true;

    async function wrappedApiClubGet_(action) {
      const detailsRequest = normalizeAction_(action) === "wydarzeniedetails";

      if (detailsRequest) setEditRepeatDays_(0);

      const response = await original.apply(this, arguments);

      if (detailsRequest) {
        const repeatDays = extractRepeatDays_(response, 0);
        setEditRepeatDays_(repeatDays === null ? 0 : repeatDays);
      }

      return response;
    }

    wrappedApiClubGet_.__orgHubRecurringEventsV4 = true;
    window.apiClubGet = wrappedApiClubGet_;
    return true;
  }

  function patchApiClubPost_() {
    const original = window.apiClubPost;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsV4) return true;

    async function wrappedApiClubPost_(payload) {
      const args = Array.from(arguments);
      const action = payload && typeof payload === "object"
        ? normalizeAction_(payload.action)
        : "";

      const detailsRequest = action === "wydarzeniedetails";
      const editRequest = action === "edytujwydarzenie";

      if (detailsRequest) setEditRepeatDays_(0);

      if (editRequest) {
        args[0] = Object.assign({}, payload, {
          repeatDays: readEditRepeatDays_()
        });
      }

      const response = await original.apply(this, args);

      if (detailsRequest) {
        const repeatDays = extractRepeatDays_(response, 0);
        setEditRepeatDays_(repeatDays === null ? 0 : repeatDays);
      }

      if (editRequest && response && response.success !== false) {
        setEditRepeatDays_(0);
      }

      return response;
    }

    wrappedApiClubPost_.__orgHubRecurringEventsV4 = true;
    window.apiClubPost = wrappedApiClubPost_;
    return true;
  }

  function patchEditLoadingState_() {
    const original = window.setTrainerEditPopupLoadingState_;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsV4) return true;

    window.setTrainerEditPopupLoadingState_ = function(isLoading) {
      const result = original.apply(this, arguments);
      setWheelDisabled_("editEventRepeatDays", !!isLoading);
      return result;
    };

    window.setTrainerEditPopupLoadingState_.__orgHubRecurringEventsV4 = true;
    return true;
  }

  function observeEditPopup_() {
    const popup = document.getElementById("trainerEditPopup");
    if (!popup || popup.__orgHubRecurringEventsObserverV4) return;

    popup.__orgHubRecurringEventsObserverV4 = true;

    const observer = new MutationObserver(function() {
      const hidden =
        window.getComputedStyle(popup).display === "none" ||
        popup.classList.contains("hidden");

      if (hidden) {
        if (isWheelOpen_()) closeWheelDirect_();
        setEditRepeatDays_(0);
      }
    });

    observer.observe(popup, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  }

  function patchRuntime_() {
    const ready = [
      patchAddEventSubmit_(),
      patchApiClubGet_(),
      patchApiClubPost_(),
      patchEditLoadingState_()
    ].every(Boolean);

    if (!ready) {
      window.setTimeout(patchRuntime_, 100);
    }
  }

  function initialize_() {
    installStyles_();
    ensureAddRepeatControl_();
    ensureEditRepeatControl_();
    ensureWheelOverlay_();
    observeEditPopup_();
    patchRuntime_();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize_, { once: true });
  } else {
    initialize_();
  }
})();