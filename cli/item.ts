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
  DEFAULT_BITMAP_ITEM,
  listBitmapItems,
} from "../server/bitmappunk-avatar.ts";

function normalizedArgs(): string[] {
  const args = process.argv.slice(2);
  return args[0] === "item" ? args.slice(1) : args;
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
const items = listBitmapItems();
const current = saveConfig({}).activeBitmapItem ?? DEFAULT_BITMAP_ITEM;

if (!args[0]) {
  console.log(`Active BitmapPunks item: ${current}`);
  console.log(`Available items: ${items.slice(0, 12).map((item) => item.key).join(", ")}${items.length > 12 ? ", ..." : ""}`);
  process.exit(0);
}

const requested = args[0];
const chosen = items.find((item) => item.key === requested || item.name === requested);
if (!chosen) {
  console.error(`Unknown BitmapPunks item: ${requested}`);
  console.error(`Try one of: ${items.slice(0, 12).map((item) => item.key).join(", ")}${items.length > 12 ? ", ..." : ""}`);
  process.exit(1);
}

saveConfig({ activeBitmapItem: chosen.key });
const companion = ensureCompanion();
writeStatusState(companion);
console.log(`Active BitmapPunks item -> ${chosen.key} (${chosen.displayName})`);
