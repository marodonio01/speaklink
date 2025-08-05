// selection.js
window.startSelection = () => {
  const selectionDiv = document.createElement('div');
  selectionDiv.style.position = 'fixed';
  selectionDiv.style.border = '2px dashed red';
  selectionDiv.style.zIndex = 9999;
  selectionDiv.style.backgroundColor = 'rgba(255,0,0,0.2)';
  document.body.appendChild(selectionDiv);

  let startX, startY;

  const onMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;

    selectionDiv.style.left = startX + 'px';
    selectionDiv.style.top = startY + 'px';
    selectionDiv.style.width = '0px';
    selectionDiv.style.height = '0px';

    const onMouseMove = (e) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      selectionDiv.style.width = Math.abs(currentX - startX) + 'px';
      selectionDiv.style.height = Math.abs(currentY - startY) + 'px';
      selectionDiv.style.left = Math.min(currentX, startX) + 'px';
      selectionDiv.style.top = Math.min(currentY, startY) + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const rect = selectionDiv.getBoundingClientRect();
      document.body.removeChild(selectionDiv);

      chrome.runtime.sendMessage({
        action: 'areaSelected',
        rect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        devicePixelRatio: window.devicePixelRatio
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousedown', onMouseDown, { once: true });
};
