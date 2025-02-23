import { exampleThemeStorage } from '@extension/storage';
import 'webextension-polyfill';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('message', message);
  if (message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
      console.log('dataUrl', dataUrl);
      sendResponse(dataUrl);
    });
    return true; // Required to use sendResponse asynchronously
  }
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
