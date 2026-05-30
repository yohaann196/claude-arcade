// Read the hook JSON payload on stdin and print Claude Code's session_id.
// Used to scope arcade runtime state per Claude session (two Claude instances
// in one tmux session must not share a pane or play/pause flag).
const text = await Bun.stdin.text().catch(() => "");
try {
  const json = JSON.parse(text) as { session_id?: unknown };
  if (typeof json.session_id === "string") process.stdout.write(json.session_id);
} catch {
  /* no/!json stdin -> print nothing, caller falls back to "default" */
}
