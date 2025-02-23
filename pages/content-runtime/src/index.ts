import { mount } from '@src/Root';

declare global {
  interface Window {
    __selectionHandlerAdded?: boolean;
    startSelection?: () => void;
  }
}

const captureScreen = (left: number, top: number, width: number, height: number) => {
  console.log('Selection:', left, top, width, height);

  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, dataUrl => {
    if (!dataUrl) {
      console.error('Failed to capture screen.');
      return;
    }

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const scale = window.devicePixelRatio; // Fix for high-DPI displays
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(
          img,
          left * scale,
          top * scale,
          width * scale,
          height * scale,
          0,
          0,
          width * scale,
          height * scale,
        );

        const croppedImage = canvas.toDataURL('image/png');
        chrome.runtime.sendMessage({ action: 'capturedImage', image: croppedImage });
      }
    };
  });
};

(() => {
  if (window.__selectionHandlerAdded) return;
  window.__selectionHandlerAdded = true;

  window.startSelection = () => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '10000';
    overlay.style.cursor = 'crosshair';
    document.body.appendChild(overlay);

    let startX: number, startY: number, endX: number, endY: number;
    const selectionRect = document.createElement('div');
    selectionRect.style.position = 'fixed';
    selectionRect.style.background = 'rgba(3,7,18,0.2)';
    selectionRect.style.zIndex = '10001';
    document.body.appendChild(selectionRect);

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      endX = e.clientX;
      endY = e.clientY;
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      selectionRect.style.width = `${width}px`;
      selectionRect.style.height = `${height}px`;
      selectionRect.style.left = `${left}px`;
      selectionRect.style.top = `${top}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);

      document.body.removeChild(overlay);
      document.body.removeChild(selectionRect);
      captureScreen(left, top, width, height);
    };

    overlay.addEventListener('mousedown', onMouseDown);
  };
})();

mount();
console.log('Runtime script loaded');
