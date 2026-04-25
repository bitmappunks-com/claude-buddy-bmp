import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { ReactionReason } from "./reactions.ts";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const VENDOR_DIR = join(MODULE_DIR, "..", "vendor", "bmp-gif");
const BASE_DIR = join(VENDOR_DIR, "traits", "BASE");
const ITEM_DIR = join(VENDOR_DIR, "traits", "ITEM");
const ACTIONS_DIR = join(VENDOR_DIR, "actions");

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const RESET = "\x1b[0m";

type RenderMode = "halfblock" | "fullcell";
type BitmapGender = "male" | "female";
type BitmapCanvas = (string | null)[][];

type BitmapLayer = {
  zIndex: number;
  width: number;
  height: number;
  pixels: string[][];
  activeRegion?: {
    xTL: number;
    yTL: number;
    xBR: number;
    yBR: number;
    bgColor?: string;
  };
};

type BitmapTraitJson = {
  id: number;
  name: string;
  displayName?: string;
  layerPixels: BitmapLayer[];
};

type BitmapSparsePixel = {
  x: number;
  y: number;
  color: string;
};

type BitmapItemAnimJson = {
  itemId: number;
  name: string;
  archetype?: string;
  frames: BitmapSparsePixel[][];
};

type ActionPoint = { x: string | number; y: string | number };
type ActionOp =
  | { op: "set"; x: string | number; y: string | number; color: string }
  | { op: "swap"; a: ActionPoint; b: ActionPoint };

type ActionJson = {
  name: string;
  anchors: Record<string, number | Record<BitmapGender, number>>;
  frames: number[];
  states: Record<string, { name: string; ops: ActionOp[] }>;
};

export interface BitmapBaseInfo {
  key: string;
  id: number;
  name: string;
  displayName: string;
  gender: BitmapGender;
  width: number;
  height: number;
}

export interface BitmapBaseTrait extends BitmapBaseInfo {
  layers: BitmapLayer[];
}

export interface BitmapItemInfo {
  key: string;
  id: number;
  name: string;
  displayName: string;
  archetype: string;
  frameCount: number;
}

export interface BitmapStatusArt {
  bitmapBase: string;
  bitmapItem?: string;
  frames: string[];
  framesHalfblock: string[];
  framesFullcell: string[];
  frameSequence: number[];
}

const traitCache = new Map<string, BitmapBaseTrait>();
const actionCache = new Map<string, ActionJson>();
const itemCache = new Map<string, BitmapItemInfo & { frames: BitmapSparsePixel[][] }>();
let baseIndexCache: BitmapBaseInfo[] | null = null;
let itemIndexCache: BitmapItemInfo[] | null = null;

function parseGender(name: string): BitmapGender {
  return name.endsWith("_female") ? "female" : "male";
}

function normalizeColor(color: string): string | null {
  const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*((?:\d+)|(?:\d*\.\d+))\)$/);
  if (rgba) {
    if (Number(rgba[4]) === 0) return null;
    return `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
  }
  const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgb) return `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;
  throw new Error(`Unsupported color: ${color}`);
}

