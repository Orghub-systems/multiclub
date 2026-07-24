/* ORG HUB — trainer medical alerts without dedicated GAS polling */
(function applyTrainerMedicalNoPollingPatch_() {
  "use strict";

  if (window.__trainerMedicalNoPollingPatchV1) return;
  window.__trainerMedicalNoPollingPatchV1 = true;

  function readSession_() {
    try {
      return typeof loadAppSession_ === "function"
        ? loadAppSession_()
        : null;
    } catch (e) {
      return null;
    }
  }

  function readMedicalFeatureFromCache_() {
    try {
      if (typeof trainerIsMedicalFeatureEnabledFromCache_ === "function") {
        return trainerIsMedicalFeatureEnabledFromCache_();
      }
    } catch (e) {}

    return false;
  }

  function buildAlertsFromPlayersCache_() {
    const players = Array.isArray(window.__trainerPlayersListCache)
      ? window.__trainerPlayersListCache
      : [];

    const alerts = players
      .map(function(player) {
        const medicalExam =
          player && player.medicalExam && typeof player.medicalExam === "object"
            ? player.medicalExam
            : null;

        if (
          !medicalExam ||
          medicalExam.enabled !== true ||
          medicalExam.showAlert !== true
        ) {
          return null;
        }

        return Object.assign({}, medicalExam, {
          numer: String(player.nr || "").trim()
        });
      })
      .filter(Boolean);

    const map = {};

    alerts.forEach(function(alert) {
      const nr = String(alert.numer || alert.player_id || "").trim();
      if (nr) map[nr] = alert;
    });

    window.__trainerMedicalExamAlertsByNr = map;
    window.__trainerMedicalExamAlertsCount = alerts.length;

    if (typeof trainerSetMedicalAlertBeacon_ === "function") {
      trainerSetMedicalAlertBeacon_(alerts.length);
    }

    if (typeof trainerApplyMedicalAlertsToVisiblePlayerTiles_ === "function") {
      trainerApplyMedicalAlertsToVisiblePlayerTiles_();
    }

    return {
      success: true,
      source: "players-cache",
      alerts: alerts
    };
  }

  const originalLoadSelectedMedical_ =
    typeof window.trainerLoadMedicalExamForSelectedPlayer_ === "function"
      ? window.trainerLoadMedicalExamForSelectedPlayer_
      : null;

  const originalShowTrainerPlayers_ =
    typeof window.trainerPokazZawodnicy === "function"
      ? window.trainerPokazZawodnicy
      : null;

  window.trainerRefreshMedicalFeatureState_ = async function() {
    const session = readSession_();
    const flag =
      (session && session.medicalExamClubFlag) ||
      window.__trainerMedicalExamClubFlag ||
      null;

    if (flag && typeof flag.enabled !== "undefined") {
      return flag.enabled === true;
    }

    return readMedicalFeatureFromCache_();
  };

  window.trainerLoadMedicalExamForSelectedPlayer_ = async function() {
    const nr = String(window.__trainerSelectedNr || "").trim();
    const dateEl = document.getElementById("trainerMedicalExamDate");

    if (!nr) return;

    const cachedPlayer = Array.isArray(window.__trainerPlayersListCache)
      ? window.__trainerPlayersListCache.find(function(player) {
          return String((player && player.nr) || "").trim() === nr;
        })
      : null;

    const medicalExam =
      cachedPlayer && cachedPlayer.medicalExam &&
      typeof cachedPlayer.medicalExam === "object"
        ? cachedPlayer.medicalExam
        : null;

    if (medicalExam) {
      const validUntil = String(
        medicalExam.validUntil ||
        medicalExam.validUntilLabel ||
        medicalExam.date ||
        ""
      ).trim();

      if (dateEl) {
        dateEl.textContent = validUntil || "Nie ustawiono";
      }

      return;
    }

    // Jedyny fallback: świadome otwarcie konkretnego zawodnika,
    // gdy lista nie zawiera jeszcze daty badania.
    if (originalLoadSelectedMedical_) {
      return originalLoadSelectedMedical_.apply(this, arguments);
    }
  };

  window.trainerRefreshMedicalExamAlerts_ = async function() {
    return buildAlertsFromPlayersCache_();
  };

  window.trainerScheduleMedicalExamAlertsCheck_ = function() {
    buildAlertsFromPlayersCache_();
    return false;
  };

  window.trainerStartMedicalAlertsFromActiveSession_ = function() {
    const session = readSession_();
    const role = String((session && session.role) || "").trim().toLowerCase();

    if (role !== "trener") return false;

    const flag =
      (session && session.medicalExamClubFlag) ||
      window.__trainerMedicalExamClubFlag ||
      null;

    if (typeof trainerApplyMedicalExamClubFlag_ === "function") {
      trainerApplyMedicalExamClubFlag_(flag);
    }

    return true;
  };

  window.trainerBootMedicalAlertsWatcher_ = function() {
    if (window.__trainerMedicalBootWatcherStarted) return;
    window.__trainerMedicalBootWatcherStarted = true;

    window.trainerStartMedicalAlertsFromActiveSession_();
  };

  if (window.__trainerMedicalExamAlertStartTimer) {
    clearTimeout(window.__trainerMedicalExamAlertStartTimer);
    window.__trainerMedicalExamAlertStartTimer = null;
  }

  if (originalShowTrainerPlayers_) {
    window.trainerPokazZawodnicy = async function() {
      const result = await originalShowTrainerPlayers_.apply(this, arguments);
      buildAlertsFromPlayersCache_();
      return result;
    };
  }

  // Działa również wtedy, gdy stary listener DOMContentLoaded lub focus
  // został już zarejestrowany — wywoła teraz nadpisane funkcje bez GAS.
  setTimeout(function() {
    window.trainerStartMedicalAlertsFromActiveSession_();
  }, 0);
})();

