/* ORG HUB — frontend wydarzeń cyklicznych */
(function installRecurringEventsFront_() {
  "use strict";

  if (window.__orgHubRecurringEventsFrontV3) return;
  window.__orgHubRecurringEventsFrontV3 = true;

  const MIN_REPEAT_DAYS = 0;
  const MAX_REPEAT_DAYS = 30;
  const WHEEL_ITEM_HEIGHT = 40;

  let activeWheelInput = null;
  let activeWheelButton = null;
  let wheelScrollTimer = null;
  let previousBodyOverflow = "";

  function ensureStylesheet_() {
    if (document.querySelector('link[data-org-hub-recurring-events-css="1"]')) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/recurring-events-front.css?v=20260724-2";
    link.dataset.orgHubRecurringEventsCss = "1";
    document.head.appendChild(link);
  }

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
        if (button.disabled) return;
        openWheel_(input, button);
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
    let overlay = document.getElementById("eventRepeatWheelOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "eventRepeatWheelOverlay";
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
      if (wheelScrollTimer) {
        clearTimeout(wheelScrollTimer);
      }

      updateWheelSelectionFromScroll_();

      wheelScrollTimer = setTimeout(function() {
        const value = wheelValueFromScroll_();
        scrollWheelToValue_(value, true);
      }, 90);
    }, { passive: true });

    done.addEventListener("click", closeWheel_);

    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) {
        closeWheel_();
      }
    });

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
        closeWheel_();
      }
    });

    return overlay;
  }

  function wheelValueFromScroll_() {
    const overlay = ensureWheelOverlay_();
    const list = overlay.querySelector("#eventRepeatWheelList");
    if (!list) return 0;

    const index = Math.round(list.scrollTop / WHEEL_ITEM_HEIGHT);
    return Math.min(
      MAX_REPEAT_DAYS,
      Math.max(MIN_REPEAT_DAYS, index + MIN_REPEAT_DAYS)
    );
  }

  function updateWheelSelectedClasses_(value) {
    const overlay = ensureWheelOverlay_();
    const options = overlay.querySelectorAll(".event-repeat-wheel-option");

    options.forEach(function(option) {
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

  function updateWheelSelectionFromScroll_() {
    setActiveWheelValue_(wheelValueFromScroll_());
  }

  function scrollWheelToValue_(value, smooth) {
    const overlay = ensureWheelOverlay_();
    const list = overlay.querySelector("#eventRepeatWheelList");
    if (!list) return;

    const normalized = normalizedRepeatDays_(value);
    const top = (normalized - MIN_REPEAT_DAYS) * WHEEL_ITEM_HEIGHT;

    list.scrollTo({
      top,
      behavior: smooth ? "smooth" : "auto"
    });

    setActiveWheelValue_(normalized);
  }

  function openWheel_(input, button) {
    const overlay = ensureWheelOverlay_();

    activeWheelInput = input;
    activeWheelButton = button;

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");

    const value = normalizedRepeatDays_(input.value);

    requestAnimationFrame(function() {
      scrollWheelToValue_(value, false);
      const done = overlay.querySelector("#eventRepeatWheelDone");
      if (done) done.focus({ preventScroll: true });
    });
  }

  function closeWheel_() {
    const overlay = document.getElementById("eventRepeatWheelOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;

    if (activeWheelButton) {
      activeWheelButton.setAttribute("aria-expanded", "false");
      activeWheelButton.focus({ preventScroll: true });
    }

    activeWheelInput = null;
    activeWheelButton = null;
  }

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

      if (msg) {
        msg.textContent = "❌ Wybierz liczbę dni od 0 do 30.";
      }

      throw new Error("Nieprawidłowa liczba dni powtarzania.");
    }

    return value;
  }

  function extractRepeatDays_(value, depth) {
    const level = Number(depth || 0);
    if (level > 4 || value == null) return null;

    if (typeof value !== "object") return null;

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

  function isEventDetailsAction_(action) {
    const normalized = String(action || "")
      .trim()
      .replace(/[_-]/g, "")
      .toLowerCase();

    return normalized === "wydarzeniedetails";
  }

  function isEditEventAction_(action) {
    const normalized = String(action || "")
      .trim()
      .replace(/[_-]/g, "")
      .toLowerCase();

    return normalized === "edytujwydarzenie";
  }

  function patchAddEventSubmit_() {
    const original = window.wyslijNoweWydarzenie;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV3) return true;

    async function wrappedAddEventSubmit_() {
      const input = ensureAddRepeatControl_();
      const selectedValue = input
        ? String(input.value || "0")
        : "0";

      /*
       * Stara funkcja dodawania traktuje pustą wartość jako brak
       * cykliczności. Dla użytkownika pokazujemy 0, a przed wysłaniem
       * przekazujemy ten stan jako wartość pustą.
       */
      if (input && selectedValue === "0") {
        input.value = "";
      }

      try {
        return await original.apply(this, arguments);
      } finally {
        const currentInput = ensureAddRepeatControl_();
        const addView = document.getElementById(
          "trainerDodajWydarzenieView"
        );

        if (!currentInput) return;

        const formWasSubmitted =
          !!addView && addView.classList.contains("hidden");

        currentInput.value = formWasSubmitted
          ? "0"
          : selectedValue;

        updateWheelButton_(currentInput);
      }
    }

    wrappedAddEventSubmit_.__orgHubRecurringEventsFrontV3 = true;
    window.wyslijNoweWydarzenie = wrappedAddEventSubmit_;
    return true;
  }

  function patchApiClubGet_() {
    const original = window.apiClubGet;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV3) return true;

    async function wrappedApiClubGet_(action) {
      const detailsRequest = isEventDetailsAction_(action);

      if (detailsRequest) {
        setEditRepeatDays_(0);
        setWheelDisabled_("editEventRepeatDays", true);
      }

      try {
        const response = await original.apply(this, arguments);

        if (detailsRequest) {
          const repeatDays = extractRepeatDays_(response, 0);
          setEditRepeatDays_(repeatDays === null ? 0 : repeatDays);
        }

        return response;
      } finally {
        if (detailsRequest) {
          setWheelDisabled_("editEventRepeatDays", false);
        }
      }
    }

    wrappedApiClubGet_.__orgHubRecurringEventsFrontV3 = true;
    window.apiClubGet = wrappedApiClubGet_;
    return true;
  }

  function patchApiClubPost_() {
    const original = window.apiClubPost;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV3) return true;

    async function wrappedApiClubPost_(payload) {
      const args = Array.from(arguments);
      const action = payload && typeof payload === "object"
        ? payload.action
        : "";

      const detailsRequest = isEventDetailsAction_(action);
      const editRequest = isEditEventAction_(action);

      if (detailsRequest) {
        setEditRepeatDays_(0);
        setWheelDisabled_("editEventRepeatDays", true);
      }

      if (editRequest) {
        args[0] = Object.assign({}, payload, {
          repeatDays: readEditRepeatDays_()
        });
      }

      try {
        const response = await original.apply(this, args);

        if (detailsRequest) {
          const repeatDays = extractRepeatDays_(response, 0);
          setEditRepeatDays_(repeatDays === null ? 0 : repeatDays);
        }

        if (
          editRequest &&
          response &&
          response.success !== false
        ) {
          setEditRepeatDays_(0);
        }

        return response;
      } finally {
        if (detailsRequest) {
          setWheelDisabled_("editEventRepeatDays", false);
        }
      }
    }

    wrappedApiClubPost_.__orgHubRecurringEventsFrontV3 = true;
    window.apiClubPost = wrappedApiClubPost_;
    return true;
  }

  function observeEditPopup_() {
    const popup = document.getElementById("trainerEditPopup");
    if (!popup || popup.__orgHubRecurringEventsObserverV3) return;

    popup.__orgHubRecurringEventsObserverV3 = true;

    const observer = new MutationObserver(function() {
      const computed = window.getComputedStyle(popup);
      const hidden =
        computed.display === "none" ||
        popup.classList.contains("hidden");

      if (hidden) {
        closeWheel_();
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
      patchApiClubPost_()
    ].every(Boolean);

    if (!ready) {
      window.setTimeout(patchRuntime_, 100);
    }
  }

  function initializeRecurringEventsFront_() {
    ensureStylesheet_();
    ensureAddRepeatControl_();
    ensureEditRepeatControl_();
    ensureWheelOverlay_();
    observeEditPopup_();
    patchRuntime_();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeRecurringEventsFront_,
      { once: true }
    );
  } else {
    initializeRecurringEventsFront_();
  }
})();
