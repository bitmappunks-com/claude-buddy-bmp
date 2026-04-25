# Testing Claude Punk

Claude Punk is the BitmapPunks-powered Claude Code companion by **bitmappunks**, adapted from [1270011/claude-buddy](https://github.com/1270011/claude-buddy).

## Standard validation

```bash
mise x bun@1 -- bun run typecheck
mise x bun@1 -- bun test
```

Use targeted tests while iterating:

```bash
mise x bun@1 -- bun test server/art.test.ts server/base.test.ts server/item.test.ts
mise x bun@1 -- bun test server/pick.test.ts
```

## Copy and product language checks

User-facing copy should say **Claude Punk** and **bitmappunks**. Keep attribution to `1270011/claude-buddy` in package/docs/marketplace copy.

Compatibility names that may remain intentionally:

- `/buddy` slash command
- `buddy_*` MCP tools
- `~/.claude-buddy/` legacy state path
- `install-buddy` / `claude-buddy` compatibility aliases

## Rendering checks

- Pick rows must stay aligned with long BitmapPunks tuple labels.
- Preview cards must show BitmapPunks tuple labels, not old animal species.
- Preview cards must not show legacy `eye:` / `hat:` metadata.
- Preview cards must not overlay legacy ASCII hats on BitmapPunks art.
- Every vendored BitmapPunks BASE should render without crashing.
