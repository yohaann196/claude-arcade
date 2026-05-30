#!/usr/bin/env bash
# UserPromptSubmit hook: Claude is about to work, let the arcade run.
# Silent on stdout (UserPromptSubmit stdout is injected into the prompt).
set -u

. "${CLAUDE_PLUGIN_ROOT}/hooks/lib.sh"
SID="$(read_sid)"
set_rdir "$SID"
mkdir -p "$ARC_RDIR"
echo playing >"$ARC_RDIR/state"

# Focus the arcade pane only if it is visible (same window as Claude) so we
# don't no-op-focus a hidden/parked pane or yank focus across windows.
if [ -n "${TMUX:-}" ] && [ -f "$ARC_RDIR/pane" ]; then
  BUN="$(command -v bun 2>/dev/null || echo "$HOME/.bun/bin/bun")"
  focus="$("$BUN" "${CLAUDE_PLUGIN_ROOT}/hooks/read-config.ts" autoFocus 2>/dev/null)"
  if [ "$focus" != "false" ]; then
    ap="$(cat "$ARC_RDIR/pane" 2>/dev/null)"
    cp="$(cat "$ARC_RDIR/claude_pane" 2>/dev/null)"
    if pane_alive "$ap" && [ -n "$(win_of "$ap")" ] && [ "$(win_of "$ap")" = "$(win_of "$cp")" ]; then
      tmux select-pane -t "$ap" 2>/dev/null || true
    fi
  fi
fi

exit 0
