// Style Inspector - background service worker
// Receives the toggle shortcut registered under "commands" in the manifest. Chrome itself
// catches the key, so pages cannot swallow it and the user can rebind it at
// chrome://extensions/shortcuts.

// Must match content.js: the key the on/off state lives under, and the default a fresh
// profile starts with.
const STORAGE_KEY = "enabled";
const DEFAULT_ENABLED = true;

// The icon carries the state, so it can be read without opening the popup. Only the "off"
// case is marked: a badge on every tab all day would be noise, and off is the state worth
// noticing, since it explains why nothing happens on hover.
async function paintBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "" : "off" });
  await chrome.action.setBadgeBackgroundColor({ color: "#4a4d52" });
}

async function paintBadgeFromStorage() {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
  await paintBadge(stored[STORAGE_KEY]);
}

// The badge does not survive the service worker going idle, so it is repainted on every
// wake-up event as well as whenever the state changes.
chrome.runtime.onStartup.addListener(paintBadgeFromStorage);
chrome.runtime.onInstalled.addListener(paintBadgeFromStorage);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  paintBadge(changes[STORAGE_KEY].newValue);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-inspector") return;

  // Write only. The storage listener in content.js is what flips the inspector in every
  // open tab, so the shortcut needs no messaging of its own.
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
  await chrome.storage.local.set({ [STORAGE_KEY]: !stored[STORAGE_KEY] });
});
