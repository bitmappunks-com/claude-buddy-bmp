/**
 * Display-width tests — covers the U+2600-U+27BF split between Emoji_Presentation
 * (2 cols) and text-presentation (1 col), plus VS16 upgrades. Keeps bubble
 * padding and companion-card alignment stable when reactions/achievements
 * contain emoji.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { displayWidth, getStatusFrames, STATUS_FRAME_SEQUENCE } from "./art.ts";
import { HELLO_BITMAPPUNK_FRAME } from "./bitmappunk-avatar.ts";
import { SPECIES, type BuddyBones } from "./engine.ts";

describe("displayWidth", () => {
  test("ASCII has width equal to character count", () => {
    expect(displayWidth("")).toBe(0);
    expect(displayWidth("hola")).toBe(4);
    expect(displayWidth("hola  ")).toBe(6);
  });

  test("non-BMP emoji (U+1F000+) count as 2", () => {
    expect(displayWidth("\u{1F3C6}")).toBe(2); // 🏆
    expect(displayWidth("\u{1F9F9}")).toBe(2); // 🧹
  });

  test("Emoji_Presentation codepoints in U+2600-U+27BF count as 2", () => {
    expect(displayWidth("\u2705")).toBe(2); // ✅
    expect(displayWidth("\u274C")).toBe(2); // ❌
    expect(displayWidth("\u26A1")).toBe(2); // ⚡
    expect(displayWidth("\u2728")).toBe(2); // ✨
  });

  test("text-presentation symbols in U+2600-U+27BF stay 1 without VS16", () => {
    expect(displayWidth("\u2605")).toBe(1);           // ★
    expect(displayWidth("\u2605\u2605\u2605\u2605\u2605")).toBe(5); // ★★★★★ (rarity stars)
    expect(displayWidth("\u2660")).toBe(1);           // ♠
    expect(displayWidth("\u2764")).toBe(1);           // ❤ plain
  });

  test("VS16 upgrades narrow symbols in U+2600-U+27BF to 2", () => {
    expect(displayWidth("\u2764\uFE0F")).toBe(2); // ❤️
    expect(displayWidth("\u2600\uFE0F")).toBe(2); // ☀️
  });

  test("VS16 after an already-wide emoji does not add width", () => {
    expect(displayWidth("\u2705\uFE0F")).toBe(2);      // ✅ + VS16
    expect(displayWidth("\u{1F3C6}\uFE0F")).toBe(2);   // 🏆 + VS16
  });

  test("zero-width joiner and variation selectors don't add width", () => {
    expect(displayWidth("\u200D")).toBe(0);
    expect(displayWidth("\uFE00")).toBe(0);
  });

  test("ANSI escape sequences are stripped", () => {
    expect(displayWidth("\x1b[31mhola\x1b[0m")).toBe(4);
  });

  test("mixed ASCII + emoji matches terminal columns", () => {
    // "🏆 ✅ Good Buddy" → 2+1+2+1+10 = 16
    expect(displayWidth("\u{1F3C6} \u2705 Good Buddy")).toBe(16);
  });
});

describe("getStatusFrames", () => {
  const bones = (overrides: Partial<BuddyBones> = {}): BuddyBones => ({
    rarity: "common",
    species: "capybara",
    eye: "\u00b0",
    hat: "none",
    shiny: false,
    stats: { DEBUGGING: 50, PATIENCE: 50, CHAOS: 50, WISDOM: 50, SNARK: 50 },
    peak: "DEBUGGING",
    dump: "PATIENCE",
    ...overrides,
  });

  test("produces 4 frames and a 15-tick sequence", () => {
    const { frames, frameSequence } = getStatusFrames(bones());
    expect(frames).toHaveLength(4);
    expect(frameSequence).toEqual([...STATUS_FRAME_SEQUENCE]);
  });

  test("every species produces 4 bitmap frames, each matching the generated avatar height", () => {
    for (const species of SPECIES) {
      const { frames } = getStatusFrames(bones({ species }));
      expect(frames).toHaveLength(4);
      for (const body of frames) {
        const lines = body.split("\n");
        expect(lines).toHaveLength(HELLO_BITMAPPUNK_FRAME.length);
        expect(body).toMatch(/\x1b\[(?:38|48);(?:2|5);/);
      }
    }
  });

  test("idle frames ignore eye substitutions because the implanted avatar is pre-rendered", () => {
    const withAt = getStatusFrames(bones({ species: "capybara", eye: "@" }));
    const withDot = getStatusFrames(bones({ species: "capybara", eye: "·" }));
    expect(withAt.frames[0]).toBe(withDot.frames[0]);
    expect(withAt.frames[0]).not.toContain("{E}");
  });

  test("blink frame reuses the same implanted bitmap art", () => {
    const { frames } = getStatusFrames(bones({ species: "capybara", eye: "@" }));
    expect(frames[3]).toBe(frames[0]);
  });

  test("hat overlays are ignored because the implanted avatar fully occupies line 0", () => {
    const plain = getStatusFrames(bones({ species: "duck", hat: "none" }));
    const withHat = getStatusFrames(bones({ species: "duck", hat: "crown" }));
    expect(withHat.frames[0]).toBe(plain.frames[0]);
  });

  test("frame sequence references only valid frame indices", () => {
    const { frames, frameSequence } = getStatusFrames(bones());
    for (const idx of frameSequence) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(frames.length);
    }
  });
});

describe("statusline/emoji-widths.data", () => {
  test("matches Unicode Emoji_Presentation in U+2600-U+27BF (regenerate via 'bun run gen:emoji-widths')", () => {
    const data = readFileSync(
      join(import.meta.dir, "..", "statusline", "emoji-widths.data"),
      "utf8",
    );
    const fileList = data
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .join(" ")
      .trim()
      .split(/\s+/)
      .map(Number);

    const re = /\p{Emoji_Presentation}/u;
    const expected: number[] = [];
    for (let cp = 0x2600; cp <= 0x27BF; cp++) {
      if (re.test(String.fromCodePoint(cp))) expected.push(cp);
    }
    expect(fileList).toEqual(expected);
  });
});
