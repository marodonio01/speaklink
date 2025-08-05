chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'areaSelected') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      chrome.storage.local.set({
        fullScreenshot: dataUrl,
        cropRect: message.rect,
        devicePixelRatio: message.devicePixelRatio
      }, () => {
        console.log("✅ Screenshot + selection saved.");
      });
    });
  }
});
