// Style Inspector - content script
// This file is automatically injected into EVERY page you visit (because of "matches": ["<all_urls>"] in the manifest)

// Not the default — a fail-safe. The stored value is read at the bottom of this file,
// and that read is asynchronous, so every page load has a brief moment before it lands.
// Staying off during that moment is what stops the tooltip from flashing on every page
// while the inspector is switched off. The actual default lives in that read.
let enabled = false;

// Where the on/off state lives, shared by every tab and kept across restarts.
const STORAGE_KEY = "enabled";

// How long the pointer has to rest on an element before the tooltip appears.
// Short enough to feel instant, long enough that sweeping across a page shows nothing.
const SHOW_DELAY = 100;

// Distance between the cursor and the corner of the tooltip.
const CURSOR_OFFSET = 16;

// The rows the tooltip is made of, in display order. Built once in createTooltip(),
// then updated in place — no innerHTML rebuilds while the mouse moves.
//
// Each row describes itself completely, so adding a property to the tooltip is one
// line here and nothing anywhere else:
//   label   what the left column says
//   get     how the raw value is read, from the computed style and the element
//   format  optional, how that raw value is turned into what the user reads
//   swatch  optional, whether the row gets a colour square (which uses the raw value,
//           not the formatted one, since the browser is the one painting it)
const ROWS = [
  { label: "font",           get: (s) => s.fontFamily },
  { label: "size",           get: (s) => `${s.fontSize} / weight ${s.fontWeight}` },
  { label: "line-height",    get: (s) => s.lineHeight },
  { label: "letter-spacing", get: (s) => s.letterSpacing },
  { label: "color",          get: (s) => s.color,           format: formatColor, swatch: true },
  { label: "bg",             get: (s) => s.backgroundColor, format: formatColor, swatch: true },
];

let tooltip = null; // the container element, created lazily on first use
let fields = null; // one { value, swatch } per ROWS entry, same order

let visible = false; // whether the tooltip is currently shown
let shownTarget = null; // the element the tooltip is currently describing
let restingTarget = null; // the element the pointer is on right now
let showTimer = null; // debounce timer for measuring and showing
let frameQueued = false; // throttle guard for repositioning

let pointerX = 0;
let pointerY = 0;
let width = 0; // tooltip size, measured once per content change
let height = 0;

// Elements we ignore (showing styles for them makes no sense)
const IGNORED_TAGS = new Set(["HTML", "BODY", "SCRIPT", "STYLE"]);

// Create the tooltip element once and keep it hidden until needed
function createTooltip() {
  tooltip = document.createElement("div");
  tooltip.id = "style-inspector-tooltip";
  fields = [];

  for (const { label, swatch } of ROWS) {
    const row = document.createElement("div");
    row.className = "si-row";

    const labelEl = document.createElement("span");
    labelEl.className = "si-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    let swatchEl = null;
    if (swatch) {
      swatchEl = document.createElement("span");
      swatchEl.className = "si-swatch";
      row.appendChild(swatchEl);
    }

    const valueEl = document.createElement("span");
    row.appendChild(valueEl);

    tooltip.appendChild(row);
    fields.push({ value: valueEl, swatch: swatchEl });
  }

  document.body.appendChild(tooltip);
}

// getComputedStyle always reports colours as rgb()/rgba(). Hex is shorter and is what
// you actually want to paste into a stylesheet or a design tool.
function formatColor(value) {
  const parts = value.match(/^rgba?\(([^)]+)\)$/);
  if (!parts) return value; // some other notation (e.g. color(srgb ...)) - leave it alone

  const [r, g, b, a = 1] = parts[1].split(",").map((n) => parseFloat(n));
  if (a === 0) return "transparent";

  const hex = [r, g, b]
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("");

  // #aabbcc can be written as #abc
  const short = /^(.)\1(.)\2(.)\3$/.test(hex) ? hex[0] + hex[2] + hex[4] : hex;

  if (a === 1) return `#${short}`;
  return `#${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}

// The expensive half: read the element's styles and write them into the rows.
// Only ever called from the debounce timer, and only when the element has changed.
function updateContent(target) {
  const style = window.getComputedStyle(target);

  ROWS.forEach((row, i) => {
    const field = fields[i];
    const raw = row.get(style, target);

    field.value.textContent = row.format ? row.format(raw) : raw;
    if (field.swatch) field.swatch.style.background = raw;
  });
}

// The cheap half: two style writes, safe to run on every frame.
// Sits below-right of the cursor, and flips to the other side rather than leaving the screen.
function position() {
  let left = pointerX + CURSOR_OFFSET;
  let top = pointerY + CURSOR_OFFSET;

  if (left + width > window.innerWidth) left = pointerX - width - CURSOR_OFFSET;
  if (top + height > window.innerHeight) top = pointerY - height - CURSOR_OFFSET;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Throttle: at most one reposition per repaint, always using the freshest coordinates.
function queueReposition() {
  if (frameQueued) return;
  frameQueued = true;

  requestAnimationFrame(() => {
    frameQueued = false;
    if (visible) position();
  });
}

// Fired by the debounce timer once the pointer has rested on an element.
function show() {
  showTimer = null;
  if (!enabled || !restingTarget) return;

  if (!tooltip) createTooltip();

  if (restingTarget !== shownTarget) {
    shownTarget = restingTarget;
    updateContent(shownTarget);
  }

  if (!visible) {
    tooltip.style.display = "block";
    visible = true;
  }

  // Measuring needs the final content and a laid-out element, so it happens here
  // rather than on every frame.
  const rect = tooltip.getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  position();
}

function hideTooltip() {
  clearTimeout(showTimer);
  showTimer = null;
  restingTarget = null;
  shownTarget = null;
  visible = false;
  if (tooltip) tooltip.style.display = "none";
}

document.addEventListener("mousemove", (e) => {
  if (!enabled) return;

  pointerX = e.clientX;
  pointerY = e.clientY;

  const target = e.target;
  if (!target || IGNORED_TAGS.has(target.tagName)) {
    hideTooltip();
    return;
  }

  // A new element restarts the delay; the tooltip only appears once the pointer settles.
  if (target !== restingTarget) {
    restingTarget = target;
    clearTimeout(showTimer);
    showTimer = setTimeout(show, SHOW_DELAY);
  }

  // Once shown, it follows the cursor without waiting for anything.
  if (visible) queueReposition();
});

document.addEventListener("mouseleave", hideTooltip);

// Alt+S (Option+S on macOS) to toggle the inspector on/off on the fly.
// Match on e.code, the physical key, instead of e.key: on macOS, holding Option
// changes the character produced, so Option+S reports e.key === "ß", never "s".
document.addEventListener("keydown", (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.code !== "KeyS") return;

  // Without this, Option+S types "ß" into whatever field has focus.
  e.preventDefault();

  // Write only. The storage listener below is what actually flips `enabled`,
  // here and in every other open tab, so there is one path into the state.
  chrome.storage.local.set({ [STORAGE_KEY]: !enabled });
});

// Pick up the stored state on load. The fallback here is the real default, and it only
// ever applies on a fresh profile: once the shortcut has been pressed even once, the
// stored value wins from then on.
chrome.storage.local.get({ [STORAGE_KEY]: true }, (stored) => {
  enabled = stored[STORAGE_KEY];
});

// Toggling in one tab has to reach all the others, otherwise every tab keeps its own
// stale copy of the state and the shortcut stops being predictable.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;

  enabled = changes[STORAGE_KEY].newValue;
  if (!enabled) hideTooltip();
});
