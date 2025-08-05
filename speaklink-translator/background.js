chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'areaSelected') {
    const tabId = sender.tab.id;

    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'cropImage',
        dataUrl,
        rect: message.rect,
        devicePixelRatio: message.devicePixelRatio
      });
    });
  }
});
