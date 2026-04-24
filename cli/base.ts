#!/usr/bin/env bun

import { createInterface } from "readline";
import {
  loadCompanion,
  loadConfig,
  resolveUserId,
  saveCompanion,
  saveConfig,
  writeStatusState,
} from "../server/state.ts";
import {
  generateBones,
  generatePersonality,
  type Companion,
} from "../server/engine.ts";
import {
  DEFAULT_BITMAP_BASE,
  listBitmapBaseTraits,
  resolveBitmapBaseSelection,
} from "../server/bitmappunk-avatar.ts";

function normalizedArgs(): string[] {
  const args = process.argv.slice(2);
  return args[0] === "base" ? args.slice(1) : args;
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

const args = normalizedArgs();
const bases = listBitmapBaseTraits();
function currentBaseKey(): string {
  const configuredBase = loadConfig().activeBitmapBase;
  try {
    return resolveBitmapBaseSelection(configuredBase ?? DEFAULT_BITMAP_BASE);
  } catch {
    return DEFAULT_BITMAP_BASE;
  }
}

const current = currentBaseKey();

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function filterBases(filter?: string): typeof bases {
  const trimmedFilter = filter?.trim() ?? "";
  const normalizedFilter = normalizeSearch(trimmedFilter);
  return normalizedFilter
    ? bases.filter((base) => {
        const haystack = [base.key, base.name, base.displayName, base.gender, String(base.id)].map(normalizeSearch).join(" ");
        return haystack.includes(normalizedFilter);
      })
    : bases;
}

function printBaseList(filter?: string): void {
  const visibleBases = filterBases(filter);
  const trimmedFilter = filter?.trim() ?? "";
  const normalizedFilter = normalizeSearch(trimmedFilter);

  console.log(normalizedFilter ? `Available BitmapPunks bases matching "${trimmedFilter}":` : "Available BitmapPunks bases:");
  for (const base of visibleBases) {
    const marker = base.key === current ? "*" : " ";
    console.log(`${marker} ${String(base.id).padStart(3)}  ${base.key}  (${base.displayName}, ${base.gender})`);
  }
  if (visibleBases.length === 0) {
    console.log("No matching bases. Try a key fragment like `solana`, a gender like `female`, or run `base list` with no filter.");
  }
}

function applyBase(chosen: (typeof bases)[number]): void {
  saveConfig({ activeBitmapBase: chosen.key });
  const companion = ensureCompanion();
  writeStatusState(companion);
  console.log(`Active BitmapPunks base -> ${chosen.key} (${chosen.displayName})`);
  console.log("Companion name, rarity, stats, eye, hat, personality, and menagerie slot are unchanged.");
}

async function pickBaseInteractively(filter?: string): Promise<void> {
  const candidates = filterBases(filter);
  if (candidates.length === 0) {
    console.error(`No matching bases for: ${filter ?? ""}`);
    process.exit(1);
  }

  console.log(filter?.trim() ? `Pick BitmapPunks base matching "${filter.trim()}":` : "Pick BitmapPunks base:");
  candidates.forEach((base, index) => {
    const marker = base.key === current ? "*" : " ";
    console.log(`  ${String(index + 1).padStart(2)}${marker} ${base.key} (${base.displayName}, ${base.gender})`);
  });
  console.log("Only the BitmapPunks BASE layer changes; all buddy attributes stay the same.");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(`Choice [1-${candidates.length}, q to cancel]: `, resolve));
  rl.close();
  if (answer.trim().toLowerCase() === "q") process.exit(0);
  const index = Number.parseInt(answer, 10) - 1;
  const chosen = candidates[index];
  if (!chosen) {
    console.error(`Invalid choice: ${answer}`);
    process.exit(1);
  }
  applyBase(chosen);
}

if (!args[0]) {
  console.log(`Active BitmapPunks base: ${current}`);
  console.log("Use `base pick [search]` for an interactive picker, `base list [search]` to browse/filter, or `base default` to reset.");
  console.log(`Available bases: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(0);
}

const command = args[0];
if (command === "list") {
  printBaseList(args.slice(1).join(" "));
  process.exit(0);
}

if (command === "pick") {
  await pickBaseInteractively(args.slice(1).join(" "));
  process.exit(0);
}

const requested = args.join(" ");
let chosen;
try {
  const resolved = resolveBitmapBaseSelection(requested);
  chosen = bases.find((base) => base.key === resolved);
} catch {
  chosen = undefined;
}
if (!chosen) {
  console.error(`Unknown BitmapPunks base: ${requested}`);
  console.error("Try `base list` to browse available traits or `base list <search>` to narrow them down.");
  console.error(`Quick picks: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(1);
}

applyBase(chosen);
