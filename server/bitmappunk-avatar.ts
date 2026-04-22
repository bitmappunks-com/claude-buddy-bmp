import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const HELLO_BITMAPPUNK_SVG_PATH = join(MODULE_DIR, "..", "assets", "hello.svg");
export const HELLO_BITMAPPUNK_SVG = readFileSync(HELLO_BITMAPPUNK_SVG_PATH, "utf8");

const ANSI_RE = /\x1b\[[0-9;]*m/g;

type RGBA = [number, number, number, number];
type RenderMode = "halfblock" | "fullcell";

function parseHex(fill: string): RGBA {
  const h = fill.replace("#", "");
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      255,
    ];
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16),
    ];
  }
  throw new Error(`bad color: ${fill}`);
}

function getSvgSize(svg: string): { width: number; height: number } {
  const vb = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+(\d+)\s+(\d+)\s*"/);
  if (vb) return { width: +vb[1], height: +vb[2] };
  return {
    width: +(svg.match(/width="(\d+)"/)?.[1] ?? 0),
    height: +(svg.match(/height="(\d+)"/)?.[1] ?? 0),
  };
}

function buildPixelGrid(svg: string): RGBA[][] {
  const { width, height } = getSvgSize(svg);
  const grid: RGBA[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [0, 0, 0, 0] as RGBA),
  );
  const re = /d="M(\d+) (\d+)v1h(\d+)v-1"[^>]*fill="(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))"/g;
  for (const m of svg.matchAll(re)) {
    const x = +m[1];
    const y = +m[2];
    const w = +m[3];
    const c = parseHex(m[4]);
    for (let col = x; col < Math.min(x + w, width); col++) grid[y][col] = c;
  }
  return grid;
}

// ─── Render-mode detection ──────────────────────────────────────────────────
// halfblock: compact (H/2 rows) but requires cell width:height ≈ 1:2 to look
//   square, so use it only in terminals where half-block glyphs tile cleanly.
// fullcell:  larger (2W × H cells) but uses only space + bg color, so it
//   renders without seams on terminals that add line spacing (Apple Terminal)
//   or have a non-1:2 cell aspect.
export function detectRenderMode(env: NodeJS.ProcessEnv = process.env): RenderMode {
  const forced = env.BUDDY_AVATAR_RENDER;
  if (forced === "halfblock" || forced === "fullcell") return forced;

  const termProgram = (env.TERM_PROGRAM ?? "").toLowerCase();
  if (
    termProgram === "iterm.app" ||
    termProgram === "wezterm" ||
    termProgram === "ghostty" ||
    termProgram === "alacritty"
  ) {
    return "halfblock";
  }

  const term = (env.TERM ?? "").toLowerCase();
  if (term.includes("kitty") || term.includes("alacritty")) return "halfblock";

  return "fullcell";
}

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const bg = (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`;
const RESET = "\x1b[0m";

function renderHalfBlock(grid: RGBA[][]): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const rows: string[] = [];
  for (let y = 0; y < h; y += 2) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      const b = grid[y + 1]?.[x] ?? ([0, 0, 0, 0] as RGBA);
      if (t[3] === 0 && b[3] === 0) {
        line += " ";
      } else if (t[3] > 0 && b[3] > 0) {
        line += `${fg(t[0], t[1], t[2])}${bg(b[0], b[1], b[2])}▀${RESET}`;
      } else if (t[3] > 0) {
        line += `${fg(t[0], t[1], t[2])}▀${RESET}`;
      } else {
        line += `${fg(b[0], b[1], b[2])}▄${RESET}`;
      }
    }
    rows.push(line);
  }
  return rows;
}

function renderFullCell(grid: RGBA[][]): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const p = grid[y][x];
      if (p[3] === 0) {
        line += "  ";
      } else {
        line += `${bg(p[0], p[1], p[2])}  ${RESET}`;
      }
    }
    rows.push(line);
  }
  return rows;
}

export function renderSvg(svg: string, mode: RenderMode = detectRenderMode()): string[] {
  const grid = buildPixelGrid(svg);
  return mode === "halfblock" ? renderHalfBlock(grid) : renderFullCell(grid);
}

// Bake BOTH render variants at server startup so a single status.json can
// feed multiple terminals with different cell aspects / glyph behavior. The
// shell-side statusline picks the variant matching its own env. Without this,
// the server would lock in whichever mode the first terminal to start Claude
// happened to have, and subsequent terminals would render wrong.
export const HELLO_BITMAPPUNK_FRAME_HALFBLOCK = renderSvg(HELLO_BITMAPPUNK_SVG, "halfblock");
export const HELLO_BITMAPPUNK_FRAME_FULLCELL = renderSvg(HELLO_BITMAPPUNK_SVG, "fullcell");

export const HELLO_BITMAPPUNK_RENDER_MODE = detectRenderMode();
export const HELLO_BITMAPPUNK_FRAME =
  HELLO_BITMAPPUNK_RENDER_MODE === "halfblock"
    ? HELLO_BITMAPPUNK_FRAME_HALFBLOCK
    : HELLO_BITMAPPUNK_FRAME_FULLCELL;
export const HELLO_BITMAPPUNK_FRAME_WIDTH = HELLO_BITMAPPUNK_FRAME.reduce(
  (max, line) => Math.max(max, line.replace(ANSI_RE, "").length),
  0,
);

const replicate = (frame: string[]): string[][] => [frame, frame, frame].map((f) => f.map((l) => l));
export const HELLO_BITMAPPUNK_FRAMES_HALFBLOCK = replicate(HELLO_BITMAPPUNK_FRAME_HALFBLOCK);
export const HELLO_BITMAPPUNK_FRAMES_FULLCELL = replicate(HELLO_BITMAPPUNK_FRAME_FULLCELL);
export const HELLO_BITMAPPUNK_FRAMES =
  HELLO_BITMAPPUNK_RENDER_MODE === "halfblock"
    ? HELLO_BITMAPPUNK_FRAMES_HALFBLOCK
    : HELLO_BITMAPPUNK_FRAMES_FULLCELL;
