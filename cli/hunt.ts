/**
 * claude-buddy hunt — brute-force search for a specific buddy
 */

import {
  searchBuddy, renderBuddy, SPECIES, RARITIES, STAT_NAMES,
  type Species, type Rarity, type StatName, type SearchCriteria,
} from "../server/engine.ts";
import { saveCompanion, writeStatusState, resolveUserId } from "../server/state.ts";
import { generateFallbackName } from "../server/reactions.ts";
import { createInterface } from "readline";

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const NC = "\x1b[0m";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function pickFromList<T extends string>(label: string, items: readonly T[]): Promise<T> {
  return new Promise(async (resolve) => {
    console.log(`\n${BOLD}${label}${NC}`);
    items.forEach((item, i) => console.log(`  ${CYAN}${(i + 1).toString().padStart(2)}${NC}) ${item}`));
    while (true) {
      const ans = await ask(`\n  Choice [1-${items.length}]: `);
      const idx = parseInt(ans) - 1;
      if (idx >= 0 && idx < items.length) { resolve(items[idx]); return; }
      console.log(`  ${RED}Invalid. Enter 1-${items.length}.${NC}`);
    }
  });
}

async function main() {
  console.log(`
${CYAN}╔══════════════════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  ${BOLD}claude-buddy hunt${NC} — find your perfect companion          ${CYAN}║${NC}
${CYAN}╚══════════════════════════════════════════════════════════╝${NC}
`);

  const species = await pickFromList("Species:", SPECIES);
  console.log(`${GREEN}✓${NC} ${species}`);

  const rarity = await pickFromList("Rarity:", RARITIES);
  console.log(`${GREEN}✓${NC} ${rarity}`);

  const shinyAns = await ask(`\n  Shiny? (much longer search) [y/N]: `);
  const wantShiny = shinyAns.toLowerCase() === "y";
  console.log(`${GREEN}✓${NC} shiny: ${wantShiny ? "yes" : "any"}`);

  let wantPeak: StatName | undefined;
  let wantDump: StatName | undefined;

  const statsAns = await ask(`\n  Configure stats? [Y/n]: `);
  if (statsAns.toLowerCase() !== "n") {
    wantPeak = await pickFromList("Peak stat (highest):", STAT_NAMES);
    const dumpOptions = STAT_NAMES.filter((s) => s !== wantPeak);
    wantDump = await pickFromList("Dump stat (lowest):", dumpOptions as any);
    console.log(`${GREEN}✓${NC} peak=${wantPeak} dump=${wantDump}`);
  }

  // Calculate max attempts
  let maxAttempts = 10_000_000;
  if (rarity === "legendary") maxAttempts = 200_000_000;
  else if (rarity === "epic") maxAttempts = 50_000_000;
  if (wantShiny) maxAttempts *= 3;

  console.log(`\n${DIM}  Max attempts: ${(maxAttempts / 1e6).toFixed(0)}M${NC}`);

  const startAns = await ask(`\n  Start search? [Y/n]: `);
  if (startAns.toLowerCase() === "n") { rl.close(); return; }

  console.log(`\n${CYAN}→${NC}  Searching...\n`);

  const criteria: SearchCriteria = { species, rarity, wantShiny };
  if (wantPeak) criteria.wantPeak = wantPeak;
  if (wantDump) criteria.wantDump = wantDump;

  const results = searchBuddy(criteria, maxAttempts, (checked, found) => {
    process.stderr.write(`\r  ${(checked / 1e6).toFixed(0)}M checked, ${found} matches   `);
  });

  console.log("");

  if (results.length === 0) {
    console.log(`${RED}✗${NC}  No matches found. Try less restrictive criteria.`);
    rl.close();
    return;
  }

  console.log(`${GREEN}✓${NC}  ${results.length} matches found!\n`);

  // Show top 5
  const top = results.slice(0, 5);
  for (let i = 0; i < top.length; i++) {
    const r = top[i];
    const stats = STAT_NAMES.map((n) => `${n.slice(0, 3)}:${r.bones.stats[n]}`).join(" ");
    const shiny = r.bones.shiny ? "✨ " : "   ";
    console.log(`  ${CYAN}${i + 1}${NC}) ${shiny}eye=${r.bones.eye} hat=${r.bones.hat}  ${stats}`);
  }

  const pickAns = await ask(`\n  Apply which? [1-${top.length}, q to cancel]: `);
  if (pickAns === "q") { rl.close(); return; }

  const pickIdx = parseInt(pickAns) - 1;
  if (pickIdx < 0 || pickIdx >= top.length) {
    console.log(`${RED}Invalid.${NC}`);
    rl.close();
    return;
  }

  const chosen = top[pickIdx];
  console.log(`\n${renderBuddy(chosen.bones)}\n`);

  const companion = {
    bones: chosen.bones,
    name: generateFallbackName(),
    personality: `A ${chosen.bones.rarity} ${chosen.bones.species} who watches code with quiet intensity.`,
    hatchedAt: Date.now(),
    userId: chosen.userId,
  };

  saveCompanion(companion);
  writeStatusState(companion);

  // Also update ~/.claude.json userID for Claude Code's own companion system
  try {
    const { readFileSync: rf, writeFileSync: wf } = require("fs");
    const { join: pj } = require("path");
    const { homedir: hd } = require("os");
    const cfgPath = pj(hd(), ".claude.json");
    const cfg = JSON.parse(rf(cfgPath, "utf8"));
    cfg.userID = chosen.userId;
    delete cfg.companion;
    if (cfg.oauthAccount?.accountUuid) delete cfg.oauthAccount.accountUuid;
    wf(cfgPath, JSON.stringify(cfg, null, 2));
    console.log(`${GREEN}✓${NC}  userID set in ~/.claude.json`);
  } catch {
    console.log(`${YELLOW}⚠${NC}  Could not update ~/.claude.json — do it manually or run with --fix`);
  }

  console.log(`${GREEN}✓${NC}  Companion saved: ${companion.name}`);
  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${GREEN}  Done! Restart Claude Code and type /buddy${NC}`);
  console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);

  rl.close();
}

main();
