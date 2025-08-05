chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'cropImage') {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scale = message.devicePixelRatio || 1;
      const rect = message.rect;

      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      ctx.drawImage(
        img,
        rect.x * scale,
        rect.y * scale,
        rect.width * scale,
        rect.height * scale,
        0,
        0,
        rect.width * scale,
        rect.height * scale
      );

      const croppedImage = canvas.toDataURL('image/png');
      chrome.storage.local.set({ croppedImage }, () => {
        console.log("✅ Cropped image saved to storage.");
      });
    };
    img.src = message.dataUrl;
  }
});
