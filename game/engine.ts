// Pure snake game logic. No IO, no globals, no randomness of its own —
// any randomness is injected via an `rng` callback so the engine stays
// deterministic and unit-testable.

export type Point = { readonly x: number; readonly y: number };

export type Dir = "up" | "down" | "left" | "right";

export type Board = {
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly wrap: boolean;
};

export type GameState = {
  readonly snake: readonly Point[]; // head at index 0
  readonly dir: Dir;
  readonly food: Point;
  readonly score: number;
  readonly alive: boolean;
  readonly won: boolean;
};

const DELTAS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function isOpposite(a: Dir, b: Dir): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function occupies(snake: readonly Point[], p: Point): boolean {
  return snake.some((cell) => samePoint(cell, p));
}

// Reject a 180-degree reversal (would instantly eat the neck); keep current
// heading instead. Everything else is accepted.
export function nextDirection(current: Dir, requested: Dir): Dir {
  return isOpposite(current, requested) ? current : requested;
}

// Pick a uniformly random free cell. Falls back to the head when the board is
// full (player has effectively won).
export function spawnFood(
  snake: readonly Point[],
  board: Board,
  rng: () => number,
): Point {
  const free: Point[] = [];
  for (let y = 0; y < board.gridHeight; y++) {
    for (let x = 0; x < board.gridWidth; x++) {
      const p = { x, y };
      if (!occupies(snake, p)) free.push(p);
    }
  }
  if (free.length === 0) return snake[0];
  const idx = Math.min(Math.floor(rng() * free.length), free.length - 1);
  return free[idx];
}

export function initialState(board: Board, rng: () => number): GameState {
  const cx = Math.floor(board.gridWidth / 2);
  const cy = Math.floor(board.gridHeight / 2);
  const snake: Point[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    snake,
    dir: "right",
    food: spawnFood(snake, board, rng),
    score: 0,
    alive: true,
    won: false,
  };
}

// Advance the world by one tick using the already-committed direction.
// Direction changes must be applied to `state.dir` (via nextDirection) before
// calling step.
export function step(
  state: GameState,
  board: Board,
  rng: () => number,
): GameState {
  if (!state.alive || state.won) return state;

  const d = DELTAS[state.dir];
  let hx = state.snake[0].x + d.x;
  let hy = state.snake[0].y + d.y;

  if (board.wrap) {
    hx = (hx + board.gridWidth) % board.gridWidth;
    hy = (hy + board.gridHeight) % board.gridHeight;
  } else if (hx < 0 || hy < 0 || hx >= board.gridWidth || hy >= board.gridHeight) {
    return { ...state, alive: false };
  }

  const head: Point = { x: hx, y: hy };
  const ate = samePoint(head, state.food);

  // When not eating the tail vacates, so chasing your own tail is legal.
  const body = ate ? state.snake : state.snake.slice(0, state.snake.length - 1);
  if (occupies(body, head)) {
    return { ...state, alive: false };
  }

  const snake: Point[] = [head, ...body];

  if (!ate) {
    return { ...state, snake };
  }

  const filledBoard = snake.length >= board.gridWidth * board.gridHeight;
  return {
    snake,
    dir: state.dir,
    food: filledBoard ? head : spawnFood(snake, board, rng),
    score: state.score + 1,
    alive: true,
    won: filledBoard,
  };
}