/* ADMIN: link klubu, kod QR i systemowe udostępnianie */
(function installAdminClubShareLoader_() {
  "use strict";

  if (window.__orgHubClubShareLoaderV1) return;
  window.__orgHubClubShareLoaderV1 = true;

  function loadAdminClubShare_() {
    if (window.__orgHubAdminClubShareV1) return;
    if (document.querySelector('script[data-org-hub-club-share="1"]')) return;

    const script = document.createElement("script");
    script.src = "/club-share.js?v=20260721-1";
    script.async = true;
    script.dataset.orgHubClubShare = "1";
    script.onerror = function() {
      console.error("Nie udało się załadować modułu udostępniania klubu.");
    };
    document.head.appendChild(script);
  }

  const originalOpenSettings_ = window.adminOpenClubSeasonSettingsView;

  if (typeof originalOpenSettings_ === "function") {
    window.adminOpenClubSeasonSettingsView = function() {
      const result = originalOpenSettings_.apply(this, arguments);
      loadAdminClubShare_();
      return result;
    };
  }
})();

/* ADMIN HOTFIX: prawidłowa biblioteka QR + adapter do API QRCode.toCanvas */
(function installAdminQrBootstrapFix_() {
  "use strict";

  if (window.__orgHubQrBootstrapFixV1) return;
  window.__orgHubQrBootstrapFixV1 = true;

  const QR_SOURCES = [
    "https://cdn.jsdelivr.net/npm/davidshimjs-qrcodejs@0.0.2/qrcode.min.js",
    "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js"
  ];

  let qrReadyPromise = null;

  function installToCanvasAdapter_() {
    const QRCodeCtor = window.QRCode;

    if (typeof QRCodeCtor !== "function") return false;
    if (typeof QRCodeCtor.toCanvas === "function") return true;

    QRCodeCtor.toCanvas = function(targetCanvas, text, options) {
      return new Promise(function(resolve, reject) {
        const opts = options || {};
        const size = Math.max(128, Number(opts.width) || 760);
        const marginModules = Math.max(0, Number(opts.margin) || 0);
        const marginPx = Math.min(
          Math.floor(size * 0.12),
          Math.round(marginModules * 8)
        );

        let holder = null;

        function cleanup_() {
          if (holder && holder.parentNode) holder.remove();
          holder = null;
        }

        try {
          if (!targetCanvas || typeof targetCanvas.getContext !== "function") {
            throw new Error("Brak docelowego canvas dla kodu QR");
          }

          holder = document.createElement("div");
          holder.setAttribute("aria-hidden", "true");
          holder.style.cssText = [
            "position:fixed",
            "left:-10000px",
            "top:-10000px",
            "width:" + size + "px",
            "height:" + size + "px",
            "overflow:hidden",
            "opacity:0",
            "pointer-events:none"
          ].join(";");

          document.body.appendChild(holder);

          new QRCodeCtor(holder, {
            text: String(text || ""),
            width: size,
            height: size,
            colorDark:
              opts.color && opts.color.dark
                ? String(opts.color.dark)
                : "#000000",
            colorLight:
              opts.color && opts.color.light
                ? String(opts.color.light)
                : "#ffffff",
            correctLevel:
              QRCodeCtor.CorrectLevel && QRCodeCtor.CorrectLevel.M != null
                ? QRCodeCtor.CorrectLevel.M
                : 0
          });

          window.setTimeout(function() {
            try {
              const source =
                holder.querySelector("canvas") ||
                holder.querySelector("img");

              if (!source) {
                throw new Error("Biblioteka QR nie utworzyła obrazu");
              }

              targetCanvas.width = size;
              targetCanvas.height = size;

              const ctx = targetCanvas.getContext("2d");
              if (!ctx) throw new Error("Brak obsługi canvas");

              const light =
                opts.color && opts.color.light
                  ? String(opts.color.light)
                  : "#ffffff";

              ctx.clearRect(0, 0, size, size);
              ctx.fillStyle = light;
              ctx.fillRect(0, 0, size, size);

              const drawSize = Math.max(1, size - marginPx * 2);
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(
                source,
                marginPx,
                marginPx,
                drawSize,
                drawSize
              );

              cleanup_();
              resolve(targetCanvas);
            } catch (error) {
              cleanup_();
              reject(error);
            }
          }, 0);

        } catch (error) {
          cleanup_();
          reject(error);
        }
      });
    };

    return true;
  }

  function loadQrSource_(index) {
    if (installToCanvasAdapter_()) return Promise.resolve(window.QRCode);

    if (index >= QR_SOURCES.length) {
      return Promise.reject(new Error("Nie udało się załadować biblioteki QR"));
    }

    return new Promise(function(resolve, reject) {
      const old = document.querySelector(
        'script[data-org-hub-qr-bootstrap="' + index + '"]'
      );

      if (old) old.remove();

      const script = document.createElement("script");
      script.src = QR_SOURCES[index];
      script.async = true;
      script.dataset.orgHubQrBootstrap = String(index);

      script.onload = function() {
        if (installToCanvasAdapter_()) {
          resolve(window.QRCode);
        } else {
          script.remove();
          loadQrSource_(index + 1).then(resolve, reject);
        }
      };

      script.onerror = function() {
        script.remove();
        loadQrSource_(index + 1).then(resolve, reject);
      };

      document.head.appendChild(script);
    });
  }

  function ensureQrSupport_() {
    if (installToCanvasAdapter_()) {
      return Promise.resolve(window.QRCode);
    }

    if (!qrReadyPromise) {
      qrReadyPromise = loadQrSource_(0).catch(function(error) {
        qrReadyPromise = null;
        throw error;
      });
    }

    return qrReadyPromise;
  }

  const previousOpenSettings_ = window.adminOpenClubSeasonSettingsView;

  if (typeof previousOpenSettings_ === "function") {
    window.adminOpenClubSeasonSettingsView = async function() {
      try {
        await ensureQrSupport_();
      } catch (error) {
        console.error("ORG HUB QR bootstrap error:", error);
      }

      return previousOpenSettings_.apply(this, arguments);
    };
  }
})();
