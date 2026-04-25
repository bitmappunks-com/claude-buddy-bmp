#!/usr/bin/env bun
/**
 * claude-punk CLI
 *
 * Usage:
 *   npx claude-punk              Interactive install
 *   npx claude-punk install      Install MCP + skill + hooks + statusline
 *   npx claude-punk show         Show current pet
 *   npx claude-punk pick         Interactive two-pane pet picker (saved + search)
 *   npx claude-punk hunt         Create a BitmapPunks pet (gender → type → look)
 *   npx claude-punk upgrade      Pull latest + reinstall
 *   npx claude-punk uninstall    Remove all integrations
 *   npx claude-punk verify       Verify what pet your ID produces
 */

const args = process.argv.slice(2);
const command = args[0] || "install";

switch (command) {
  case "install":
    await import("./install.ts");
    break;
  case "show":
    await import("./show.ts");
    break;
  case "pick":
    await import("./pick.ts");
    break;
  case "hunt":
    await import("./hunt.ts");
    break;
  case "uninstall":
    await import("./uninstall.ts");
    break;
  case "verify":
    await import("./verify.ts");
    break;
  case "doctor":
    await import("./doctor.ts");
    break;
  case "test-statusline":
    await import("./test-statusline.ts");
    break;
  case "backup":
    await import("./backup.ts");
    break;
  case "settings":
    await import("./settings.ts");
    break;
  case "disable":
    await import("./disable.ts");
    break;
  case "upgrade":
    await import("./upgrade.ts");
    break;
  case "enable":
    await import("./install.ts");
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}

function showHelp() {
  console.log(`
claude-punk — BitmapPunks companion for Claude Code
Built by bitmappunks on top of https://github.com/1270011/claude-buddy

Setup:
  install           Set up MCP server, skill, hooks, and status line
  upgrade           Pull latest version and reinstall integrations
  enable            Same as install (re-enable after disable)
  disable           Temporarily deactivate Claude Punk (data preserved)
  uninstall         Remove all Claude Punk integrations

Pet:
  show              Display your current pet
  pick              Interactive picker (saved/search + BitmapPunks BASE via [b])
  hunt              Create a BitmapPunks pet (gender → type → look)
  verify            Verify what pet your current ID produces

Settings:
  settings          Show current settings
  settings cooldown <n>  Set comment cooldown (0-300 seconds)
  settings ttl <n>       Set reaction display duration (0-300s, 0 = permanent)

Diagnostics:
  doctor            Run diagnostic report (paste output in bug reports)
  test-statusline   Test status line rendering in Claude Code
  backup            Snapshot or restore all Claude Punk state

In Claude Code:
  /buddy            Show Claude Punk pet card with BitmapPunks art + stats
  /buddy pet        Pet your companion
  /buddy stats      Detailed stat card
  /buddy off        Mute reactions
  /buddy on         Unmute reactions
  /buddy rename     Rename companion (1-14 chars)
  /buddy personality  Set custom personality text
  /buddy summon     Summon a saved pet (omit slot for random)
  /buddy save       Save current pet to a named slot
  /buddy list       List all saved pets
  /buddy dismiss    Remove a saved pet slot
  /buddy pick       Launch interactive TUI picker (! bun run pick)
  /buddy frequency  Show or set comment cooldown (tmux only)
  /buddy style      Show or set bubble style (tmux only)
  /buddy position   Show or set bubble position (tmux only)
  /buddy rarity     Show or hide rarity stars (tmux only)
  /buddy width      Set bubble text width in chars (10-60, tmux only)

Usage:
  bun run <command>           e.g. bun run show, bun run doctor
  claude-punk <command>       if globally linked (bun link)
  claude-buddy <command>      legacy alias, kept for compatibility
  bun run help                Show this help
`);
}
