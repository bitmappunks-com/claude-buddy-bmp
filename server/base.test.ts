import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("BitmapPunks base UX", () => {
  test("removes the direct base command interface", () => {
    const profileDir = mkdtempSync(join(tmpdir(), "buddy-base-command-removed-"));
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, ".claude.json"), JSON.stringify({ userID: "base-removed-user" }));

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

    expect(proc.exitCode).toBe(1);
    expect(Buffer.from(proc.stderr).toString("utf8")).toContain("Unknown command: base");
    expect(Buffer.from(proc.stdout).toString("utf8")).not.toContain("base <trait>");
    expect(existsSync(join(profileDir, "buddy-state", "status.json"))).toBe(false);
  });

  test("hunt creates a new pet with its own bitmap base and generated setup", () => {
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
      personality: "Only a new pet should be added.",
      hatchedAt: 987654321,
      userId: "hunt-preserve-user-id",
    };
    writeFileSync(join(stateDir, "menagerie.json"), JSON.stringify({ active: "hunt", companions: { hunt: companion } }, null, 2));

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
    expect(output).toContain("Created");
    expect(output).toContain("(Solana, female)");
    expect(output).not.toContain("86-solana_female");

    const afterManifest = JSON.parse(readFileSync(join(stateDir, "menagerie.json"), "utf8"));
    expect({ ...afterManifest.companions.hunt, bitmapBase: undefined }).toEqual({ ...companion, bitmapBase: undefined });
    expect(afterManifest.active).not.toBe("hunt");
    const hunted = afterManifest.companions[afterManifest.active];
    expect(hunted).toBeTruthy();
    expect(hunted.bitmapBase).toBe("86-solana_female");
    expect(hunted.personality).toEqual(expect.any(String));
    expect(hunted.name).toEqual(expect.any(String));

    expect(existsSync(join(stateDir, "config.json"))).toBe(false);

    const status = JSON.parse(readFileSync(join(stateDir, "status.json"), "utf8"));
    expect(status.bitmapBase).toBe("86-solana_female");
    expect(status.name).toBe(hunted.name);
    expect(status.rarity).toBe(hunted.bones.rarity);
    expect(status.species).toBe(hunted.bones.species);
    expect(status.hat).toBe(hunted.bones.hat);
  });

  test("hunt prompts for an exact look when a gender/type pair maps to multiple bases", () => {
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
    expect(output).toContain("Exact look:");
    expect(output).toContain("(Human, beige, female)");
    expect(output).toContain("Created");
    expect(output).not.toContain("52-beige_female");
    expect(output).not.toContain("Variant:");

    const manifest = JSON.parse(readFileSync(join(profileDir, "buddy-state", "menagerie.json"), "utf8"));
    const active = manifest.companions[manifest.active];
    expect(active.bitmapBase).toBe("52-beige_female");
    expect(existsSync(join(profileDir, "buddy-state", "config.json"))).toBe(false);
  });

  test("main commands advertise pick/hunt base flows but not the direct base command", () => {
    const proc = Bun.spawnSync({
      cmd: [process.execPath, "run", "cli/index.ts", "help"],
      cwd: join(import.meta.dir, ".."),
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    const output = Buffer.from(proc.stdout).toString("utf8");
    expect(output).toContain("pick              Interactive picker (saved/search + BitmapPunks BASE via [b])");
    expect(output).toContain("hunt              Create a BitmapPunks pet (gender → type → look)");
    expect(output).not.toContain("base <trait>");
    expect(output).not.toContain("base list");
    expect(output).not.toContain("base default");
    expect(output).not.toContain("base pick");
    expect(output).not.toContain("install-buddy");
  });

  test("secondary help and TUI copy do not expose direct base or legacy buddy hunting", () => {
    const serverIndex = readFileSync(join(import.meta.dir, "index.ts"), "utf8");
    expect(serverIndex).toContain("bun run hunt            Create a BitmapPunks pet (gender → type → look)");
    expect(serverIndex).toContain("bun run pick            Interactive picker (saved/search + BitmapPunks BASE via [b])");
    expect(serverIndex).not.toContain("bun run hunt            Search for specific buddy");
    expect(serverIndex).not.toContain("base <trait>");
    expect(serverIndex).not.toContain("base list");
    expect(serverIndex).not.toContain("base default");

    const tui = readFileSync(join(import.meta.dir, "..", "cli", "tui.tsx"), "utf8");
    expect(tui).not.toContain("key: \"hunt\", icon");
    expect(tui).not.toContain("Brute-force search for a specific buddy.");
    expect(tui).not.toContain("Choose species, rarity, shiny flag, peak");
    expect(tui).not.toContain("View all 16 milestone badges");
    expect(tui).toContain("View all achievement badges you can");
  });
});
