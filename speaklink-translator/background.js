console.log("background.js loaded");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("background.js received message:", message);

  if (message.action === 'areaSelected') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      chrome.storage.local.set({
        fullScreenshot: dataUrl,
        cropRect: message.rect,
        devicePixelRatio: message.devicePixelRatio
      }, () => {
        console.log("✅ Screenshot + selection saved.");
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'startSelection') {
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

      sendResponse({ started: true });
    });
    return true;
  }
});

