// Preview the vendored BitmapPunks companion as ANSI terminal art.
// Usage:
//   bun run scripts/preview-iterm-inline.ts                     # default base
//   bun run scripts/preview-iterm-inline.ts 100-solana_male     # explicit base
//   bun run scripts/preview-iterm-inline.ts 100-solana_male fullcell
import {
  DEFAULT_BITMAP_BASE,
  buildBitmapStatusArt,
} from "../server/bitmappunk-avatar.ts";

function normalizeMode(value: string | undefined): "halfblock" | "fullcell" {
  return value === "fullcell" ? "fullcell" : "halfblock";
}

const baseKey = process.argv[2] ?? DEFAULT_BITMAP_BASE;
const mode = normalizeMode(process.argv[3]);
const status = buildBitmapStatusArt(baseKey);
const frame = mode === "halfblock" ? status.framesHalfblock[0] : status.framesFullcell[0];

console.log(`# BitmapPunks preview`);
console.log(`# base=${status.bitmapBase} item=${status.bitmapItem ?? "auto"} mode=${mode}`);
console.log();
console.log(frame);
