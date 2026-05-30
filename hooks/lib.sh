#!/usr/bin/env bash
# Shared helpers for the claude-arcade hooks.

# ARC_DIR holds global config + the plugin root pointer. ARC_RDIR is a
# per-Claude-session runtime dir (pane ids + play/pause state). Keying on
# Claude's session id (not the tmux session) means two Claude instances in the
# same tmux session each get their own pane and state.

arcade_base() { ARC_DIR="$HOME/.claude-arcade"; }

sanitize_sid() { printf '%s' "${1:-}" | tr -cd 'a-zA-Z0-9' | cut -c1-32; }

set_rdir() {
  arcade_base
  local s
  s="$(sanitize_sid "${1:-}")"
  [ -z "$s" ] && s="default"
  ARC_SID_SAFE="$s"
  ARC_RDIR="$ARC_DIR/sessions/$s"
}

# Echo the Claude session id (sanitized). Uses CLAUDE_ARCADE_SID if the caller
# already knows it (the Alt-j recreate path); otherwise parses the hook JSON on
# stdin. Reads stdin at most once.
read_sid() {
  if [ -n "${CLAUDE_ARCADE_SID:-}" ]; then
    sanitize_sid "$CLAUDE_ARCADE_SID"
    return
  fi
  local bun
  bun="$(command -v bun 2>/dev/null || echo "$HOME/.bun/bin/bun")"
  sanitize_sid "$("$bun" "${CLAUDE_PLUGIN_ROOT}/hooks/session-id.ts" 2>/dev/null)"
}

pane_alive() { [ -n "${1:-}" ] && tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -qx "$1"; }

win_of() { [ -n "${1:-}" ] && tmux display-message -t "$1" -p '#{window_id}' 2>/dev/null; }
