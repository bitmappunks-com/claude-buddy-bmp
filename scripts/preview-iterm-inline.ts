// Preview the vendored BitmapPunks companion as ANSI terminal art.
// Usage:
//   bun run scripts/preview-iterm-inline.ts                     # default base + default item
//   bun run scripts/preview-iterm-inline.ts 100-solana_male     # explicit base
//   bun run scripts/preview-iterm-inline.ts 100-solana_male 1-420 fullcell
import {
  DEFAULT_BITMAP_BASE,
  DEFAULT_BITMAP_ITEM,
  buildBitmapStatusArt,
} from "../server/bitmappunk-avatar.ts";

type PreviewMode = "halfblock" | "fullcell" | "auto";

function normalizeMode(value: string | undefined): PreviewMode {
  if (value === "halfblock" || value === "fullcell") return value;
  return "auto";
}

const baseKey = process.argv[2] ?? DEFAULT_BITMAP_BASE;
const itemKey = process.argv[3] ?? DEFAULT_BITMAP_ITEM;
const mode = normalizeMode(process.argv[4]);
const status = buildBitmapStatusArt(baseKey, itemKey);
const frame =
  mode === "halfblock"
    ? status.framesHalfblock[0]
    : mode === "fullcell"
      ? status.framesFullcell[0]
      : status.frames[0];

console.log(`# BitmapPunks preview`);
console.log(`# base=${status.bitmapBase} item=${status.bitmapItem ?? "none"} mode=${mode}`);
console.log();
console.log(frame);
