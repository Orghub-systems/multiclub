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
