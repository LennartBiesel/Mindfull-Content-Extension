chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/watch')) {
        // Send message to content.js or display a notification
        chrome.tabs.sendMessage(tabId, {action: "checkVideoIntent"});
    }
});
