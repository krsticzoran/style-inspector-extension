# Style Inspector

A small Chrome extension that shows the computed styles of whatever element is under the
cursor — font family, size, weight, line-height, letter-spacing, text color and
background color — in a tooltip that follows the mouse.

## Why this exists

This is a personal developer tool. I built it for my own day-to-day work, not as a
product, and it is shaped by what I actually need rather than by what a general-purpose
extension ought to have.

The plan is deliberately narrow:

1. **First, get the fundamentals right** — reading text styles off an element and showing
   them clearly and quickly. That is the core of the tool and most of what I need on a
   normal day.
2. **Then grow it on demand.** When a real need shows up while I'm working — some other
   property I keep having to dig for in DevTools, a different way of copying a value, a
   shortcut that saves a few seconds — that becomes the next feature.

So there is no roadmap of features waiting to be built. New functionality gets added when
the work itself asks for it. If nothing is missing, nothing gets added.

## Installation

The extension is not on the Chrome Web Store; it is loaded unpacked.

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked** and select this project folder.

The extension activates on every page. After installing, reload any tabs that were
already open.

## Usage

Hover over any text and the tooltip appears next to the cursor with that element's
computed styles.

`Alt + S` (`Option + S` on macOS) turns the inspector off and on. The switch is
remembered: it applies to every tab at once and survives reloads and restarts, so it is
pressed once when you are done inspecting and once when you start again.

## Tech

Manifest V3, one content script, no permissions, no dependencies, no build step.
