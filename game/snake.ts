// Terminal snake game. Runs in the right-hand tmux pane next to Claude Code.
// Play/pause is driven by a state file that the plugin hooks write:
//   ~/.claude-snake/state == "playing"  -> snake advances
//   ~/.claude-snake/state == "paused"   -> snake frozen (Claude is idle)
//
// Run directly with:  bun game/snake.ts

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type Board,
  type Dir,
  type GameState,
  initialState,
  nextDirection,
  step,
} from "./engine.ts";

type RuntimeConfig = {
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly wrap: boolean;
  readonly tickMs: number;
};

const STATE_DIR = join(homedir(), ".claude-snake");
const STATE_FILE = join(STATE_DIR, "state");
const CONFIG_FILE = join(STATE_DIR, "config.json");

const DEFAULT_CONFIG: RuntimeConfig = {
  gridWidth: 20,
  gridHeight: 16,
  wrap: false,
  tickMs: 120,
};

// --- ANSI helpers -----------------------------------------------------------
const ESC = "\x1b[";
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const CLEAR = `${ESC}2J${ESC}H`;
const HOME = `${ESC}H`;
const CLEAR_BELOW = `${ESC}J`;
const CLEAR_EOL = `${ESC}K`;
const RESET = `${ESC}0m`;
const GREEN = `${ESC}32m`;
const BRIGHT_GREEN = `${ESC}92m`;
const RED = `${ESC}91m`;
const YELLOW = `${ESC}93m`;
const DIM = `${ESC}2m`;
const BOLD = `${ESC}1m`;

function clampInt(value: unknown, fallback: number, min: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min
    ? Math.floor(value)
    : fallback;
}

function loadConfig(): RuntimeConfig {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Record<
      string,
      unknown
    >;
    return {
      gridWidth: clampInt(raw.gridWidth, DEFAULT_CONFIG.gridWidth, 5),
      gridHeight: clampInt(raw.gridHeight, DEFAULT_CONFIG.gridHeight, 5),
      wrap: typeof raw.wrap === "boolean" ? raw.wrap : DEFAULT_CONFIG.wrap,
      tickMs: clampInt(raw.tickMs, DEFAULT_CONFIG.tickMs, 40),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function readPlaying(): boolean {
  try {
    return readFileSync(STATE_FILE, "utf8").trim() === "playing";
  } catch {
    return false; // default to paused if no signal yet
  }
}

function boardOf(config: RuntimeConfig): Board {
  return {
    gridWidth: config.gridWidth,
    gridHeight: config.gridHeight,
    wrap: config.wrap,
  };
}

// --- rendering --------------------------------------------------------------
function render(
  state: GameState,
  config: RuntimeConfig,
  playing: boolean,
): string {
  const w = config.gridWidth;
  const h = config.gridHeight;

  // Build a cell grid: each cell is 2 chars wide for roughly square pixels.
  const grid: string[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => `${DIM}··${RESET}`),
  );

  state.snake.forEach((p, i) => {
    if (p.y >= 0 && p.y < h && p.x >= 0 && p.x < w) {
      grid[p.y][p.x] = i === 0 ? `${BRIGHT_GREEN}██${RESET}` : `${GREEN}██${RESET}`;
    }
  });
  if (state.food.y >= 0 && state.food.y < h) {
    grid[state.food.y][state.food.x] = `${RED}◆◆${RESET}`;
  }

  const top = `${DIM}┌${"──".repeat(w)}┐${RESET}`;
  const bottom = `${DIM}└${"──".repeat(w)}┘${RESET}`;
  const rows = grid.map((row) => `${DIM}│${RESET}${row.join("")}${DIM}│${RESET}`);

  let status: string;
  if (!state.alive) {
    status = `${RED}${BOLD} GAME OVER ${RESET}  press ${YELLOW}r${RESET} to retry`;
  } else if (state.won) {
    status = `${BRIGHT_GREEN}${BOLD} YOU WIN! ${RESET}  press ${YELLOW}r${RESET} to retry`;
  } else if (!playing) {
    status = `${YELLOW}⏸ paused${RESET}  ${DIM}prompt Claude to play${RESET}`;
  } else {
    status = `${BRIGHT_GREEN}▶ playing${RESET}  ${DIM}WASD / arrows${RESET}`;
  }

  const title = `${BOLD}${BRIGHT_GREEN}🐍 CLAUDE SNAKE${RESET}`;
  const score = `${BOLD}score ${YELLOW}${state.score}${RESET}`;

  const lines = [
    `  ${title}`,
    "",
    `  ${top}`,
    ...rows.map((r) => `  ${r}`),
    `  ${bottom}`,
    "",
    `  ${score}`,
    `  ${status}`,
    `  ${DIM}q quit · r restart${RESET}`,
  ];
  // CLEAR_EOL on every line wipes leftover chars when a line gets shorter
  // (e.g. status shrinking from "playing" to "GAME OVER"); CLEAR_BELOW wipes
  // any rows below if the board itself shrinks.
  return HOME + lines.map((l) => l + CLEAR_EOL).join("\n") + CLEAR_BELOW;
}

// --- input ------------------------------------------------------------------
function keyToDir(key: string): Dir | null {
  switch (key) {
    case "\x1b[A":
    case "w":
    case "W":
      return "up";
    case "\x1b[B":
    case "s":
    case "S":
      return "down";
    case "\x1b[D":
    case "a":
    case "A":
      return "left";
    case "\x1b[C":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

// --- main loop --------------------------------------------------------------
function main(): void {
  let config = loadConfig();
  let state = initialState(boardOf(config), Math.random);
  let pending: Dir = state.dir;

  const out = process.stdout;
  out.write(CLEAR + HIDE_CURSOR);

  function cleanup(): void {
    out.write(SHOW_CURSOR + RESET + "\n");
    try {
      process.stdin.setRawMode(false);
    } catch {
      /* not a TTY */
    }
    process.exit(0);
  }

  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (chunk: string) => {
    if (chunk === "q" || chunk === "\x03") {
      cleanup();
      return;
    }
    if (chunk === "r" || chunk === "R") {
      config = loadConfig(); // pick up config edits on restart
      state = initialState(boardOf(config), Math.random);
      pending = state.dir;
      return;
    }
    const dir = keyToDir(chunk);
    if (dir !== null) pending = dir;
  });

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  const loop = setInterval(() => {
    const playing = readPlaying();
    if (playing && state.alive && !state.won) {
      const dir = nextDirection(state.dir, pending);
      state = step({ ...state, dir }, boardOf(config), Math.random);
    }
    out.write(render(state, config, playing));
  }, config.tickMs);

  // tickMs is captured here; a changed speed applies on next game start.
  process.on("exit", () => clearInterval(loop));
}

main();