function parseRgb(color: string): [number, number, number] {
  const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgb) throw new Error(`Unsupported rgb color: ${color}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function createCanvas(width: number, height: number): BitmapCanvas {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => null));
}

function cloneCanvas(canvas: BitmapCanvas): BitmapCanvas {
  return canvas.map((row) => [...row]);
}

function resolveBaseInfoFromDir(dirName: string): BitmapBaseInfo {
  const trait = loadBitmapBaseTrait(dirName);
  return {
    key: trait.key,
    id: trait.id,
    name: trait.name,
    displayName: trait.displayName,
    gender: trait.gender,
    width: trait.width,
    height: trait.height,
  };
}

function resolveBaseDir(base: string): string {
  const dirs = readdirSync(BASE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const exactDir = dirs.find((dir) => dir === base);
  if (exactDir) return exactDir;

  const byName = dirs.find((dir) => dir.replace(/^\d+-/, "") === base);
  if (byName) return byName;

  throw new Error(`Unknown BitmapPunks base: ${base}`);
}

function normalizeBitmapLookup(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function listBitmapBaseTraits(): BitmapBaseInfo[] {
  if (!baseIndexCache) {
    baseIndexCache = readdirSync(BASE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolveBaseInfoFromDir(entry.name))
      .sort((a, b) => a.id - b.id);
  }
  return baseIndexCache.map((base) => ({ ...base }));
}

export const DEFAULT_BITMAP_BASE = listBitmapBaseTraits()[0]?.key ?? "100-solana_male";

export function pickBitmapBaseForSeed(seed: string): string {
  const bases = listBitmapBaseTraits();
  if (bases.length === 0) return DEFAULT_BITMAP_BASE;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return bases[hash % bases.length]!.key;
}

function baseVariantParts(base: Pick<BitmapBaseInfo, "name" | "displayName" | "gender">): string[] {
  const familyTokens = new Set(base.displayName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return base.name
    .split("_")
    .filter((part) => part !== base.gender && !familyTokens.has(part.toLowerCase()))
    .map((part) => part.toLowerCase());
}

export function formatBitmapBaseLabel(base: Pick<BitmapBaseInfo, "name" | "displayName" | "gender">): string {
  return `(${[base.displayName, ...baseVariantParts(base), base.gender].join(", ")})`;
}

export function bitmapBaseLabelForKey(baseKey: string | undefined): string {
  const resolved = resolveBitmapBaseSelection(baseKey ?? DEFAULT_BITMAP_BASE);
  const base = listBitmapBaseTraits().find((candidate) => candidate.key === resolved);
  return base ? formatBitmapBaseLabel(base) : formatBitmapBaseLabel(loadBitmapBaseTrait(resolved));
}

const ERROR_ITEM_POOL = ["1733-drool", "1734-drool_with_blood", "1735-drool_with_liquor", "1731-vomit_clear", "1732-vomit_rainbow"] as const;
const SUCCESS_ITEM_POOL = ["1744-bubble_gum_large", "1749-sleep_bubble"] as const;
const FIRE_ITEM_POOL = ["1722-fire_breathing_blue", "1723-fire_breathing_green", "1724-fire_breathing_purple", "1725-fire_breathing_red"] as const;

// Mirrors the reaction reason vocabulary used by hooks/server/index.ts. ITEM is
// still internal-only; these buckets just let automatic selection react to more
// real buddy behavior instead of falling through to the same idle loop.
const ERROR_REASONS = [
  "error", "test-fail", "lint-fail", "type-error", "build-fail", "security-warning", "deprecation", "merge-conflict",
  "frustrated", "stuck", "late-night-error", "marathon-error", "weekend-conflict", "build-after-push", "marathon-test-fail",
] as const satisfies readonly ReactionReason[];
const STREAK_REASONS = ["streak-3", "streak-5", "streak-10", "streak-20"] as const satisfies readonly ReactionReason[];
const SUCCESS_REASONS = [
  "success", "all-green", "deploy", "release", "coverage", "happy",
  "recovery-from-error", "recovery-from-test-fail", "recovery-from-build-fail", "recovery-from-merge-conflict",
] as const satisfies readonly ReactionReason[];
const CHURN_REASONS = [
  "large-diff", "many-edits", "delete-file", "large-file", "create-file", "debug-loop", "write-spree", "search-heavy",
  "snark", "debugging", "wisdom", "patience",
] as const satisfies readonly ReactionReason[];
const IDLE_REASONS = ["hatch", "pet", "turn", "idle", "sarcastic"] as const satisfies readonly ReactionReason[];
const GIT_REASONS = ["push", "commit", "branch", "rebase", "stash", "tag", "late-night-commit", "friday-push"] as const satisfies readonly ReactionReason[];
const TEMPORAL_REASONS = [
  "late-night", "early-morning", "long-session", "marathon", "weekend", "monday", "friday",
  "new-year", "valentines", "pi-day", "april-fools", "halloween", "christmas", "new-years-eve", "spooky-season",
] as const satisfies readonly ReactionReason[];
const CHAOS_REASONS = ["chaos"] as const satisfies readonly ReactionReason[];
const FIRE_REASONS = [
  "regex-file", "css-file", "sql-file", "docker-file", "ci-file", "lock-file", "env-file", "test-file", "doc-file", "config-file",
  "binary-file", "gitignore", "makefile", "readme", "package-file", "proto-file",
  "lang-python", "lang-typescript", "lang-rust", "lang-go", "lang-java", "lang-ruby", "lang-php", "lang-c", "lang-cpp",
  "lang-haskell", "lang-swift", "lang-elixir", "lang-zig", "lang-kotlin",
] as const satisfies readonly ReactionReason[];

type BitmapActionBlock = {
  name: string;
  itemKey?: string;
  indices: number[];
};

function pickFromPool(pool: readonly string[], seed: number): string {
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}

function normalizedBitmapReason(reason?: string): string {
  return (reason ?? "").toLowerCase();
}

function hashBitmapReason(reason: string): number {
  let hash = 2166136261;
  for (let i = 0; i < reason.length; i++) {
    hash ^= reason.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mixBitmapAnimationSeed(reason: string, seed: number): number {
  if (!reason) return seed;
  return Math.imul(seed, 31) + hashBitmapReason(reason);
}

function reasonIn(reason: string, pool: readonly string[]): boolean {
  return pool.includes(reason);
}

function itemPoolForReason(reason?: string): string[] {
  const normalized = normalizedBitmapReason(reason);
  if (reasonIn(normalized, STREAK_REASONS) || reasonIn(normalized, ERROR_REASONS)) {
    return [...ERROR_ITEM_POOL];
  }
  if (reasonIn(normalized, SUCCESS_REASONS)) {
    return [...SUCCESS_ITEM_POOL];
  }
  if (reasonIn(normalized, FIRE_REASONS)) {
    return [...FIRE_ITEM_POOL];
  }
  return allBitmapItemKeys();
}

function randomStep(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function buildRandomActionSequence(blocks: BitmapActionBlock[], seed: number): number[] {
  if (blocks.length === 0) return [0];
  const sequence: number[] = [0, 0, 0];
  const mandatory = blocks.slice(0, Math.min(2, blocks.length));
  let state = seed >>> 0;
  for (const block of mandatory) {
    sequence.push(0, 0, ...block.indices, 0);
  }

  const randomActionCount = Math.min(10, Math.max(4, blocks.length));
  for (let i = 0; i < randomActionCount; i++) {
    state = randomStep(state + i + 1);
    const block = blocks[state % blocks.length]!;
    sequence.push(0, 0, ...block.indices, 0);
  }
  return sequence;
}

function allBitmapItemKeys(): string[] {
  return listBitmapItems().map((item) => item.key);
}

export function resolveBitmapBaseSelection(requestedBase?: string): string {
  const trimmed = requestedBase?.trim();
  if (!trimmed || normalizeBitmapLookup(trimmed) === "default") {
    return DEFAULT_BITMAP_BASE;
  }

  const exactDir = readdirSync(BASE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((dir) => dir === trimmed);
  if (exactDir) return exactDir;

  const normalized = normalizeBitmapLookup(trimmed);
  const bases = listBitmapBaseTraits();
  const matched = bases.find((base) => {
    const aliases = [
      base.key,
      base.name,
      base.displayName,
      base.key.replace(/^\d+-/, ""),
      String(base.id),
    ];
    return aliases.some((alias) => normalizeBitmapLookup(alias) === normalized);
  });

  if (matched) return matched.key;
  throw new Error(`Unknown BitmapPunks base: ${requestedBase}`);
}

export function resolveBitmapItemSelection(
  reason?: string,
  seed: number = 0,
): string {
  const normalized = normalizedBitmapReason(reason);
  const selectionSeed = mixBitmapAnimationSeed(normalized, seed);
  if (reasonIn(normalized, STREAK_REASONS)) {
    return pickFromPool(ERROR_ITEM_POOL, selectionSeed);
  }
  if (reasonIn(normalized, ERROR_REASONS)) {
    return pickFromPool(ERROR_ITEM_POOL, selectionSeed);
  }
  if (reasonIn(normalized, SUCCESS_REASONS)) {
    return pickFromPool(SUCCESS_ITEM_POOL, selectionSeed);
  }
  if (
    reasonIn(normalized, IDLE_REASONS) ||
    reasonIn(normalized, GIT_REASONS) ||
    reasonIn(normalized, TEMPORAL_REASONS) ||
    reasonIn(normalized, CHURN_REASONS)
  ) {
    return pickFromPool(allBitmapItemKeys(), selectionSeed);
  }
  if (reasonIn(normalized, CHAOS_REASONS)) {
    return pickFromPool(allBitmapItemKeys(), selectionSeed);
  }
  if (reasonIn(normalized, FIRE_REASONS)) {
    return pickFromPool(FIRE_ITEM_POOL, selectionSeed);
  }

  return pickFromPool(allBitmapItemKeys(), selectionSeed);
}

export function loadBitmapBaseTrait(base: string): BitmapBaseTrait {
  const dir = resolveBitmapBaseSelection(base);
  const cached = traitCache.get(dir);
  if (cached) return cached;

  const path = join(BASE_DIR, dir, "trait.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as BitmapTraitJson;
  const width = Math.max(...raw.layerPixels.map((layer) => layer.width));
  const height = Math.max(...raw.layerPixels.map((layer) => layer.height));
  const trait: BitmapBaseTrait = {
    key: dir,
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName ?? raw.name,
    gender: parseGender(raw.name),
    width,
    height,
    layers: raw.layerPixels,
  };
  traitCache.set(dir, trait);
  return trait;
}

function loadAction(actionName: string): ActionJson {
  const cached = actionCache.get(actionName);
  if (cached) return cached;
  const actionPath = join(ACTIONS_DIR, actionName, "action.json");
  const action = JSON.parse(readFileSync(actionPath, "utf8")) as ActionJson;
  actionCache.set(actionName, action);
  return action;
}

function resolveItemDir(item: string): string {
  const dirs = readdirSync(ITEM_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const exactDir = dirs.find((dir) => dir === item);
  if (exactDir) return exactDir;

  const byName = dirs.find((dir) => dir.replace(/^\d+-/, "") === item);
  if (byName) return byName;

  throw new Error(`Unknown BitmapPunks item: ${item}`);
}

function loadBitmapItem(item: string): BitmapItemInfo & { frames: BitmapSparsePixel[][] } {
  const dir = resolveItemDir(item);
  const cached = itemCache.get(dir);
  if (cached) return cached;

  const traitPath = join(ITEM_DIR, dir, "trait.json");
  const animPath = join(ITEM_DIR, dir, "anim.json");
  const trait = JSON.parse(readFileSync(traitPath, "utf8")) as BitmapTraitJson;
  const anim = JSON.parse(readFileSync(animPath, "utf8")) as BitmapItemAnimJson;
  const itemInfo = {
    key: dir,
    id: trait.id,
    name: trait.name,
    displayName: trait.displayName ?? trait.name,
    archetype: anim.archetype ?? "static",
    frameCount: anim.frames.length,
    frames: anim.frames,
  };
  itemCache.set(dir, itemInfo);
  return itemInfo;
}

export function listBitmapItems(): BitmapItemInfo[] {
  if (!itemIndexCache) {
    itemIndexCache = readdirSync(ITEM_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const { frames: _frames, ...info } = loadBitmapItem(entry.name);
        return info;
      })
      .sort((a, b) => a.id - b.id);
  }
  return itemIndexCache.map((item) => ({ ...item }));
}

function composeBaseCanvas(base: BitmapBaseTrait): BitmapCanvas {
  const canvas = createCanvas(base.width, base.height);
  const layers = [...base.layers].sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of layers) {
    const x0 = layer.activeRegion?.xTL ?? 0;
    const y0 = layer.activeRegion?.yTL ?? 0;
    for (let y = 0; y < layer.pixels.length; y++) {
      for (let x = 0; x < layer.pixels[y].length; x++) {
        const color = normalizeColor(layer.pixels[y][x]);
        if (color !== null) {
          const cy = y0 + y;
          const cx = x0 + x;
          if (cy >= 0 && cy < canvas.length && cx >= 0 && cx < canvas[cy].length) {
            canvas[cy][cx] = color;
          }
        }
      }
    }
  }
  return canvas;
}

function resolveAnchorValue(
  base: BitmapBaseTrait,
  anchors: Record<string, number | Record<BitmapGender, number>>,
  expr: string | number,
): number {
  if (typeof expr === "number") return expr;
  const trimmed = expr.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);

  const replaced = trimmed.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
    const raw = anchors[name];
    if (raw === undefined) throw new Error(`Unknown anchor '${name}' in '${expr}'`);
    if (typeof raw === "number") return String(raw);
    return String(raw[base.gender]);
  });

  if (!/^[\d\s+-]+$/.test(replaced)) {
    throw new Error(`Unsupported anchor expression: ${expr}`);
  }

  return replaced
    .split(/\s+/)
    .filter(Boolean)
    .join("")
    .replace(/^-/, "0-")
    .split(/(?=[+-])/)
    .filter(Boolean)
    .reduce((sum, token) => sum + Number(token), 0);
}

function applySetOp(
  canvas: BitmapCanvas,
  base: BitmapBaseTrait,
  anchors: Record<string, number | Record<BitmapGender, number>>,
  op: Extract<ActionOp, { op: "set" }>,
): void {
  const x = resolveAnchorValue(base, anchors, op.x);
  const y = resolveAnchorValue(base, anchors, op.y);
  if (canvas[y] && x >= 0 && x < canvas[y].length) {
    canvas[y][x] = normalizeColor(op.color);
  }
}

function applySwapOp(
  canvas: BitmapCanvas,
  base: BitmapBaseTrait,
  anchors: Record<string, number | Record<BitmapGender, number>>,
  op: Extract<ActionOp, { op: "swap" }>,
): void {
  const ax = resolveAnchorValue(base, anchors, op.a.x);
  const ay = resolveAnchorValue(base, anchors, op.a.y);
  const bx = resolveAnchorValue(base, anchors, op.b.x);
  const by = resolveAnchorValue(base, anchors, op.b.y);
  const aColor = canvas[ay]?.[ax] ?? null;
  const bColor = canvas[by]?.[bx] ?? null;
  if (canvas[ay] && ax >= 0 && ax < canvas[ay].length) canvas[ay][ax] = bColor;
  if (canvas[by] && bx >= 0 && bx < canvas[by].length) canvas[by][bx] = aColor;
}

export function applyBitmapAction(baseKey: string, actionName: string): BitmapCanvas[] {
  const base = loadBitmapBaseTrait(baseKey);
  const action = loadAction(actionName);
  const baseCanvas = composeBaseCanvas(base);

  return action.frames.map((stateIndex) => {
    const canvas = cloneCanvas(baseCanvas);
    const state = action.states[String(stateIndex)];
    for (const op of state.ops) {
      if (op.op === "set") applySetOp(canvas, base, action.anchors, op);
      else if (op.op === "swap") applySwapOp(canvas, base, action.anchors, op);
    }
    return canvas;
  });
}

export function composeBitmapItemFrames(baseKey: string, itemKey: string): BitmapCanvas[] {
  const baseCanvas = composeBaseCanvas(loadBitmapBaseTrait(baseKey));
  const item = loadBitmapItem(itemKey);

  return item.frames.map((frame) => {
    const canvas = cloneCanvas(baseCanvas);
    for (const pixel of frame) {
      if (canvas[pixel.y] && pixel.x >= 0 && pixel.x < canvas[pixel.y].length) {
        canvas[pixel.y][pixel.x] = normalizeColor(pixel.color);
      }
    }
    return canvas;
  });
}

export function detectRenderMode(env: NodeJS.ProcessEnv = process.env): RenderMode {
  const forced = env.BUDDY_AVATAR_RENDER;
  if (forced === "halfblock" || forced === "fullcell") return forced;

  const termProgram = (env.TERM_PROGRAM ?? "").toLowerCase();
  if (["iterm.app", "wezterm", "ghostty", "alacritty"].includes(termProgram)) {
    return "halfblock";
  }

  const term = (env.TERM ?? "").toLowerCase();
  if (term.includes("kitty") || term.includes("alacritty")) return "halfblock";
  return "fullcell";
}

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const bg = (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`;

function renderHalfBlock(canvas: BitmapCanvas): string[] {
  const h = canvas.length;
  const w = canvas[0]?.length ?? 0;
  const rows: string[] = [];
  for (let y = 0; y < h; y += 2) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const top = canvas[y][x];
      const bottom = canvas[y + 1]?.[x] ?? null;
      if (!top && !bottom) {
        line += " ";
      } else if (top && bottom) {
        const [tr, tg, tb] = parseRgb(top);
        const [br, bgc, bb] = parseRgb(bottom);
        line += `${fg(tr, tg, tb)}${bg(br, bgc, bb)}▀${RESET}`;
      } else if (top) {
        const [tr, tg, tb] = parseRgb(top);
        line += `${fg(tr, tg, tb)}▀${RESET}`;
      } else if (bottom) {
        const [br, bgc, bb] = parseRgb(bottom);
        line += `${fg(br, bgc, bb)}▄${RESET}`;
      }
    }
    rows.push(line);
  }
  return rows;
}

