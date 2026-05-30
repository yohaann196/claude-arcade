---
description: View or change Claude Snake game settings
---

The Claude Snake config lives at `~/.claude-snake/config.json`. Fields:

- `gridWidth` / `gridHeight` — board size in cells (min 5).
- `tickMs` — milliseconds per move; lower is faster (min 40).
- `wrap` — `true` lets the snake pass through walls, `false` is deadly walls.
- `paneWidth` — width in columns of the game's tmux pane (applies to new panes).
- `autoFocus` — `true` jumps focus to the game on prompt submit and back to
  Claude when it finishes; `false` leaves you to switch panes manually.

Do this:

1. Read `~/.claude-snake/config.json` and show the user the current values.
2. If the user asked for a change in their message (`$ARGUMENTS`), apply it by
   editing the JSON file, validating against the constraints above.
3. Tell the user that grid/speed changes take effect on the next game (press
   `r` in the game pane to restart now), and `paneWidth` changes apply to the
   next session.

User request: $ARGUMENTS
