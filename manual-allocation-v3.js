/* ORG HUB — System przelewów / ręczne rozliczenie wielu należności */
(function () {
  "use strict";

  const MONEY_EPSILON = 0.005;
  const transferMetaByRow = Object.create(null);

  function roundMoney_(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function moneyEqual_(a, b) {
    return Math.abs(roundMoney_(a) - roundMoney_(b)) < MONEY_EPSILON;
  }

  function moneyText_(value) {
    return roundMoney_(value).toFixed(2).replace(".", ",") + " zł";
  }

  function esc_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getState_() {
    if (!window.__orgHubManualAllocationV3) {
      window.__orgHubManualAllocationV3 = {
        row: 0,
        title: "",
        amount: 0,
        currency: "PLN",
        suggestedPlayerNo: "",
        players: [],
        selectedPlayerNo: ""
      };
    }
    return window.__orgHubManualAllocationV3;
  }

  function rememberTransferMeta_(p) {
    const row = Number(p && p.sheet_row || 0);
    if (!(row >= 2)) return;

    transferMetaByRow[row] = {
      amount: roundMoney_(p && p.amount),
      currency: String(p && p.currency || "PLN").trim() || "PLN",
      title: String(p && p.raw_title || "").trim(),
      originalMatchStatus: String(p && p.original_match_status || p && p.match_status || "").trim()
    };
  }

  const originalRenderTile_ = window.renderAdminSystemPrzelewTile_;
  if (typeof originalRenderTile_ === "function") {
    window.renderAdminSystemPrzelewTile_ = function (p) {
      rememberTransferMeta_(p);
      let html = originalRenderTile_(p);

      if (String(p && p.original_match_status || "").trim() === "NEW") {
        html = String(html).replace("NIEROZPOZNANY", "DO RĘCZNEGO ROZLICZENIA");
      }

      return html;
    };
  }

  function closeModal_() {
    const modal = document.getElementById("orgHubManualAllocationModalV3");
    if (modal) modal.remove();
  }

  function buildModal_() {
    closeModal_();

    const state = getState_();
    const modal = document.createElement("div");
    modal.id = "orgHubManualAllocationModalV3";
    modal.className = "modal";
    modal.style.zIndex = "10050";

    modal.innerHTML = `
      <div class="modal-card" style="width:min(560px,100%);max-height:92vh;overflow:auto;text-align:left;background:#171717;">
        <div style="font-size:20px;font-weight:900;margin-bottom:14px;">Ręczne rozliczenie przelewu</div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          <div>
            <div style="font-size:13px;opacity:.75;margin-bottom:4px;">Wiersz</div>
            <div style="padding:11px 12px;border:1px solid #3b3b3b;border-radius:12px;background:#191919;font-weight:800;">
              ${esc_(state.row)}
            </div>
          </div>

          <div>
            <div style="font-size:13px;opacity:.75;margin-bottom:4px;">Tytuł przelewu</div>
            <div style="padding:11px 12px;border:1px solid #3b3b3b;border-radius:12px;background:#191919;font-weight:800;word-break:break-word;">
              ${esc_(state.title || "—")}
            </div>
          </div>

          <div style="padding:12px;border:1px solid #6f5920;border-radius:12px;background:#2a2412;">
            <div style="font-size:13px;opacity:.8;">Kwota przelewu</div>
            <div id="orgHubAllocationTransferAmountV3" style="font-size:24px;font-weight:900;color:#ffd37a;margin-top:3px;">
              ${moneyText_(state.amount)}
            </div>
          </div>

          <div>
            <label for="orgHubAllocationPlayerV3" style="display:block;font-size:15px;font-weight:900;margin-bottom:6px;">Zawodnik</label>
            <select id="orgHubAllocationPlayerV3" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #444;background:#191919;color:#fff;">
              <option value="">— wybierz zawodnika —</option>
            </select>
            <div id="orgHubAllocationPlayerHintV3" style="font-size:12px;opacity:.75;margin-top:5px;min-height:16px;"></div>
          </div>
        </div>

        <div style="margin-top:16px;font-size:15px;font-weight:900;">Nieopłacone wymagalne płatności</div>
        <div id="orgHubAllocationDueItemsV3" style="margin-top:8px;">
          <div style="padding:12px;border:1px solid #333;border-radius:12px;background:#141414;opacity:.8;">
            ⏳ Ładowanie zawodników i płatności...
          </div>
        </div>

        <div id="orgHubAllocationSummaryV3" style="margin-top:14px;padding:12px;border:1px solid #444;border-radius:12px;background:#101010;line-height:1.55;">
          <div>Przypisano: <b id="orgHubAllocationAssignedV3">0,00 zł</b></div>
          <div>Pozostało: <b id="orgHubAllocationRemainingV3">${moneyText_(state.amount)}</b></div>
        </div>

        <div id="orgHubAllocationMsgV3" style="min-height:20px;margin-top:10px;font-size:13px;line-height:1.4;color:#ff9b9b;"></div>

        <div class="modal-actions" style="margin-top:14px;">
          <button id="orgHubAllocationSaveV3" class="full-btn" type="button" disabled
            style="width:100%;margin:0;opacity:.55;"
            onclick="orgHubSaveManualAllocationV3_()">
            Zatwierdź rozliczenie
          </button>
          <button class="full-btn alt" type="button" style="width:100%;margin:0;" onclick="adminCloseManualSystemPrzelew()">
            Anuluj
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function selectedPlayer_() {
    const state = getState_();
    const select = document.getElementById("orgHubAllocationPlayerV3");
    const number = String(select && select.value || state.selectedPlayerNo || "").trim();

    return (state.players || []).find(function (player) {
      return String(player && player.numer || "").trim() === number;
    }) || null;
  }

  function renderDueItems_() {
    const state = getState_();
    const player = selectedPlayer_();
    const box = document.getElementById("orgHubAllocationDueItemsV3");
    const hint = document.getElementById("orgHubAllocationPlayerHintV3");
    const msg = document.getElementById("orgHubAllocationMsgV3");

    if (!box) return;
    if (msg) msg.textContent = "";

    if (!player) {
      if (hint) hint.textContent = "";
      box.innerHTML = `
        <div style="padding:12px;border:1px solid #333;border-radius:12px;background:#141414;opacity:.8;">
          Wybierz zawodnika, aby wyświetlić należności.
        </div>
      `;
      updateSummary_();
      return;
    }

    state.selectedPlayerNo = String(player.numer || "").trim();
    const dueItems = Array.isArray(player.due_items) ? player.due_items : [];

    if (hint) {
      hint.textContent = "Numer systemowy: " + state.selectedPlayerNo +
        " • należności: " + dueItems.length +
        " • razem: " + moneyText_(player.due_total || 0);
    }

    if (!dueItems.length) {
      box.innerHTML = `
        <div style="padding:12px;border:1px solid #376f42;border-radius:12px;background:#123a1a;color:#9cffad;">
          Ten zawodnik nie ma nieopłaconych wymagalnych płatności.
        </div>
      `;
      updateSummary_();
      return;
    }

    box.innerHTML = dueItems.map(function (item, index) {
      const id = esc_(item.id || "");
      const label = esc_(item.label || "Płatność");
      const sourceSheet = esc_(item.sourceSheet || "Kartoteka");
      const sourceType = String(item.sourceType || "current");
      const outstanding = roundMoney_(item.outstandingAmount || 0);
      const partialAllowed = item.partialAllowed === true;
      const typeLabel = String(item.typ || "") === "skladka" ? "Składka" : "Zajęcia dodatkowe";
      const archive = sourceType === "archive";

      return `
        <div class="orgHubAllocationItemV3" data-index="${index}"
          style="margin-top:8px;padding:11px;border:1px solid #3b3b3b;border-radius:13px;background:#151515;">
          <label style="display:grid;grid-template-columns:30px minmax(0,1fr);gap:9px;align-items:start;cursor:pointer;">
            <input class="orgHubAllocationCheckV3" type="checkbox" data-id="${id}"
              onchange="orgHubAllocationToggleV3_(this)"
              style="width:22px;height:22px;margin:2px 0 0 0;">
            <span>
              <span style="display:block;font-size:15px;font-weight:900;">${esc_(typeLabel)} — ${label}</span>
              <span style="display:block;font-size:12px;opacity:.78;margin-top:3px;">${sourceSheet}</span>
              ${archive ? `<span style="display:block;font-size:11px;font-weight:900;color:#ffd37a;margin-top:3px;">ARCHIWUM</span>` : ""}
              <span style="display:block;font-size:13px;color:#ff9b9b;margin-top:5px;">Do zapłaty: ${moneyText_(outstanding)}</span>
            </span>
          </label>

          <div style="display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:10px;align-items:center;margin-top:10px;">
            <div style="font-size:12px;opacity:.75;">
              ${partialAllowed ? "Można przypisać całość lub część składki." : "Ta pozycja musi zostać rozliczona w całości."}
            </div>
            <input class="orgHubAllocationAmountV3" type="text" inputmode="decimal"
              data-id="${id}"
              data-outstanding="${outstanding}"
              data-partial="${partialAllowed ? "1" : "0"}"
              value=""
              disabled
              ${partialAllowed ? "" : "readonly"}
              oninput="orgHubAllocationAmountChangedV3_(this)"
              style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #444;background:#1d1d1d;color:#fff;text-align:right;font-weight:800;">
          </div>
        </div>
      `;
    }).join("");

    updateSummary_();
  }

  function readAmountInput_(input) {
    const raw = String(input && input.value || "")
      .replace(/\s/g, "")
      .replace(",", ".");
    return roundMoney_(raw);
  }

  function selectedAllocations_() {
    const rows = Array.from(document.querySelectorAll(".orgHubAllocationItemV3"));
    const allocations = [];
    let error = "";

    rows.forEach(function (row) {
      const check = row.querySelector(".orgHubAllocationCheckV3");
      const input = row.querySelector(".orgHubAllocationAmountV3");
      if (!check || !input || !check.checked) return;

      const amount = readAmountInput_(input);
      const outstanding = roundMoney_(input.dataset.outstanding || 0);
      const partialAllowed = input.dataset.partial === "1";

      if (!(amount > 0)) {
        error = error || "Każda zaznaczona płatność musi mieć kwotę większą od zera.";
        return;
      }
      if (amount - outstanding > MONEY_EPSILON) {
        error = error || "Przypisana kwota nie może przekraczać należności.";
        return;
      }
      if (!partialAllowed && !moneyEqual_(amount, outstanding)) {
        error = error || "Zajęcia dodatkowe muszą zostać rozliczone w całości.";
        return;
      }

      allocations.push({
        id: String(check.dataset.id || "").trim(),
        amount: amount
      });
    });

    return { allocations: allocations, error: error };
  }

  function updateSummary_() {
    const state = getState_();
    const data = selectedAllocations_();
    const assigned = roundMoney_(data.allocations.reduce(function (sum, item) {
      return sum + Number(item.amount || 0);
    }, 0));
    const remaining = roundMoney_(state.amount - assigned);

    const assignedEl = document.getElementById("orgHubAllocationAssignedV3");
    const remainingEl = document.getElementById("orgHubAllocationRemainingV3");
    const summary = document.getElementById("orgHubAllocationSummaryV3");
    const save = document.getElementById("orgHubAllocationSaveV3");
    const msg = document.getElementById("orgHubAllocationMsgV3");

    if (assignedEl) assignedEl.textContent = moneyText_(assigned);
    if (remainingEl) remainingEl.textContent = moneyText_(remaining);

    const valid = !data.error && data.allocations.length > 0 && moneyEqual_(assigned, state.amount);

    if (summary) {
      summary.style.borderColor = valid ? "#376f42" : (remaining < -MONEY_EPSILON ? "#8b0000" : "#444");
      summary.style.background = valid ? "#123a1a" : (remaining < -MONEY_EPSILON ? "#3a1414" : "#101010");
    }

    if (remainingEl) {
      remainingEl.style.color = valid ? "#8cff9f" : (remaining < -MONEY_EPSILON ? "#ff7c7c" : "#ffd37a");
    }

    if (save) {
      save.disabled = !valid;
      save.style.opacity = valid ? "1" : ".55";
    }

    if (msg) {
      msg.textContent = data.error || (remaining < -MONEY_EPSILON
        ? "❌ Przypisano więcej niż wynosi przelew."
        : "");
    }

    return { valid: valid, allocations: data.allocations, assigned: assigned, remaining: remaining };
  }

  window.orgHubAllocationToggleV3_ = function (checkbox) {
    const row = checkbox && checkbox.closest(".orgHubAllocationItemV3");
    const input = row && row.querySelector(".orgHubAllocationAmountV3");
    if (!input) return;

    const state = getState_();
    const current = selectedAllocations_();
    const alreadyAssigned = roundMoney_(current.allocations.reduce(function (sum, item) {
      return item.id === String(checkbox.dataset.id || "") ? sum : sum + Number(item.amount || 0);
    }, 0));
    const outstanding = roundMoney_(input.dataset.outstanding || 0);
    const partialAllowed = input.dataset.partial === "1";
    const available = roundMoney_(Math.max(0, state.amount - alreadyAssigned));

    if (checkbox.checked) {
      if (!partialAllowed && available + MONEY_EPSILON < outstanding) {
        checkbox.checked = false;
        const msg = document.getElementById("orgHubAllocationMsgV3");
        if (msg) msg.textContent = "❌ Brak wystarczającej kwoty przelewu, aby rozliczyć tę pozycję w całości.";
        updateSummary_();
        return;
      }

      input.disabled = false;
      input.value = String(partialAllowed ? Math.min(outstanding, available) : outstanding)
        .replace(".", ",");
    } else {
      input.value = "";
      input.disabled = true;
    }

    updateSummary_();
  };

  window.orgHubAllocationAmountChangedV3_ = function (input) {
    if (!input) return;

    const amount = readAmountInput_(input);
    const outstanding = roundMoney_(input.dataset.outstanding || 0);

    if (amount - outstanding > MONEY_EPSILON) {
      input.style.borderColor = "#ff2b2b";
    } else {
      input.style.borderColor = "#444";
    }

    updateSummary_();
  };

  async function loadPlayers_() {
    const state = getState_();
    const select = document.getElementById("orgHubAllocationPlayerV3");
    const box = document.getElementById("orgHubAllocationDueItemsV3");
    const msg = document.getElementById("orgHubAllocationMsgV3");

    try {
      const res = await apiClubPost({ action: "system_przelewy_players" });
      if (!res || res.success === false) {
        throw new Error(res && res.error ? res.error : "Nie udało się pobrać zawodników");
      }

      state.players = Array.isArray(res.items) ? res.items : [];

      if (select) {
        select.innerHTML = `<option value="">— wybierz zawodnika —</option>` +
          state.players.map(function (player) {
            const number = String(player.numer || "").trim();
            const name = String(player.name || "").trim();
            const dueCount = Number(player.due_count || 0);
            return `<option value="${esc_(number)}">#${esc_(number)} — ${esc_(name)}${dueCount ? ` (${dueCount})` : ""}</option>`;
          }).join("");

        if (state.suggestedPlayerNo) {
          select.value = state.suggestedPlayerNo;
        }

        select.onchange = function () {
          state.selectedPlayerNo = String(select.value || "").trim();
          renderDueItems_();
        };
      }

      renderDueItems_();
    } catch (err) {
      if (box) {
        box.innerHTML = `<div style="padding:12px;border:1px solid #8b0000;border-radius:12px;background:#3a1414;color:#ff9b9b;">❌ ${esc_(err && err.message ? err.message : err)}</div>`;
      }
      if (msg) msg.textContent = "";
    }
  }

  window.adminOpenManualSystemPrzelew = function (row, title, suggestedPlayerNo) {
    const rowNumber = Number(row || 0);
    const meta = transferMetaByRow[rowNumber] || {};
    const state = getState_();

    state.row = rowNumber;
    state.title = String(title || meta.title || "").trim();
    state.amount = roundMoney_(meta.amount || 0);
    state.currency = String(meta.currency || "PLN").trim() || "PLN";
    state.suggestedPlayerNo = String(suggestedPlayerNo || "").trim();
    state.selectedPlayerNo = state.suggestedPlayerNo;
    state.players = [];

    buildModal_();
    loadPlayers_();
  };

  window.adminCloseManualSystemPrzelew = function () {
    closeModal_();
  };

  window.orgHubSaveManualAllocationV3_ = async function () {
    const state = getState_();
    const select = document.getElementById("orgHubAllocationPlayerV3");
    const playerNo = String(select && select.value || "").trim();
    const msg = document.getElementById("orgHubAllocationMsgV3");
    const save = document.getElementById("orgHubAllocationSaveV3");
    const summary = updateSummary_();

    if (!playerNo) {
      if (msg) msg.textContent = "❌ Wybierz zawodnika.";
      return;
    }
    if (!summary.valid) {
      if (msg) msg.textContent = "❌ Suma przypisanych kwot musi być równa kwocie przelewu.";
      return;
    }

    try {
      if (save) {
        save.disabled = true;
        save.style.opacity = ".65";
        save.textContent = "⏳ Księguję...";
      }
      if (msg) msg.textContent = "";

      const res = await apiClubPost({
        action: "system_przelewy_confirm",
        sheet_row: state.row,
        player_no: playerNo,
        payment_kind: "ALLOCATE",
        period: JSON.stringify(summary.allocations)
      });

      if (!res || res.success === false) {
        throw new Error(res && res.error ? res.error : "Nie udało się rozliczyć przelewu");
      }

      closeModal_();

      if (typeof adminRemoveSystemPrzelewRow_ === "function") {
        adminRemoveSystemPrzelewRow_(state.row);
      } else if (typeof adminOpenSystemPrzelewy === "function") {
        await adminOpenSystemPrzelewy();
      }

      const listMsg = document.getElementById("adminSystemPrzelewyMsg");
      if (listMsg) {
        listMsg.textContent = "✅ Przelew " + moneyText_(state.amount) + " został rozliczony na " + summary.allocations.length + " płatności.";
      }
    } catch (err) {
      if (msg) msg.textContent = "❌ " + String(err && err.message ? err.message : err);
      if (save) {
        save.disabled = false;
        save.style.opacity = "1";
        save.textContent = "Zatwierdź rozliczenie";
      }
      updateSummary_();
    }
  };
})();
