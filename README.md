<div align="center">

# Claude Punk

### BitmapPunks avatars for Claude Code — pet-scoped, animated, and persistent.

[![Claude Code](https://img.shields.io/badge/Claude%20Code-MCP-8b5cf6?style=flat-square)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS-blue?style=flat-square)](#requirements)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)](LICENSE)

**Claude Punk** is a BitmapPunks-powered Claude Code companion system by **bitmappunks**.

It is built on top of [1270011/claude-buddy](https://github.com/1270011/claude-buddy), preserving the useful MCP/statusline/hook architecture while replacing the old animal-species identity with per-pet BitmapPunks BASE avatars and automatic ITEM animations.

</div>

---

## Claude Punk vs Claude Buddy

Claude Punk is adapted from [1270011/claude-buddy](https://github.com/1270011/claude-buddy), but it is not just a skin swap. The original Claude Buddy architecture is still useful for Claude Code hooks, MCP tools, local state, and statusline plumbing; Claude Punk changes the companion domain model around BitmapPunks pets.

| Area | Claude Buddy | Claude Punk |
|---|---|---|
| Project identity | `claude-buddy`, the original Claude Code buddy project | `claude-punk`, maintained by **bitmappunks**, with `claude-buddy` kept only as a compatibility alias |
| Companion model | A buddy with animal/species-style identity and legacy cosmetic fields | A pet entity with name, rarity, stats, personality, menagerie slot, and its own BitmapPunks `bitmapBase` |
| Avatar ownership | Look/customization could behave like global or species-oriented state | Every saved pet owns its own BASE; rendering uses the active pet's `companion.bitmapBase` |
| User-facing look labels | Legacy species/cosmetic wording could appear in previews | Compact BitmapPunks tuples such as `(Snowman, male)` and `(Demon, purple, male)` |
| Picking pets | Saved-buddy flow | `pick` manages saved pets and edits only the selected pet's BASE without changing name, rarity, stats, personality, or slot |
| Hunting | Original generated-buddy search semantics | `hunt` creates a new pet through gender → type → exact look → rarity → name criteria |
| BASE command | Direct/global base-style customization existed in old flows | No standalone `base <trait>` CLI; BASE selection lives inside `pick` or new-pet creation through `hunt` |
| ITEM animation | Not the primary product model | ITEM is automatic/statusline-driven; users do not choose ITEM traits directly |
| Preview metadata | Species, eye, and hat can be visible identity/cosmetic concepts | Legacy `species`, `eye`, and `hat` may remain internally for compatibility, but are not user-facing identity |
| Raw IDs | Internal IDs may leak in implementation-oriented output | Normal UX shows tuple labels, not vendored keys like `50-snowman_male` |
| Compatibility | Original package/plugin naming | Primary package/plugin/MCP name is `claude-punk`; `/buddy` and `claude-buddy` remain migration-compatible surfaces |

In short: Claude Buddy is the foundation; Claude Punk is the BitmapPunks product layer. Pets are first-class entities, BASE belongs to each pet, and the UI should describe looks as `(Type, variant, gender)` tuples instead of old animal/species or raw trait-key language.

## Requirements

- [Bun](https://bun.sh/install) on `PATH`
- Claude Code with MCP support
- `jq` for statusline rendering
- macOS or Linux

## Quick Start

```bash
git clone https://github.com/bitmappunks-com/claude-buddy-bmp.git claude-punk
cd claude-punk
bun install
bun run install-punk
```

Restart Claude Code, then use `/buddy` inside Claude Code or the CLI commands below.

> The slash command is still `/buddy` for compatibility with Claude Code skill routing. The project/package identity is **Claude Punk**.

## CLI

```bash
bun run install-punk      # install MCP server, skill, hooks, and statusline
bun run show              # show current pet in the terminal
bun run pick              # interactive saved-pet picker and BASE editor
bun run hunt              # create a new BitmapPunks pet
bun run doctor            # diagnostic report
bun run test-statusline   # statusline rendering diagnostics
bun run backup            # backup / restore local state
bun run settings          # reaction cooldown and display settings
bun run disable           # disable integrations without deleting pet data
bun run enable            # re-enable integrations
bun run uninstall         # cleanly remove integrations
bun run help              # command reference
```

After `bun link`, the primary global command is:

```bash
claude-punk <command>
```

A `claude-buddy` bin alias is kept for compatibility while users migrate.

## In Claude Code

| Command | Description |
|---|---|
| `/buddy` | Show the active Claude Punk pet |
| `/buddy pet` | Pet the active pet |
| `/buddy stats` | Show stats |
| `/buddy rename <name>` | Rename the active pet |
| `/buddy personality <text>` | Set custom personality text |
| `/buddy summon [slot]` | Summon a saved pet |
| `/buddy save [slot]` | Save the active pet |
| `/buddy list` | List saved pets |
| `/buddy dismiss <slot>` | Remove a saved pet slot |
| `/buddy pick` | Launch the interactive picker (`! bun run pick`) |
| `/buddy statusline [on|off|combined|basic]` | Manage statusline display |
| `/buddy help` | Show all commands |

## Core concepts

### Pet identity

A pet is a full entity:

- name
- rarity and stats
- personality
- menagerie slot
- `bitmapBase` (the pet's own BitmapPunks BASE)

The BASE belongs to the pet. Rendering always uses the active pet's own `bitmapBase`.

### BASE labels

User-facing labels are compact tuples:

```text
(Snowman, male)
(Demon, purple, male)
(Human, beige, female)
```

Raw vendored IDs such as `50-snowman_male` are implementation details and should not appear in normal UX.

### Automatic ITEM animation

ITEM animations are internal and context-aware. Claude Punk chooses complete action blocks (blink/look/item loops) based on statusline context such as idle, errors, success, git activity, or chaos. Users do not pick ITEM traits manually.

## Repository layout

```text
claude-punk/
├── server/          # MCP tools, state, rendering, BitmapPunks animation engine
├── cli/             # install, show, pick, hunt, doctor, backup, settings
├── hooks/           # Claude Code hooks for reactions and statusline context
├── statusline/      # shell statusline renderer reading status.json
├── skills/buddy/    # Claude Code /buddy skill routing
├── vendor/bmp-gif/  # vendored BitmapPunks BASE/ITEM/action data
└── docs/            # design notes and future plans
```

## State and compatibility

Default single-profile state still lives in `~/.claude-buddy/` for compatibility with existing installs. When `CLAUDE_CONFIG_DIR` is set, state is stored under that profile's `buddy-state/` directory.

Old global BitmapPunks settings such as `activeBitmapBase` and `activeBitmapItem` are treated as legacy config and stripped/ignored by runtime normalization. The authoritative avatar identity is `companion.bitmapBase`.

## Attribution

- **Claude Punk**: BitmapPunks adaptation by **bitmappunks**.
- Built on top of [1270011/claude-buddy](https://github.com/1270011/claude-buddy).
- Original Claude Code buddy concept by Anthropic.
- BitmapPunks animation data is vendored under `vendor/bmp-gif/`.
- Built with the [Model Context Protocol](https://modelcontextprotocol.io).

## Development

```bash
bun install
bun run typecheck
bun test
```

Recommended validation before pushing:

```bash
mise x bun@1 -- bun run typecheck
mise x bun@1 -- bun test
```

## License

MIT. See [LICENSE](LICENSE).
