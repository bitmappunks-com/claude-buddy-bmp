# claude-buddy

Permanent coding companion for Claude Code — **survives any update**.

Unlike the built-in `/buddy` (which Anthropic can remove at will), `claude-buddy` is a standalone app that integrates through **stable extension points** (MCP, Skills, Hooks, Status Line). Your companion persists regardless of Claude Code version changes.

## Quick Start

```bash
cd claude-buddy
bun run install-buddy
```

Then restart Claude Code and type `/buddy`.

## How It Works

```
┌─────────────── Claude Code (any version) ───────────────┐
│                                                         │
│  MCP Server    Skill /buddy    Status Line    Hooks     │
│  (tools +      (SKILL.md)     (shell script)  (shell)  │
│   resources)                                            │
└──────────────────────┬──────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │    claude-buddy     │
            │                     │
            │  wyhash → mulberry32│
            │  18 species + stats │
            │  reactions + art    │
            │  ~/.claude-buddy/   │
            └─────────────────────┘
```

**Four stable integration points, zero binary patching:**

| Component | Purpose | Stability |
|-----------|---------|-----------|
| **MCP Server** | Buddy intelligence — tools Claude can call | Industry standard |
| **Skill** | `/buddy` slash command | Markdown file |
| **Status Line** | Buddy always visible in terminal | Shell script |
| **Hooks** | Auto-react to errors, test failures, diffs | Shell script |

## Commands

### In Claude Code

| Command | Description |
|---------|-------------|
| `/buddy` | Show your companion |
| `/buddy pet` | Pet your companion |
| `/buddy stats` | Detailed stat card |
| `/buddy off` | Mute reactions |
| `/buddy on` | Unmute reactions |
| `/buddy rename <name>` | Rename companion |
| `/buddy personality <text>` | Set custom personality |

### CLI

```bash
bun run install-buddy    # Install all integrations
bun run show             # Show current buddy in terminal
bun run hunt             # Search for specific buddy
```

## Species (18)

duck · goose · blob · cat · dragon · octopus · owl · penguin · turtle · snail · ghost · axolotl · capybara · cactus · robot · rabbit · mushroom · chonk

## Rarities

| Rarity | Chance | Stars |
|--------|--------|-------|
| Common | 60% | ★ |
| Uncommon | 25% | ★★ |
| Rare | 10% | ★★★ |
| Epic | 4% | ★★★★ |
| Legendary | 1% | ★★★★★ |

## Stats

**DEBUGGING** · **PATIENCE** · **CHAOS** · **WISDOM** · **SNARK**

Each buddy has a peak stat (highest) and dump stat (lowest). Rarity determines the stat floor.

## Status Line

Your buddy appears permanently in Claude Code's status bar:

```
(°)(°) Mira ✨★★★★★ │ "that migration looks clean"
```

Reactions update automatically when errors or test failures are detected.

## Reactions

Your buddy reacts to events detected by hooks:

- **Test failures** — detects `FAIL`, `failed`, `✗` in Bash output
- **Errors** — detects `error:`, `exception`, `traceback`, `fatal:`
- **Large diffs** — detects >80 lines changed

Reactions are species-aware — an owl reacts differently than a cat.

## Architecture

```
claude-buddy/
├── server/
│   ├── index.ts          # MCP server (stdio transport)
│   ├── engine.ts         # wyhash + mulberry32 + generation
│   ├── state.ts          # ~/.claude-buddy/ persistence
│   └── reactions.ts      # Event-driven reactions
├── skills/buddy/
│   └── SKILL.md          # /buddy slash command
├── hooks/
│   └── react.sh          # PostToolUse event detection
├── statusline/
│   └── buddy-status.sh   # Status bar rendering
├── cli/
│   ├── install.ts        # One-command setup
│   ├── show.ts           # Terminal display
│   ├── hunt.ts           # Brute-force search
│   ├── verify.ts         # ID verification
│   └── uninstall.ts      # Clean removal
└── .claude-plugin/
    └── plugin.json       # Claude Code plugin manifest
```

## Why Not Binary Patching?

| Approach | Update-safe | Risk |
|----------|-------------|------|
| Binary patching (any-buddy) | Breaks on update | Binary changes |
| Salt replacement | Breaks on update | Algorithm changes |
| **claude-buddy (MCP)** | **Permanent** | **None** |

MCP is an industry standard. Skills are Markdown. Hooks are shell scripts. None of these depend on Claude Code internals.

## Requirements

- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- Claude Code v2.1.80+ (MCP support)
- `jq` for status line script

## Uninstall

```bash
bun run cli/uninstall.ts
```

Removes MCP server, skill, hooks, and status line config. Companion data is preserved at `~/.claude-buddy/`.

## Credits

- Hash algorithm analysis from Claude Code binary reverse engineering
- Inspired by [any-buddy](https://github.com/cpaczek/any-buddy), [buddy-reroll](https://github.com/grayashh/buddy-reroll)
- Built with the [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT
