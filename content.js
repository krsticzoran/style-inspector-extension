// Style Inspector - content script
// This file is automatically injected into EVERY page you visit (because of "matches": ["<all_urls>"] in the manifest)

let tooltip = null;
// Off by default: the inspector stays out of the way until Alt+S turns it on.
let enabled = false;

// Create the tooltip element once and keep it hidden until needed
function createTooltip() {
  const el = document.createElement("div");
  el.id = "style-inspector-tooltip";
  document.body.appendChild(el);
  return el;
}

function formatColor(value) {
  return value;
}

function showTooltip(target, x, y) {
  const style = window.getComputedStyle(target);

  const fontFamily = style.fontFamily;
  const fontSize = style.fontSize;
  const fontWeight = style.fontWeight;
  const lineHeight = style.lineHeight;
  const color = style.color;
  const bgColor = style.backgroundColor;
  const letterSpacing = style.letterSpacing;

  tooltip.innerHTML = `
    <div class="si-row"><span class="si-label">font</span> ${fontFamily}</div>
    <div class="si-row"><span class="si-label">size</span> ${fontSize} / weight ${fontWeight}</div>
    <div class="si-row"><span class="si-label">line-height</span> ${lineHeight}</div>
    <div class="si-row"><span class="si-label">letter-spacing</span> ${letterSpacing}</div>
    <div class="si-row">
      <span class="si-label">color</span>
      <span class="si-swatch" style="background:${color}"></span> ${formatColor(color)}
    </div>
    <div class="si-row">
      <span class="si-label">bg</span>
      <span class="si-swatch" style="background:${bgColor}"></span> ${formatColor(bgColor)}
    </div>
  `;

  tooltip.style.display = "block";

  // Position the tooltip next to the cursor, making sure it stays on screen
  const offset = 16;
  let left = x + offset;
  let top = y + offset;

  const rect = tooltip.getBoundingClientRect();
  if (left + rect.width > window.innerWidth) {
    left = x - rect.width - offset;
  }
  if (top + rect.height > window.innerHeight) {
    top = y - rect.height - offset;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  if (tooltip) tooltip.style.display = "none";
}

// Elements we ignore (showing styles for them makes no sense)
const IGNORED_TAGS = new Set(["HTML", "BODY", "SCRIPT", "STYLE"]);

document.addEventListener("mousemove", (e) => {
  if (!enabled) return;

  const target = e.target;
  if (!target || IGNORED_TAGS.has(target.tagName)) {
    hideTooltip();
    return;
  }
  if (target.id === "style-inspector-tooltip") return; // ignore the tooltip itself

  if (!tooltip) tooltip = createTooltip();
  showTooltip(target, e.clientX, e.clientY);
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

  enabled = !enabled;
  if (!enabled) hideTooltip();
});
