#!/usr/bin/env bash
# SessionEnd hook: tear down this Claude session's arcade pane (visible or
# parked) and remove its runtime dir, leaving other sessions untouched.
set -u

. "${CLAUDE_PLUGIN_ROOT}/hooks/lib.sh"
SID="$(read_sid)"
set_rdir "$SID"

if [ -n "${TMUX:-}" ] && [ -f "$ARC_RDIR/pane" ]; then
  tmux kill-pane -t "$(cat "$ARC_RDIR/pane")" 2>/dev/null || true
fi

rm -rf "$ARC_RDIR" 2>/dev/null || true

exit 0
