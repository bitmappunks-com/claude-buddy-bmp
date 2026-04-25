# Contributing to Claude Punk

Thanks for helping improve **Claude Punk**, the BitmapPunks-powered Claude Code companion by **bitmappunks**.

This repository is adapted from [1270011/claude-buddy](https://github.com/1270011/claude-buddy). Please preserve that attribution when changing docs, package metadata, or release copy.

## Quick Setup

```bash
git clone https://github.com/bitmappunks-com/claude-punk.git claude-punk
cd claude-punk
bun install
bun run install-punk
```

Restart Claude Code and type `/buddy` to verify the MCP tools, skill, hooks, and statusline are active.

## Project Structure

| Directory | What it does |
|-----------|--------------|
| `server/` | MCP tools, pet state, BitmapPunks rendering, reactions, achievements |
| `cli/` | Install, show, pick, hunt, doctor, backup, settings, uninstall |
| `skills/buddy/` | Claude Code `/buddy` routing for Claude Punk tools |
| `hooks/` | Shell hooks for reactions and statusline context |
| `statusline/` | Shell statusline renderer reading `status.json` frames |
| `vendor/bmp-gif/` | Vendored BitmapPunks BASE/ITEM/action data |

## Product Language

Use **Claude Punk** for the project name and **bitmappunks** for the author/owner.

Use **pet** or **companion** for user-facing entities. Do not describe visible identity as old animal `species`, `eye`, or `hat`; those are legacy/internal bones. User-facing BitmapPunks looks should be compact tuples like `(Snowman, male)` or `(Demon, purple, female)`.

The `/buddy` slash command and `buddy_*` MCP tool names remain for compatibility unless a migration explicitly changes them.

## Before Opening a PR

- [ ] `bun install` ran cleanly
- [ ] `mise x bun@1 -- bun run typecheck` passes
- [ ] `mise x bun@1 -- bun test` passes
- [ ] User-facing docs/copy say Claude Punk, author bitmappunks, and attribution to `1270011/claude-buddy` where appropriate
- [ ] New command surfaces are reflected in `README.md`, `cli/index.ts`, `server/index.ts`, and `skills/buddy/SKILL.md`

## Development Notes

- Keep each pet's `bitmapBase` scoped to that pet. Do not reintroduce global BASE selection.
- ITEM is automatic/internal; do not add user-selectable ITEM commands.
- `hunt` creates a new pet.
- `pick` changes the selected pet's BASE only when using `[b] base`.
- Statusline animation uses pre-rendered `status.json.frames` + `frameSequence`; preserve that playback contract.

## Commit Sign-off

If the repo requires DCO sign-off, use:

```bash
git commit -s -m "docs: improve Claude Punk copy"
```

If you forgot on the last commit:

```bash
git commit --amend --no-edit -s
git push --force-with-lease
```
