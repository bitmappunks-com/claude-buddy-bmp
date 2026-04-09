/**
 * claude-buddy installer
 *
 * Registers: MCP server, skill, hooks, status line
 * All in ~/.claude/settings.json (user scope — works for all projects)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { join, resolve, dirname } from "path";
import { homedir } from "os";

import { generateBones, renderBuddy, renderFace, RARITY_STARS } from "../server/engine.ts";
import { loadCompanion, saveCompanion, resolveUserId, writeStatusState } from "../server/state.ts";
import { generateFallbackName } from "../server/reactions.ts";

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const NC = "\x1b[0m";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");
const BUDDY_DIR = join(CLAUDE_DIR, "skills", "buddy");
const PROJECT_ROOT = resolve(dirname(import.meta.dir));

function banner() {
  console.log(`
${CYAN}╔══════════════════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  ${BOLD}claude-buddy${NC} — permanent coding companion              ${CYAN}║${NC}
${CYAN}║${NC}  ${DIM}MCP + Skill + StatusLine + Hooks${NC}                        ${CYAN}║${NC}
${CYAN}╚══════════════════════════════════════════════════════════╝${NC}
`);
}

function ok(msg: string) { console.log(`${GREEN}✓${NC}  ${msg}`); }
function info(msg: string) { console.log(`${CYAN}→${NC}  ${msg}`); }
function warn(msg: string) { console.log(`${YELLOW}⚠${NC}  ${msg}`); }

// ─── Load / update settings.json ────────────────────────────────────────────

function loadSettings(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, any>) {
  mkdirSync(CLAUDE_DIR, { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + "\n");
}

// ─── Step 1: Register MCP server (in ~/.claude.json, NOT settings.json) ─────

function installMcp(_settings: Record<string, any>) {
  const serverPath = join(PROJECT_ROOT, "server", "index.ts");
  const claudeJsonPath = join(homedir(), ".claude.json");

  let claudeJson: Record<string, any> = {};
  try {
    claudeJson = JSON.parse(readFileSync(claudeJsonPath, "utf8"));
  } catch { /* fresh config */ }

  if (!claudeJson.mcpServers) claudeJson.mcpServers = {};

  claudeJson.mcpServers["claude-buddy"] = {
    command: "bun",
    args: [serverPath],
    cwd: PROJECT_ROOT,
  };

  writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2));
  ok("MCP server registered in ~/.claude.json: claude-buddy");
}

// ─── Step 2: Install skill ──────────────────────────────────────────────────

function installSkill() {
  const srcSkill = join(PROJECT_ROOT, "skills", "buddy", "SKILL.md");
  mkdirSync(BUDDY_DIR, { recursive: true });
  cpSync(srcSkill, join(BUDDY_DIR, "SKILL.md"), { force: true });
  ok(`Skill installed: ${BUDDY_DIR}/SKILL.md`);
}

// ─── Step 3: Configure status line ──────────────────────────────────────────

function installStatusLine(settings: Record<string, any>) {
  const statusScript = join(PROJECT_ROOT, "statusline", "buddy-status.sh");

  settings.statusLine = {
    type: "command",
    command: statusScript,
    padding: 1,
  };

  ok("Status line configured: buddy-status.sh");
}

// ─── Step 4: Register hooks ─────────────────────────────────────────────────

function installHooks(settings: Record<string, any>) {
  const hookScript = join(PROJECT_ROOT, "hooks", "react.sh");

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

  // Remove existing claude-buddy hooks
  settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
    (h: any) => !h.hooks?.some((hh: any) => hh.command?.includes("claude-buddy")),
  );

  // Add hook for Bash tool (where errors and test output appear)
  settings.hooks.PostToolUse.push({
    matcher: "Bash",
    hooks: [{
      type: "command",
      command: hookScript,
    }],
  });

  ok("Hooks registered: PostToolUse → react.sh");
}

// ─── Step 5: Initialize companion ───────────────────────────────────────────

function initCompanion() {
  let companion = loadCompanion();
  if (companion) {
    info(`Existing companion found: ${companion.name} (${companion.bones.rarity} ${companion.bones.species})`);
    return companion;
  }

  const userId = resolveUserId();
  info(`Generating companion from user ID: ${userId.slice(0, 12)}...`);

  const bones = generateBones(userId);
  companion = {
    bones,
    name: generateFallbackName(),
    personality: `A ${bones.rarity} ${bones.species} who watches code with quiet intensity.`,
    hatchedAt: Date.now(),
    userId,
  };

  saveCompanion(companion);
  writeStatusState(companion);
  ok(`Companion hatched: ${companion.name}`);

  return companion;
}

// ─── Main ───────────────────────────────────────────────────────────────────

banner();

// Preflight
if (!existsSync(join(CLAUDE_DIR))) {
  warn("~/.claude/ not found. Start Claude Code once first, then re-run.");
  process.exit(1);
}

info("Installing claude-buddy...\n");

const settings = loadSettings();

installMcp(settings);
installSkill();
installStatusLine(settings);
installHooks(settings);
saveSettings(settings);

console.log("");
const companion = initCompanion();

console.log("");
console.log(renderBuddy(companion.bones));
console.log("");
console.log(`  ${BOLD}${companion.name}${NC} — ${companion.personality}`);
console.log("");

console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
console.log(`${GREEN}  Done! Restart Claude Code and type /buddy${NC}`);
console.log(`${GREEN}  Your companion is now permanent — survives any update.${NC}`);
console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
console.log("");
console.log(`${DIM}  /buddy        show your companion`);
console.log(`  /buddy pet    pet your companion`);
console.log(`  /buddy stats  detailed stat card`);
console.log(`  /buddy off    mute reactions`);
console.log(`  /buddy on     unmute reactions${NC}`);
console.log("");
