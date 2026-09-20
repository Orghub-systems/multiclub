(function () {
  "use strict";

  var VERSION = "club-background-ui-v29";
  var CACHE_PREFIX = "orghub_club_background_v1:";
  var DEFAULT_OVERLAY = 58;
  var DEFAULT_POSITION = "center";
  var MAX_INPUT = 15 * 1024 * 1024;
  var MAX_OUTPUT = 3 * 1024 * 1024;

  function clean(v) {
    return String(v == null ? "" : v).trim();
  }

  function clubKey() {
    var direct = clean(window.clubId).toLowerCase();
    if (direct) return direct;
    try {
      if (typeof window.getClubIdFromUrl_ === "function") {
        var byFn = clean(window.getClubIdFromUrl_()).toLowerCase();
        if (byFn) return byFn;
      }
    } catch (e) {}
    try {
      return clean(new URL(window.location.href).searchParams.get("clubId")).toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function cacheKey() {
    var key = clubKey();
    return key ? CACHE_PREFIX + key : "";
  }

  function overlay(v) {
    var n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(80, Math.round(n))) : DEFAULT_OVERLAY;
  }

  function position(v) {
    var p = clean(v).toLowerCase();
    return ["top", "center", "bottom"].indexOf(p) >= 0 ? p : DEFAULT_POSITION;
  }

  function hasBgFields(o) {
    if (!o || typeof o !== "object") return false;
    return [
      "backgroundImageUrl", "background_image_url",
      "backgroundOverlay", "background_overlay",
      "backgroundPosition", "background_position"
    ].some(function (k) {
      return Object.prototype.hasOwnProperty.call(o, k);
    });
  }

  function norm(o) {
    o = o && typeof o === "object" ? o : {};
    return {
      backgroundImageUrl: clean(
        o.backgroundImageUrl != null ? o.backgroundImageUrl : o.background_image_url
      ),
      backgroundOverlay: overlay(
        o.backgroundOverlay != null ? o.backgroundOverlay : o.background_overlay
      ),
      backgroundPosition: position(
        o.backgroundPosition != null ? o.backgroundPosition : o.background_position
      )
    };
  }

  function fromPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    var list = [payload.theme, payload.settings, payload.branding, payload];
    for (var i = 0; i < list.length; i += 1) {
      if (hasBgFields(list[i])) return norm(list[i]);
    }
    return null;
  }

  function loadCache() {
    var key = cacheKey();
    if (!key) return norm({});
    try {
      return norm(JSON.parse(localStorage.getItem(key) || "{}"));
    } catch (e) {
      return norm({});
    }
  }

  function saveCache(bg) {
    var key = cacheKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(norm(bg)));
    } catch (e) {}
  }

  function applyBg(bg) {
    bg = norm(bg);
    if (!document.body) return;

    if (!bg.backgroundImageUrl) {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundAttachment = "";
      return;
    }

    var u = bg.backgroundImageUrl
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/[\r\n]/g, "");

    var a = bg.backgroundOverlay / 100;
    document.body.style.backgroundImage =
      "linear-gradient(rgba(0,0,0," + a + "),rgba(0,0,0," + a + ")),url(\"" + u + "\")";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center " + bg.backgroundPosition;
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.minHeight = "100vh";
  }

  function syncPayload(payload) {
    var bg = fromPayload(payload);
    if (!bg) return;
    saveCache(bg);
    applyBg(bg);
  }

  function installApiHook() {
    var original = window.apiClubGet;
    if (typeof original !== "function" || original.__clubBgV29) return;

    var wrapped = async function (action) {
      var result = await original.apply(this, arguments);
      if (
        action === "branding" ||
        action === "brandingBoot" ||
        action === "adminGetClubSeasonSettings"
      ) {
        syncPayload(result);
        if (action === "adminGetClubSeasonSettings") {
          window.__clubBgLastAdminSettings =
            result && result.settings && typeof result.settings === "object"
              ? result.settings
              : {};
        }
      }
      return result;
    };

    wrapped.__clubBgV29 = true;
    window.apiClubGet = wrapped;
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function draft() {
    return window.__adminClubBackgroundDraft || null;
  }

  function changed() {
    var d = draft();
    if (!d) return false;
    return d.imageChanged === true ||
      overlay(d.overlay) !== overlay(d.originalOverlay) ||
      position(d.position) !== position(d.originalPosition);
  }

  function syncSave() {
    var b = document.getElementById("adminVisualBackgroundSaveBtn");
    var d = draft();
    if (b && d) b.disabled = !changed() || d.busy === true;
  }

  function syncPreview(src) {
    var d = draft();
    if (!d) return;

    var img = document.getElementById("adminVisualBackgroundPreviewImage");
    var empty = document.getElementById("adminVisualBackgroundPreviewEmpty");
    var shade = document.getElementById("adminVisualBackgroundPreviewOverlay");
    var value = document.getElementById("adminVisualBackgroundOverlayValue");
    var url = clean(src || d.imageData || d.currentUrl);

    if (img) {
      img.style.display = url ? "block" : "none";
      if (url) img.src = url;
      img.style.objectPosition = "center " + position(d.position);
    }
    if (empty) empty.style.display = url ? "none" : "flex";
    if (shade) shade.style.background = "rgba(0,0,0," + (overlay(d.overlay) / 100) + ")";
    if (value) value.textContent = overlay(d.overlay) + "%";

    document.querySelectorAll("[data-admin-background-position]").forEach(function (btn) {
      var selected = clean(btn.dataset.adminBackgroundPosition) === position(d.position);
      btn.style.border = selected ? "2px solid #fff" : "1px solid rgba(255,255,255,.22)";
      btn.style.opacity = selected ? "1" : ".72";
    });
  }

  function setStatus(text, error) {
    var el = document.getElementById("adminVisualBackgroundStatus");
    if (!el) return;
    el.textContent = clean(text);
    el.style.color = error ? "#ff8a8a" : "";
    el.style.opacity = text ? ".9" : "0";
  }

  function renderCard(settings) {
    var body = document.getElementById("adminClubVisualSettingsBody");
    if (!body) return;

    var old = document.getElementById("adminClubBackgroundCard");
    if (old) old.remove();

    var bg = norm(settings || {});
    window.__adminClubBackgroundDraft = {
      currentUrl: bg.backgroundImageUrl,
      imageData: "",
      imageChanged: false,
      overlay: bg.backgroundOverlay,
      originalOverlay: bg.backgroundOverlay,
      position: bg.backgroundPosition,
      originalPosition: bg.backgroundPosition,
      busy: false
    };

    var url = esc(bg.backgroundImageUrl);
    var html =
      '<div id="adminClubBackgroundCard" class="card" style="max-width:320px;margin:12px auto;padding:16px;">' +
        '<div style="font-weight:900;font-size:16px;margin-bottom:6px;">Zdjęcie w tle aplikacji</div>' +
        '<div style="text-align:left;opacity:.76;font-size:12px;line-height:1.45;margin-bottom:12px;">' +
          'Jedno tło dla całego klubu. Jest widoczne na wszystkich kontach klubu.' +
        '</div>' +
        '<div style="position:relative;width:100%;aspect-ratio:9/16;max-height:360px;overflow:hidden;' +
          'border-radius:14px;border:1px solid rgba(255,255,255,.22);background:#050505;margin-bottom:12px;">' +
          '<img id="adminVisualBackgroundPreviewImage" src="' + url + '" alt="Podgląd tła" style="' +
            'display:' + (url ? "block" : "none") + ';width:100%;height:100%;object-fit:cover;' +
            'object-position:center ' + bg.backgroundPosition + ';">' +
          '<div id="adminVisualBackgroundPreviewOverlay" style="position:absolute;inset:0;pointer-events:none;' +
            'background:rgba(0,0,0,' + (bg.backgroundOverlay / 100) + ');"></div>' +
          '<div id="adminVisualBackgroundPreviewEmpty" style="position:absolute;inset:0;display:' +
            (url ? "none" : "flex") + ';align-items:center;justify-content:center;font-size:13px;opacity:.72;">' +
            'Brak zdjęcia tła</div>' +
        '</div>' +
        '<button class="full-btn" type="button" onclick="adminPickClubBackground_()">' +
          (url ? "Zmień zdjęcie" : "Wybierz zdjęcie") + '</button>' +
        '<input id="adminVisualBackgroundInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" ' +
          'onchange="adminVisualBackgroundSelected_(this)">' +
        '<div style="text-align:left;margin-top:14px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;">' +
            '<span>Przyciemnienie</span><span id="adminVisualBackgroundOverlayValue">' +
              bg.backgroundOverlay + '%</span></div>' +
          '<input type="range" min="0" max="80" step="1" value="' + bg.backgroundOverlay +
            '" oninput="adminVisualBackgroundOverlayChanged_(this.value)" style="width:100%;margin-top:8px;">' +
        '</div>' +
        '<div style="text-align:left;margin-top:14px;font-size:13px;font-weight:800;">Pozycja zdjęcia</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px;">' +
          '<button type="button" class="full-btn alt" data-admin-background-position="top" ' +
            'onclick="adminVisualBackgroundPosition_(\\'top\\')" style="margin:0;padding:10px 4px;">Góra</button>' +
          '<button type="button" class="full-btn alt" data-admin-background-position="center" ' +
            'onclick="adminVisualBackgroundPosition_(\\'center\\')" style="margin:0;padding:10px 4px;">Środek</button>' +
          '<button type="button" class="full-btn alt" data-admin-background-position="bottom" ' +
            'onclick="adminVisualBackgroundPosition_(\\'bottom\\')" style="margin:0;padding:10px 4px;">Dół</button>' +
        '</div>' +
        '<button id="adminVisualBackgroundSaveBtn" class="full-btn" type="button" style="margin-top:16px;" ' +
          'onclick="adminSaveClubBackground_()" disabled>Zapisz tło</button>' +
        '<button id="adminVisualBackgroundDeleteBtn" class="full-btn alt" type="button" style="margin-top:8px;display:' +
          (url ? "block" : "none") + ';" onclick="adminDeleteClubBackground_()">Usuń zdjęcie tła</button>' +
        '<div style="text-align:left;opacity:.65;font-size:12px;line-height:1.4;margin-top:9px;">' +
          'JPG, PNG lub WEBP. Duże zdjęcia są automatycznie zmniejszane przed wysłaniem.</div>' +
        '<div id="adminVisualBackgroundStatus" style="text-align:left;font-size:12px;margin-top:8px;opacity:0;"></div>' +
      '</div>';

    body.insertAdjacentHTML("beforeend", html);
    syncPreview();
    syncSave();
  }

  function installAdminOpenHook() {
    var original = window.adminOpenClubVisualSettingsView;
    if (typeof original !== "function" || original.__clubBgV29) return;

    var wrapped = async function () {
      var result = await original.apply(this, arguments);
      renderCard(window.__clubBgLastAdminSettings || {});
      return result;
    };

    wrapped.__clubBgV29 = true;
    window.adminOpenClubVisualSettingsView = wrapped;
  }

  window.adminPickClubBackground_ = function () {
    var input = document.getElementById("adminVisualBackgroundInput");
    if (input) {
      input.value = "";
      input.click();
    }
  };

  function readData(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function (e) { resolve(clean(e.target && e.target.result)); };
      r.onerror = function () { reject(new Error("Nie udało się odczytać zdjęcia.")); };
      r.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Nie udało się otworzyć zdjęcia.")); };
      img.src = dataUrl;
    });
  }

  function dataBytes(dataUrl) {
    var b64 = clean(dataUrl).split(",")[1] || "";
    return Math.floor(b64.length * 3 / 4);
  }

  function encodeImage(img, maxDim, quality) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, maxDim / w, maxDim / h);
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Brak obsługi optymalizacji zdjęcia.");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    var out = canvas.toDataURL("image/webp", quality);
    if (out.indexOf("data:image/webp") !== 0) out = canvas.toDataURL("image/jpeg", quality);
    return out;
  }

  async function optimize(file) {
    if (!file || clean(file.type).indexOf("image/") !== 0) {
      throw new Error("Wybierz plik graficzny.");
    }
    if (file.size > MAX_INPUT) {
      throw new Error("Plik źródłowy jest za duży. Maksymalnie 15 MB.");
    }

    var img = await loadImage(await readData(file));
    var tries = [[1920,.82],[1920,.68],[1600,.72],[1280,.70],[1080,.68]];
    var out = "";

    for (var i = 0; i < tries.length; i += 1) {
      out = encodeImage(img, tries[i][0], tries[i][1]);
      if (dataBytes(out) <= MAX_OUTPUT) return out;
    }

    throw new Error("Nie udało się zmniejszyć zdjęcia poniżej 3 MB.");
  }

  window.adminVisualBackgroundSelected_ = async function (input) {
    var file = input && input.files && input.files[0];
    var d = draft();
    if (!file || !d) return;

    setStatus("⏳ Optymalizuję zdjęcie...", false);
    try {
      d.imageData = await optimize(file);
      d.imageChanged = true;
      window.__adminClubBackgroundDraft = d;
      syncPreview(d.imageData);
      syncSave();
      setStatus("✅ Zdjęcie gotowe do zapisu (" + Math.round(dataBytes(d.imageData) / 1024) + " KB).", false);
    } catch (e) {
      setStatus("❌ " + clean(e.message || e), true);
      alert("❌ " + clean(e.message || e));
    }
  };

  window.adminVisualBackgroundOverlayChanged_ = function (v) {
    var d = draft();
    if (!d) return;
    d.overlay = overlay(v);
    syncPreview();
    syncSave();
  };

  window.adminVisualBackgroundPosition_ = function (v) {
    var d = draft();
    if (!d) return;
    d.position = position(v);
    syncPreview();
    syncSave();
  };

  function busy(on, label) {
    var d = draft();
    if (d) d.busy = !!on;
    var save = document.getElementById("adminVisualBackgroundSaveBtn");
    var del = document.getElementById("adminVisualBackgroundDeleteBtn");
    if (save) {
      save.textContent = on ? (label || "⏳ Zapisuję...") : "Zapisz tło";
      save.style.opacity = on ? ".65" : "1";
      if (on) save.disabled = true;
    }
    if (del) {
      del.disabled = !!on;
      del.style.opacity = on ? ".65" : "1";
    }
    if (!on) syncSave();
  }

  window.adminSaveClubBackground_ = async function () {
    var d = draft();
    if (!d) return;
    if (!clean(d.currentUrl) && !d.imageChanged) {
      alert("❌ Najpierw wybierz zdjęcie tła.");
      return;
    }

    busy(true, "⏳ Zapisuję tło...");
    try {
      var res = await window.apiClubPost({
        action: "adminSaveClubBackground",
        imageData: d.imageChanged ? d.imageData : "",
        backgroundOverlay: overlay(d.overlay),
        backgroundPosition: position(d.position)
      });
      if (!res || res.success !== true) throw new Error((res && res.error) || "Nie udało się zapisać tła.");
      var bg = norm(res);
      saveCache(bg);
      applyBg(bg);
      alert("✅ Zdjęcie tła zostało zapisane dla całego klubu.");
      await window.adminOpenClubVisualSettingsView();
    } catch (e) {
      alert("❌ " + clean(e.message || e));
    } finally {
      busy(false);
    }
  };

  window.adminDeleteClubBackground_ = async function () {
    var d = draft();
    if (!d || !clean(d.currentUrl)) return;
    if (!confirm("Usunąć zdjęcie tła aplikacji dla całego klubu?")) return;

    busy(true, "⏳ Usuwam...");
    try {
      var res = await window.apiClubPost({ action: "adminDeleteClubBackground" });
      if (!res || res.success !== true) throw new Error((res && res.error) || "Nie udało się usunąć tła.");
      var bg = norm(res);
      saveCache(bg);
      applyBg(bg);
      alert("✅ Zdjęcie tła zostało usunięte.");
      await window.adminOpenClubVisualSettingsView();
    } catch (e) {
      alert("❌ " + clean(e.message || e));
    } finally {
      busy(false);
    }
  };

  function updateDescription() {
    var view = document.getElementById("adminClubSeasonSettingsView");
    if (!view) return;
    var buttons = Array.from(view.querySelectorAll("button"));
    var button = buttons.find(function (b) { return clean(b.textContent) === "Ustawienia wizualne"; });
    var description = button && button.nextElementSibling;
    if (description && clean(description.textContent) === "Logo klubu oraz kolor tła aplikacji.") {
      description.textContent = "Logo klubu, kolor oraz zdjęcie tła aplikacji.";
    }
  }

  installApiHook();
  installAdminOpenHook();
  updateDescription();
  applyBg(loadCache());

  window.__clubBackgroundUiV29 = {
    version: VERSION,
    apply: applyBg,
    loadCached: loadCache
  };
})();