// The play/pause channel. The plugin hooks write one word to a per-session
// state file whose path arrives in CLAUDE_ARCADE_STATE: "playing" while Claude
// Code is generating, "paused" when it finishes.
//
// Run standalone with `bun arcade/arcade.ts` and there is no hook and no state
// file, so there is nothing to wait on: treat that as free play (everything
// runs), otherwise Snake would sit frozen on a "prompt Claude" message forever.

import { readFileSync } from "node:fs";

const STATE_FILE = process.env.CLAUDE_ARCADE_STATE;

export function isClaudeWorking(): boolean {
  if (STATE_FILE === undefined || STATE_FILE === "") return true; // standalone: free play
  try {
    return readFileSync(STATE_FILE, "utf8").trim() === "playing";
  } catch {
    return false;
  }
}
