import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("cli item command", () => {
  test("does not expose direct bitmap item selection from the CLI", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-item-command-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, "claude.json"), JSON.stringify({ userID: "item-test-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "item", "1749-sleep_bubble"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(1);
    expect(Buffer.from(proc.stderr).toString("utf8")).toContain("ITEM choice is automatic");

    const stateDir = join(profileDir, "buddy-state");
    expect(existsSync(join(stateDir, "config.json"))).toBe(false);
    expect(existsSync(join(stateDir, "status.json"))).toBe(false);
  });

  test("supports auto item mode for behavior-driven animation selection", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-item-auto-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, "claude.json"), JSON.stringify({ userID: "item-auto-user" }));

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

    expect(proc.exitCode).toBe(0);
    expect(Buffer.from(proc.stdout).toString("utf8")).toContain("auto");

    const stateDir = join(profileDir, "buddy-state");
    const config = JSON.parse(readFileSync(join(stateDir, "config.json"), "utf8"));
    expect(config.activeBitmapItem).toBe("auto");
  });
});
