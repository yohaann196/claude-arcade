import { test, expect } from "bun:test";
import {
  type Board,
  type GameState,
  initialState,
  nextDirection,
  spawnFood,
  step,
} from "../game/engine.ts";

const board: Board = { gridWidth: 10, gridHeight: 10, wrap: false };
const wrapBoard: Board = { gridWidth: 10, gridHeight: 10, wrap: true };
const zero = (): number => 0;

test("snake starts length 3 heading right in the middle", () => {
  const s = initialState(board, zero);
  expect(s.snake.length).toBe(3);
  expect(s.dir).toBe("right");
  expect(s.alive).toBe(true);
});

test("step moves the head one cell in the current direction", () => {
  const s = initialState(board, zero);
  const head = s.snake[0];
  const next = step(s, board, zero);
  expect(next.snake[0]).toEqual({ x: head.x + 1, y: head.y });
  expect(next.snake.length).toBe(3); // no growth without food
});

test("hitting a wall ends the game when wrap is off", () => {
  let s: GameState = {
    snake: [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }],
    dir: "right",
    food: { x: 0, y: 0 },
    score: 0,
    alive: true,
    won: false,
  };
  s = step(s, board, zero);
  expect(s.alive).toBe(false);
});

test("wrap mode teleports across the edge instead of dying", () => {
  let s: GameState = {
    snake: [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }],
    dir: "right",
    food: { x: 0, y: 0 },
    score: 0,
    alive: true,
    won: false,
  };
  s = step(s, wrapBoard, zero);
  expect(s.alive).toBe(true);
  expect(s.snake[0]).toEqual({ x: 0, y: 5 });
});

test("eating food grows the snake and scores", () => {
  const start: GameState = {
    snake: [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }],
    dir: "right",
    food: { x: 5, y: 5 },
    score: 0,
    alive: true,
    won: false,
  };
  const next = step(start, board, zero);
  expect(next.score).toBe(1);
  expect(next.snake.length).toBe(4);
  expect(next.snake[0]).toEqual({ x: 5, y: 5 });
});

test("running into a non-tail body segment ends the game", () => {
  // Head at (2,1) heading down into its own body at (2,2).
  const s: GameState = {
    snake: [
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    dir: "down",
    food: { x: 9, y: 9 },
    score: 0,
    alive: true,
    won: false,
  };
  expect(step(s, board, zero).alive).toBe(false);
});

test("a 180-degree reversal is rejected", () => {
  expect(nextDirection("right", "left")).toBe("right");
  expect(nextDirection("up", "down")).toBe("up");
  expect(nextDirection("right", "up")).toBe("up"); // perpendicular turn allowed
});

test("spawned food never lands on the snake", () => {
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  for (let r = 0; r < 100; r++) {
    const food = spawnFood(snake, board, () => r / 100);
    expect(snake.some((p) => p.x === food.x && p.y === food.y)).toBe(false);
  }
});
