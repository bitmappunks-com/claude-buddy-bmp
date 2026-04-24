import { describe, test, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";
import * as avatar from "./bitmappunk-avatar.ts";
import {
  applyBitmapAction,
  buildBitmapStatusArt,
  composeBitmapItemFrames,
  listBitmapBaseTraits,
  listBitmapItems,
  loadBitmapBaseTrait,
} from "./bitmappunk-avatar.ts";

describe("vendored bmp-gif base traits", () => {
  test("exports generic default-frame names instead of hello-specific constants", () => {
    expect(Object.keys(avatar).some((key) => key.includes("HELLO_BITMAPPUNK"))).toBe(false);
    expect(avatar.DEFAULT_BITMAP_FRAME.length).toBeGreaterThan(0);
    expect(avatar.DEFAULT_BITMAP_FRAME_WIDTH).toBeGreaterThan(0);
  });

  test("lists vendored base traits and includes solana_male", () => {
    const bases = listBitmapBaseTraits();
    expect(bases.length).toBeGreaterThan(0);
    expect(bases.some((base) => base.key === "100-solana_male")).toBe(true);
  });

  test("loads a vendored base trait with metadata derived from vendor files", () => {
    const base = loadBitmapBaseTrait("100-solana_male");
    expect(base.id).toBe(100);
    expect(base.name).toBe("solana_male");
    expect(base.gender).toBe("male");
    expect(base.width).toBe(24);
    expect(base.height).toBe(24);
  });
});

describe("vendored bmp-gif actions", () => {
  test("applies blink action ops at anchored eye coordinates", () => {
    const frames = applyBitmapAction("100-solana_male", "blink");
    expect(frames).toHaveLength(3);

    const closed = frames[1];
    expect(closed[12][9]).toBe("rgb(0, 0, 0)");
    expect(closed[12][10]).toBe("rgb(0, 0, 0)");
    expect(closed[12][14]).toBe("rgb(0, 0, 0)");
    expect(closed[12][15]).toBe("rgb(0, 0, 0)");
  });

  test("applies move action by swapping eye pixels with their right neighbors", () => {
    const frames = applyBitmapAction("100-solana_male", "move");
    expect(frames).toHaveLength(3);

    const open = frames[0];
    const moved = frames[1];
    expect(moved[12][9]).toBe(open[12][10]);
    expect(moved[12][10]).toBe(open[12][9]);
    expect(moved[12][14]).toBe(open[12][15]);
    expect(moved[12][15]).toBe(open[12][14]);
  });
});

describe("vendored bmp-gif item animations", () => {
  test("lists vendored items and includes the 420 loop", () => {
    const items = listBitmapItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.key === "1-420")).toBe(true);
  });

  test("composes item animation frames over the selected base canvas", () => {
    const frames = composeBitmapItemFrames("100-solana_male", "1-420");
    expect(frames).toHaveLength(8);

    expect(frames[0][17][13]).toBe("rgb(0, 0, 0)");
    expect(frames[0][8][23]).toBeNull();
    expect(frames[4][8][23]).toBe("rgb(215, 215, 220)");
  });
});

describe("legacy avatar assets", () => {
  test("removes old hello.svg and hello.gif assets from the repo", () => {
    expect(existsSync(join(import.meta.dir, "..", "assets", "hello.svg"))).toBe(false);
    expect(existsSync(join(import.meta.dir, "..", "assets", "hello.gif"))).toBe(false);
  });
});

describe("buildBitmapStatusArt", () => {
  test("builds ANSI-rendered status frames from vendored base, action, and item data", () => {
    const status = buildBitmapStatusArt("100-solana_male");
    expect(status.bitmapBase).toBe("100-solana_male");
    expect(status.bitmapItem).toBe("1-420");
    expect(status.frames).toHaveLength(12);
    expect(status.framesHalfblock).toHaveLength(12);
    expect(status.framesFullcell).toHaveLength(12);
    expect(status.frameSequence).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 4, 5, 6, 7, 8, 9, 10, 11, 0, 2, 0, 0, 0]);
    expect(status.frames[0]).toMatch(/\x1b\[(?:38|48);2;/);
    expect(status.frames[1]).not.toBe(status.frames[0]);
    expect(status.frames[3]).not.toBe(status.frames[0]);
    expect(status.frames[4]).not.toBe(status.frames[0]);
    expect(status.frames[11]).not.toBe(status.frames[4]);
  });

  test("preview script renders vendored ANSI art instead of referencing hello.gif assets", () => {
    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "scripts/preview-iterm-inline.ts", "100-solana_male"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        BUDDY_AVATAR_RENDER: "halfblock",
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const output = Buffer.from(proc.stdout).toString("utf8");
    expect(output).toContain("100-solana_male");
    expect(output).toMatch(/\x1b\[(?:38|48);2;/);
    expect(output).not.toContain("hello.gif");
    expect(output).not.toContain("]1337;File=");
  });
});
