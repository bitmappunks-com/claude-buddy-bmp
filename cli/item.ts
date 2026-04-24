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
import { DEFAULT_BITMAP_ITEM } from "../server/bitmappunk-avatar.ts";

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
const current = loadConfig().activeBitmapItem ?? DEFAULT_BITMAP_ITEM;

if (!args[0]) {
  console.log(`Active BitmapPunks item mode: ${current === "auto" ? "auto (behavior/randomized)" : "legacy explicit item (will render, but direct item selection is no longer user-facing)"}`);
  console.log("ITEM animations are selected automatically from recent buddy behavior.");
  console.log("Use `item auto` to reset any legacy explicit item override back to automatic selection.");
  process.exit(0);
}

const requested = args[0];
if (requested === "auto") {
  saveConfig({ activeBitmapItem: "auto" });
  const companion = ensureCompanion();
  writeStatusState(companion);
  console.log("Active BitmapPunks item mode -> auto (behavior/randomized)");
  process.exit(0);
}

console.error("BitmapPunks ITEM choice is automatic and is not user-selectable.");
console.error("Use `item auto` to reset legacy explicit item config, or `base <trait>` to choose a user-facing BASE trait.");
process.exit(1);
