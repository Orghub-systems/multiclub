/* ORG HUB — frontend wydarzeń cyklicznych */
(function installRecurringEventsFront_() {
  "use strict";

  if (window.__orgHubRecurringEventsFrontV2) return;
  window.__orgHubRecurringEventsFrontV2 = true;

  const MIN_REPEAT_DAYS = 0;
  const MAX_REPEAT_DAYS = 30;

  function ensureStylesheet_() {
    if (document.querySelector('link[data-org-hub-recurring-events-css="1"]')) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/recurring-events-front.css?v=20260724-1";
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

  function fillRepeatOptions_(select) {
    if (!select) return;

    const currentValues = Array.from(select.options || []).map(function(option) {
      return String(option.value);
    });

    const expectedValues = Array.from(
      { length: MAX_REPEAT_DAYS - MIN_REPEAT_DAYS + 1 },
      function(_, index) {
        return String(index + MIN_REPEAT_DAYS);
      }
    );

    if (
      currentValues.length === expectedValues.length &&
      currentValues.every(function(value, index) {
        return value === expectedValues[index];
      })
    ) {
      return;
    }

    select.innerHTML = "";

    expectedValues.forEach(function(value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function ensureAddRepeatSelect_() {
    const current = document.getElementById("eventRepeatDays");
    if (!current) return null;

    if (current.tagName === "SELECT") {
      fillRepeatOptions_(current);

      if (!current.value && current.selectedIndex < 0) {
        current.value = "0";
      }

      return current;
    }

    const select = document.createElement("select");
    select.id = "eventRepeatDays";
    select.className = current.className || "event-repeat-input";
    select.setAttribute(
      "aria-label",
      "Liczba dni pomiędzy wydarzeniami"
    );

    fillRepeatOptions_(select);
    select.value = "0";

    current.replaceWith(select);
    return select;
  }

  function ensureEditRepeatSelect_() {
    const existing = document.getElementById("editEventRepeatDays");

    if (existing) {
      fillRepeatOptions_(existing);
      return existing;
    }

    const eventTypeInput = document.getElementById("editEventRodzaj");
    if (!eventTypeInput || !eventTypeInput.parentNode) return null;

    const row = document.createElement("div");
    row.className = "full-btn alt event-repeat-row event-repeat-edit-row";

    const startText = document.createElement("span");
    startText.textContent = "Powtarzaj co";

    const select = document.createElement("select");
    select.id = "editEventRepeatDays";
    select.className = "event-repeat-input event-repeat-edit-input";
    select.setAttribute(
      "aria-label",
      "Liczba dni pomiędzy wydarzeniami"
    );

    fillRepeatOptions_(select);
    select.value = "0";

    const endText = document.createElement("span");
    endText.textContent = "dni";

    row.appendChild(startText);
    row.appendChild(select);
    row.appendChild(endText);

    eventTypeInput.insertAdjacentElement("afterend", row);
    return select;
  }

  function setEditRepeatDays_(value) {
    const select = ensureEditRepeatSelect_();
    if (!select) return;

    select.value = String(normalizedRepeatDays_(value));
  }

  function readEditRepeatDays_() {
    const select = ensureEditRepeatSelect_();
    const value = select ? Number(select.value || 0) : 0;

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
    if (original.__orgHubRecurringEventsFrontV2) return true;

    async function wrappedAddEventSubmit_() {
      const select = ensureAddRepeatSelect_();
      const selectedValue = select
        ? String(select.value || "0")
        : "0";

      /*
       * Stara funkcja dodawania traktuje pustą wartość jako brak
       * cykliczności. Dla użytkownika pokazujemy 0, a przed wysłaniem
       * przekazujemy ten stan jako wartość pustą.
       */
      if (select && selectedValue === "0") {
        select.value = "";
      }

      try {
        return await original.apply(this, arguments);
      } finally {
        const currentSelect = ensureAddRepeatSelect_();
        const addView = document.getElementById(
          "trainerDodajWydarzenieView"
        );

        if (!currentSelect) return;

        const formWasSubmitted =
          !!addView && addView.classList.contains("hidden");

        currentSelect.value = formWasSubmitted
          ? "0"
          : selectedValue;
      }
    }

    wrappedAddEventSubmit_.__orgHubRecurringEventsFrontV2 = true;
    window.wyslijNoweWydarzenie = wrappedAddEventSubmit_;
    return true;
  }

  function patchApiClubGet_() {
    const original = window.apiClubGet;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV2) return true;

    async function wrappedApiClubGet_(action) {
      const detailsRequest = isEventDetailsAction_(action);

      if (detailsRequest) {
        setEditRepeatDays_(0);
      }

      const response = await original.apply(this, arguments);

      if (detailsRequest) {
        const repeatDays = extractRepeatDays_(response, 0);
        setEditRepeatDays_(repeatDays === null ? 0 : repeatDays);
      }

      return response;
    }

    wrappedApiClubGet_.__orgHubRecurringEventsFrontV2 = true;
    window.apiClubGet = wrappedApiClubGet_;
    return true;
  }

  function patchApiClubPost_() {
    const original = window.apiClubPost;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV2) return true;

    async function wrappedApiClubPost_(payload) {
      const args = Array.from(arguments);
      const action = payload && typeof payload === "object"
        ? payload.action
        : "";

      const detailsRequest = isEventDetailsAction_(action);
      const editRequest = isEditEventAction_(action);

      if (detailsRequest) {
        setEditRepeatDays_(0);
      }

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

      if (
        editRequest &&
        response &&
        response.success !== false
      ) {
        setEditRepeatDays_(0);
      }

      return response;
    }

    wrappedApiClubPost_.__orgHubRecurringEventsFrontV2 = true;
    window.apiClubPost = wrappedApiClubPost_;
    return true;
  }

  function observeEditPopup_() {
    const popup = document.getElementById("trainerEditPopup");
    if (!popup || popup.__orgHubRecurringEventsObserverV2) return;

    popup.__orgHubRecurringEventsObserverV2 = true;

    const observer = new MutationObserver(function() {
      const computed = window.getComputedStyle(popup);
      const hidden =
        computed.display === "none" ||
        popup.classList.contains("hidden");

      if (hidden) {
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
    ensureAddRepeatSelect_();
    ensureEditRepeatSelect_();
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
