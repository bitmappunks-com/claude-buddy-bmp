import { describe, test, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";
import * as avatar from "./bitmappunk-avatar.ts";
import type { ReactionReason } from "./reactions.ts";
import {
  applyBitmapAction,
  buildBitmapStatusArt,
  composeBitmapItemFrames,
  listBitmapBaseTraits,
  listBitmapItems,
  loadBitmapBaseTrait,
  resolveBitmapItemSelection,
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

describe("bitmap item selection", () => {
  test("maps all quality failure reasons to a themed error item when auto mode is used", () => {
    for (const reason of ["error", "test-fail", "lint-fail", "type-error", "build-fail", "security-warning", "deprecation", "merge-conflict"] as const) {
      const chosen = resolveBitmapItemSelection(reason, 0);
      expect(["1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow"]).toContain(chosen);
    }
  });

  test("maps build/release success reasons to an upbeat item when auto mode is used", () => {
    const chosen = resolveBitmapItemSelection("all-green", 1);
    expect(["1744-bubble_gum_large", "1749-sleep_bubble"]).toContain(chosen);
  });

  test("maps error-streak reasons to stressed error items instead of upbeat success items", () => {
    const successItems = ["1744-bubble_gum_large", "1749-sleep_bubble"];
    for (const reason of ["streak-3", "streak-5", "streak-10", "streak-20"] as const satisfies readonly ReactionReason[]) {
      const status = buildBitmapStatusArt("100-solana_male", reason, 0);
      expect(["1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow"]).toContain(status.bitmapItem!);
      expect(successItems).not.toContain(status.bitmapItem!);
      expect(status.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(5);
      expect(status.frameSequence.slice(0, 6).some((idx) => idx === 1 || idx === 3)).toBe(true);
    }
  });

  test("maps file-work reasons to a fire animation pool when auto mode is used", () => {
    for (const reason of ["regex-file", "css-file", "sql-file", "docker-file", "ci-file", "lock-file", "env-file", "test-file", "config-file", "makefile", "package-file", "proto-file"] as const) {
      const chosen = resolveBitmapItemSelection(reason, 2);
      expect(["1722-fire_breathing_blue", "1723-fire_breathing_green", "1724-fire_breathing_purple", "1725-fire_breathing_red"]).toContain(chosen);
    }
  });

  test("keeps churn/editing reasons automatic but distinct from failure and success pools", () => {
    const chosen = resolveBitmapItemSelection("debug-loop", 3);
    expect(listBitmapItems().map((item) => item.key)).toContain(chosen);
  });

  test("falls back to a deterministic idle choice from every vendored item when no reason is provided", () => {
    const itemKeys = listBitmapItems().map((item) => item.key);
    const selectedAcrossSeeds = new Set(Array.from({ length: itemKeys.length * 3 }, (_, seed) => resolveBitmapItemSelection(undefined, seed)));

    expect(resolveBitmapItemSelection(undefined, 5)).toBe(resolveBitmapItemSelection(undefined, 5));
    expect(itemKeys.length).toBeGreaterThan(4);
    expect(selectedAcrossSeeds.size).toBe(itemKeys.length);
    for (const selected of selectedAcrossSeeds) {
      expect(itemKeys).toContain(selected);
    }
  });
  test("maps additional file, language, temporal, and recovery triggers instead of dropping them into generic idle", () => {
    const fireReasons = ["doc-file", "binary-file", "gitignore", "readme", "lang-typescript"] as const satisfies readonly ReactionReason[];
    for (const reason of fireReasons) {
      const chosen = resolveBitmapItemSelection(reason, 2);
      expect(["1722-fire_breathing_blue", "1723-fire_breathing_green", "1724-fire_breathing_purple", "1725-fire_breathing_red"]).toContain(chosen);
    }

    const errorReasons = ["late-night-error", "weekend-conflict", "marathon-test-fail", "build-after-push"] as const satisfies readonly ReactionReason[];
    for (const reason of errorReasons) {
      const chosen = resolveBitmapItemSelection(reason, 0);
      expect(["1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow"]).toContain(chosen);
    }

    const successReasons = ["recovery-from-merge-conflict"] as const satisfies readonly ReactionReason[];
    for (const reason of successReasons) {
      const chosen = resolveBitmapItemSelection(reason, 1);
      expect(["1744-bubble_gum_large", "1749-sleep_bubble"]).toContain(chosen);
    }
  });

  test("maps chaos triggers to a broad automatic pool with a jagged animation profile", () => {
    const first = buildBitmapStatusArt("100-solana_male", "chaos", 0);
    const second = buildBitmapStatusArt("100-solana_male", "chaos", 1);

    expect([
      "1-420", "1720-cigarette", "1721-corn_cob_pipe", "1749-sleep_bubble",
      "1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow",
      "1744-bubble_gum_large",
      "1722-fire_breathing_blue", "1723-fire_breathing_green", "1724-fire_breathing_purple", "1725-fire_breathing_red",
    ]).toContain(first.bitmapItem!);
    expect(first.frameSequence).not.toEqual(second.frameSequence);
    expect(first.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(4);
    expect(second.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(4);
    for (const status of [first, second]) {
      expect(status.frameSequence.every((idx) => idx >= 0 && idx < status.frames.length)).toBe(true);
      expect(status.frameSequence.slice(0, 6).some((idx) => idx === 1 || idx === 2 || idx === 3)).toBe(true);
    }
  });

  test("keeps newly classified triggers on behavior-specific animation profiles", () => {
    const languageStatus = buildBitmapStatusArt("100-solana_male", "lang-typescript", 0);
    const holidayStatus = buildBitmapStatusArt("100-solana_male", "halloween", 0);
    const recoveryStatus = buildBitmapStatusArt("100-solana_male", "recovery-from-merge-conflict", 0);

    expect(languageStatus.frameSequence.filter((idx) => idx >= 4)).toHaveLength(5);
    expect(holidayStatus.frameSequence.filter((idx) => idx >= 4)).toHaveLength(4);
    expect(recoveryStatus.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(3);
    for (const status of [languageStatus, holidayStatus, recoveryStatus]) {
      expect(status.frameSequence.every((idx) => idx >= 0 && idx < status.frames.length)).toBe(true);
    }
  });

  test("gives git and temporal triggers distinct automatic cadences instead of generic idle looping", () => {
    const idleStatus = buildBitmapStatusArt("100-solana_male", "idle", 0);
    const commitStatus = buildBitmapStatusArt("100-solana_male", "commit", 0);
    const pushStatus = buildBitmapStatusArt("100-solana_male", "push", 0);
    const lateNightStatus = buildBitmapStatusArt("100-solana_male", "late-night", 0);

    const itemKeys = listBitmapItems().map((item) => item.key);
    for (const status of [commitStatus, pushStatus, lateNightStatus]) {
      expect(itemKeys).toContain(status.bitmapItem!);
      expect(status.frameSequence.every((idx) => idx >= 0 && idx < status.frames.length)).toBe(true);
      expect(status.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(3);
      expect(status.frameSequence.slice(0, 6).some((idx) => idx === 1 || idx === 2 || idx === 3)).toBe(true);
    }
    expect(commitStatus.frameSequence).not.toEqual(idleStatus.frameSequence);
    expect(pushStatus.frameSequence).not.toEqual(commitStatus.frameSequence);
    expect(lateNightStatus.frameSequence).not.toEqual(commitStatus.frameSequence);
  });
});

describe("buildBitmapStatusArt", () => {
  test("builds ANSI-rendered status frames from vendored base, action, and item data", () => {
    const status = buildBitmapStatusArt("100-solana_male", "error", 0);
    const chosenItem = status.bitmapItem!;
    expect(status.bitmapBase).toBe("100-solana_male");
    expect(["1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow"]).toContain(chosenItem);
    expect(status.frames).toHaveLength(12);
    expect(status.framesHalfblock).toHaveLength(12);
    expect(status.framesFullcell).toHaveLength(12);
    const itemBurst = status.frameSequence.filter((idx) => idx >= 4);
    expect(itemBurst.length).toBeGreaterThanOrEqual(4);
    expect(itemBurst.length).toBeLessThan(8);
    expect(status.frameSequence.every((idx) => idx >= 0 && idx < status.frames.length)).toBe(true);
    expect(status.frames[0]).toMatch(/\x1b\[(?:38|48);2;/);
    expect(status.frames[1]).not.toBe(status.frames[0]);
    expect(status.frames[3]).not.toBe(status.frames[0]);
    expect(new Set(status.frames.slice(4)).size).toBeGreaterThan(1);
  });

  test("varies the auto item burst cadence with the seed instead of replaying a simple sequential slice", () => {
    const first = buildBitmapStatusArt("100-solana_male", undefined, 0);
    const second = buildBitmapStatusArt("100-solana_male", undefined, 1);

    expect(first.frameSequence).toEqual([0, 0, 0, 1, 0, 0, 4, 5, 6, 0, 3, 0, 2, 0, 0]);
    expect(second.frameSequence).toEqual([0, 0, 1, 0, 0, 3, 5, 10, 7, 0, 2, 0, 0, 0]);
    expect(first.frameSequence).not.toEqual(second.frameSequence);
  });

  test("auto idle status frames include multiple item animations instead of only smoking", () => {
    const auto = buildBitmapStatusArt("100-solana_male", undefined, 0);
    const itemFrames = auto.frames.slice(4);

    expect(auto.bitmapItem).toBe("auto");
    expect(auto.frames).toHaveLength(12);
    expect(new Set(itemFrames).size).toBeGreaterThan(2);
    expect(auto.frameSequence.some((idx) => idx >= 4)).toBe(true);
  });

  test("uses different reaction-specific sequence profiles for adjacent time buckets", () => {
    const first = buildBitmapStatusArt("100-solana_male", "lint-fail", 0);
    const second = buildBitmapStatusArt("100-solana_male", "lint-fail", 1);

    expect(first.frameSequence).not.toEqual(second.frameSequence);
    expect(first.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(4);
    expect(second.frameSequence.filter((idx) => idx >= 4).length).toBeGreaterThanOrEqual(4);
  });

  test("mixes the reaction reason into automatic item and burst selection for same-bucket behavior changes", () => {
    const errored = buildBitmapStatusArt("100-solana_male", "error", 0);
    const tested = buildBitmapStatusArt("100-solana_male", "test-fail", 0);

    expect(errored.bitmapItem).not.toBe(tested.bitmapItem);
    expect(errored.frameSequence).not.toEqual(tested.frameSequence);
    expect(errored.frameSequence.every((idx) => idx >= 0 && idx < errored.frames.length)).toBe(true);
    expect(tested.frameSequence.every((idx) => idx >= 0 && idx < tested.frames.length)).toBe(true);
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
