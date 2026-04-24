#!/usr/bin/env bun

import {
  loadCompanion,
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
const current = saveConfig({}).activeBitmapBase ?? DEFAULT_BITMAP_BASE;

if (!args[0]) {
  console.log(`Active BitmapPunks base: ${current}`);
  console.log(`Available bases: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(0);
}

const requested = args[0];
const chosen = bases.find((base) => base.key === requested || base.name === requested);
if (!chosen) {
  console.error(`Unknown BitmapPunks base: ${requested}`);
  console.error(`Try one of: ${bases.slice(0, 12).map((base) => base.key).join(", ")}${bases.length > 12 ? ", ..." : ""}`);
  process.exit(1);
}

saveConfig({ activeBitmapBase: chosen.key });
const companion = ensureCompanion();
writeStatusState(companion);
console.log(`Active BitmapPunks base -> ${chosen.key} (${chosen.displayName})`);
