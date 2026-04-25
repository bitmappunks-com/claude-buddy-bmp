# Security Policy

Claude Punk runs locally on your machine. It consists of:

- A Claude Code MCP server launched over stdio
- A `/buddy` skill for compatibility with existing Claude Code workflows
- Shell hooks that write local reaction/status files
- Statusline scripts that read local state
- State files under `~/.claude-buddy/` or profile-scoped `buddy-state/`

Claude Punk is authored by **bitmappunks** and is built on top of [1270011/claude-buddy](https://github.com/1270011/claude-buddy).

## Reporting a Vulnerability

Please do not open a public issue for sensitive reports. Send a private report to the repository owner/maintainer for this fork.

Useful details:

- OS and shell
- Claude Code version
- Bun version
- Install method
- Redacted `~/.claude.json` / `settings.json` snippets if relevant
- Steps to reproduce

## Scope

Security-sensitive areas include:

- MCP server startup and plugin manifests
- Shell hooks and statusline scripts
- State path resolution and profile isolation
- Anything that could leak data from Claude Code config or Claude Punk state

## Non-goals

- Cosmetic rendering issues
- Normal local state files created by the app
- Bugs that require a user to run arbitrary untrusted commands manually
