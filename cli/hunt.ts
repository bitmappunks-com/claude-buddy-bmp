#!/usr/bin/env bun
/**
 * claude-buddy hunt — guided BitmapPunks BASE selector
 *
 * Flow:
 *   1. Pick gender
 *   2. Pick base type/species
 *   3. If that type has multiple variants, pick the exact BASE
 *
 * Selecting a BASE changes only the visual BitmapPunks base. The companion's
 * name, rarity, stats, eye, hat, personality, and menagerie slot stay intact.
 */

import { createInterface } from "readline";
import {
  generateBones,
  generatePersonality,
  type Companion,
} from "../server/engine.ts";
import {
  loadCompanion,
  resolveUserId,
  saveCompanion,
  saveConfig,
  writeStatusState,
} from "../server/state.ts";
import {
  listBitmapBaseTraits,
  type BitmapBaseInfo,
} from "../server/bitmappunk-avatar.ts";

const CYAN  = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const NC    = "\x1b[0m";

type BitmapGender = BitmapBaseInfo["gender"];

const rl = createInterface({ input: process.stdin, output: process.stdout });
const queuedInput: string[] = [];
const waitingInput: Array<(line: string) => void> = [];

rl.on("line", (line) => {
  const resolve = waitingInput.shift();
  if (resolve) resolve(line);
  else queuedInput.push(line);
});

rl.on("close", () => {
  while (waitingInput.length > 0) waitingInput.shift()!("");
});

function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const queued = queuedInput.shift();
  if (queued !== undefined) return Promise.resolve(queued);
  return new Promise((resolve) => waitingInput.push(resolve));
}

function pickFromList<T>(label: string, items: readonly T[], render: (item: T) => string): Promise<T> {
  return new Promise(async (resolve) => {
    console.log(`\n${BOLD}${label}${NC}`);
    items.forEach((item, i) => console.log(`  ${CYAN}${(i + 1).toString().padStart(2)}${NC}) ${render(item)}`));
    while (true) {
      const ans = await ask(`\n  Choice [1-${items.length}]: `);
      const idx = parseInt(ans, 10) - 1;
      if (idx >= 0 && idx < items.length) { resolve(items[idx]!); return; }
      console.log(`  ${RED}Invalid. Enter 1-${items.length}.${NC}`);
    }
  });
}

function ensureCompanion(): Companion {
  const existing = loadCompanion();
  if (existing) return existing;

  const userId = resolveUserId();
  const bones = generateBones(userId);
  const companion: Companion = {
    bones,
    name: "buddy",
    personality: generatePersonality(bones, userId),
    hatchedAt: Date.now(),
    userId,
  };
  saveCompanion(companion);
  return companion;
}

function uniqueBy<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function main() {
  console.log(`
${CYAN}╔══════════════════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  ${BOLD}claude-buddy hunt${NC} — choose a BitmapPunks BASE             ${CYAN}║${NC}
${CYAN}╚══════════════════════════════════════════════════════════╝${NC}
`);

  const bases = listBitmapBaseTraits();
  const genders = uniqueBy(bases.map((base) => base.gender), (gender) => gender);
  const gender = await pickFromList<BitmapGender>("Gender:", genders, (item) => item);
  console.log(`${GREEN}✓${NC} ${gender}`);

  const basesForGender = bases.filter((base) => base.gender === gender);
  const typeChoices = uniqueBy(basesForGender, (base) => base.displayName);
  const typeChoice = await pickFromList<BitmapBaseInfo>("Type:", typeChoices, (base) => {
    const count = basesForGender.filter((candidate) => candidate.displayName === base.displayName).length;
    return `${base.displayName}${count > 1 ? ` ${DIM}(${count} variants)${NC}` : ""}`;
  });
  console.log(`${GREEN}✓${NC} ${typeChoice.displayName}`);

  const variants = basesForGender.filter((base) => base.displayName === typeChoice.displayName);
  const chosen = variants.length === 1
    ? variants[0]!
    : await pickFromList<BitmapBaseInfo>("Variant:", variants, (base) => `${base.key} ${DIM}(${base.name})${NC}`);

  saveConfig({ activeBitmapBase: chosen.key });
  const companion = ensureCompanion();
  writeStatusState(companion, `*base changed to ${chosen.displayName}*`);

  console.log(`\n${GREEN}✓${NC}  Active BitmapPunks BASE -> ${chosen.key} (${chosen.displayName}, ${chosen.gender})`);
  console.log(`${DIM}  Companion name, rarity, stats, eye, hat, personality, and menagerie slot are unchanged.${NC}`);
  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${GREEN}  Done! Restart Claude Code to see the selected BASE.${NC}`);
  console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);

  rl.close();
}

main();
