// Style Inspector - toolbar popup
// A second way into the same on/off state the shortcut writes: everything here reads from
// and writes to chrome.storage, and never talks to a tab directly.

// Must match content.js and background.js.
const STORAGE_KEY = "enabled";
const DEFAULT_ENABLED = true;

const toggle = document.getElementById("toggle");
const state = document.getElementById("state");

function render(enabled) {
  toggle.checked = enabled;
  state.textContent = enabled ? "Inspector on" : "Inspector off";
}

chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED }, (stored) => {
  render(stored[STORAGE_KEY]);
});

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEY]: toggle.checked });
});

// The popup can be open while the shortcut is pressed, so follow storage rather than
// assuming this switch is the only thing changing the state.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  render(changes[STORAGE_KEY].newValue);
});

// Show the shortcut the user actually has, which may have been rebound at
// chrome://extensions/shortcuts, or left unassigned if it clashed with something.
chrome.commands.getAll((commands) => {
  const command = commands.find((c) => c.name === "toggle-inspector");
  if (command && command.shortcut) document.getElementById("shortcut").textContent = command.shortcut;
});
