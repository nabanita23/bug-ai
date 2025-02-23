import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ToggleButton } from '@extension/ui';
import '@src/Popup.css';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    startSelection?: () => void;
  }
}

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/index.iife.js'],
      });
    } catch (err: any) {
      console.error('Error injecting content script:', err);
      chrome.notifications.create('inject-error', notificationOptions);
    }
  };

  const startScreenshotSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await injectContentScript(); // Inject content script

      // Now execute the function, ensuring it's available
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (typeof window.startSelection === 'function') {
            window.startSelection();
            return { success: true };
          }
          return { success: false, error: 'startSelection is not available' };
        },
      });

      if (!result?.result?.success) {
        console.error('Error executing startSelection:', result?.result?.error);
      }
    } catch (err) {
      console.error('Error executing startSelection:', err);
    }
  };

  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('message in popup', message);
      if (message.action === 'capturedImage') {
        setScreenshot(message.image);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button
          className={`font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ${
            isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white'
          }`}
          onClick={injectContentScript}>
          Inject Content Script
        </button>

        <button
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded shadow hover:scale-105"
          onClick={startScreenshotSelection}>
          Capture Screenshot
        </button>

        {screenshot && (
          <div className="popup-modal">
            <img src={screenshot} alt="Captured Screenshot" className="screenshot-preview" />
            <button
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded shadow hover:scale-105"
              onClick={() => setScreenshot(null)}>
              Close
            </button>
          </div>
        )}

        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occurred</div>);
