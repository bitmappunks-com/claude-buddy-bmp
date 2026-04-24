import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { DEFAULT_BITMAP_BASE } from "./bitmappunk-avatar.ts";

describe("cli base command", () => {
  test("persists the active bitmap base and refreshes profile-aware status.json", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-command-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, "claude.json"), JSON.stringify({ userID: "base-test-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "100-solana_male"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const output = Buffer.from(proc.stdout).toString("utf8");
    expect(output).toContain("100-solana_male");

    const stateDir = join(profileDir, "buddy-state");
    const configPath = join(stateDir, "config.json");
    const statusPath = join(stateDir, "status.json");
    expect(existsSync(configPath)).toBe(true);
    expect(existsSync(statusPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    expect(config.activeBitmapBase).toBe("100-solana_male");

    const status = JSON.parse(readFileSync(statusPath, "utf8"));
    expect(status.bitmapBase).toBe("100-solana_male");
    expect(["1-420", "1720-cigarette", "1721-corn_cob_pipe", "1749-sleep_bubble"]).toContain(status.bitmapItem);
    expect(status.frames.length).toBeGreaterThan(0);
    expect(status.frameSequence.length).toBeGreaterThan(3);
  });

  test("accepts a base display name and persists its canonical trait key", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-display-name-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-display-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "Solana"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    expect(Buffer.from(proc.stdout).toString("utf8")).toContain("(Solana)");

    const config = JSON.parse(readFileSync(join(profileDir, "buddy-state", "config.json"), "utf8"));
    expect(config.activeBitmapBase).toMatch(/solana_(male|female)$/);
  });

  test("supports resetting the active bitmap base back to the default trait", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-default-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-default-user" }));

    const first = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "101-spirit_male"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(first.exitCode).toBe(0);

    const reset = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "default"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(reset.exitCode).toBe(0);
    expect(Buffer.from(reset.stdout).toString("utf8")).toContain(DEFAULT_BITMAP_BASE);

    const status = JSON.parse(readFileSync(join(profileDir, "buddy-state", "status.json"), "utf8"));
    expect(status.bitmapBase).toBe(DEFAULT_BITMAP_BASE);
  });
});
