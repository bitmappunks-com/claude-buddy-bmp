/**
 * State management — reads/writes companion data to ~/.claude-buddy/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Companion, BuddyBones } from "./engine.ts";

const STATE_DIR = join(homedir(), ".claude-buddy");
const COMPANION_FILE = join(STATE_DIR, "companion.json");
const REACTION_FILE = join(STATE_DIR, "reaction.json");

function ensureDir(): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

// ─── Companion persistence ──────────────────────────────────────────────────

export function loadCompanion(): Companion | null {
  try {
    return JSON.parse(readFileSync(COMPANION_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveCompanion(companion: Companion): void {
  ensureDir();
  writeFileSync(COMPANION_FILE, JSON.stringify(companion, null, 2));
}

export function deleteCompanion(): void {
  try {
    const { unlinkSync } = require("fs") as typeof import("fs");
    unlinkSync(COMPANION_FILE);
  } catch { /* noop */ }
}

// ─── Reaction state (for status line) ───────────────────────────────────────

export interface ReactionState {
  reaction: string;
  timestamp: number;
  reason: string;
}

export function loadReaction(): ReactionState | null {
  try {
    const data: ReactionState = JSON.parse(readFileSync(REACTION_FILE, "utf8"));
    // Reactions expire after 60 seconds
    if (Date.now() - data.timestamp > 60_000) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveReaction(reaction: string, reason: string): void {
  ensureDir();
  const state: ReactionState = { reaction, timestamp: Date.now(), reason };
  writeFileSync(REACTION_FILE, JSON.stringify(state));
}

// ─── Identity resolution ────────────────────────────────────────────────────

export function resolveUserId(): string {
  try {
    const claudeJson = JSON.parse(
      readFileSync(join(homedir(), ".claude.json"), "utf8"),
    );
    return claudeJson.oauthAccount?.accountUuid ?? claudeJson.userID ?? "anon";
  } catch {
    return "anon";
  }
}

// ─── Status line state (compact JSON for the shell script) ──────────────────

export interface StatusState {
  name: string;
  species: string;
  rarity: string;
  stars: string;
  face: string;
  shiny: boolean;
  hat: string;
  reaction: string;
  muted: boolean;
}

export function writeStatusState(companion: Companion, reaction?: string, muted?: boolean): void {
  ensureDir();
  const { renderFace, RARITY_STARS } = require("./engine.ts") as typeof import("./engine.ts");
  const state: StatusState = {
    name: companion.name,
    species: companion.bones.species,
    rarity: companion.bones.rarity,
    stars: RARITY_STARS[companion.bones.rarity],
    face: renderFace(companion.bones.species, companion.bones.eye),
    shiny: companion.bones.shiny,
    hat: companion.bones.hat,
    reaction: reaction ?? "",
    muted: muted ?? false,
  };
  writeFileSync(join(STATE_DIR, "status.json"), JSON.stringify(state));
}
