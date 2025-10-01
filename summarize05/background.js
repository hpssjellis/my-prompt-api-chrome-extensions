// Set the default behavior to always show the side panel across all hosts
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Error setting side panel behavior:", error));
});

// Optional: You can add logic here to open the side panel when the user clicks the extension icon.
// The "openPanelOnActionClick: true" above usually handles this, but you can explicitly use:
/*
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
*/