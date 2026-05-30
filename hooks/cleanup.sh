#!/usr/bin/env bash
# SessionEnd hook: tear down the game pane when Claude Code exits.
set -u

dir="$HOME/.claude-snake"

if [ -n "${TMUX:-}" ] && [ -f "$dir/pane" ]; then
  tmux kill-pane -t "$(cat "$dir/pane")" 2>/dev/null || true
fi

rm -f "$dir/pane" "$dir/claude_pane" 2>/dev/null || true

exit 0
