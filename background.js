chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "open-shortcut-target" || typeof message.url !== "string") {
    return false;
  }

  handleOpenShortcutTarget(message.url)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Failed to open shortcut target", error);
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

  return true;
});

async function handleOpenShortcutTarget(url) {
  await chrome.tabs.create({ url });
}
