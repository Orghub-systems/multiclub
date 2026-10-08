(function () {
  "use strict";

  const ADMIN_VIEW_ID = "adminAssistantView";
  const ADMIN_TILE_ID = "adminAssistantTile";
  const PLAYER_VIEW_ID = "playerAssistantView";
  const PLAYER_TILE_ID = "playerAssistantTile";

  const ADMIN_SUGGESTIONS = [
    "Kto zalega z płatnościami?",
    "Kto ma najniższą frekwencję?",
    "Kto nie odpowiedział na powołanie?",
    "Pokaż podsumowanie tego miesiąca"
  ];

  const PLAYER_SUGGESTIONS = [
    "Kto ma najwięcej obecności w tym sezonie?",
    "Na którym jestem miejscu?",
    "Porównaj mnie z Arturem",
    "Kto był najwięcej razy w tym miesiącu?",
    "Kiedy mam najbliższy trening?",
    "Czy mam jakieś powołanie bez odpowiedzi?"
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

  function role_() {
    return String(session_()?.role || "").trim().toLowerCase();
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
    return role_() === "admin";
  }

  function isPlayer_() {
    return role_() === "zawodnik" || role_() === "player";
  }

  function profileConfig_(profile) {
    if (profile === "player") {
      return {
        viewId: PLAYER_VIEW_ID,
        tileId: PLAYER_TILE_ID,
        prefix: "playerAssistant",
        panelId: "playerMenuView",
        title: "Asystent zawodnika",
        subtitle: "wersja testowa · sport i wydarzenia",
        intro: "Zapytaj o statystyki sportowe zawodników, ranking obecności, swoje miejsce, porównania, wydarzenia i powołania.",
        note: "Płatności i dane finansowe są prywatne i nie są dostępne dla Asystenta zawodnika.",
        placeholder: "Np. Na którym jestem miejscu?",
        suggestions: PLAYER_SUGGESTIONS
      };
    }

    return {
      viewId: ADMIN_VIEW_ID,
      tileId: ADMIN_TILE_ID,
      prefix: "adminAssistant",
      panelId: "adminPanelView",
      title: "Asystent ORG HUB",
      subtitle: "wersja testowa · tylko odczyt",
      intro: "Zapytaj o dane klubu normalnym językiem. Asystent na tym etapie niczego nie zmienia i nie wysyła — tylko analizuje dane.",
      note: "Asystent korzysta wyłącznie z danych klubu dostępnych dla zalogowanego administratora.",
      placeholder: "Np. Kto zalega z płatnościami?",
      suggestions: ADMIN_SUGGESTIONS
    };
  }

  function addStyles_() {
    if (document.getElementById("orghubAssistantStyles")) return;
    const style = document.createElement("style");
    style.id = "orghubAssistantStyles";
    style.textContent = `
      .orghub-assistant-view{
        margin-top:0!important;
        min-height:100dvh;
        box-sizing:border-box;
        padding:max(18px,env(safe-area-inset-top)) 14px 40px;
        background:transparent;
        color:#fff;
      }
      .orghub-assistant-view .ai-wrap{width:min(620px,100%);margin:0 auto;text-align:left}
      .orghub-assistant-view .ai-top{display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:center;gap:8px;margin-bottom:14px}
      .orghub-assistant-view .ai-back{width:42px;height:42px;border-radius:12px;background:#171717;border:1px solid rgba(255,255,255,.14);color:#fff;font-size:23px;font-weight:900;padding:0}
      .orghub-assistant-view .ai-title{text-align:center;font-size:20px;font-weight:900;line-height:1.1}
      .orghub-assistant-view .ai-title small{display:block;font-size:11px;font-weight:700;opacity:.72;margin-top:4px}
      .orghub-assistant-view .ai-card{background:#111;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;margin:10px 0;box-shadow:0 10px 28px rgba(0,0,0,.16)}
      .orghub-assistant-view .ai-intro{font-size:13px;line-height:1.45;opacity:.9}
      .orghub-assistant-view .ai-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .orghub-assistant-view .ai-chip{border:1px solid rgba(255,255,255,.17);background:#242424;color:#fff;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer}
      .orghub-assistant-view .ai-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      .orghub-assistant-view .ai-input{width:100%;min-height:46px;max-height:130px;resize:vertical;box-sizing:border-box;border-radius:12px;border:1px solid #555;background:#0b0b0b;color:#fff;padding:12px;font:inherit;font-size:14px;line-height:1.35}
      .orghub-assistant-view .ai-send{height:46px;min-width:86px;border-radius:12px;background:#f2cf39;color:#111;border:none;font-weight:900;padding:0 14px}
      .orghub-assistant-view .ai-send[disabled]{opacity:.6;background:#777!important;color:#ddd}
      .orghub-assistant-view .ai-status{font-size:12px;opacity:.75;margin-top:8px;min-height:17px}
      .orghub-assistant-view .ai-answer-title{font-size:16px;font-weight:900;margin-bottom:6px}
      .orghub-assistant-view .ai-answer-text{font-size:14px;line-height:1.45}
      .orghub-assistant-view .ai-list{display:flex;flex-direction:column;gap:7px;margin-top:12px}
      .orghub-assistant-view .ai-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#202020;border-radius:10px;padding:10px 11px}
      .orghub-assistant-view .ai-row-primary{font-size:13px;font-weight:900}
      .orghub-assistant-view .ai-row-secondary{font-size:10px;opacity:.68;margin-top:2px}
      .orghub-assistant-view .ai-row-value{font-size:12px;font-weight:900;text-align:right;white-space:nowrap}
      .orghub-assistant-view .ai-error{border-color:#e04848;background:#2a1111}
      .orghub-assistant-view .ai-note{font-size:10px;opacity:.62;margin-top:12px;text-align:center}
      @media(max-width:430px){
        .orghub-assistant-view .ai-form{grid-template-columns:1fr}
        .orghub-assistant-view .ai-send{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function syncBackground_(profile) {
    const cfg = profileConfig_(profile);
    const view = document.getElementById(cfg.viewId);
    const panel = document.getElementById(cfg.panelId);
    if (!view || !panel) return;
    const style = getComputedStyle(panel);
    view.style.backgroundColor = style.backgroundColor;
    view.style.backgroundImage = style.backgroundImage;
    view.style.backgroundSize = style.backgroundSize;
    view.style.backgroundPosition = style.backgroundPosition;
    view.style.backgroundRepeat = style.backgroundRepeat;
  }

  function makeView_(profile) {
    const cfg = profileConfig_(profile);
    if (document.getElementById(cfg.viewId)) return;

    const view = document.createElement("div");
    view.id = cfg.viewId;
    view.className = "container hidden orghub-assistant-view";
    view.innerHTML = `
      <div class="ai-wrap">
        <div class="ai-top">
          <button type="button" class="ai-back" id="${cfg.prefix}Back" aria-label="Powrót">‹</button>
          <div class="ai-title">${cfg.title}<small>${cfg.subtitle}</small></div>
          <div></div>
        </div>

        <div class="ai-card">
          <div class="ai-intro">${cfg.intro}</div>
          <div class="ai-suggestions" id="${cfg.prefix}Suggestions"></div>
        </div>

        <div class="ai-card">
          <form class="ai-form" id="${cfg.prefix}Form">
            <textarea class="ai-input" id="${cfg.prefix}Input" rows="2" maxlength="500" placeholder="${cfg.placeholder}"></textarea>
            <button class="ai-send" id="${cfg.prefix}Send" type="submit">Zapytaj</button>
          </form>
          <div class="ai-status" id="${cfg.prefix}Status"></div>
        </div>

        <div id="${cfg.prefix}Result"></div>
        <div class="ai-note">${cfg.note}</div>
      </div>
    `;
    document.body.appendChild(view);

    const suggestions = view.querySelector(`#${cfg.prefix}Suggestions`);
    cfg.suggestions.forEach(function (text) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-chip";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        const input = document.getElementById(`${cfg.prefix}Input`);
        if (input) input.value = text;
        ask_(profile, text);
      });
      suggestions.appendChild(btn);
    });

    view.querySelector(`#${cfg.prefix}Back`)?.addEventListener("click", function () {
      if (typeof window.appBack === "function") {
        window.appBack();
      } else if (typeof window.goToView === "function") {
        window.goToView(cfg.panelId);
      }
    });

    view.querySelector(`#${cfg.prefix}Form`)?.addEventListener("submit", function (event) {
      event.preventDefault();
      const value = String(document.getElementById(`${cfg.prefix}Input`)?.value || "").trim();
      if (value) ask_(profile, value);
    });
  }

  function makeTile_(profile, reference, parent, insertBefore) {
    const cfg = profileConfig_(profile);
    if (!reference || !parent || document.getElementById(cfg.tileId)) return;

    const tile = document.createElement("button");
    tile.id = cfg.tileId;
    tile.type = "button";
    tile.className = reference.className || "hub-tile";
    tile.innerHTML = `
      <div class="hub-tile-top">
        <div class="hub-tile-icon">✦</div>
        <div class="hub-tile-arrow">›</div>
      </div>
      <div>
        <div class="hub-tile-title">Asystent AI</div>
        <div class="hub-tile-meta">${profile === "player" ? "Statystyki i wydarzenia" : "Zapytaj o dane klubu"}</div>
      </div>
    `;
    tile.addEventListener("click", function () { open_(profile); });

    if (insertBefore) parent.insertBefore(tile, insertBefore);
    else parent.appendChild(tile);
  }

  function injectAdminTile_() {
    if (!isAdmin_() || document.getElementById(ADMIN_TILE_ID)) return;

    const panel = document.getElementById("adminPanelView");
    if (!panel) return;

    const extraTitle = Array.from(panel.querySelectorAll(".hub-tile-title"))
      .find(function (el) { return String(el.textContent || "").trim() === "Funkcje dodatkowe"; });
    const reference = extraTitle?.closest("button");
    const parent = reference?.parentElement;
    if (!reference || !parent) return;

    makeTile_("admin", reference, parent, reference);
  }

  function injectPlayerTile_() {
    if (!isPlayer_() || document.getElementById(PLAYER_TILE_ID)) return;

    const panel = document.getElementById("playerMenuView");
    if (!panel) return;

    const notificationsTitle = Array.from(panel.querySelectorAll(".hub-tile-title"))
      .find(function (el) { return String(el.textContent || "").trim() === "Powiadomienia"; });
    const reference = notificationsTitle?.closest("button") || panel.querySelector(".hub-tile");
    const parent = reference?.parentElement || panel.querySelector(".hub-tile-grid");
    if (!reference || !parent) return;

    makeTile_("player", reference, parent, notificationsTitle?.closest("button") || null);
  }

  function resetView_(profile) {
    const cfg = profileConfig_(profile);
    const result = document.getElementById(`${cfg.prefix}Result`);
    const status = document.getElementById(`${cfg.prefix}Status`);
    const input = document.getElementById(`${cfg.prefix}Input`);
    const button = document.getElementById(`${cfg.prefix}Send`);

    if (result) result.innerHTML = "";
    if (status) status.textContent = "";
    if (input) input.value = "";
    if (button) {
      button.disabled = false;
      button.textContent = "Zapytaj";
    }
  }

  function open_(profile) {
    const cfg = profileConfig_(profile);
    makeView_(profile);
    resetView_(profile);
    syncBackground_(profile);
    if (typeof window.goToView === "function") {
      window.goToView(cfg.viewId);
    } else {
      document.querySelectorAll(".container").forEach(function (el) { el.classList.add("hidden"); });
      document.getElementById(cfg.viewId)?.classList.remove("hidden");
    }
  }

  function setBusy_(profile, busy) {
    const cfg = profileConfig_(profile);
    const button = document.getElementById(`${cfg.prefix}Send`);
    const status = document.getElementById(`${cfg.prefix}Status`);
    if (button) {
      button.disabled = Boolean(busy);
      button.textContent = busy ? "Analizuję…" : "Zapytaj";
    }
    if (status) {
      status.textContent = busy
        ? (profile === "player" ? "Sprawdzam statystyki i wydarzenia…" : "Sprawdzam dane klubu…")
        : "";
    }
  }

  function renderAnswer_(profile, data) {
    const cfg = profileConfig_(profile);
    const root = document.getElementById(`${cfg.prefix}Result`);
    if (!root) return;
    root.innerHTML = "";

    const answer = data?.answer || {};
    const card = document.createElement("div");
    card.className = "ai-card";

    const title = document.createElement("div");
    title.className = "ai-answer-title";
    title.textContent = answer.title || cfg.title;
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

  function renderError_(profile, message) {
    const cfg = profileConfig_(profile);
    const root = document.getElementById(`${cfg.prefix}Result`);
    if (!root) return;
    root.innerHTML = "";
    const card = document.createElement("div");
    card.className = "ai-card ai-error";
    card.textContent = message || "Nie udało się pobrać odpowiedzi Asystenta.";
    root.appendChild(card);
  }

  async function ask_(profile, question) {
    const token = token_();
    const club = clubId_();
    if (!token || !club) {
      renderError_(profile, "Brak aktywnej sesji klubu. Zaloguj się ponownie.");
      return;
    }

    const cfg = profileConfig_(profile);
    const input = document.getElementById(`${cfg.prefix}Input`);
    if (input) input.value = question;

    setBusy_(profile, true);
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

      renderAnswer_(profile, data);
    } catch (error) {
      console.warn("[ORG HUB Assistant]", error);
      renderError_(profile, String(error?.message || "Nie udało się połączyć z Asystentem."));
    } finally {
      setBusy_(profile, false);
    }
  }

  function injectTiles_() {
    injectAdminTile_();
    injectPlayerTile_();
  }

  function hookNavigation_() {
    if (typeof window.goToView !== "function" || window.goToView.__orghubAssistantHooked) return;

    const originalGoToView = window.goToView;
    const wrappedGoToView = function (viewId) {
      const result = originalGoToView.apply(this, arguments);
      if (viewId === "playerMenuView" || viewId === "adminPanelView") {
        setTimeout(injectTiles_, 0);
      }
      return result;
    };

    wrappedGoToView.__orghubAssistantHooked = true;
    if (originalGoToView.__usageTrackingHooked) wrappedGoToView.__usageTrackingHooked = true;
    if (originalGoToView.__hubDashboardV1) wrappedGoToView.__hubDashboardV1 = true;
    if (originalGoToView.__orghubInstallHooked) wrappedGoToView.__orghubInstallHooked = true;
    window.goToView = wrappedGoToView;
  }

  function init_() {
    addStyles_();
    makeView_("admin");
    makeView_("player");
    hookNavigation_();
    injectTiles_();

    let attempts = 0;
    const timer = setInterval(function () {
      attempts += 1;
      hookNavigation_();
      injectTiles_();
      const role = role_();
      const ready =
        (role === "admin" && document.getElementById(ADMIN_TILE_ID)) ||
        ((role === "zawodnik" || role === "player") && document.getElementById(PLAYER_TILE_ID));
      if (ready || attempts > 30) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_, { once: true });
  } else {
    init_();
  }
})();
