import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const HELLO_BITMAPPUNK_SVG_PATH = join(MODULE_DIR, "..", "assets", "hello.svg");
export const HELLO_BITMAPPUNK_SVG = readFileSync(HELLO_BITMAPPUNK_SVG_PATH, "utf8");

function parseHexColor(fill: string): [number, number, number, number] {
  const hex = fill.replace("#", "");

  if (hex.length === 6) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      255,
    ];
  }

  if (hex.length === 8) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      Number.parseInt(hex.slice(6, 8), 16),
    ];
  }

  throw new Error(`Unsupported fill color: ${fill}`);
}

function getLogicalSize(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+(\d+)\s+(\d+)\s*"/);
  if (viewBox) {
    return {
      width: Number(viewBox[1]),
      height: Number(viewBox[2]),
    };
  }

  const width = Number(svg.match(/width="(\d+)"/)?.[1]);
  const height = Number(svg.match(/height="(\d+)"/)?.[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("BitmapPunks avatar SVG is missing explicit width/height or viewBox");
  }

  return { width, height };
}

function svgToAnsiFrame(svg: string): string[] {
  const { width, height } = getLogicalSize(svg);
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [0, 0, 0, 0] as [number, number, number, number]),
  );

  const pathPattern = /d="M(\d+) (\d+)v1h(\d+)v-1"[^>]*fill="(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))"/g;
  for (const match of svg.matchAll(pathPattern)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const runWidth = Number(match[3]);
    const color = parseHexColor(match[4]);

    for (let col = x; col < Math.min(x + runWidth, width); col += 1) {
      grid[y][col] = color;
    }
  }

  return grid.map((row) =>
    row
      .map(([r, g, b, a]) =>
        a === 0 ? " " : `\x1b[38;2;${r};${g};${b}m█\x1b[0m`,
      )
      .join(""),
  );
}

export const HELLO_BITMAPPUNK_FRAME = svgToAnsiFrame(HELLO_BITMAPPUNK_SVG);
export const HELLO_BITMAPPUNK_FRAME_WIDTH = HELLO_BITMAPPUNK_FRAME.reduce(
  (max, line) => Math.max(max, line.replace(/\x1b\[[^m]*m/g, "").length),
  0,
);

export const HELLO_BITMAPPUNK_FRAMES = [
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
] as const;
