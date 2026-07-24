/* ORG HUB — frontend wydarzeń cyklicznych */
(function installRecurringEventsFront_() {
  "use strict";

  if (window.__orgHubRecurringEventsFrontV1) return;
  window.__orgHubRecurringEventsFrontV1 = true;

  const MIN_REPEAT_DAYS = 0;
  const MAX_REPEAT_DAYS = 30;

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

  function ensureRepeatSelect_() {
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

  function patchAddEventSubmit_() {
    const original = window.wyslijNoweWydarzenie;

    if (typeof original !== "function") return false;
    if (original.__orgHubRecurringEventsFrontV1) return true;

    async function wrappedAddEventSubmit_() {
      const select = ensureRepeatSelect_();
      const selectedValue = select
        ? String(select.value || "0")
        : "0";

      /*
       * Istniejąca funkcja frontu traktuje pustą wartość jako brak
       * cykliczności. Dla użytkownika pokazujemy 0, a przed wysłaniem
       * przekazujemy ten stan jako wartość pustą. GAS normalizuje ją do 0.
       */
      if (select && selectedValue === "0") {
        select.value = "";
      }

      try {
        return await original.apply(this, arguments);
      } finally {
        const currentSelect = ensureRepeatSelect_();
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

    wrappedAddEventSubmit_.__orgHubRecurringEventsFrontV1 = true;
    window.wyslijNoweWydarzenie = wrappedAddEventSubmit_;
    return true;
  }

  function initializeRecurringEventsFront_() {
    ensureRepeatSelect_();

    if (!patchAddEventSubmit_()) {
      window.setTimeout(patchAddEventSubmit_, 50);
    }
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
