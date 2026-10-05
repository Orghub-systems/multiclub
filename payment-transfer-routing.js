(function () {
  "use strict";

  if (window.__orghubPaymentTransferRoutingV1) return;
  window.__orghubPaymentTransferRoutingV1 = true;

  const targetsByRow = new Map();

  function clean_(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeKind_(value) {
    return clean_(value).toUpperCase();
  }

  function normalizePeriod_(value) {
    return clean_(value).replace(/[^0-9]/g, "").slice(0, 6);
  }

  function isUuid_(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean_(value));
  }

  function chargeIdFromTargetCell_(value) {
    const match = clean_(value).match(/^SUPABASE:([0-9a-f-]{36})(?:=|$)/i);
    return match && isUuid_(match[1]) ? match[1] : "";
  }

  function rememberExactTarget_(item) {
    const row = Number(item && item.sheet_row);
    if (!Number.isSafeInteger(row) || row < 2) return;

    const kind = normalizeKind_(
      item && (item.suggested_payment_kind || item.matched_payment_kind)
    );
    const period = normalizePeriod_(
      item && (item.suggested_period || item.matched_period)
    );
    const chargeId = chargeIdFromTargetCell_(item && item.target_cell);
    const amount = Math.round((Number(item && item.amount) || 0) * 100) / 100;
    const approvalReady = item && item.approval_ready === true;

    if (
      approvalReady &&
      (kind === "S" || kind === "Z") &&
      period.length === 6 &&
      chargeId &&
      amount > 0
    ) {
      targetsByRow.set(row, {
        chargeId,
        amount,
        kind,
        period
      });
      return;
    }

    targetsByRow.delete(row);
  }

  function hookTransferRenderer_() {
    const original = window.renderAdminSystemPrzelewTile_;
    if (typeof original !== "function" || original.__exactChargeRoutingHooked) return;

    const wrapped = function (item) {
      try {
        rememberExactTarget_(item);
      } catch (e) {
        console.warn("rememberExactTarget_ error", e);
      }

      return original.apply(this, arguments);
    };

    wrapped.__exactChargeRoutingHooked = true;
    window.renderAdminSystemPrzelewTile_ = wrapped;
  }

  function hookApiPost_() {
    const original = window.apiClubPost;
    if (typeof original !== "function" || original.__exactChargeRoutingHooked) return;

    const wrapped = function (payload) {
      try {
        const data = payload && typeof payload === "object" ? payload : null;
        const action = clean_(data && (data.action || data.mode));

        if (action === "system_przelewy_confirm") {
          const row = Number(data.sheet_row);
          const kind = normalizeKind_(data.payment_kind);
          const period = normalizePeriod_(data.period);
          const target = targetsByRow.get(row);

          if (
            target &&
            (kind === "S" || kind === "Z") &&
            kind === target.kind &&
            period === target.period
          ) {
            const routedPayload = {
              ...data,
              payment_kind: "ALLOCATE",
              period: JSON.stringify([
                {
                  id: target.chargeId,
                  amount: target.amount
                }
              ])
            };

            return original.call(this, routedPayload);
          }
        }
      } catch (e) {
        console.warn("exact charge routing error", e);
      }

      return original.apply(this, arguments);
    };

    wrapped.__exactChargeRoutingHooked = true;
    window.apiClubPost = wrapped;
  }

  hookTransferRenderer_();
  hookApiPost_();

  // Skrypt jest ładowany po głównym index.html, ale zostawiamy drugi przebieg
  // na wypadek zmiany kolejności ładowania dodatków aplikacji.
  setTimeout(function () {
    hookTransferRenderer_();
    hookApiPost_();
  }, 0);
})();
