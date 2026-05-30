#!/usr/bin/env bash
# SessionStart hook: create the snake side-pane once per tmux window.
# Must stay silent on stdout (SessionStart stdout is injected into Claude's context).
set -u

dir="$HOME/.claude-snake"
mkdir -p "$dir"

# Seed config on first run.
if [ ! -f "$dir/config.json" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/config.default.json" ]; then
  cp "${CLAUDE_PLUGIN_ROOT}/config.default.json" "$dir/config.json"
fi

# Only works inside tmux — that is what gives us the split UI.
if [ -z "${TMUX:-}" ]; then
  exit 0
fi

# Already have a live game pane? Do nothing (SessionStart also fires on resume/clear/compact).
if [ -f "$dir/pane" ]; then
  saved="$(cat "$dir/pane" 2>/dev/null)"
  if tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -qx "$saved"; then
    exit 0
  fi
fi

# Resolve bun (hook shells may have a thin PATH).
BUN="$(command -v bun 2>/dev/null || echo "$HOME/.bun/bin/bun")"

# Remember the Claude pane so we can return focus to it later.
tmux display-message -p '#{pane_id}' >"$dir/claude_pane" 2>/dev/null

# Game starts paused; first prompt sets it playing.
echo paused >"$dir/state"

width="$("$BUN" "${CLAUDE_PLUGIN_ROOT}/hooks/read-config.ts" paneWidth 2>/dev/null)"
[ -z "$width" ] && width=46

# Split a right-hand pane, keep focus on Claude (-d). `read` keeps the pane
# visible if bun ever errors, instead of vanishing instantly.
game_pane="$(tmux split-window -h -d -l "$width" -P -F '#{pane_id}' \
  "exec '$BUN' '${CLAUDE_PLUGIN_ROOT}/game/snake.ts' || read -n1 -s" 2>/dev/null)"

[ -n "$game_pane" ] && echo "$game_pane" >"$dir/pane"

exit 0
