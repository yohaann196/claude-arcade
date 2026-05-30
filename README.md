# 🐍 Claude Snake

A Claude Code plugin that drops a playable **snake game** into a side-pane of
your terminal. The snake runs while Claude Code is generating, and **pauses the
moment Claude finishes** — the only way to resume is to send another prompt.
Game on the right, Claude's output on the left, same window.

```
┌───────────────────────────┐ ┌─────────────────────────┐
│ > refactor the auth module │ │   🐍 CLAUDE SNAKE        │
│                            │ │   ┌────────────────────┐ │
│ ● Working… (esc to cancel) │ │   │··············██████│ │
│   - reading auth.ts        │ │   │··········◆◆········│ │
│   - writing middleware     │ │   │····················│ │
│                            │ │   └────────────────────┘ │
│         (Claude pane)      │ │   score 7  ▶ playing     │
└───────────────────────────┘ └─────────────────────────┘
```

## How it works

Claude Code owns the whole terminal UI, so a plugin can't paint its own panel
*inside* it. Instead this plugin uses **tmux**: Claude Code runs in the left
pane, the game in the right pane. Three Claude Code hooks wire them together:

| Hook               | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `SessionStart`     | Splits a right-hand pane and launches the game (paused).  |
| `UserPromptSubmit` | Writes `playing` → snake moves; focus jumps to the game.  |
| `Stop`             | Writes `paused` → snake freezes; focus returns to Claude. |
| `SessionEnd`       | Kills the game pane.                                       |

Play/pause is a one-word state file at `~/.claude-snake/state`; the game polls
it each frame. No private Claude Code APIs, nothing patched.

## Requirements

- [tmux](https://github.com/tmux/tmux) (`brew install tmux`)
- [Bun](https://bun.sh) (the game is TypeScript, run directly — no build step)

## Install

1. Add this directory as a plugin marketplace and install it:

   ```
   /plugin marketplace add /Users/amaarchughtai/Developer/projects/active/claude-gaming
   /plugin install claude-snake
   ```

2. Run Claude Code **inside tmux**. Either start your own tmux session and run
   `claude`, or use the bundled launcher (also adds `Alt-←`/`Alt-→` to switch
   panes without the tmux prefix):

   ```
   ./bin/claude-snake
   ```

The game pane appears automatically. Submit a prompt → play. Claude finishes →
it pauses.

> Not using the plugin system? Point the same hooks at these scripts from your
> `~/.claude/settings.json` `hooks` block — the commands are in `hooks/`.

## Controls

| Key                | Action          |
| ------------------ | --------------- |
| Arrow keys / `WASD`| Steer           |
| `r`                | Restart         |
| `q` / `Ctrl-C`     | Quit the game   |
| `Alt-←` / `Alt-→`  | Switch panes\*  |

\* When using `bin/claude-snake`. Otherwise use tmux's default `Ctrl-b ←/→`.

## Configure

Settings live at `~/.claude-snake/config.json` (seeded from
`config.default.json` on first run):

```json
{
  "gridWidth": 20,
  "gridHeight": 16,
  "tickMs": 120,
  "wrap": false,
  "paneWidth": 46,
  "autoFocus": true
}
```

- `tickMs` — lower = faster snake.
- `wrap` — pass through walls vs. die on them.
- `autoFocus` — auto pane-switching on prompt submit/finish. Set `false` if you
  prefer to switch manually (handy when Claude often asks for tool permissions,
  which need the Claude pane focused).

Edit the file directly, or run **`/snake`** inside Claude Code to view and
change settings conversationally. Grid/speed changes apply on the next game
(press `r` to restart); `paneWidth` applies next session.

## Development

```bash
bun test            # pure game-logic tests
bun game/snake.ts   # run the game standalone in your terminal
```

Game logic is split into pure, deterministic functions in `game/engine.ts`
(randomness injected, so it's fully unit-testable) with all terminal IO in
`game/snake.ts`.

## License

MIT
