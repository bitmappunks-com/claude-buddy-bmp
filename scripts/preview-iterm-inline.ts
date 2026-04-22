// Preview the avatar via iTerm2's inline-image protocol (OSC 1337 File=).
// Works in iTerm2, WezTerm, and Konsole; no-op / garbled elsewhere.
// Usage:
//   bun run scripts/preview-iterm-inline.ts              # default 24ch × 24ch
//   bun run scripts/preview-iterm-inline.ts 32ch 16ch    # explicit cell units
//   bun run scripts/preview-iterm-inline.ts 192 192      # explicit pixel units
//   bun run scripts/preview-iterm-inline.ts auto auto    # native size
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GIF_PATH = join(HERE, "..", "assets", "hello.gif");

const bytes = readFileSync(GIF_PATH);
const b64 = bytes.toString("base64");
const nameB64 = Buffer.from("hello.gif").toString("base64");

const widthArg = process.argv[2] ?? "24ch";
const heightArg = process.argv[3] ?? "24ch";

const params = [
  "inline=1",
  `name=${nameB64}`,
  `size=${bytes.byteLength}`,
  `width=${widthArg}`,
  `height=${heightArg}`,
  "preserveAspectRatio=1",
].join(";");

const esc = `\x1b]1337;File=${params}:${b64}\x07`;

console.log(`# iTerm2 inline image  |  ${GIF_PATH}  |  ${bytes.byteLength} B`);
console.log(`# width=${widthArg} height=${heightArg}  (suffix with 'ch' for cells, plain number = pixels, '100%' = percentage, 'auto' = native)`);
console.log();
process.stdout.write(esc);
console.log();
