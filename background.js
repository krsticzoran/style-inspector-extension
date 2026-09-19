// Style Inspector - background service worker
// Receives the toggle shortcut registered under "commands" in the manifest. Chrome itself
// catches the key, so pages cannot swallow it and the user can rebind it at
// chrome://extensions/shortcuts.

// Must match content.js: the key the on/off state lives under, and the default a fresh
// profile starts with.
const STORAGE_KEY = "enabled";
const DEFAULT_ENABLED = true;

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-inspector") return;

  // Write only. The storage listener in content.js is what flips the inspector in every
  // open tab, so the shortcut needs no messaging of its own.
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
  await chrome.storage.local.set({ [STORAGE_KEY]: !stored[STORAGE_KEY] });
});
