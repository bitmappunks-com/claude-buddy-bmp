import { describe, expect, test } from "bun:test";
import { displayWidth } from "./art.ts";
import { __test as pickTest } from "../cli/pick.ts";

describe("pick terminal layout", () => {
  test("left-pane rows are clipped to the fixed pane width even with ANSI and wide glyphs", () => {
    const longRow = ` ${"\x1b[32m"}●${"\x1b[0m"} ${"\x1b[33m"}Sesame     ${"\x1b[0m"} ${"\x1b[90m"}(Demon, purple, female)${"\x1b[0m"} ${"\x1b[33m"}★★★★★${"\x1b[0m"} ✨`;

    const fitted = pickTest.rpad(longRow, pickTest.LEFT_W);

    expect(displayWidth(fitted)).toBe(pickTest.LEFT_W);
  });

  test("right-pane preview lines are clipped so bitmap cards cannot wrap and break the screen", () => {
    const wideCardLine = `${"\x1b[32m"}│${"\x1b[0m"}  ${"█".repeat(80)}${"\x1b[32m"}│${"\x1b[0m"}`;

    const fitted = pickTest.fitAnsi(wideCardLine, 42);

    expect(displayWidth(fitted)).toBe(42);
  });

  test("preview card width stays compact on very wide terminals", () => {
    expect(pickTest.rightPaneWidth(220)).toBeGreaterThan(pickTest.PREVIEW_CARD_MAX_W);
    expect(pickTest.previewCardWidth(220)).toBe(pickTest.PREVIEW_CARD_MAX_W);
  });
});
