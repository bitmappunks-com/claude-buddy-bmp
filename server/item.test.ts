import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { loadConfig, saveConfig, STATE_DIR } from "./state.ts";

describe("legacy bitmap item configuration", () => {
  test("removes the old bitmap item command entirely", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-item-removed-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, "claude.json"), JSON.stringify({ userID: "item-removed-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "item", "auto"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(1);
    expect(Buffer.from(proc.stderr).toString("utf8")).toContain("Unknown command: item");
    expect(Buffer.from(proc.stdout).toString("utf8")).not.toContain("item auto");
    expect(existsSync(join(profileDir, "buddy-state", "config.json"))).toBe(false);
  });

  test("saveConfig drops stale global bitmap config from old config files", () => {
    mkdirSync(STATE_DIR, { recursive: true });
    const configPath = join(STATE_DIR, "config.json");
    writeFileSync(configPath, JSON.stringify({ activeBitmapItem: "1-420", activeBitmapBase: "100-solana_male", bubbleWidth: 32 }, null, 2));

    saveConfig({ bubbleMargin: 10 });
    const config = JSON.parse(readFileSync(configPath, "utf8"));

    expect(loadConfig()).not.toHaveProperty("activeBitmapItem");
    expect(loadConfig()).not.toHaveProperty("activeBitmapBase");
    expect(config).not.toHaveProperty("activeBitmapItem");
    expect(config).not.toHaveProperty("activeBitmapBase");
    expect(config.bubbleWidth).toBe(32);
    expect(config.bubbleMargin).toBe(10);
  });
});
