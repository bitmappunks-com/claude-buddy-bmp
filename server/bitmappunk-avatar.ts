import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const HELLO_BITMAPPUNK_SVG_PATH = join(MODULE_DIR, "..", "assets", "hello.svg");
export const HELLO_BITMAPPUNK_SVG = readFileSync(HELLO_BITMAPPUNK_SVG_PATH, "utf8");

const CHAFA_SYMBOL_SIZE = "12x6";
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function renderSvgWithChafa(svgPath: string, size: string = CHAFA_SYMBOL_SIZE): string[] {
  try {
    const output = execFileSync(
      "chafa",
      [
        "--format",
        "symbols",
        "--symbols",
        "braille",
        "--size",
        size,
        "--colors",
        "full",
        svgPath,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    return output
      .replace(/\n+$/, "")
      .split("\n")
      .map((line) => line.replace(/\r/g, ""));
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error
      ? String((error as { stderr?: Buffer | string }).stderr ?? "")
      : "";
    throw new Error(
      `chafa is required to render the buddy avatar. Install it and retry (brew install chafa / apt install chafa). ${stderr}`.trim(),
    );
  }
}

export const HELLO_BITMAPPUNK_FRAME = renderSvgWithChafa(HELLO_BITMAPPUNK_SVG_PATH);
export const HELLO_BITMAPPUNK_FRAME_WIDTH = HELLO_BITMAPPUNK_FRAME.reduce(
  (max, line) => Math.max(max, line.replace(ANSI_RE, "").length),
  0,
);

export const HELLO_BITMAPPUNK_FRAMES = [
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
  HELLO_BITMAPPUNK_FRAME.map((line) => line),
] as const;

export { CHAFA_SYMBOL_SIZE, renderSvgWithChafa };
