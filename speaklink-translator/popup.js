document.getElementById('startCapture').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // Inject selection + cropper before starting selection
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['selection.js', 'cropper.js']
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.startSelection && window.startSelection()
      });
    });
  });
});

// Listen for new cropped image
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.croppedImage?.newValue) {
    showImageAndRunOCR(changes.croppedImage.newValue);
  }
});

// On load, check if there’s already an image saved
window.addEventListener('DOMContentLoaded', () => {
  console.log("Tesseract available:", typeof Tesseract);
  chrome.storage.local.get(['croppedImage'], (data) => {
    if (data.croppedImage) {
      showImageAndRunOCR(data.croppedImage);
    }
  });
});

function showImageAndRunOCR(imageData) {
  const resultDiv = document.getElementById('result');
  const ocrOutput = document.getElementById('ocr-result');

  resultDiv.innerHTML = '';

  const img = new Image();
  img.onload = () => {
    console.log("✅ Cropped image loaded, starting OCR...");
    Tesseract.recognize(imageData, 'eng')
      .then(({ data: { text } }) => {
        console.log("OCR Result:", text);
        ocrOutput.textContent = text || 'No text found.';
      })
      .catch(err => {
        ocrOutput.textContent = 'Error during OCR.';
        console.error(err);
      });
  };
  img.onerror = () => {
    console.error("❌ Failed to load cropped image for OCR.");
    ocrOutput.textContent = 'Error loading image.';
  };

  img.src = imageData;
  img.style.maxWidth = '100%';
  img.style.border = '1px solid #ccc';
  img.style.marginTop = '10px';
  resultDiv.appendChild(img);
}
