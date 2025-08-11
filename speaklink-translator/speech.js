// speech.js
// All rendering and TTS logic lives here and is exposed as window.speechController

(function () {
  let voices = [];

  function loadVoices() {
    voices = speechSynthesis.getVoices() || [];
    // prefer Google / Neural / Natural sounding voices earlier in list
    voices.sort((a, b) => {
      const score = name => {
        const n = (name || "").toLowerCase();
        if (n.includes("google")) return 3;
        if (n.includes("neural") || n.includes("wave")) return 2;
        if (n.includes("natural")) return 2;
        return 0;
      };
      return score(b.name) - score(a.name);
    });
  }
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function getBestVoice(langCode) {
    if (!voices.length) loadVoices();
    langCode = (langCode || "").toLowerCase();
    // try to find voice that starts with langCode
    let v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith(langCode));
    if (v) return v;
    // fallback: voice whose name contains google/neural
    v = voices.find(x => /google|neural|natural|wave/i.test(x.name || ""));
    return v || voices[0] || null;
  }

  function speakForLine(text, ttsLang, wrapperEl) {
    if (!text || !text.trim()) return;
    // stop any currently speaking utterance
    try { speechSynthesis.cancel(); } catch (e) {}

    const u = new SpeechSynthesisUtterance(text);
    u.lang = ttsLang || "en-US";
    const v = getBestVoice(u.lang);
    if (v) u.voice = v;
    u.rate = 1.0;
    u.pitch = 1.0;

    u.onstart = () => {
      if (wrapperEl) wrapperEl.classList.add("line-reading");
    };
    u.onend = () => {
      if (wrapperEl) wrapperEl.classList.remove("line-reading");
    };
    u.onerror = () => {
      if (wrapperEl) wrapperEl.classList.remove("line-reading");
      console.error("TTS error for text:", text);
    };

    speechSynthesis.speak(u);
  }

  function renderLinesInto(containerId, lines, ttsLang) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn("Missing container:", containerId);
      return;
    }
    container.innerHTML = "";

    if (!lines || !lines.length) {
      container.textContent = "No text found.";
      return;
    }

    lines.forEach(line => {
      const wrapper = document.createElement("div");
      wrapper.className = "line-item";

      const span = document.createElement("div");
      span.className = "line-text";
      span.textContent = line;

      const btn = document.createElement("button");
      btn.className = "line-speak-btn";
      btn.title = "Read this line";
      const img = document.createElement("img");
      img.src = "talkperson.png";
      img.alt = "Speak";
      btn.appendChild(img);

      btn.addEventListener("click", () => {
        speakForLine(line, ttsLang, wrapper);
      });

      wrapper.appendChild(span);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    });
  }

  // Public API on window
  window.speechController = {
    renderOcrLines: (lines, ttsLang = "en-US") => renderLinesInto("ocr-lines", lines, ttsLang),
    renderTranslationLines: (lines, ttsLang = "en-US") => renderLinesInto("translation-lines", lines, ttsLang),
    speakLine: (text, ttsLang = "en-US") => speakForLine(text, ttsLang, null)
  };
})();
