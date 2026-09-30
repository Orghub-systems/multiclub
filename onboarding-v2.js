
(function () {
  if (window.__orghubOnboardingV2) return;
  window.__orghubOnboardingV2 = true;

  const TIP_KEY = "orghub_onboarding_tips_v2";
  const q = (id) => document.getElementById(id);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name) {
    const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const map = {
      users: '<svg '+common+'><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      school: '<svg '+common+'><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c2.5 2 7.5 2 10 0v-5"/><path d="M21 10v6"/></svg>',
      image: '<svg '+common+'><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
      edit: '<svg '+common+'><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
      palette: '<svg '+common+'><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0 0-14Z"/><circle cx="7.5" cy="10" r=".7"/><circle cx="9" cy="6.5" r=".7"/><circle cx="14" cy="6.5" r=".7"/><circle cx="17" cy="10" r=".7"/></svg>',
      mail: '<svg '+common+'><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
      calendar: '<svg '+common+'><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
      card: '<svg '+common+'><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
      user: '<svg '+common+'><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
      bank: '<svg '+common+'><path d="m3 10 9-6 9 6"/><path d="M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>',
      info: '<svg '+common+'><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
      shield: '<svg '+common+'><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
      cloud: '<svg '+common+'><path d="M17.5 19H7a5 5 0 0 1-.7-9.95A7 7 0 0 1 19.7 11 4 4 0 0 1 17.5 19Z"/></svg>',
      settings: '<svg '+common+'><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21H10v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
      chart: '<svg '+common+'><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>',
      bell: '<svg '+common+'><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
      rocket: '<svg '+common+'><path d="M4.5 16.5c-1.5 1.5-1.5 4-1.5 4s2.5 0 4-1.5"/><path d="M9 15 4 10l4-2 3 1"/><path d="m15 9 1 3 4 4 2-8-6-6-7 7 6 6Z"/><circle cx="17" cy="7" r="1"/></svg>'
    };
    return map[name] || map.info;
  }

  const TIPS = {
    orgType: {
      icon: "users",
      title: "Jaki typ organizacji tworzysz?",
      copy: "Wybierz klub sportowy albo szkołę. Dzięki temu ORG HUB dopasuje nazwy ekranów i sposób prezentacji organizacji.",
      tip: "To ustawienie nie wpływa na Twoje dane — określa głównie sposób, w jaki aplikacja będzie się komunikować z użytkownikami."
    },
    logo: {
      icon: "image",
      title: "Dodaj logo organizacji",
      copy: "Logo pojawi się na ekranie logowania i w panelach użytkowników. Najlepiej sprawdza się plik kwadratowy PNG lub JPG.",
      tip: "Dobre minimum to 512×512 px. Jeśli masz większy plik, ORG HUB sam przygotuje go do aplikacji."
    },
    name: {
      icon: "edit",
      title: "Podaj nazwę organizacji",
      copy: "To nazwa, którą zobaczą zawodnicy, trenerzy, uczniowie i administratorzy.",
      tip: "Wpisz oficjalną albo skróconą nazwę, której używacie na co dzień."
    },
    color: {
      icon: "palette",
      title: "Nadaj aplikacji własny charakter",
      copy: "Wybierz kolor przewodni. Podgląd po prawej od razu pokaże, jak będzie wyglądać aplikacja Twojej organizacji.",
      tip: "Najlepiej wybierz kolor klubowy lub kolor zgodny z identyfikacją szkoły."
    },
    email: {
      icon: "mail",
      title: "Adres kontaktowy",
      copy: "Na ten adres wyślemy informacje o aktywacji i link do gotowej aplikacji.",
      tip: "Może to być adres klubu, szkoły albo osoby odpowiedzialnej za uruchomienie systemu."
    },
    season: {
      icon: "calendar",
      title: "Ustaw ramy sezonu",
      copy: "Daty początku i końca określają miesiące, dla których ORG HUB przygotuje płatności, statystyki i rozliczenia.",
      tip: "Nie musisz trafić idealnie za pierwszym razem. Daty sezonu możesz później zmienić w panelu administratora."
    },
    payments: {
      icon: "card",
      title: "Ustal zasady płatności",
      copy: "Podaj miesięczne składki, cenę pojedynczych zajęć i ewentualny limit treningów w ramach składki.",
      tip: "Te wartości możesz później poprawiać. Teraz wystarczy konfiguracja startowa, żeby uruchomić klub."
    },
    admin: {
      icon: "user",
      title: "Utwórz główne konto administratora",
      copy: "To konto otrzyma pełny dostęp do zarządzania klubem lub szkołą po aktywacji.",
      tip: "Podaj działający e-mail. Hasło można później zmienić lub zresetować."
    },
    bank: {
      icon: "bank",
      title: "Dane do wpłat są opcjonalne na start",
      copy: "Numer konta i odbiorca są potrzebne do kodów QR oraz danych przelewu widocznych dla zawodników.",
      tip: "Nie znasz teraz numeru konta? Pomiń ten krok. Klub uruchomi się normalnie, a dane do wpłat uzupełnisz później w panelu administratora."
    }
  };

  function loadSeenTips() {
    try {
      return JSON.parse(sessionStorage.getItem(TIP_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveSeenTip(key) {
    try {
      const seen = loadSeenTips();
      seen[key] = true;
      sessionStorage.setItem(TIP_KEY, JSON.stringify(seen));
    } catch (e) {}
  }

  function brandHtml() {
    return '<div class="onb-brand"><div><strong>ORG</strong> <span>HUB</span><small>SYSTEMS</small></div></div>';
  }

  function phoneHtml(prefix, live) {
    const id = (name) => live ? ' id="' + prefix + name + '"' : "";
    return (
      '<div class="onb-phone">' +
        '<div class="onb-phone-screen">' +
          '<div class="onb-phone-hero"' + id("Hero") + '>' +
            '<div class="onb-phone-logo"' + id("Logo") + '>' +
              (live ? '<span>OH</span>' : '<span>OH</span>') +
            '</div>' +
            '<div class="onb-phone-name"' + id("Name") + '>Twój klub</div>' +
          '</div>' +
          '<div class="onb-phone-menu">' +
            '<div>' + icon("calendar") + '<span>Wydarzenia</span></div>' +
            '<div>' + icon("card") + '<span>Płatności</span></div>' +
            '<div>' + icon("chart") + '<span>Statystyki</span></div>' +
            '<div>' + icon("users") + '<span>Moja drużyna</span></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderLanding() {
    const view = q("orgHubLandingView");
    if (!view) return;

    view.innerHTML =
      '<div class="onb-page">' +
        '<div class="onb-topline">' + brandHtml() + '</div>' +
        '<section class="onb-hero">' +
          '<div class="onb-hero-copy">' +
            '<div class="onb-eyebrow">● 30 dni na sprawdzenie ORG HUB</div>' +
            '<h1 class="onb-title">Twórz silniejsze <span class="accent">kluby</span></h1>' +
            '<p class="onb-lead">Własna aplikacja klubu sportowego lub szkoły w kilka minut. Płatności, wydarzenia, statystyki i komunikacja w jednym miejscu.</p>' +
            '<div class="onb-benefits">' +
              '<div class="onb-benefit"><div class="onb-benefit-icon">' + icon("calendar") + '</div><strong>30 dni<br>bezpłatnie</strong></div>' +
              '<div class="onb-benefit"><div class="onb-benefit-icon">' + icon("cloud") + '</div><strong>Bez ręcznej<br>instalacji</strong></div>' +
              '<div class="onb-benefit"><div class="onb-benefit-icon">' + icon("settings") + '</div><strong>Ustawienia poprawisz później</strong></div>' +
            '</div>' +
            '<button class="onb-primary" type="button" onclick="goToConfig()">Utwórz swoją organizację &nbsp;→</button>' +
          '</div>' +
          '<div class="onb-phone-stage">' +
            '<div class="onb-phone-glow"></div>' +
            phoneHtml("landing", false) +
          '</div>' +
        '</section>' +
      '</div>';
  }

  function legacyConfigHtml() {
    return (
      '<div class="onb-legacy" aria-hidden="true">' +
        '<h1 id="cfgOrganizationTitle">Konfiguracja klubu</h1>' +
        '<button id="cfgOrgTypeSports" type="button" class="full-btn" onclick="setCfgOrganizationType_(\'sports_club\')">Klub sportowy</button>' +
        '<button id="cfgOrgTypeSchool" type="button" class="full-btn alt" onclick="setCfgOrganizationType_(\'school\')">Szkoła</button>' +
        '<button class="full-btn" onclick="pickLogo()">Wgraj swoje logo</button>' +
        '<img id="cfgLogoPreview" src="" alt="" style="display:none">' +
        '<input id="cfgLogoInput" type="file" accept="image/*" class="hidden">' +
        '<button class="full-btn alt" id="btnClubName" onclick="clubNameEditStart()"><span id="clubNameText">Podaj nazwę klubu</span><input id="clubNameInput" type="text" class="hidden"></button>' +
        '<div id="cfgClubNameLabel"></div>' +
        '<button class="full-btn alt" onclick="toggleColorPicker(true)">Wybierz kolor tła</button>' +
        '<div id="cfgColorLabel"></div>' +
        '<div id="cfgColorGrid" class="hidden"></div>' +
        '<button class="full-btn alt" id="btnEmail" onclick="emailEditStart()"><span id="emailText">Twój email</span><input id="emailInput" type="email" class="hidden"></button>' +
        '<div id="cfgEmailLabel"></div>' +
      '</div>'
    );
  }

  function tile(id, iconName, iconClass, label, value, helpKey, action) {
    return (
      '<div class="onb-tile" id="' + id + '" role="button" tabindex="0" onclick="' + action + '">' +
        '<div class="onb-tile-icon ' + (iconClass || "") + '">' + icon(iconName) + '</div>' +
        '<div class="onb-tile-copy">' +
          '<div class="onb-tile-label">' + esc(label) + '</div>' +
          '<div class="onb-tile-value warn" id="' + id + 'Value">' + esc(value) + '</div>' +
        '</div>' +
        '<span class="onb-help" role="button" aria-label="Podpowiedź" onclick="event.stopPropagation();onboardingShowTip_(\'' + helpKey + '\',null,true)">?</span>' +
        '<span class="onb-chevron">›</span>' +
      '</div>'
    );
  }

  function renderConfig() {
    const view = q("clubConfigView");
    if (!view) return;

    view.innerHTML =
      '<div class="onb-page">' +
        '<div class="onb-topline">' +
          brandHtml() +
          '<div class="onb-step"><div class="onb-step-label">Krok 1 z 2</div><div class="onb-step-track"><div class="onb-step-fill half"></div></div></div>' +
          '<button class="onb-close" type="button" onclick="goBackFromConfig()" aria-label="Zamknij">×</button>' +
        '</div>' +
        '<main class="onb-content">' +
          '<h1 class="onb-heading" id="onbConfigHeading">Zbuduj swoją aplikację</h1>' +
          '<p class="onb-subheading">Zacznij od podstawowych informacji. Podgląd od razu pokaże, jak Twoja organizacja będzie wyglądać w ORG HUB.</p>' +
          '<div class="onb-config-layout">' +
            '<div>' +
              '<div class="onb-stack">' +
                tile("onbOrgType","users","","Rodzaj organizacji","Klub sportowy","orgType","onboardingTileAction_(\'orgType\')") +
                tile("onbLogo","image","green","Logo organizacji","Dodaj logo","logo","onboardingTileAction_(\'logo\')") +
                tile("onbName","edit","purple","Nazwa organizacji","Nie ustawiono","name","onboardingTileAction_(\'name\')") +
                tile("onbColor","palette","gold","Kolor aplikacji","Nie ustawiono","color","onboardingTileAction_(\'color\')") +
                tile("onbEmail","mail","","E-mail kontaktowy","Nie ustawiono","email","onboardingTileAction_(\'email\')") +
              '</div>' +
              '<div class="onb-completion"><strong>Bez stresu.</strong> Na tym etapie budujesz wersję startową. Ustawienia organizacyjne można później dopracować.</div>' +
              '<button id="onbConfigSubmit" class="onb-primary" type="button" onclick="submitClubConfig()">Dalej &nbsp;→</button>' +
              '<button class="onb-secondary" type="button" onclick="goBackFromConfig()">← Powrót</button>' +
              '<div id="cfgMsg" class="onb-inline-status"></div>' +
            '</div>' +
            '<aside class="onb-mini-preview">' +
              '<div class="onb-mini-preview-title">Podgląd Twojej aplikacji</div>' +
              phoneHtml("onbPreview", true) +
            '</aside>' +
          '</div>' +
        '</main>' +
        legacyConfigHtml() +
      '</div>';

    const logoInput = q("cfgLogoInput");
    if (logoInput && !logoInput.dataset.onbBound) {
      logoInput.dataset.onbBound = "1";
      logoInput.addEventListener("change", function () {
        let tries = 0;
        const timer = setInterval(function () {
          tries += 1;
          onboardingSyncConfig_();
          if ((cfgDraft && cfgDraft.logoDataUrl) || tries > 12) clearInterval(timer);
        }, 120);
      });
    }
  }

  function legacySetupHtml() {
    return (
      '<div class="onb-legacy" aria-hidden="true">' +
        '<button id="btnSetupSeasonStart" type="button"><span id="setupSeasonStartText">Początek sezonu</span><input id="setupSeasonStartInput" type="date" class="hidden"></button>' +
        '<div id="setupSeasonStartLabel"></div>' +
        '<button id="btnSetupSeasonEnd" type="button"><span id="setupSeasonEndText">Koniec sezonu</span><input id="setupSeasonEndInput" type="date" class="hidden"></button>' +
        '<div id="setupSeasonEndLabel"></div>' +
        '<button id="btnSetupPayments" type="button" disabled onclick="openPaymentsPopup()">Płatności</button>' +
        '<button id="btnSetupAdminPass" type="button" disabled onclick="openAdminPassPopup()">Dane administratora</button>' +
        '<div id="setupAdminDataLabel"></div>' +
        '<button id="btnSetupBankData" type="button" disabled onclick="openBankDataPopup()">Dane do wpłat</button>' +
        '<div id="setupBankDataLabel"></div>' +
      '</div>'
    );
  }

  function renderSetup() {
    const view = q("clubSetupView");
    if (!view) return;

    view.innerHTML =
      '<div class="onb-page">' +
        '<div class="onb-topline">' +
          brandHtml() +
          '<div class="onb-step"><div class="onb-step-label">Krok 2 z 2</div><div class="onb-step-track"><div class="onb-step-fill full"></div></div></div>' +
          '<button class="onb-close" type="button" onclick="goBackFromSetup()" aria-label="Zamknij">×</button>' +
        '</div>' +
        '<main class="onb-content">' +
          '<h1 class="onb-heading" id="onbSetupHeading">Przygotuj klub do działania</h1>' +
          '<p class="onb-subheading">Ustaw sezon, płatności i konto administratora. Nie musisz znać wszystkich danych od razu.</p>' +
          '<div class="onb-info">' + icon("info") + '<div><strong>Nic Cię tu nie blokuje na zawsze.</strong><br>Daty sezonu, ustawienia płatności i dane do wpłat możesz później zmienić w panelu administratora.</div></div>' +
          '<div class="onb-stack">' +
            tile("onbSeason","calendar","","Sezon","Nie ustawiono","season","onboardingTileAction_(\'season\')") +
            tile("onbPayments","card","","Płatności","Ustaw składki i zajęcia dodatkowe","payments","onboardingTileAction_(\'payments\')") +
            tile("onbAdmin","user","red","Konto administratora","Utwórz dane logowania","admin","onboardingTileAction_(\'admin\')") +
            tile("onbBank","bank","purple","Dane do wpłat","Nie ustawiono (opcjonalne)","bank","onboardingTileAction_(\'bank\')") +
          '</div>' +
          '<div class="onb-info" style="margin-top:14px">' + icon("shield") + '<div><strong>Nie masz jeszcze numeru konta?</strong><br>Pomiń ten krok i uzupełnij dane później. Do tego czasu kody QR do przelewów nie będą dostępne.</div></div>' +
          '<button class="onb-primary green" id="btnSetupSubmit" type="button" onclick="submitSetupAndActivateClub()">Uruchom mój klub &nbsp;🚀</button>' +
          '<button class="onb-secondary" type="button" onclick="goBackFromSetup()">← Powrót</button>' +
          '<p id="setupMsg" class="onb-inline-status"></p>' +
          '<div id="setupErrorBox" class="hidden" style="margin-top:10px;padding:10px 12px;border:1px solid #963a46;border-radius:12px;background:#32151a;color:#ffb6bf;font-size:13px"></div>' +
        '</main>' +
        legacySetupHtml() +
      '</div>';
  }

  function mountOverlay(id, cls) {
    let overlay = q(id);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = cls + " hidden";
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeOverlay(id) {
    const overlay = q(id);
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.innerHTML = "";
  }

  let onboardingHistoryAfterClose_ = null;

  function onboardingPushModalHistory_(modalId) {
    const id = String(modalId || "").trim();
    if (!id) return;

    try {
      if (history.state && String(history.state.modal || "") === id) return;

      if (typeof pushAppModalHistoryState_ === "function") {
        pushAppModalHistoryState_(id);
        return;
      }

      const baseState =
        history.state && typeof history.state === "object"
          ? { ...history.state }
          : {};

      history.pushState(
        { ...baseState, modal: id },
        "",
        location.pathname + location.search
      );
    } catch (e) {
      console.warn("onboardingPushModalHistory_ error", e);
    }
  }

  function onboardingCloseHistoryModal_(modalId, afterClose) {
    const id = String(modalId || "").trim();

    try {
      if (history.state && String(history.state.modal || "") === id) {
        onboardingHistoryAfterClose_ =
          typeof afterClose === "function" ? afterClose : null;
        history.back();
        return;
      }
    } catch (e) {}

    closeOverlay(id);

    if (typeof afterClose === "function") {
      afterClose();
    }
  }

  window.onboardingCloseTip_ = function () {
    onboardingCloseHistoryModal_("onbTutorialOverlay");
  };

  window.onboardingCloseEditor_ = function () {
    onboardingCloseHistoryModal_("onbEditorOverlay");
  };

  window.onboardingShowTip_ = function (key, actionName, force) {
    const tip = TIPS[key];
    if (!tip) {
      if (actionName) onboardingRunAction_(actionName);
      return;
    }

    const seen = loadSeenTips();
    if (!force && seen[key]) {
      if (actionName) onboardingRunAction_(actionName);
      return;
    }

    const overlay = mountOverlay("onbTutorialOverlay", "onb-tutorial-overlay");
    overlay.classList.remove("hidden");
    onboardingPushModalHistory_("onbTutorialOverlay");
    overlay.onclick = function (event) {
      if (event.target === overlay) onboardingCloseTip_();
    };

    const actionAttr = actionName
      ? 'onclick="saveOnboardingTipAndRun_(\'' + key + '\',\'' + actionName + '\')"'
      : 'onclick="onboardingCloseTip_()"';

    overlay.innerHTML =
      '<div class="onb-tutorial-sheet" role="dialog" aria-modal="true">' +
        '<div class="onb-sheet-handle"></div>' +
        '<div class="onb-sheet-icon">' + icon(tip.icon) + '</div>' +
        '<h2 class="onb-sheet-title">' + esc(tip.title) + '</h2>' +
        '<p class="onb-sheet-copy">' + esc(tip.copy) + '</p>' +
        '<div class="onb-sheet-tip">' + esc(tip.tip) + '</div>' +
        '<div class="onb-sheet-actions ' + (actionName ? "" : "one") + '">' +
          (actionName ? '<button type="button" class="onb-sheet-secondary" onclick="onboardingCloseTip_()">Nie teraz</button>' : '') +
          '<button type="button" class="onb-sheet-primary" ' + actionAttr + '>' +
            (actionName ? 'Rozumiem — ustawiam' : 'Zamknij') +
          '</button>' +
        '</div>' +
      '</div>';
  };

  window.saveOnboardingTipAndRun_ = function (key, actionName) {
    saveSeenTip(key);

    onboardingCloseHistoryModal_(
      "onbTutorialOverlay",
      function () {
        onboardingRunAction_(actionName);
      }
    );
  };

  window.onboardingTileAction_ = function (key) {
    onboardingShowTip_(key, key, false);
  };

  window.onboardingRunAction_ = function (name) {
    if (name === "orgType") return openOrgTypeEditor();
    if (name === "logo") {
      if (typeof pickLogo === "function") pickLogo();
      return;
    }
    if (name === "name") return openTextEditor("name");
    if (name === "color") return openColorEditor();
    if (name === "email") return openTextEditor("email");
    if (name === "season") return openSeasonEditor();
    if (name === "payments") {
      if (!datesReady()) {
        setSetupStatus("Najpierw ustaw początek i koniec sezonu.");
        return;
      }
      if (typeof openPaymentsPopup === "function") openPaymentsPopup();
      return;
    }
    if (name === "admin") {
      if (!datesReady()) {
        setSetupStatus("Najpierw ustaw początek i koniec sezonu.");
        return;
      }
      if (typeof openAdminPassPopup === "function") openAdminPassPopup();
      return;
    }
    if (name === "bank") {
      if (!datesReady()) {
        setSetupStatus("Najpierw ustaw początek i koniec sezonu.");
        return;
      }
      if (typeof openBankDataPopup === "function") openBankDataPopup();
    }
  };

  function openEditor(content) {
    const overlay = mountOverlay("onbEditorOverlay", "onb-editor-overlay");
    overlay.classList.remove("hidden");
    onboardingPushModalHistory_("onbEditorOverlay");
    overlay.onclick = function (event) {
      if (event.target === overlay) onboardingCloseEditor_();
    };
    overlay.innerHTML =
      '<div class="onb-editor-sheet" role="dialog" aria-modal="true">' +
        '<div class="onb-sheet-handle"></div>' +
        content +
      '</div>';
  }

  function openOrgTypeEditor() {
    const current = normalizeOrganizationType_(cfgDraft?.organizationType || "sports_club");
    openEditor(
      '<div class="onb-sheet-icon">' + icon("users") + '</div>' +
      '<h2 class="onb-sheet-title">Rodzaj organizacji</h2>' +
      '<p class="onb-sheet-copy">Wybierz wariant, który najlepiej pasuje do Twojej organizacji.</p>' +
      '<div class="onb-type-grid">' +
        '<button type="button" class="onb-type-option ' + (current === "sports_club" ? "active" : "") + '" onclick="setCfgOrganizationType_(\'sports_club\');onboardingSyncConfig_();onboardingCloseEditor_()">' + icon("users") + '<strong>Klub sportowy</strong></button>' +
        '<button type="button" class="onb-type-option ' + (current === "school" ? "active" : "") + '" onclick="setCfgOrganizationType_(\'school\');onboardingSyncConfig_();onboardingCloseEditor_()">' + icon("school") + '<strong>Szkoła</strong></button>' +
      '</div>'
    );
  }

  function openTextEditor(kind) {
    const isName = kind === "name";
    const value = isName ? String(cfgDraft?.clubName || "") : String(cfgDraft?.email || "");
    const title = isName ? "Nazwa organizacji" : "E-mail kontaktowy";
    const placeholder = isName ? "Np. Warriors Sosnowiec" : "np. klub@twojadomena.pl";
    const inputType = isName ? "text" : "email";

    openEditor(
      '<div class="onb-sheet-icon">' + icon(isName ? "edit" : "mail") + '</div>' +
      '<h2 class="onb-sheet-title">' + title + '</h2>' +
      '<p class="onb-sheet-copy">' + (isName ? "Wpisz nazwę widoczną dla użytkowników aplikacji." : "Na ten adres wyślemy informacje o uruchomieniu organizacji.") + '</p>' +
      '<label class="onb-editor-label" for="onbEditorText">' + title + '</label>' +
      '<input id="onbEditorText" class="onb-editor-input" type="' + inputType + '" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '">' +
      '<div id="onbEditorError" class="onb-inline-status"></div>' +
      '<div class="onb-sheet-actions">' +
        '<button type="button" class="onb-sheet-secondary" onclick="onboardingCloseEditor_()">Anuluj</button>' +
        '<button type="button" class="onb-sheet-primary" onclick="onboardingSaveTextEditor_(\'' + kind + '\')">Zapisz</button>' +
      '</div>'
    );

    setTimeout(function () {
      const input = q("onbEditorText");
      if (input) input.focus();
    }, 50);
  }

  window.onboardingSaveTextEditor_ = function (kind) {
    const input = q("onbEditorText");
    const error = q("onbEditorError");
    const value = String(input?.value || "").trim();

    if (!value) {
      if (error) error.textContent = "Uzupełnij pole.";
      return;
    }

    if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      if (error) error.textContent = "Wpisz poprawny adres e-mail.";
      return;
    }

    if (kind === "name") cfgDraft.clubName = value;
    if (kind === "email") cfgDraft.email = value;

    if (typeof renderConfigUI_ === "function") renderConfigUI_();
    onboardingSyncConfig_();
    onboardingCloseEditor_();
  };

  function openColorEditor() {
    openEditor(
      '<div class="onb-sheet-icon">' + icon("palette") + '</div>' +
      '<h2 class="onb-sheet-title">Kolor aplikacji</h2>' +
      '<p class="onb-sheet-copy">Wybierz kolor przewodni. Zmiana jest widoczna od razu w podglądzie.</p>' +
      '<div id="onboardingColorWheel"></div>' +
      '<div class="onb-sheet-actions one"><button type="button" class="onb-sheet-primary" onclick="onboardingSyncConfig_();onboardingCloseEditor_()">Gotowe</button></div>'
    );

    const target = q("onboardingColorWheel");
    if (target && typeof createOrgHubColorWheel_ === "function") {
      createOrgHubColorWheel_(
        target,
        cfgDraft?.bgColor || "#147ED6",
        function (color) {
          const normalized = String(color || "").trim().toUpperCase();
          if (/^#[0-9A-F]{6}$/.test(normalized)) {
            cfgDraft.bgColor = normalized;
            onboardingSyncConfig_();
          }
        }
      );
    }
  }

  function openSeasonEditor() {
    openEditor(
      '<div class="onb-sheet-icon">' + icon("calendar") + '</div>' +
      '<h2 class="onb-sheet-title">Sezon</h2>' +
      '<p class="onb-sheet-copy">Ustaw początek i koniec sezonu. ORG HUB na tej podstawie przygotuje miesiące płatności i statystyk.</p>' +
      '<label class="onb-editor-label" for="onbSeasonStart">Początek sezonu</label>' +
      '<input id="onbSeasonStart" class="onb-editor-input" type="date" value="' + esc(setupDraft?.sezonStart || "") + '">' +
      '<label class="onb-editor-label" for="onbSeasonEnd">Koniec sezonu</label>' +
      '<input id="onbSeasonEnd" class="onb-editor-input" type="date" value="' + esc(setupDraft?.sezonEnd || "") + '">' +
      '<div id="onbEditorError" class="onb-inline-status"></div>' +
      '<div class="onb-sheet-actions">' +
        '<button type="button" class="onb-sheet-secondary" onclick="onboardingCloseEditor_()">Anuluj</button>' +
        '<button type="button" class="onb-sheet-primary" onclick="onboardingSaveSeason_()">Zapisz</button>' +
      '</div>'
    );
  }

  window.onboardingSaveSeason_ = function () {
    const start = String(q("onbSeasonStart")?.value || "").trim();
    const end = String(q("onbSeasonEnd")?.value || "").trim();
    const error = q("onbEditorError");

    if (!start || !end) {
      if (error) error.textContent = "Ustaw obie daty.";
      return;
    }

    if (end < start) {
      if (error) error.textContent = "Koniec sezonu nie może być przed początkiem.";
      return;
    }

    setupDraft.sezonStart = start;
    setupDraft.sezonEnd = end;

    if (typeof updateSetupPaymentsState_ === "function") updateSetupPaymentsState_();
    onboardingSyncSetup_();
    onboardingCloseEditor_();
  };

  function setTileValue(id, value, state) {
    const el = q(id + "Value");
    if (!el) return;
    el.textContent = value;
    el.classList.remove("ok", "warn", "optional");
    el.classList.add(state || "warn");
  }

  function datesReady() {
    const s = String(setupDraft?.sezonStart || "").trim();
    const e = String(setupDraft?.sezonEnd || "").trim();
    return !!s && !!e && s <= e;
  }

  function paymentsReady() {
    if (!datesReady()) return false;
    const months = Array.isArray(setupDraft?.months) ? setupDraft.months : [];
    const fees = setupDraft?.fees || {};
    if (!months.length) return false;

    const monthlyOk = months.every(function (m) {
      const key = typeof monthKey_ === "function" ? monthKey_(m) : String(m || "");
      return fees[key] !== undefined && fees[key] !== null && String(fees[key]).trim() !== "";
    });

    const single = String(setupDraft?.singleTrainingPrice ?? "").trim();
    const singleOk = setupDraft?.noSingleTraining === true || single !== "";
    return monthlyOk && singleOk;
  }

  function adminReady() {
    const pass = String(setupDraft?.adminPass || "").trim();
    const email = String(setupDraft?.adminEmail || "").trim();
    return pass.length >= 6 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function bankReady() {
    const receiver = String(setupDraft?.bankReceiver || "").trim();
    const account = String(setupDraft?.bankAccount || "").replace(/\s+/g, "");
    return !!receiver && /^\d{26}$/.test(account);
  }

  function setSetupStatus(text) {
    const msg = q("setupMsg");
    if (msg) msg.textContent = text || "";
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date(value + "T12:00:00"));
    } catch (e) {
      return value;
    }
  }

  window.onboardingSyncConfig_ = function () {
    const orgType = normalizeOrganizationType_(cfgDraft?.organizationType || "sports_club");
    const isSchool = orgType === "school";
    const name = String(cfgDraft?.clubName || "").trim();
    const email = String(cfgDraft?.email || "").trim();
    const color = String(cfgDraft?.bgColor || "").trim().toUpperCase();
    const logo = String(cfgDraft?.logoDataUrl || "").trim();

    setTileValue("onbOrgType", isSchool ? "Szkoła" : "Klub sportowy", "ok");
    setTileValue("onbLogo", logo ? "Logo dodane ✓" : "Dodaj logo", logo ? "ok" : "warn");
    setTileValue("onbName", name || "Nie ustawiono", name ? "ok" : "warn");

    const colorValue = q("onbColorValue");
    if (colorValue) {
      colorValue.innerHTML = /^#[0-9A-F]{6}$/.test(color)
        ? '<span class="onb-dot" style="background:' + esc(color) + '"></span>' + esc(color)
        : "Nie ustawiono";
      colorValue.classList.remove("ok", "warn");
      colorValue.classList.add(/^#[0-9A-F]{6}$/.test(color) ? "ok" : "warn");
    }

    setTileValue("onbEmail", email || "Nie ustawiono", email ? "ok" : "warn");

    const heading = q("onbConfigHeading");
    if (heading) heading.textContent = isSchool ? "Zbuduj aplikację swojej szkoły" : "Zbuduj swoją aplikację";

    const previewName = q("onbPreviewName");
    if (previewName) previewName.textContent = name || (isSchool ? "Twoja szkoła" : "Twój klub");

    const previewHero = q("onbPreviewHero");
    if (previewHero) {
      const safeColor = /^#[0-9A-F]{6}$/.test(color) ? color : "#0A568C";
      previewHero.style.background =
        "linear-gradient(180deg,rgba(5,12,20,.12),rgba(4,9,15,.84)),radial-gradient(circle at 50% 38%," +
        safeColor + "88,transparent 60%)," + safeColor;
    }

    const previewLogo = q("onbPreviewLogo");
    if (previewLogo) {
      previewLogo.innerHTML = logo
        ? '<img src="' + esc(logo) + '" alt="">'
        : '<span>' + (isSchool ? "S" : "OH") + '</span>';
    }

    const submit = q("onbConfigSubmit");
    if (submit && typeof validateCfg_ === "function") {
      submit.disabled = !!validateCfg_();
    }
  };

  window.onboardingSyncSetup_ = function () {
    const dateOk = datesReady();
    const paymentOk = paymentsReady();
    const adminOk = adminReady();
    const bankOk = bankReady();
    const start = String(setupDraft?.sezonStart || "");
    const end = String(setupDraft?.sezonEnd || "");

    setTileValue(
      "onbSeason",
      dateOk ? formatDate(start) + " – " + formatDate(end) : "Nie ustawiono",
      dateOk ? "ok" : "warn"
    );

    setTileValue(
      "onbPayments",
      paymentOk ? "Płatności ustawione ✓" : (dateOk ? "Ustaw składki i zajęcia dodatkowe" : "Najpierw ustaw sezon"),
      paymentOk ? "ok" : "warn"
    );

    setTileValue(
      "onbAdmin",
      adminOk ? String(setupDraft?.adminEmail || "Administrator gotowy") : (dateOk ? "Utwórz dane logowania" : "Najpierw ustaw sezon"),
      adminOk ? "ok" : "warn"
    );

    setTileValue(
      "onbBank",
      bankOk ? "Dane do wpłat ustawione ✓" : "Nie ustawiono (opcjonalne)",
      bankOk ? "ok" : "optional"
    );

    ["onbPayments", "onbAdmin", "onbBank"].forEach(function (id) {
      const el = q(id);
      if (el) el.classList.toggle("locked", !dateOk);
    });

    const submit = q("btnSetupSubmit");
    if (submit) {
      submit.disabled = !(dateOk && paymentOk && adminOk);
      const orgType = normalizeOrganizationType_(cfgDraft?.organizationType || "sports_club");
      submit.innerHTML = orgType === "school"
        ? "Uruchom moją szkołę &nbsp;🚀"
        : "Uruchom mój klub &nbsp;🚀";
    }

    const heading = q("onbSetupHeading");
    if (heading) {
      heading.textContent = normalizeOrganizationType_(cfgDraft?.organizationType || "sports_club") === "school"
        ? "Przygotuj szkołę do działania"
        : "Przygotuj klub do działania";
    }
  };

  window.onboardingSkipBankData_ = function () {
    setupDraft.bankReceiver = "";
    setupDraft.bankAccount = "";

    const receiver = q("bankReceiverInput");
    const account = q("bankAccountInput");
    const label = q("setupBankDataLabel");
    if (receiver) receiver.value = "";
    if (account) account.value = "";
    if (label) label.textContent = "";

    if (typeof closeBankDataPopup === "function") closeBankDataPopup();
    if (typeof refreshSetupSubmitState_ === "function") refreshSetupSubmitState_();
    onboardingSyncSetup_();
    setSetupStatus("Dane do wpłat pominięte. Uzupełnisz je później w panelu administratora.");
  };

  function enhanceBankPopup() {
    const popup = q("bankDataPopup");
    if (!popup || popup.dataset.onbV2) return;
    popup.dataset.onbV2 = "1";

    const card = popup.querySelector(".popup-card");
    if (!card) return;

    const loginBox = card.querySelector(".login-box");
    if (loginBox) {
      const note = document.createElement("div");
      note.className = "onb-bank-note";
      note.innerHTML = "<strong>Nie masz teraz danych?</strong><br>Możesz pominąć ten krok i uzupełnić konto później. Do tego czasu kody QR do przelewów pozostaną wyłączone.";
      loginBox.insertAdjacentElement("afterend", note);
    }

    const actions = card.querySelector("div[style*='margin-top:12px']");
    if (actions && !q("onbSkipBankBtn")) {
      const skip = document.createElement("button");
      skip.id = "onbSkipBankBtn";
      skip.type = "button";
      skip.className = "onb-bank-skip";
      skip.textContent = "Pomiń na razie";
      skip.onclick = onboardingSkipBankData_;
      actions.appendChild(skip);
    }
  }


  function setGlobalFunction_(name, fn) {
    window[name] = fn;

    try {
      if (name === "openAdminPassPopup") openAdminPassPopup = fn;
      if (name === "closeAdminPassPopup") closeAdminPassPopup = fn;
      if (name === "openBankDataPopup") openBankDataPopup = fn;
      if (name === "closeBankDataPopup") closeBankDataPopup = fn;
    } catch (e) {}
  }

  function wrapSetupPopupHistory_(openName, closeName, modalId) {
    const originalOpen = window[openName];
    const originalClose = window[closeName];

    if (
      typeof originalOpen !== "function" ||
      typeof originalClose !== "function" ||
      originalOpen.__onbHistoryWrapped
    ) {
      return;
    }

    const wrappedOpen = function () {
      const result = originalOpen.apply(this, arguments);

      requestAnimationFrame(function () {
        const popup = q(modalId);
        if (!popup) return;

        const visible =
          !popup.classList.contains("hidden") &&
          getComputedStyle(popup).display !== "none";

        if (visible) {
          onboardingPushModalHistory_(modalId);
        }
      });

      return result;
    };

    const wrappedClose = function () {
      try {
        if (
          history.state &&
          String(history.state.modal || "") === modalId
        ) {
          history.back();
          return;
        }
      } catch (e) {}

      return originalClose.apply(this, arguments);
    };

    wrappedOpen.__onbHistoryWrapped = true;
    wrappedClose.__onbHistoryWrapped = true;

    setGlobalFunction_(openName, wrappedOpen);
    setGlobalFunction_(closeName, wrappedClose);
  }

  function hideSetupPopupDirect_(modalId) {
    const popup = q(modalId);
    if (!popup) return;

    if (modalId === "adminPassPopup") {
      popup.classList.add("hidden");
      const msg = q("adminPassMsg");
      if (msg) msg.textContent = "";
      return;
    }

    if (modalId === "bankDataPopup") {
      popup.style.display = "none";
      const msg = q("bankDataPopupMsg");
      if (msg) msg.textContent = "";
      return;
    }
  }

  window.addEventListener("popstate", function (event) {
    const modal = String(event.state?.modal || "");

    if (modal !== "onbTutorialOverlay") {
      closeOverlay("onbTutorialOverlay");
    }

    if (modal !== "onbEditorOverlay") {
      closeOverlay("onbEditorOverlay");
    }

    if (modal !== "adminPassPopup") {
      hideSetupPopupDirect_("adminPassPopup");
    }

    if (modal !== "bankDataPopup") {
      hideSetupPopupDirect_("bankDataPopup");
    }

    if (onboardingHistoryAfterClose_) {
      const callback = onboardingHistoryAfterClose_;
      onboardingHistoryAfterClose_ = null;
      setTimeout(callback, 0);
    }
  });

  function wrapFunction(name, after, isAsync) {
    const original = window[name];
    if (typeof original !== "function" || original.__onbV2Wrapped) return;

    const wrapped = isAsync
      ? async function () {
          const result = await original.apply(this, arguments);
          try { after(); } catch (e) {}
          return result;
        }
      : function () {
          const result = original.apply(this, arguments);
          try { after(); } catch (e) {}
          return result;
        };

    wrapped.__onbV2Wrapped = true;
    window[name] = wrapped;

    try {
      if (name === "goToView") goToView = wrapped;
      if (name === "goToConfig") goToConfig = wrapped;
      if (name === "setCfgOrganizationType_") setCfgOrganizationType_ = wrapped;
      if (name === "renderConfigUI_") renderConfigUI_ = wrapped;
      if (name === "setBgColor") setBgColor = wrapped;
      if (name === "applyPaymentsPopup") applyPaymentsPopup = wrapped;
      if (name === "saveAdminPass") saveAdminPass = wrapped;
      if (name === "saveBankDataPopup") saveBankDataPopup = wrapped;
    } catch (e) {}
  }

  renderLanding();
  renderConfig();
  renderSetup();
  enhanceBankPopup();

  wrapSetupPopupHistory_(
    "openAdminPassPopup",
    "closeAdminPassPopup",
    "adminPassPopup"
  );

  wrapSetupPopupHistory_(
    "openBankDataPopup",
    "closeBankDataPopup",
    "bankDataPopup"
  );

  wrapFunction("goToConfig", function () {
    requestAnimationFrame(onboardingSyncConfig_);
  }, false);

  wrapFunction("renderConfigUI_", function () {
    requestAnimationFrame(onboardingSyncConfig_);
  }, false);

  wrapFunction("setCfgOrganizationType_", onboardingSyncConfig_, false);
  wrapFunction("setBgColor", onboardingSyncConfig_, false);
  wrapFunction("applyPaymentsPopup", onboardingSyncSetup_, false);
  wrapFunction("saveAdminPass", onboardingSyncSetup_, true);
  wrapFunction("saveBankDataPopup", onboardingSyncSetup_, false);

  const originalGoToView = window.goToView;
  if (typeof originalGoToView === "function" && !originalGoToView.__onbViewHook) {
    const wrappedGoToView = function (viewId) {
      const result = originalGoToView.apply(this, arguments);
      if (viewId === "clubConfigView") requestAnimationFrame(onboardingSyncConfig_);
      if (viewId === "clubSetupView") requestAnimationFrame(onboardingSyncSetup_);
      return result;
    };
    wrappedGoToView.__onbViewHook = true;
    window.goToView = wrappedGoToView;
    try { goToView = wrappedGoToView; } catch (e) {}
  }

  requestAnimationFrame(function () {
    onboardingSyncConfig_();
    onboardingSyncSetup_();
  });
})();
