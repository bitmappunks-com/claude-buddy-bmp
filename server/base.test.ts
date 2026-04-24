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
    expect(status.bitmapItem).toBe("auto");
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

  test("accepts multi-word base trait names from CLI args and persists the canonical key", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-multi-word-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-multi-word-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "demon", "purple", "female"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    expect(Buffer.from(proc.stdout).toString("utf8")).toContain("39-demon_purple_female");

    const config = JSON.parse(readFileSync(join(profileDir, "buddy-state", "config.json"), "utf8"));
    expect(config.activeBitmapBase).toBe("39-demon_purple_female");

    const status = JSON.parse(readFileSync(join(profileDir, "buddy-state", "status.json"), "utf8"));
    expect(status.bitmapBase).toBe("39-demon_purple_female");
  });

  test("filters the base list by user search text without changing config", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-list-filter-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-list-filter-user" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "list", "purple", "female"],
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
    expect(output).toContain('Available BitmapPunks bases matching "purple female"');
    expect(output).toContain("39-demon_purple_female");
    expect(output).toContain("female)");
    expect(output).not.toContain("100-solana_male");
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

  test("selecting a bitmap base preserves the active companion's non-visual attributes", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-preserve-companion-"));
    const stateDir = join(profileDir, "buddy-state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-preserve-user" }));

    const companion = {
      bones: {
        rarity: "legendary",
        species: "dragon",
        eye: "◉",
        hat: "crown",
        shiny: true,
        stats: { DEBUGGING: 99, PATIENCE: 88, CHAOS: 77, WISDOM: 66, SNARK: 55 },
        peak: "DEBUGGING",
        dump: "SNARK",
      },
      name: "KeptBuddy",
      personality: "Do not mutate me.",
      hatchedAt: 123456789,
      userId: "preserve-user-id",
    };
    const beforeManifest = { active: "kept", companions: { kept: companion } };
    writeFileSync(join(stateDir, "menagerie.json"), JSON.stringify(beforeManifest, null, 2));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "101-spirit_male"],
      cwd: join(import.meta.dir, ".."),
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: profileDir,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const afterManifest = JSON.parse(readFileSync(join(stateDir, "menagerie.json"), "utf8"));
    expect(afterManifest).toEqual(beforeManifest);

    const config = JSON.parse(readFileSync(join(stateDir, "config.json"), "utf8"));
    expect(config.activeBitmapBase).toBe("101-spirit_male");

    const status = JSON.parse(readFileSync(join(stateDir, "status.json"), "utf8"));
    expect(status.bitmapBase).toBe("101-spirit_male");
    expect(status.name).toBe("KeptBuddy");
    expect(status.rarity).toBe("legendary");
    expect(status.species).toBe("dragon");
    expect(status.shiny).toBe(true);
    expect(status.hat).toBe("crown");
  });

  test("hunt selects a bitmap base through gender then type without changing the companion", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-hunt-base-flow-"));
    const stateDir = join(profileDir, "buddy-state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "hunt-base-flow-user" }));

    const companion = {
      bones: {
        rarity: "epic",
        species: "fox",
        eye: "◉",
        hat: "beanie",
        shiny: false,
        stats: { DEBUGGING: 91, PATIENCE: 82, CHAOS: 73, WISDOM: 64, SNARK: 55 },
        peak: "DEBUGGING",
        dump: "SNARK",
      },
      name: "HuntPreserved",
      personality: "Only the bitmap base should change.",
      hatchedAt: 987654321,
      userId: "hunt-preserve-user-id",
    };
    const beforeManifest = { active: "hunt", companions: { hunt: companion } };
    writeFileSync(join(stateDir, "menagerie.json"), JSON.stringify(beforeManifest, null, 2));

    const proc = Bun.spawnSync({
      cmd: ["bash", "-lc", `printf '1\\n11\\n' | "${process.execPath}" run cli/index.ts hunt`],
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
    expect(output).toContain("Gender:");
    expect(output).toContain("Type:");
    expect(output).toContain("Active BitmapPunks BASE -> 86-solana_female");

    const afterManifest = JSON.parse(readFileSync(join(stateDir, "menagerie.json"), "utf8"));
    expect(afterManifest).toEqual(beforeManifest);

    const config = JSON.parse(readFileSync(join(stateDir, "config.json"), "utf8"));
    expect(config.activeBitmapBase).toBe("86-solana_female");

    const status = JSON.parse(readFileSync(join(stateDir, "status.json"), "utf8"));
    expect(status.bitmapBase).toBe("86-solana_female");
    expect(status.name).toBe("HuntPreserved");
    expect(status.rarity).toBe("epic");
    expect(status.species).toBe("fox");
    expect(status.hat).toBe("beanie");
  });

  test("hunt prompts for a variant when a gender/type pair maps to multiple bases", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-hunt-base-variant-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "hunt-base-variant-user" }));

    const proc = Bun.spawnSync({
      cmd: ["bash", "-lc", `printf '1\\n3\\n2\\n' | "${process.execPath}" run cli/index.ts hunt`],
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
    expect(output).toContain("Human");
    expect(output).toContain("Variant:");
    expect(output).toContain("Active BitmapPunks BASE -> 52-beige_female");

    const config = JSON.parse(readFileSync(join(profileDir, "buddy-state", "config.json"), "utf8"));
    expect(config.activeBitmapBase).toBe("52-beige_female");
  });

  test("main commands advertise integrated base selection instead of legacy hunt or a separate base picker", () => {
    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "help"],
      cwd: join(import.meta.dir, ".."),
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const output = Buffer.from(proc.stdout).toString("utf8");
    expect(output).toContain("pick              Interactive picker (saved/search + BitmapPunks BASE via [b])");
    expect(output).toContain("hunt              Guided BitmapPunks BASE selector (gender → type → variant)");
    expect(output).not.toContain("Search for a specific buddy");
    expect(output).not.toContain("base pick");
  });

  test("falls back to the default marker when persisted base config is invalid", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-invalid-current-"));
    const stateDir = join(profileDir, "buddy-state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-invalid-current-user" }));
    writeFileSync(join(stateDir, "config.json"), JSON.stringify({ activeBitmapBase: "not-a-real-base" }));

    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "base", "list"],
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
    expect(output).toContain(`*  ${DEFAULT_BITMAP_BASE.split("-")[0]}  ${DEFAULT_BITMAP_BASE}`);
  });
});
