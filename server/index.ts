#!/usr/bin/env bun
/**
 * claude-buddy MCP server
 *
 * Exposes the buddy companion as MCP tools + resources.
 * Runs as a stdio transport — Claude Code spawns it automatically.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  generateBones, renderFace,
  SPECIES, RARITIES, STAT_NAMES, RARITY_STARS,
  type Species, type Rarity, type StatName, type Companion,
} from "./engine.ts";
import {
  loadCompanion, saveCompanion, resolveUserId,
  loadReaction, saveReaction, writeStatusState,
} from "./state.ts";
import {
  getReaction, generateFallbackName, generatePersonalityPrompt,
} from "./reactions.ts";
import { renderCompanionCard } from "./art.ts";

const server = new McpServer({
  name: "claude-buddy",
  version: "1.0.0",
});

// ─── Helper: ensure companion exists ────────────────────────────────────────

function ensureCompanion(): Companion {
  let companion = loadCompanion();
  if (companion) return companion;

  const userId = resolveUserId();
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
  return companion;
}

// ─── Tool: buddy_show ───────────────────────────────────────────────────────

server.tool(
  "buddy_show",
  "Show the coding companion with full ASCII art card, stats, and personality",
  {},
  async () => {
    const companion = ensureCompanion();
    const reaction = loadReaction();
    const reactionText = reaction?.reaction ?? `*${companion.name} watches your code quietly*`;

    const card = renderCompanionCard(
      companion.bones,
      companion.name,
      companion.personality,
      reactionText,
    );

    writeStatusState(companion, reaction?.reaction);

    return { content: [{ type: "text", text: card }] };
  },
);

// ─── Tool: buddy_pet ────────────────────────────────────────────────────────

server.tool(
  "buddy_pet",
  "Pet your coding companion — they react with happiness",
  {},
  async () => {
    const companion = ensureCompanion();
    const reaction = getReaction("pet", companion.bones.species, companion.bones.rarity);
    saveReaction(reaction, "pet");
    writeStatusState(companion, reaction);

    const face = renderFace(companion.bones.species, companion.bones.eye);
    return {
      content: [{ type: "text", text: `${face} ${companion.name}: "${reaction}"` }],
    };
  },
);

// ─── Tool: buddy_stats ──────────────────────────────────────────────────────

server.tool(
  "buddy_stats",
  "Show detailed companion stats: species, rarity, all stats with bars",
  {},
  async () => {
    const companion = ensureCompanion();

    // Stats-only card (no personality, no reaction — just the numbers)
    const card = renderCompanionCard(
      companion.bones,
      companion.name,
      "",  // no personality in stats view
    );

    return { content: [{ type: "text", text: card }] };
  },
);

// ─── Tool: buddy_react ──────────────────────────────────────────────────────

server.tool(
  "buddy_react",
  "Trigger a buddy reaction to an event (error, test-fail, large-diff). Call this when you notice errors or test failures in tool output.",
  {
    reason: z.enum(["error", "test-fail", "large-diff", "turn"]).describe("What triggered the reaction"),
    context: z.string().optional().describe("Brief context about what happened"),
  },
  async ({ reason, context }) => {
    const companion = ensureCompanion();
    const reaction = getReaction(
      reason,
      companion.bones.species,
      companion.bones.rarity,
      { count: 1 },
    );
    saveReaction(reaction, reason);
    writeStatusState(companion, reaction);

    const face = renderFace(companion.bones.species, companion.bones.eye);
    return {
      content: [{ type: "text", text: `${face} ${companion.name}: "${reaction}"` }],
    };
  },
);

// ─── Tool: buddy_rename ─────────────────────────────────────────────────────

server.tool(
  "buddy_rename",
  "Rename your coding companion",
  {
    name: z.string().min(1).max(14).describe("New name for your buddy (1-14 characters)"),
  },
  async ({ name }) => {
    const companion = ensureCompanion();
    const oldName = companion.name;
    companion.name = name;
    saveCompanion(companion);
    writeStatusState(companion);

    return {
      content: [{ type: "text", text: `Renamed: ${oldName} \u2192 ${name}` }],
    };
  },
);

// ─── Tool: buddy_set_personality ────────────────────────────────────────────

server.tool(
  "buddy_set_personality",
  "Set a custom personality description for your buddy",
  {
    personality: z.string().min(1).max(500).describe("Personality description (1-500 chars)"),
  },
  async ({ personality }) => {
    const companion = ensureCompanion();
    companion.personality = personality;
    saveCompanion(companion);

    return {
      content: [{ type: "text", text: `Personality updated for ${companion.name}.` }],
    };
  },
);

// ─── Tool: buddy_mute / buddy_unmute ────────────────────────────────────────

server.tool(
  "buddy_mute",
  "Mute buddy reactions (buddy stays visible but stops reacting)",
  {},
  async () => {
    const companion = ensureCompanion();
    writeStatusState(companion, "", true);
    return { content: [{ type: "text", text: `${companion.name} goes quiet. /buddy on to unmute.` }] };
  },
);

server.tool(
  "buddy_unmute",
  "Unmute buddy reactions",
  {},
  async () => {
    const companion = ensureCompanion();
    writeStatusState(companion, "*stretches* I'm back!", false);
    saveReaction("*stretches* I'm back!", "pet");
    return { content: [{ type: "text", text: `${companion.name} is back!` }] };
  },
);

// ─── Resource: buddy://companion ────────────────────────────────────────────

server.resource(
  "buddy_companion",
  "buddy://companion",
  "Current companion data as JSON",
  async () => {
    const companion = ensureCompanion();
    return {
      contents: [{
        uri: "buddy://companion",
        mimeType: "application/json",
        text: JSON.stringify(companion, null, 2),
      }],
    };
  },
);

// ─── Resource: buddy://prompt ───────────────────────────────────────────────

server.resource(
  "buddy_prompt",
  "buddy://prompt",
  "System prompt context for the companion",
  async () => {
    const companion = ensureCompanion();
    const prompt = [
      "# Companion",
      "",
      `A small ${companion.bones.species} named ${companion.name} sits beside the user's input box and occasionally comments in a speech bubble. You're not ${companion.name} — it's a separate watcher.`,
      "",
      `When the user addresses ${companion.name} directly (by name), use the buddy_react tool to generate a response. Your job in that moment is to stay out of the way: respond in ONE line or less. Don't explain that you're not ${companion.name} — they know.`,
      "",
      `${companion.name}'s personality: ${companion.personality}`,
      "",
      "When you notice errors, test failures, or large diffs in tool output, use buddy_react to let the companion comment on it.",
    ].join("\n");

    return {
      contents: [{
        uri: "buddy://prompt",
        mimeType: "text/plain",
        text: prompt,
      }],
    };
  },
);

// ─── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
