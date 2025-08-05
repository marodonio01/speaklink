if (!window.startSelection) {
  window.startSelection = () => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      cursor: 'crosshair',
      backgroundColor: 'rgba(0,0,0,0.1)'
    });
    document.body.appendChild(overlay);

    let startX, startY, selectionBox;

    overlay.addEventListener('mousedown', (e) => {
      startX = e.pageX;
      startY = e.pageY;

      selectionBox = document.createElement('div');
      Object.assign(selectionBox.style, {
        position: 'absolute',
        border: '2px dashed #000',
        backgroundColor: 'rgba(255,255,255,0.3)',
        zIndex: 10000
      });
      overlay.appendChild(selectionBox);

      const onMouseMove = (moveEvent) => {
        const x = Math.min(moveEvent.pageX, startX);
        const y = Math.min(moveEvent.pageY, startY);
        const width = Math.abs(moveEvent.pageX - startX);
        const height = Math.abs(moveEvent.pageY - startY);

        Object.assign(selectionBox.style, {
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`
        });
      };

      const onMouseUp = () => {
        overlay.remove();
        const rect = selectionBox.getBoundingClientRect();

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

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  };
}
