#!/usr/bin/env bun

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

function printBaseList(): void {
  console.log("Available BitmapPunks bases:");
  for (const base of bases) {
    const marker = base.key === current ? "*" : " ";
    console.log(`${marker} ${String(base.id).padStart(3)}  ${base.key}  (${base.displayName})`);
  }
}

if (!args[0]) {
  console.log(`Active BitmapPunks base: ${current}`);
  console.log("Use `base list` to browse all bases or `base default` to reset to the default trait.");
  console.log(`Available bases: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(0);
}

const command = args[0];
if (command === "list") {
  printBaseList();
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
  console.error("Try `base list` to browse available traits.");
  console.error(`Quick picks: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(1);
}

saveConfig({ activeBitmapBase: chosen.key });
const companion = ensureCompanion();
writeStatusState(companion);
console.log(`Active BitmapPunks base -> ${chosen.key} (${chosen.displayName})`);