function renderFullCell(canvas: BitmapCanvas): string[] {
  const rows: string[] = [];
  for (const row of canvas) {
    let line = "";
    for (const color of row) {
      if (!color) {
        line += "  ";
      } else {
        const [r, g, b] = parseRgb(color);
        line += `${bg(r, g, b)}  ${RESET}`;
      }
    }
    rows.push(line);
  }
  return rows;
}

export function renderCanvas(canvas: BitmapCanvas, mode: RenderMode = detectRenderMode()): string[] {
  return mode === "halfblock" ? renderHalfBlock(canvas) : renderFullCell(canvas);
}

export function buildBitmapStatusArt(
  baseKey: string = DEFAULT_BITMAP_BASE,
  reason?: string,
  seed: number = 0,
): BitmapStatusArt {
  const trait = loadBitmapBaseTrait(baseKey);
  const animationSeed = mixBitmapAnimationSeed(normalizedBitmapReason(reason), seed);
  const idle = composeBaseCanvas(trait);
  const canvases: BitmapCanvas[] = [idle];
  const blocks: BitmapActionBlock[] = [];

  const blinkStart = canvases.length;
  const blinkCanvases = applyBitmapAction(trait.key, "blink");
  canvases.push(...blinkCanvases);
  blocks.push({ name: "blink", indices: blinkCanvases.map((_, index) => blinkStart + index) });

  const lookStart = canvases.length;
  const lookCanvases = applyBitmapAction(trait.key, "move");
  canvases.push(...lookCanvases);
  blocks.push({ name: "look", indices: lookCanvases.map((_, index) => lookStart + index) });

  const itemKeys = itemPoolForReason(reason);
  for (const itemKey of itemKeys) {
    const itemStart = canvases.length;
    const itemCanvases = composeBitmapItemFrames(trait.key, itemKey);
    canvases.push(...itemCanvases);
    blocks.push({
      name: `item:${itemKey}`,
      itemKey,
      indices: itemCanvases.map((_, index) => itemStart + index),
    });
  }

  const framesHalfblock = canvases.map((canvas) => renderCanvas(canvas, "halfblock").join("\n"));
  const framesFullcell = canvases.map((canvas) => renderCanvas(canvas, "fullcell").join("\n"));
  const mode = detectRenderMode();

  return {
    bitmapBase: trait.key,
    bitmapItem: reason ? resolveBitmapItemSelection(reason, seed) : "auto",
    frames: mode === "halfblock" ? [...framesHalfblock] : [...framesFullcell],
    framesHalfblock,
    framesFullcell,
    frameSequence: buildRandomActionSequence(blocks, animationSeed),
  };
}

export function getBitmapFrame(baseKey: string = DEFAULT_BITMAP_BASE, mode: RenderMode = detectRenderMode()): string[] {
  const status = buildBitmapStatusArt(baseKey);
  const body = mode === "halfblock" ? status.framesHalfblock[0] : status.framesFullcell[0];
  return body.split("\n");
}

export const DEFAULT_BITMAP_FRAME_HALFBLOCK = getBitmapFrame(DEFAULT_BITMAP_BASE, "halfblock");
export const DEFAULT_BITMAP_FRAME_FULLCELL = getBitmapFrame(DEFAULT_BITMAP_BASE, "fullcell");
export const DEFAULT_BITMAP_RENDER_MODE = detectRenderMode();
export const DEFAULT_BITMAP_FRAME = getBitmapFrame(DEFAULT_BITMAP_BASE, DEFAULT_BITMAP_RENDER_MODE);
export const DEFAULT_BITMAP_FRAME_WIDTH = DEFAULT_BITMAP_FRAME.reduce(
  (max, line) => Math.max(max, line.replace(ANSI_RE, "").length),
  0,
);
