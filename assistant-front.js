(function () {
  "use strict";

  const VIEW_ID = "adminAssistantView";
  const TILE_ID = "adminAssistantTile";

  const SUGGESTIONS = [
    "Kto zalega z płatnościami?",
    "Kto ma najniższą frekwencję?",
    "Kto nie odpowiedział na powołanie?",
    "Pokaż podsumowanie tego miesiąca"
  ];

  function session_() {
    try {
      if (typeof loadAppSession_ === "function") return loadAppSession_();
    } catch (e) {}

    try {
      const raw = localStorage.getItem("orghub_app_session_v1");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clubId_() {
    const sess = session_();
    try {
      return String(sess?.clubId || (typeof clubId !== "undefined" ? clubId : "") || "").trim().toLowerCase();
    } catch (e) {
      return String(sess?.clubId || "").trim().toLowerCase();
    }
  }

  function token_() {
    return String(session_()?.sessionToken || "").trim();
  }

  function coreUrl_() {
    try {
      if (typeof CORE_URL !== "undefined" && CORE_URL) return String(CORE_URL).replace(/\/$/, "");
    } catch (e) {}
    return window.location.hostname === "orghub-dev.orghubsystems.workers.dev"
      ? "https://orghub-dev.orghubsystems.workers.dev"
      : "https://orghubmulticlub.orghubsystems.workers.dev";
  }

  function isAdmin_() {
    return String(session_()?.role || "").trim().toLowerCase() === "admin";
  }

  function addStyles_() {
    if (document.getElementById("orghubAssistantStyles")) return;
    const style = document.createElement("style");
    style.id = "orghubAssistantStyles";
    style.textContent = `
      #${VIEW_ID}{
        margin-top:0!important;
        min-height:100dvh;
        box-sizing:border-box;
        padding:max(18px,env(safe-area-inset-top)) 14px 40px;
        background:transparent;
        color:#fff;
      }
      #${VIEW_ID} .ai-wrap{width:min(620px,100%);margin:0 auto;text-align:left}
      #${VIEW_ID} .ai-top{display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:center;gap:8px;margin-bottom:14px}
      #${VIEW_ID} .ai-back{width:42px;height:42px;border-radius:12px;background:#171717;border:1px solid rgba(255,255,255,.14);color:#fff;font-size:23px;font-weight:900;padding:0}
      #${VIEW_ID} .ai-title{text-align:center;font-size:20px;font-weight:900;line-height:1.1}
      #${VIEW_ID} .ai-title small{display:block;font-size:11px;font-weight:700;opacity:.72;margin-top:4px}
      #${VIEW_ID} .ai-card{background:#111;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;margin:10px 0;box-shadow:0 10px 28px rgba(0,0,0,.16)}
      #${VIEW_ID} .ai-intro{font-size:13px;line-height:1.45;opacity:.9}
      #${VIEW_ID} .ai-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      #${VIEW_ID} .ai-chip{border:1px solid rgba(255,255,255,.17);background:#242424;color:#fff;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer}
      #${VIEW_ID} .ai-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      #${VIEW_ID} .ai-input{width:100%;min-height:46px;max-height:130px;resize:vertical;box-sizing:border-box;border-radius:12px;border:1px solid #555;background:#0b0b0b;color:#fff;padding:12px;font:inherit;font-size:14px;line-height:1.35}
      #${VIEW_ID} .ai-send{height:46px;min-width:86px;border-radius:12px;background:#f2cf39;color:#111;border:none;font-weight:900;padding:0 14px}
      #${VIEW_ID} .ai-send[disabled]{opacity:.6;background:#777!important;color:#ddd}
      #${VIEW_ID} .ai-status{font-size:12px;opacity:.75;margin-top:8px;min-height:17px}
      #${VIEW_ID} .ai-answer-title{font-size:16px;font-weight:900;margin-bottom:6px}
      #${VIEW_ID} .ai-answer-text{font-size:14px;line-height:1.45}
      #${VIEW_ID} .ai-list{display:flex;flex-direction:column;gap:7px;margin-top:12px}
      #${VIEW_ID} .ai-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#202020;border-radius:10px;padding:10px 11px}
      #${VIEW_ID} .ai-row-primary{font-size:13px;font-weight:900}
      #${VIEW_ID} .ai-row-secondary{font-size:10px;opacity:.68;margin-top:2px}
      #${VIEW_ID} .ai-row-value{font-size:12px;font-weight:900;text-align:right;white-space:nowrap}
      #${VIEW_ID} .ai-error{border-color:#e04848;background:#2a1111}
      #${VIEW_ID} .ai-note{font-size:10px;opacity:.62;margin-top:12px;text-align:center}
      @media(max-width:430px){
        #${VIEW_ID} .ai-form{grid-template-columns:1fr}
        #${VIEW_ID} .ai-send{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function syncBackground_() {
    const view = document.getElementById(VIEW_ID);
    const panel = document.getElementById("adminPanelView");
    if (!view || !panel) return;
    const style = getComputedStyle(panel);
    view.style.backgroundColor = style.backgroundColor;
    view.style.backgroundImage = style.backgroundImage;
    view.style.backgroundSize = style.backgroundSize;
    view.style.backgroundPosition = style.backgroundPosition;
    view.style.backgroundRepeat = style.backgroundRepeat;
  }

  function makeView_() {
    if (document.getElementById(VIEW_ID)) return;

    const view = document.createElement("div");
    view.id = VIEW_ID;
    view.className = "container hidden";
    view.innerHTML = `
      <div class="ai-wrap">
        <div class="ai-top">
          <button type="button" class="ai-back" id="adminAssistantBack" aria-label="Powrót">‹</button>
          <div class="ai-title">Asystent ORG HUB<small>wersja testowa · tylko odczyt</small></div>
          <div></div>
        </div>

        <div class="ai-card">
          <div class="ai-intro">
            Zapytaj o dane klubu normalnym językiem. Asystent na tym etapie niczego nie zmienia i nie wysyła — tylko analizuje dane.
          </div>
          <div class="ai-suggestions" id="adminAssistantSuggestions"></div>
        </div>

        <div class="ai-card">
          <form class="ai-form" id="adminAssistantForm">
            <textarea class="ai-input" id="adminAssistantInput" rows="2" maxlength="500" placeholder="Np. Kto zalega z płatnościami?"></textarea>
            <button class="ai-send" id="adminAssistantSend" type="submit">Zapytaj</button>
          </form>
          <div class="ai-status" id="adminAssistantStatus"></div>
        </div>

        <div id="adminAssistantResult"></div>
        <div class="ai-note">Asystent korzysta wyłącznie z danych klubu dostępnych dla zalogowanego administratora.</div>
      </div>
    `;
    document.body.appendChild(view);

    const suggestions = view.querySelector("#adminAssistantSuggestions");
    SUGGESTIONS.forEach(function (text) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-chip";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        const input = document.getElementById("adminAssistantInput");
        if (input) input.value = text;
        ask_(text);
      });
      suggestions.appendChild(btn);
    });

    view.querySelector("#adminAssistantBack")?.addEventListener("click", function () {
      if (typeof window.goToView === "function") window.goToView("adminPanelView");
    });

    view.querySelector("#adminAssistantForm")?.addEventListener("submit", function (event) {
      event.preventDefault();
      const value = String(document.getElementById("adminAssistantInput")?.value || "").trim();
      if (value) ask_(value);
    });
  }

  function injectTile_() {
    if (!isAdmin_() || document.getElementById(TILE_ID)) return;

    const panel = document.getElementById("adminPanelView");
    if (!panel) return;

    const extraTitle = Array.from(panel.querySelectorAll(".hub-tile-title"))
      .find(function (el) { return String(el.textContent || "").trim() === "Funkcje dodatkowe"; });
    const reference = extraTitle?.closest("button");
    const parent = reference?.parentElement;
    if (!reference || !parent) return;

    const tile = document.createElement("button");
    tile.id = TILE_ID;
    tile.type = "button";
    tile.className = reference.className || "hub-tile";
    tile.innerHTML = `
      <div class="hub-tile-top">
        <div class="hub-tile-icon">✦</div>
        <div class="hub-tile-arrow">›</div>
      </div>
      <div>
        <div class="hub-tile-title">Asystent AI</div>
        <div class="hub-tile-meta">Zapytaj o dane klubu</div>
      </div>
    `;
    tile.addEventListener("click", open_);
    parent.insertBefore(tile, reference);
  }

  function resetView_() {
    const result = document.getElementById("adminAssistantResult");
    const status = document.getElementById("adminAssistantStatus");
    const input = document.getElementById("adminAssistantInput");
    const button = document.getElementById("adminAssistantSend");

    if (result) result.innerHTML = "";
    if (status) status.textContent = "";
    if (input) input.value = "";
    if (button) {
      button.disabled = false;
      button.textContent = "Zapytaj";
    }
  }

  function open_() {
    makeView_();
    resetView_();
    syncBackground_();
    if (typeof window.goToView === "function") {
      window.goToView(VIEW_ID);
    } else {
      document.querySelectorAll(".container").forEach(function (el) { el.classList.add("hidden"); });
      document.getElementById(VIEW_ID)?.classList.remove("hidden");
    }
  }

  function setBusy_(busy) {
    const button = document.getElementById("adminAssistantSend");
    const status = document.getElementById("adminAssistantStatus");
    if (button) {
      button.disabled = Boolean(busy);
      button.textContent = busy ? "Analizuję…" : "Zapytaj";
    }
    if (status) status.textContent = busy ? "Sprawdzam dane klubu…" : "";
  }

  function renderAnswer_(data) {
    const root = document.getElementById("adminAssistantResult");
    if (!root) return;
    root.innerHTML = "";

    const answer = data?.answer || {};
    const card = document.createElement("div");
    card.className = "ai-card";

    const title = document.createElement("div");
    title.className = "ai-answer-title";
    title.textContent = answer.title || "Asystent ORG HUB";
    card.appendChild(title);

    const text = document.createElement("div");
    text.className = "ai-answer-text";
    text.textContent = answer.text || "Brak odpowiedzi.";
    card.appendChild(text);

    if (Array.isArray(answer.items) && answer.items.length) {
      const list = document.createElement("div");
      list.className = "ai-list";
      answer.items.slice(0, 30).forEach(function (item) {
        const row = document.createElement("div");
        row.className = "ai-row";

        const left = document.createElement("div");
        const primary = document.createElement("div");
        primary.className = "ai-row-primary";
        primary.textContent = item.primary || "";
        left.appendChild(primary);

        if (item.secondary) {
          const secondary = document.createElement("div");
          secondary.className = "ai-row-secondary";
          secondary.textContent = item.secondary;
          left.appendChild(secondary);
        }

        const value = document.createElement("div");
        value.className = "ai-row-value";
        value.textContent = item.value || "";

        row.appendChild(left);
        row.appendChild(value);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    root.appendChild(card);
  }

  function renderError_(message) {
    const root = document.getElementById("adminAssistantResult");
    if (!root) return;
    root.innerHTML = "";
    const card = document.createElement("div");
    card.className = "ai-card ai-error";
    card.textContent = message || "Nie udało się pobrać odpowiedzi Asystenta.";
    root.appendChild(card);
  }

  async function ask_(question) {
    const token = token_();
    const club = clubId_();
    if (!token || !club) {
      renderError_("Brak aktywnej sesji klubu. Zaloguj się ponownie.");
      return;
    }

    const input = document.getElementById("adminAssistantInput");
    if (input) input.value = question;

    setBusy_(true);
    try {
      const endpoint = new URL(coreUrl_() + "/api/assistant/query");
      endpoint.searchParams.set("clubId", club);

      const response = await fetch(endpoint.toString(), {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: question }),
        cache: "no-store"
      });

      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (e) {}

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || `Błąd HTTP ${response.status}`);
      }

      renderAnswer_(data);
    } catch (error) {
      console.warn("[ORG HUB Assistant]", error);
      renderError_(String(error?.message || "Nie udało się połączyć z Asystentem."));
    } finally {
      setBusy_(false);
    }
  }

  function init_() {
    addStyles_();
    makeView_();
    injectTile_();

    let attempts = 0;
    const timer = setInterval(function () {
      attempts += 1;
      injectTile_();
      if (document.getElementById(TILE_ID) || attempts > 30) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_, { once: true });
  } else {
    init_();
  }
})();
