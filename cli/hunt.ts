#!/usr/bin/env bun
/**
 * claude-buddy hunt — guided BitmapPunks pet creation
 *
 * Flow:
 *   1. Pick gender
 *   2. Pick base type/species
 *   3. If that type has multiple concrete bases, pick the exact look
 *
 * Hunt creates a new companion. The chosen BitmapPunks BASE is stored on that
 * companion, so every saved pet keeps its own visual base and generated setup.
 */

import { createInterface } from "readline";
import {
  generateBones,
  generatePersonality,
  type Companion,
} from "../server/engine.ts";
import {
  resolveUserId,
  saveActiveSlot,
  saveCompanionSlot,
  slugify,
  unusedName,
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

function baseVariantParts(base: BitmapBaseInfo): string[] {
  const familyTokens = new Set(
    base.displayName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  );
  return base.name
    .split("_")
    .filter((part) => part !== base.gender && !familyTokens.has(part.toLowerCase()))
    .map((part) => part.toLowerCase());
}

function describeBase(base: BitmapBaseInfo): string {
  const parts = [base.displayName, ...baseVariantParts(base), base.gender];
  return `(${parts.join(", ")})`;
}

function createCompanionForBase(base: BitmapBaseInfo): { companion: Companion; slot: string } {
  const userId = resolveUserId();
  const now = Date.now();
  const bones = generateBones(userId, `hunt:${base.key}:${now}`);
  const name = unusedName();
  const companion: Companion = {
    bones,
    name,
    personality: generatePersonality(bones, userId),
    hatchedAt: now,
    userId,
    bitmapBase: base.key,
  };
  const slot = slugify(name);
  saveCompanionSlot(companion, slot);
  saveActiveSlot(slot);
  return { companion, slot };
}

async function main() {
  console.log(`
${CYAN}╔══════════════════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  ${BOLD}claude-buddy hunt${NC} — create a BitmapPunks pet            ${CYAN}║${NC}
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
    return `${base.displayName}${count > 1 ? ` ${DIM}(${count} options)${NC}` : ""}`;
  });
  console.log(`${GREEN}✓${NC} ${typeChoice.displayName}`);

  const variants = basesForGender.filter((base) => base.displayName === typeChoice.displayName);
  const chosen = variants.length === 1
    ? variants[0]!
    : await pickFromList<BitmapBaseInfo>("Exact look:", variants, describeBase);

  const { companion, slot } = createCompanionForBase(chosen);
  writeStatusState(companion, `*${companion.name} arrives as ${describeBase(chosen)}*`);

  console.log(`\n${GREEN}✓${NC}  Created ${BOLD}${companion.name}${NC} ${describeBase(chosen)}`);
  console.log(`${DIM}  Saved to slot "${slot}" and set as active. This pet keeps its own BASE and generated setup.${NC}`);
  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
  console.log(`${GREEN}  Done! Restart Claude Code to see the selected pet.${NC}`);
  console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n`);

  rl.close();
}

main();
