// popup.js
const OCR_API_KEY = "K85624106488957"; // OCR.space API key

let lastOcrLines = null; // from OCR.space TextOverlay.Lines
let lastCroppedCanvas = null;
let lastScale = 1;

// simple mapping from select value to TTS lang (approximate)
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

function translateTextMyMemory(text, targetLang) {
  const encodedText = encodeURIComponent(text);
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`;

  return fetch(apiUrl)
    .then(res => res.json())
    .then(data => data.responseData?.translatedText || "Translation failed.")
    .catch(err => {
      console.error("Translation API Error:", err);
      return "Translation failed.";
    });
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

  // render translated lines in popup via speechController
  const ttsLang = mapTargetToTtsLang(targetLang);
  if (window.speechController && typeof window.speechController.renderTranslationLines === "function") {
    window.speechController.renderTranslationLines(translatedLines, ttsLang);
  } else {
    // fallback: set the old element if exists
    const tr = document.getElementById('translated-result');
    if (tr) tr.textContent = translatedLines.join("\n");
  }

  // set overlay image
  const overlayImgEl = document.getElementById('overlay-img');
  if (overlayImgEl) overlayImgEl.src = overlayCanvas.toDataURL('image/png');
}

window.addEventListener('DOMContentLoaded', () => {
  const startCaptureBtn = document.getElementById('startCapture');
  const targetSelect = document.getElementById('target-lang');
  const croppedImgEl = document.getElementById('cropped-img');

  if (startCaptureBtn) {
    startCaptureBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;

        chrome.scripting.executeScript({
          target: { tabId },
          files: ['selection.js']
        }, () => {
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => window.startSelection && window.startSelection()
          });
        });
      });
    });
  }

  if (targetSelect) {
    targetSelect.addEventListener('change', () => {
      renderTranslation(targetSelect.value);
    });
  }

  // load screenshot & run OCR if available
  chrome.storage.local.get(['fullScreenshot', 'cropRect', 'devicePixelRatio'], (data) => {
    if (!data.fullScreenshot || !data.cropRect) {
      console.warn("⚠ No screenshot data found.");
      return;
    }

    const image = new Image();
    image.onload = async () => {
      lastScale = data.devicePixelRatio || 1;

      // Prepare cropped canvas
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
      if (croppedImgEl) {
        croppedImgEl.src = croppedDataUrl;
        croppedImgEl.addEventListener('click', () => {
          chrome.tabs.create({ url: croppedDataUrl });
        });
      }

      // Send to OCR.space
      console.log("📤 Sending to OCR.space...");
      try {
        const formData = new FormData();
        formData.append("base64Image", croppedDataUrl);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "true");

        const res = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "apikey": OCR_API_KEY },
          body: formData
        });
        const result = await res.json();
        console.log("📥 OCR API Response:", result);

        const parsed = result?.ParsedResults?.[0];
        const fullText = parsed?.ParsedText || '';
        // Build lines from TextOverlay if available
        lastOcrLines = parsed?.TextOverlay?.Lines || [];

        // If overlay lines exist, build line strings; otherwise fallback to fullText split.
        let extractedLines = [];
        if (lastOcrLines.length) {
          extractedLines = lastOcrLines.map(line => (line.Words || []).map(w => w.WordText).join(" ").trim()).filter(Boolean);
        } else {
          extractedLines = (fullText || '').split("\n").map(s => s.trim()).filter(Boolean);
        }

        // render OCR lines via speechController (TTS lang en-US)
        if (window.speechController && typeof window.speechController.renderOcrLines === "function") {
          window.speechController.renderOcrLines(extractedLines, "en-US");
        } else {
          const ocrEl = document.getElementById('ocr-lines');
          if (ocrEl) ocrEl.textContent = extractedLines.join("\n") || 'No text found.';
        }

        // render translated text for currently selected language
        const targetLang = targetSelect ? targetSelect.value : 'tl';
        await renderTranslation(targetLang);
      } catch (err) {
        console.error("OCR error:", err);
        const ocrEl = document.getElementById('ocr-lines');
        if (ocrEl) ocrEl.textContent = 'Error during OCR.';
      }
    };

    image.src = data.fullScreenshot;
  });
});
