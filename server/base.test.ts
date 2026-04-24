import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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
    expect(status.bitmapItem).toBe("1-420");
    expect(status.frames.length).toBeGreaterThan(0);
    expect(status.frameSequence.length).toBeGreaterThan(3);
  });
});
