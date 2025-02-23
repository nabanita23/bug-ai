import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
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
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const aiCaptureButton = 'popup/ai-capture-button.png';
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
    <div className={`p-4 ${isLight ? 'bg-slate-50' : 'bg-gray-950'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="flex space-x-2 items-center">
          <img src={chrome.runtime.getURL(logo)} className="bug-ai-logo" alt="bug-ai-logo" />
          <div>
            <h1 className="font-extrabold text-lg">BugAI</h1>
            <small className="text-xs">AI bug tracker</small>
          </div>
        </div>
      </header>

      <div className="flex my-4 border border-dashed rounded-xl items-center justify-center h-56">
        <div className="relative flex items-center justify-center h-full w-full p-2">
          {screenshot ? (
            <div>
              <img src={screenshot} alt="Captured Screenshot" className="screenshot-preview" />
              <button
                className="absolute right-0 top-0 px-2 py-1 m-1 rounded-lg border border-dashed hover:scale-105"
                onClick={() => setScreenshot(null)}>
                Reset
              </button>
            </div>
          ) : (
            <button className="text-center" onClick={startScreenshotSelection}>
              <img src={chrome.runtime.getURL(aiCaptureButton)} className="h-28" alt="ai-capture-btn" />
              <p className="text-gray-600 text-xs">Capture Screen</p>
            </button>
          )}
        </div>
      </div>

      <span className="flex rounded-full">
        <button
          disabled={!screenshot}
          type="button"
          className="flex-1 items-center rounded-l-full px-3 py-2 text-sm font-semibold text-gray-900 border hover:bg-gray-50 focus:z-10">
          Run AI/LLM
        </button>
        <button
          disabled={!screenshot}
          type="button"
          className="flex-1 -ml-px items-center rounded-r-full px-3 py-2 text-sm font-semibold text-gray-900 border hover:bg-gray-50 focus:z-10">
          Create JIRA
        </button>
      </span>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occurred</div>);
