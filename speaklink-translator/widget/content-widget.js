(() => {
  // === Create the toggle icon button ===
	const toggleIcon = document.createElement('img');
	toggleIcon.id = 'speaklink-toggle-icon';
	toggleIcon.title = 'Open SpeakLink Translator';
	toggleIcon.src = chrome.runtime.getURL('speaklinkicon.gif');  // use the .gif file here
	toggleIcon.style.cssText = `
	  position: fixed;
	  bottom: 20px;
	  left: 20px;
	  width: 200px;      /* adjust as needed */
	  border-radius: 24px;
	  border: none;
	  cursor: pointer;
	  z-index: 99999999;
	  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
	  display: block;    /* img is inline by default, block makes sizing easier */
	  user-select: none;
	`;

	document.body.appendChild(toggleIcon);


  // === Create widget container ===
  const widget = document.createElement('div');
  widget.id = 'speaklink-widget';

  widget.innerHTML = `
    <style>
      /* Minimal styling inside widget */
      #speaklink-widget {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 480px;
        background: white;
        border: 2px solid #444;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
        z-index: 9999999;
        user-select: none;
      }
      #speaklink-header {
        background: #0366d6;
        color: white;
        font-weight: bold;
        padding: 8px 10px;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 6px 6px 0 0;
      }
      #speaklink-close-btn {
        background: transparent;
        border: none;
        color: white;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
      }
      #speaklink-content {
        padding: 10px;
        max-height: 480px;
        overflow-y: auto;
      }
      .image-container {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }
      .image-box {
        flex: 1;
        text-align: center;
      }
      .image-box img {
        max-width: 100%;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      .text-container {
        display: flex;
        gap: 10px;
      }
      .text-box-wrapper {
        flex: 1;
        position: relative;
      }
      .text-box {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 6px;
        max-height: 150px;
        overflow-y: auto;
        white-space: pre-wrap;
        background: #fafafa;
      }
      .line-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .line-text {
        flex-grow: 1;
        margin-right: 6px;
        user-select: text;
      }
      .line-speak-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      .line-speak-btn img {
        width: 100%;
        height: 100%;
      }
      select, button {
        margin-top: 6px;
        padding: 5px;
        font-size: 14px;
      }
    </style>

    <div id="speaklink-header">
      SpeakLink Translator
      <button id="speaklink-close-btn" title="Close widget">&times;</button>
    </div>
    <div id="speaklink-content">
      <button id="startCapture">Start Capture</button>

      <div class="image-container">
        <div class="image-box">
          <h4>Cropped Image:</h4>
          <img id="cropped-img" alt="Cropped Image" />
        </div>
        <div class="image-box">
          <h4>Translated Overlay Image:</h4>
          <img id="overlay-img" alt="Overlay Image" />
        </div>
      </div>

      <h4>Extracted & Translated Text:</h4>
      <label for="target-lang">Translate to:</label>
      <select id="target-lang">
        <option value="tl">Filipino</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="ja">Japanese</option>
        <option value="zh-CN">Chinese (Simplified)</option>
      </select>

      <div class="text-container">
        <div class="text-box-wrapper">
          <div id="ocr-lines" class="text-box">Waiting for OCR...</div>
        </div>

        <div class="text-box-wrapper">
          <div id="translation-lines" class="text-box">Waiting for translation...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  // Hide widget initially and show icon
  widget.style.display = 'none';
  toggleIcon.style.display = 'flex';

  // === Toggle logic ===
  toggleIcon.addEventListener('click', () => {
    widget.style.display = 'block';
    toggleIcon.style.display = 'none';
  });

  widget.querySelector('#speaklink-close-btn').addEventListener('click', () => {
    widget.style.display = 'none';
    toggleIcon.style.display = 'flex';
  });

  // === Draggable widget header ===
  const header = widget.querySelector('#speaklink-header');
  let isDragging = false;
  let offsetX, offsetY;

  header.style.cursor = 'move';

  header.addEventListener('mousedown', e => {
    isDragging = true;
    offsetX = e.clientX - widget.getBoundingClientRect().left;
    offsetY = e.clientY - widget.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;

    // Keep widget inside viewport
    const maxLeft = window.innerWidth - widget.offsetWidth;
    const maxTop = window.innerHeight - widget.offsetHeight;

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;

    widget.style.left = left + 'px';
    widget.style.top = top + 'px';
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
  });

  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.left = 'auto';
  widget.style.top = 'auto';

  // === Variables for OCR & translation ===
  let lastOcrLines = null;
  let lastCroppedCanvas = null;
  let lastScale = 1;

  // === Text-to-Speech logic from speech.js ===
  let voices = [];

  function loadVoices() {
    voices = speechSynthesis.getVoices() || [];
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
    let v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith(langCode));
    if (v) return v;
    v = voices.find(x => /google|neural|natural|wave/i.test(x.name || ""));
    return v || voices[0] || null;
  }

  function speakForLine(text, ttsLang, wrapperEl) {
    if (!text || !text.trim()) return;
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

  function renderLinesInto(container, lines, ttsLang) {
    if (!container) {
      console.warn("Missing container for renderLinesInto");
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
      img.src = chrome.runtime.getURL("talkperson.png");
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

  // === Public API for TTS + rendering ===
  const speechController = {
    renderOcrLines: (lines, ttsLang = "en-US") => {
      const container = widget.querySelector("#ocr-lines");
      renderLinesInto(container, lines, ttsLang);
    },
    renderTranslationLines: (lines, ttsLang = "en-US") => {
      const container = widget.querySelector("#translation-lines");
      renderLinesInto(container, lines, ttsLang);
    },
    speakLine: speakForLine,
  };

  // === Helpers from popup.js ===
  function mapTargetToTtsLang(target) {
    switch (target) {
      case "tl":
      case "fil":
        return "fil-PH";
      case "es":
        return "es-ES";
      case "fr":
        return "fr-FR";
      case "de":
        return "de-DE";
      case "ja":
        return "ja-JP";
      case "zh-CN":
        return "zh-CN";
      default:
        return "en-US";
    }
  }

  async function translateTextMyMemory(text, targetLang) {
    const encodedText = encodeURIComponent(text);
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`;

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      return data.responseData?.translatedText || "Translation failed.";
    } catch {
      return "Translation failed.";
    }
  }

  async function renderTranslation(targetLang) {
    if (!lastOcrLines || !lastCroppedCanvas) return;

    const overlayCanvas = document.createElement('canvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCanvas.width = lastCroppedCanvas.width;
    overlayCanvas.height = lastCroppedCanvas.height;

    overlayCtx.drawImage(lastCroppedCanvas, 0, 0);
    const fontSize = 16;
    overlayCtx.font = `${fontSize}px Arial`;
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";

    const translatedLines = [];

    for (let line of lastOcrLines) {
      const lineText = (line.Words || []).map(w => w.WordText).join(" ").trim();
      if (!lineText) continue;

      const translatedLine = await translateTextMyMemory(lineText, targetLang);
      translatedLines.push(translatedLine);

      // draw overlay box + text
      const x = (line.Words[0].Left || 0) * lastScale;
      const y = (line.Words[0].Top || 0) * lastScale;
      const ocrWidth = (line.Words.reduce((acc, w) => acc + (w.Width || 0), 0) || 0) * lastScale;
      const ocrHeight = (line.MaxHeight || fontSize) * lastScale;

      const textWidth = overlayCtx.measureText(translatedLine).width;
      const boxWidth = Math.max(ocrWidth, textWidth + 20);
      const boxHeight = Math.max(ocrHeight, fontSize + 10);

      overlayCtx.fillStyle = "white";
      overlayCtx.fillRect(x, y, boxWidth, boxHeight);
      overlayCtx.strokeStyle = "black";
      overlayCtx.lineWidth = 1;
      overlayCtx.strokeRect(x, y, boxWidth, boxHeight);

      overlayCtx.fillStyle = "black";
      overlayCtx.fillText(translatedLine, x + boxWidth / 2, y + boxHeight / 2);
    }

    speechController.renderTranslationLines(translatedLines, mapTargetToTtsLang(targetLang));

    // set overlay image
    const overlayImgEl = widget.querySelector('#overlay-img');
    if (overlayImgEl) overlayImgEl.src = overlayCanvas.toDataURL('image/png');
  }

  // === Start Capture button ===
	widget.querySelector('#startCapture').addEventListener('click', () => {
		console.log("[Widget] Sending 'startSelection' message to background...");
		chrome.runtime.sendMessage({ action: 'startSelection' }, (response) => {
		  if (chrome.runtime.lastError) {
			console.error('Message error:', chrome.runtime.lastError.message);
		  } else {
			console.log('Selection started:', response);
		  }
		});
	});

  // === Target language change handler ===
  widget.querySelector('#target-lang').addEventListener('change', e => {
    renderTranslation(e.target.value);
  });

  // === Load last screenshot and OCR ===
function loadData() {
  chrome.storage.local.get(['fullScreenshot', 'cropRect', 'devicePixelRatio'], async (data) => {
    console.log("[Widget] Retrieved data from storage:", data);
    if (!data.fullScreenshot || !data.cropRect) {
      console.warn("[Widget] ⚠ No screenshot data found in storage.");
      return;
    }

    // Debug log the stored cropRect
    console.log("[Widget] Loaded cropRect from storage:", data.cropRect);

    // Check if cropRect has meaningful size
    if (data.cropRect.width < 5 || data.cropRect.height < 5) {
      console.warn("[Widget] Crop rectangle too small, skipping processing.");
      return;
    }

    const image = new Image();
    image.onload = async () => {
      lastScale = data.devicePixelRatio || 1;

      lastCroppedCanvas = document.createElement('canvas');
      const ctx = lastCroppedCanvas.getContext('2d');
      lastCroppedCanvas.width = data.cropRect.width * lastScale;
      lastCroppedCanvas.height = data.cropRect.height * lastScale;

      ctx.drawImage(
        image,
        data.cropRect.x * lastScale,
        data.cropRect.y * lastScale,
        data.cropRect.width * lastScale,
        data.cropRect.height * lastScale,
        0,
        0,
        data.cropRect.width * lastScale,
        data.cropRect.height * lastScale
      );

      const croppedDataUrl = lastCroppedCanvas.toDataURL('image/png');
      const croppedImgEl = widget.querySelector('#cropped-img');
      if (croppedImgEl) {
        croppedImgEl.src = croppedDataUrl;
        croppedImgEl.addEventListener('click', () => {
          chrome.tabs.create({ url: croppedDataUrl });
        });
      }

      try {
        console.log("[Widget] Sending image to OCR.space...");
        const formData = new FormData();
        formData.append("base64Image", croppedDataUrl);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "true");

        const res = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "apikey": "K85624106488957" },
          body: formData
        });
        const result = await res.json();
        console.log("[Widget] OCR API response:", result);

        const parsed = result?.ParsedResults?.[0];
        const fullText = parsed?.ParsedText || '';
        lastOcrLines = parsed?.TextOverlay?.Lines || [];

        // Extract OCR lines text
        let extractedLines = [];
        if (lastOcrLines.length) {
          extractedLines = lastOcrLines.map(line => (line.Words || []).map(w => w.WordText).join(" ").trim()).filter(Boolean);
        } else {
          extractedLines = (fullText || '').split("\n").map(s => s.trim()).filter(Boolean);
        }

        speechController.renderOcrLines(extractedLines, "en-US");

        const targetSelect = widget.querySelector('#target-lang');
        const targetLang = targetSelect ? targetSelect.value : 'tl';
        await renderTranslation(targetLang);
      } catch (err) {
        console.error("[Widget] OCR error:", err);
        const ocrEl = widget.querySelector('#ocr-lines');
        if (ocrEl) ocrEl.textContent = 'Error during OCR.';
      }
    };

    image.onerror = () => {
      console.error("[Widget] Image failed to load");
    };

    image.src = data.fullScreenshot;
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}

})();
