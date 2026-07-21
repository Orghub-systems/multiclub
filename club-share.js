/* ORG HUB — udostępnianie linku klubu i kodu QR w panelu administratora */
(function installAdminClubShare_() {
  "use strict";

  if (window.__orgHubAdminClubShareV1) return;
  window.__orgHubAdminClubShareV1 = true;

  const QR_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
  const LONG_PRESS_MS = 650;

  const state = {
    qrPromise: null,
    shareFile: null,
    shareUrl: "",
    clubName: "",
    pressTimer: null,
    pressReady: false,
    pressStartedAt: 0,
    pointerId: null,
    startX: 0,
    startY: 0
  };

  function readClubId_() {
    const candidates = [
      window.clubId,
      typeof clubId !== "undefined" ? clubId : "",
      localStorage.getItem("orghub_clubId")
    ];

    for (const candidate of candidates) {
      const value = String(candidate || "").trim();
      if (value) return value;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      return String(params.get("clubId") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function readClubName_() {
    try {
      if (typeof loadTheme_ === "function") {
        const theme = loadTheme_();
        const name = String(theme && theme.clubName || "").trim();
        if (name) return name;
      }
    } catch (e) {}

    try {
      const savedTheme = JSON.parse(localStorage.getItem("orghub_theme") || "null");
      const name = String(savedTheme && savedTheme.clubName || "").trim();
      if (name) return name;
    } catch (e) {}

    try {
      const savedConfig = JSON.parse(localStorage.getItem("orghub.clubConfig.v1") || "null");
      const name = String(
        savedConfig && (savedConfig.clubName || savedConfig.name) || ""
      ).trim();
      if (name) return name;
    } catch (e) {}

    const clubIdValue = readClubId_();
    return clubIdValue
      ? clubIdValue.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase()
      : "Twój klub";
  }

  function buildClubUrl_() {
    const cid = readClubId_();
    if (!cid) return "";

    try {
      const url = new URL(window.location.href);
      url.hash = "";
      url.search = "";
      url.searchParams.set("clubId", cid);
      return url.toString();
    } catch (e) {
      return window.location.origin + "/?clubId=" + encodeURIComponent(cid);
    }
  }

  function showToast_(message, type) {
    const old = document.getElementById("orgHubClubShareToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "orgHubClubShareToast";
    toast.setAttribute("role", "status");
    toast.textContent = String(message || "");
    toast.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:28px",
      "transform:translateX(-50%)",
      "z-index:100000",
      "max-width:min(360px,calc(100vw - 32px))",
      "box-sizing:border-box",
      "padding:12px 16px",
      "border-radius:14px",
      "font-size:14px",
      "font-weight:900",
      "line-height:1.35",
      "text-align:center",
      "color:#fff",
      "background:" + (type === "error" ? "#7a1010" : "#14652b"),
      "border:1px solid rgba(255,255,255,.28)",
      "box-shadow:0 14px 45px rgba(0,0,0,.55)"
    ].join(";");

    document.body.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 2600);
  }

  async function copyText_(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) throw new Error("Nie udało się skopiować linku");
  }

  async function copyClubLink_() {
    const url = buildClubUrl_();
    if (!url) {
      showToast_("Nie udało się ustalić linku klubu.", "error");
      return;
    }

    try {
      await copyText_(url);
      showToast_("Link skopiowany do schowka.");
    } catch (e) {
      showToast_("Nie udało się skopiować linku.", "error");
    }
  }

  function ensureStyles_() {
    if (document.getElementById("orgHubClubShareStyles")) return;

    const style = document.createElement("style");
    style.id = "orgHubClubShareStyles";
    style.textContent = `
      #orgHubClubShareSection {
        border-top: 1px solid rgba(255,255,255,.12);
        margin-top: 4px;
        padding-top: 14px;
      }

      #orgHubClubShareQrWrap {
        width: min(250px, 100%);
        margin: 12px auto 0 auto;
        padding: 10px;
        box-sizing: border-box;
        border-radius: 18px;
        background: #fff;
        border: 1px solid rgba(255,255,255,.28);
        box-shadow: 0 10px 30px rgba(0,0,0,.32);
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        touch-action: pan-y;
        transition: transform .14s ease, box-shadow .14s ease;
      }

      #orgHubClubShareQrWrap.org-hub-holding {
        transform: scale(.965);
        box-shadow: 0 0 0 4px rgba(255,255,255,.28), 0 10px 30px rgba(0,0,0,.32);
      }

      #orgHubClubShareQrCanvas {
        display: block;
        width: 100%;
        height: auto;
        background: #fff;
        border-radius: 10px;
        pointer-events: none;
      }

      #orgHubClubShareQrStatus {
        min-height: 18px;
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.35;
        opacity: .72;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureQrLibrary_() {
    if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
      return Promise.resolve(window.QRCode);
    }

    if (state.qrPromise) return state.qrPromise;

    state.qrPromise = new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-org-hub-qrcode="1"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.QRCode); }, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = QR_LIBRARY_URL;
      script.async = true;
      script.dataset.orgHubQrcode = "1";
      script.onload = function () {
        if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
          resolve(window.QRCode);
        } else {
          reject(new Error("Biblioteka QR nie została uruchomiona"));
        }
      };
      script.onerror = function () {
        reject(new Error("Nie udało się pobrać biblioteki QR"));
      };
      document.head.appendChild(script);
    });

    return state.qrPromise;
  }

  function canvasToBlob_(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("Nie udało się utworzyć obrazu QR"));
      }, "image/png", 1);
    });
  }

  function fitText_(ctx, text, maxWidth, initialSize, minSize) {
    let size = initialSize;
    do {
      ctx.font = "900 " + size + "px Arial, sans-serif";
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size >= minSize);
    return minSize;
  }

  async function buildShareFile_(qrCanvas, clubName, url) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Brak obsługi obrazu");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const title = String(clubName || "Twój klub").trim();
    const titleSize = fitText_(ctx, title, 900, 76, 44);
    ctx.font = "900 " + titleSize + "px Arial, sans-serif";
    ctx.fillText(title, 540, 118);

    ctx.font = "700 34px Arial, sans-serif";
    ctx.fillStyle = "#444444";
    ctx.fillText("Zeskanuj kod i otwórz aplikację klubu", 540, 198);

    const qrSize = 790;
    const qrX = Math.round((canvas.width - qrSize) / 2);
    const qrY = 275;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = "#111111";
    ctx.font = "900 38px Arial, sans-serif";
    ctx.fillText("ORG HUB", 540, 1135);

    ctx.fillStyle = "#555555";
    ctx.font = "500 25px Arial, sans-serif";
    const visibleUrl = String(url || "").replace(/^https?:\/\//i, "");
    const shortUrl = visibleUrl.length > 68 ? visibleUrl.slice(0, 65) + "…" : visibleUrl;
    ctx.fillText(shortUrl, 540, 1192);

    const blob = await canvasToBlob_(canvas);
    const safeName = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "klub";

    return new File([blob], "kod-qr-" + safeName + ".png", { type: "image/png" });
  }

  async function renderQr_() {
    const canvas = document.getElementById("orgHubClubShareQrCanvas");
    const status = document.getElementById("orgHubClubShareQrStatus");
    if (!canvas) return;

    const url = buildClubUrl_();
    const clubName = readClubName_();
    state.shareFile = null;
    state.shareUrl = url;
    state.clubName = clubName;

    if (!url) {
      if (status) status.textContent = "Nie udało się ustalić linku klubu.";
      return;
    }

    if (status) status.textContent = "Generuję kod QR…";

    try {
      const QRCode = await ensureQrLibrary_();
      await QRCode.toCanvas(canvas, url, {
        width: 760,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });

      state.shareFile = await buildShareFile_(canvas, clubName, url);
      if (status) status.textContent = "Kod QR jest gotowy do udostępnienia.";
    } catch (e) {
      console.error("ORG HUB QR error:", e);
      if (status) status.textContent = "Nie udało się wygenerować kodu QR.";
    }
  }

  function downloadShareFile_(file) {
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name || "kod-qr-klubu.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1500);
  }

  async function shareQr_() {
    const file = state.shareFile;
    const url = state.shareUrl || buildClubUrl_();
    const clubName = state.clubName || readClubName_();

    if (!file) {
      showToast_("Kod QR jeszcze się przygotowuje. Przytrzymaj ponownie za chwilę.", "error");
      return;
    }

    try {
      const canShareFile =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({
          title: clubName,
          text: "Kod QR do aplikacji klubu " + clubName,
          files: [file]
        });
        return;
      }

      if (typeof navigator.share === "function") {
        await navigator.share({
          title: clubName,
          text: "Link do aplikacji klubu " + clubName,
          url: url
        });
        return;
      }

      downloadShareFile_(file);
      showToast_("Kod QR zapisany jako obraz.");
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.error("ORG HUB share error:", e);
      showToast_("Nie udało się otworzyć udostępniania.", "error");
    }
  }

  function clearLongPress_(wrap) {
    if (state.pressTimer) {
      clearTimeout(state.pressTimer);
      state.pressTimer = null;
    }
    state.pressReady = false;
    state.pressStartedAt = 0;
    state.pointerId = null;
    if (wrap) wrap.classList.remove("org-hub-holding");
  }

  function bindLongPress_(wrap) {
    if (!wrap || wrap.dataset.longPressBound === "1") return;
    wrap.dataset.longPressBound = "1";

    wrap.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });

    wrap.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      clearLongPress_(wrap);
      state.pointerId = event.pointerId;
      state.pressStartedAt = Date.now();
      state.startX = Number(event.clientX || 0);
      state.startY = Number(event.clientY || 0);
      wrap.classList.add("org-hub-holding");

      try { wrap.setPointerCapture(event.pointerId); } catch (e) {}

      state.pressTimer = window.setTimeout(function () {
        state.pressReady = true;
        if (navigator.vibrate) navigator.vibrate(35);
      }, LONG_PRESS_MS);
    });

    wrap.addEventListener("pointermove", function (event) {
      if (state.pointerId !== event.pointerId) return;
      const movedX = Math.abs(Number(event.clientX || 0) - state.startX);
      const movedY = Math.abs(Number(event.clientY || 0) - state.startY);
      if (movedX > 16 || movedY > 16) clearLongPress_(wrap);
    });

    wrap.addEventListener("pointerup", function (event) {
      if (state.pointerId !== event.pointerId) return;

      const heldLongEnough =
        state.pressReady ||
        (state.pressStartedAt && Date.now() - state.pressStartedAt >= LONG_PRESS_MS);

      if (state.pressTimer) clearTimeout(state.pressTimer);
      state.pressTimer = null;
      wrap.classList.remove("org-hub-holding");
      state.pointerId = null;
      state.pressStartedAt = 0;
      state.pressReady = false;

      if (heldLongEnough) {
        event.preventDefault();
        shareQr_();
      }
    });

    ["pointercancel", "lostpointercapture"].forEach(function (eventName) {
      wrap.addEventListener(eventName, function () {
        clearLongPress_(wrap);
      });
    });
  }

  function renderSection_() {
    ensureStyles_();

    const view = document.getElementById("adminClubSeasonSettingsView");
    if (!view) return;

    const card = view.querySelector(".card");
    if (!card) return;

    let section = document.getElementById("orgHubClubShareSection");
    if (!section) {
      section = document.createElement("div");
      section.id = "orgHubClubShareSection";
      section.innerHTML = `
        <button id="orgHubCopyClubLinkBtn" class="full-btn" type="button"></button>

        <div style="text-align:left;opacity:.75;font-size:12px;line-height:1.4;margin:6px 0 16px 0;">
          Naciśnij klawisz, aby skopiować link swojego klubu.
        </div>

        <div id="orgHubClubShareQrWrap" role="button" tabindex="0"
          aria-label="Naciśnij i przytrzymaj kod QR, aby go udostępnić">
          <canvas id="orgHubClubShareQrCanvas" width="760" height="760"></canvas>
        </div>

        <div id="orgHubClubShareQrStatus"></div>

        <div style="text-align:left;opacity:.75;font-size:12px;line-height:1.4;margin:6px 0 16px 0;">
          Naciśnij i przytrzymaj kod QR, aby wysłać screen.
        </div>
      `;

      const backButton = Array.from(card.querySelectorAll("button")).find(function (button) {
        return /wróć/i.test(String(button.textContent || ""));
      });

      if (backButton) card.insertBefore(section, backButton);
      else card.appendChild(section);
    }

    const clubName = readClubName_();
    const copyButton = document.getElementById("orgHubCopyClubLinkBtn");
    if (copyButton) {
      copyButton.textContent = clubName;
      copyButton.setAttribute("aria-label", "Skopiuj link klubu " + clubName);
      copyButton.onclick = copyClubLink_;
    }

    const wrap = document.getElementById("orgHubClubShareQrWrap");
    bindLongPress_(wrap);

    renderQr_();
  }

  function hookAdminSettingsOpen_() {
    const original = window.adminOpenClubSeasonSettingsView;
    if (typeof original !== "function" || original.__orgHubClubShareWrapped) return;

    function wrappedAdminOpenClubSeasonSettingsView_() {
      const result = original.apply(this, arguments);
      window.setTimeout(renderSection_, 0);
      return result;
    }

    wrappedAdminOpenClubSeasonSettingsView_.__orgHubClubShareWrapped = true;
    window.adminOpenClubSeasonSettingsView = wrappedAdminOpenClubSeasonSettingsView_;
  }

  hookAdminSettingsOpen_();
  renderSection_();
})();
