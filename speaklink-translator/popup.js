const OCR_API_KEY = "K85624106488957"; // OCR.space API key

let lastOcrLines = null; // store OCR lines
let lastCroppedCanvas = null; // store cropped canvas
let lastScale = 1;

// MyMemory Translation API function
function translateTextMyMemory(text, targetLang) {
  const encodedText = encodeURIComponent(text);
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`;

  return fetch(apiUrl)
    .then(res => res.json())
    .then(data => data.responseData.translatedText || "Translation failed.")
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

  let translatedFullText = "";

  for (let line of lastOcrLines) {
    const lineText = line.Words.map(w => w.WordText).join(" ");
    if (!lineText.trim()) continue;

    const translatedLine = await translateTextMyMemory(lineText, targetLang);
    translatedFullText += translatedLine + "\n";

    const x = line.Words[0].Left * lastScale;
    const y = line.Words[0].Top * lastScale;
    const ocrWidth = line.Words.reduce((acc, w) => acc + w.Width, 0) * lastScale;
    const ocrHeight = line.MaxHeight * lastScale;

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

  document.getElementById('translated-result').textContent = translatedFullText.trim();
  document.getElementById('overlay-img').src = overlayCanvas.toDataURL('image/png');
}

document.getElementById('startCapture').addEventListener('click', () => {
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

document.getElementById('target-lang').addEventListener('change', () => {
  const targetLang = document.getElementById('target-lang').value;
  renderTranslation(targetLang);
});

window.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['fullScreenshot', 'cropRect', 'devicePixelRatio'], (data) => {
    if (!data.fullScreenshot || !data.cropRect) {
      console.warn("⚠ No screenshot data found.");
      return;
    }

    const image = new Image();
    image.onload = () => {
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

      const croppedImage = lastCroppedCanvas.toDataURL('image/png');
      document.getElementById('cropped-img').src = croppedImage;
      document.getElementById('cropped-img').addEventListener('click', () => {
        chrome.tabs.create({ url: croppedImage });
      });

      // Step 1: Send to OCR.space with overlay request
      console.log("📤 Sending to OCR.space...");
      fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "apikey": OCR_API_KEY },
        body: (() => {
          const formData = new FormData();
          formData.append("base64Image", croppedImage);
          formData.append("language", "eng");
          formData.append("isOverlayRequired", "true");
          return formData;
        })()
      })
      .then(res => res.json())
      .then(async (result) => {
        console.log("📥 OCR API Response:", result);
        let fullText = result?.ParsedResults?.[0]?.ParsedText || '';
        document.getElementById('ocr-result').textContent = fullText || 'No text found.';

        lastOcrLines = result?.ParsedResults?.[0]?.TextOverlay?.Lines || [];
        console.log("📏 Detected lines:", lastOcrLines.length);

        // First render with default selected language
        const targetLang = document.getElementById('target-lang').value;
        renderTranslation(targetLang);
      })
      .catch(err => {
        document.getElementById('ocr-result').textContent = 'Error during OCR.';
        console.error(err);
      });
    };

    image.src = data.fullScreenshot;
  });
});
