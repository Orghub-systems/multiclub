(function () {
  "use strict";

  const VIEW_ID = "playerAssistantView";
  const FORM_ID = "playerAssistantForm";
  const INPUT_ID = "playerAssistantInput";
  const SEND_ID = "playerAssistantSend";
  const STATUS_ID = "playerAssistantStatus";
  const RESULT_ID = "playerAssistantResult";
  const MIC_ID = "playerAssistantMic";

  let recognition = null;
  let listening = false;
  let voiceQuestionPending = false;
  let resultObserver = null;
  let enhanceTimer = null;

  function recognitionCtor_() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function speechSupported_() {
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  function addStyles_() {
    if (document.getElementById("orghubAssistantVoiceStyles")) return;

    const style = document.createElement("style");
    style.id = "orghubAssistantVoiceStyles";
    style.textContent = `
      #${VIEW_ID} .ai-form.ai-voice-form{
        grid-template-columns:minmax(0,1fr) 48px auto;
      }
      #${VIEW_ID} .ai-mic{
        width:46px;
        height:46px;
        min-width:46px;
        padding:0;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.18);
        background:#242424;
        color:#fff;
        font-size:21px;
        line-height:1;
        display:flex;
        align-items:center;
        justify-content:center;
      }
      #${VIEW_ID} .ai-mic.listening{
        background:#8b0000;
        border-color:#ff4a4a;
        box-shadow:0 0 0 4px rgba(255,50,50,.12);
      }
      #${VIEW_ID} .ai-speak-btn{
        margin-top:12px;
        border:1px solid rgba(255,255,255,.18);
        background:#242424;
        color:#fff;
        border-radius:10px;
        padding:9px 11px;
        font-size:12px;
        font-weight:900;
      }
      @media(max-width:430px){
        #${VIEW_ID} .ai-form.ai-voice-form{
          grid-template-columns:minmax(0,1fr) 48px;
        }
        #${VIEW_ID} .ai-form.ai-voice-form .ai-send{
          grid-column:1 / -1;
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function status_(message) {
    const el = document.getElementById(STATUS_ID);
    if (el) el.textContent = String(message || "");
  }

  function setMicState_(active) {
    listening = Boolean(active);
    const button = document.getElementById(MIC_ID);
    if (!button) return;

    button.classList.toggle("listening", listening);
    button.textContent = listening ? "■" : "🎙";
    button.setAttribute("aria-label", listening ? "Zatrzymaj nagrywanie" : "Zadaj pytanie głosem");
    button.title = listening ? "Zatrzymaj" : "Zadaj pytanie głosem";
  }

  function stopSpeech_() {
    if (!speechSupported_()) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  function polishVoice_() {
    if (!speechSupported_()) return null;
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return voices.find(function (voice) {
        return /^pl(?:-|_)/i.test(String(voice?.lang || ""));
      }) || null;
    } catch (e) {
      return null;
    }
  }

  function speakText_(text) {
    const value = String(text || "").trim();
    if (!value || !speechSupported_()) return false;

    stopSpeech_();

    try {
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = "pl-PL";
      utterance.rate = 1;
      utterance.pitch = 1;
      const voice = polishVoice_();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      return false;
    }
  }

  function speechTextFromCard_(card) {
    if (!card) return "";

    const answer = String(card.querySelector(".ai-answer-text")?.textContent || "").trim();
    const rows = Array.from(card.querySelectorAll(".ai-row")).slice(0, 5);
    const details = rows.map(function (row) {
      const primary = String(row.querySelector(".ai-row-primary")?.textContent || "").trim();
      const value = String(row.querySelector(".ai-row-value")?.textContent || "").trim();
      return [primary, value].filter(Boolean).join(", ");
    }).filter(Boolean);

    return [answer, details.length ? details.join(". ") : ""].filter(Boolean).join(". ");
  }

  function enhanceResult_() {
    const root = document.getElementById(RESULT_ID);
    if (!root) return;

    const card = root.querySelector(".ai-card");
    if (!card) return;

    if (speechSupported_() && !card.querySelector(".ai-speak-btn")) {
      const replay = document.createElement("button");
      replay.type = "button";
      replay.className = "ai-speak-btn";
      replay.textContent = "🔊 Odczytaj odpowiedź";
      replay.addEventListener("click", function () {
        const text = card.classList.contains("ai-error")
          ? String(card.textContent || "").trim()
          : speechTextFromCard_(card);
        speakText_(text);
      });
      card.appendChild(replay);
    }

    if (voiceQuestionPending) {
      voiceQuestionPending = false;
      const text = card.classList.contains("ai-error")
        ? String(card.textContent || "").trim()
        : speechTextFromCard_(card);
      speakText_(text);
    }
  }

  function observeResults_() {
    const root = document.getElementById(RESULT_ID);
    if (!root || resultObserver) return;

    resultObserver = new MutationObserver(function () {
      clearTimeout(enhanceTimer);
      enhanceTimer = setTimeout(enhanceResult_, 40);
    });

    resultObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function recognitionErrorMessage_(code) {
    switch (String(code || "")) {
      case "not-allowed":
      case "service-not-allowed":
        return "Brak dostępu do mikrofonu. Zezwól aplikacji na używanie mikrofonu.";
      case "audio-capture":
        return "Nie mogę uruchomić mikrofonu na tym urządzeniu.";
      case "no-speech":
        return "Nie usłyszałem pytania. Spróbuj jeszcze raz.";
      case "network":
        return "Rozpoznawanie mowy wymaga połączenia z internetem.";
      default:
        return "Nie udało się rozpoznać mowy. Spróbuj ponownie.";
    }
  }

  function startRecognition_() {
    const Recognition = recognitionCtor_();
    if (!Recognition) {
      status_("Ta przeglądarka nie obsługuje rozpoznawania mowy. Możesz nadal pisać pytania.");
      return;
    }

    if (listening && recognition) {
      try { recognition.stop(); } catch (e) {}
      return;
    }

    stopSpeech_();

    const input = document.getElementById(INPUT_ID);
    const form = document.getElementById(FORM_ID);
    if (!input || !form) return;

    let transcript = "";
    let hadError = false;
    recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      setMicState_(true);
      status_("Słucham…");
    };

    recognition.onresult = function (event) {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += String(event.results[i]?.[0]?.transcript || "");
      }
      transcript = text.trim();
      if (transcript) input.value = transcript;
    };

    recognition.onerror = function (event) {
      const code = String(event?.error || "");
      if (code !== "aborted") {
        hadError = true;
        status_(recognitionErrorMessage_(code));
      }
    };

    recognition.onend = function () {
      setMicState_(false);
      recognition = null;

      if (hadError) return;
      const question = String(transcript || input.value || "").trim();
      if (!question) {
        status_("Nie usłyszałem pytania. Spróbuj jeszcze raz.");
        return;
      }

      voiceQuestionPending = true;
      status_("Rozpoznałem pytanie. Analizuję…");

      try {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      } catch (e) {
        voiceQuestionPending = false;
        status_("Nie udało się wysłać pytania głosowego.");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      recognition = null;
      setMicState_(false);
      status_("Nie udało się uruchomić mikrofonu.");
    }
  }

  function stopVoice_() {
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
    setMicState_(false);
    stopSpeech_();
    voiceQuestionPending = false;
  }

  function ensureControls_() {
    const view = document.getElementById(VIEW_ID);
    const form = document.getElementById(FORM_ID);
    const send = document.getElementById(SEND_ID);
    if (!view || !form || !send) return false;

    form.classList.add("ai-voice-form");

    if (!document.getElementById(MIC_ID)) {
      const mic = document.createElement("button");
      mic.id = MIC_ID;
      mic.type = "button";
      mic.className = "ai-mic";
      mic.textContent = "🎙";
      mic.setAttribute("aria-label", "Zadaj pytanie głosem");
      mic.title = "Zadaj pytanie głosem";
      mic.addEventListener("click", startRecognition_);
      form.insertBefore(mic, send);
    }

    const back = document.getElementById("playerAssistantBack");
    if (back && !back.dataset.voiceHooked) {
      back.dataset.voiceHooked = "1";
      back.addEventListener("click", stopVoice_, { capture: true });
    }

    observeResults_();
    enhanceResult_();
    return true;
  }

  function init_() {
    addStyles_();

    let attempts = 0;
    const timer = setInterval(function () {
      attempts += 1;
      if (ensureControls_() || attempts > 40) clearInterval(timer);
    }, 250);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopVoice_();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_, { once: true });
  } else {
    init_();
  }
})();
