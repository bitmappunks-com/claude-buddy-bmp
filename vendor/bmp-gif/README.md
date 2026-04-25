# bmp-gif

Pixel-art animation system for BitmapPunks 24×24 avatars. Two animation kinds
— **BASE actions** (blink / move) and **ITEM animations** (smoke, fire, drip,
inflate) — that composite onto a character to produce 8-frame loopable previews.

## ITEM animations

14 ITEMs across 4 archetypes. Each row is 8 frames, left to right.

![Item animations](docs/item-contact.png)

## BASE actions

Each action rendered against every BASE (frames: `[0, 1, 0]` — neutral →
changed → neutral).

### blink

![Blink across all bases](docs/blink-contact.png)

### move

![Move across all bases](docs/move-contact.png)

## Layout

```
traits/
  BASE/<id>-<name>/
    trait.json          # palette + layerPixels (24×24 source)
    preview.png
  ITEM/<id>-<name>/
    trait.json          # source pixels
    anim.json           # 8 hand-authored frames (source of truth)
    sheet.png           # 8 frames side-by-side, transparent bg
    preview.gif         # 8 frames composited onto a reference BASE
  EYEWEAR/<id>-<name>/
  BACKDROP/<id>-<name>/

actions/
  blink/action.json     # BASE eye-close: ops that set 2 pupil pixels to black
  move/action.json      # BASE eye-move: swap pupil with its right neighbor
  README.md             # op schema (set / swap, anchors, frames, states)

docs/                   # contact sheets shown above
ANIMATION-SPEC.md       # ITEM archetypes and output contract
apply-action.py         # apply one action to one BASE
batch-apply.py          # apply every action to every BASE, build contact sheets
render-anim.py          # render preview.gif + sheet.png from an ITEM's anim.json
build-contact-sheet.py  # assemble all ITEM animations into one contact sheet
```

## Archetypes

| Archetype | Items | Behavior |
|---|---|---|
| smoke   | 1, 1720, 1721 | source fixed, sway grows with height, irregular jitter |
| fire    | 1722–1725 | root stable, mid flicker, tip drops and extends |
| drip    | 1731–1735 | blank → progressive flow down / mouth bead → stretch → break → reform |
| inflate | 1744, 1749 | 1744: from mouth → grow → pop (scatter + snap-back strand); 1749: from nose → breathe small↔big↔small |

## Regenerating artifacts

```
# one ITEM preview.gif + sheet.png
python3 render-anim.py 1720

# every ITEM
python3 render-anim.py

# BASE actions (blink/move across every BASE)
python3 batch-apply.py

# a single contact sheet of every ITEM animation grouped by archetype
python3 build-contact-sheet.py
```

The Python scripts require Pillow (`pip install pillow`). `anim.json` is
hand-authored — the render pipeline treats it as the source of truth.
