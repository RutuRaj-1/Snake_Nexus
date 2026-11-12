/**
 * Snake Nexus — Shared Game Rules & Deterministic Collision Systems
 */

import { DIRECTIONS, OPPOSITE_DIRECTIONS, GAME_RULES, CUBE_FACES } from './constants.js';

export class GameRules {
  /**
   * Check if a direction change is valid (disallows 180 degree instant reversal)
   * @param {string} currentDir
   * @param {string} newDir
   * @returns {boolean}
   */
  static isValidDirectionChange(currentDir, newDir) {
    if (!DIRECTIONS[newDir]) return false;
    if (OPPOSITE_DIRECTIONS[currentDir] === newDir) return false;
    return true;
  }

  /**
   * Find a random free coordinate on the grid not occupied by any snake or existing food
   * @param {number} width
   * @param {number} height
   * @param {Array<{x: number, y: number, face?: string}>} occupiedCells
   * @param {string} [face] - Optional face filter for cube mode
   * @returns {{x: number, y: number, face?: string}|null}
   */
  static getRandomFreeCell(width, height, occupiedCells = [], face = null) {
    const occupiedSet = new Set();
    for (const cell of occupiedCells) {
      if (!face || cell.face === face) {
        occupiedSet.add(`${cell.x},${cell.y}`);
      }
    }

    const totalCells = width * height;
    if (occupiedSet.size >= totalCells) {
      return null; // Arena completely full
    }

    // Try random sampling first (fast for sparse grids)
    const MAX_ATTEMPTS = 100;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const rx = Math.floor(Math.random() * width);
      const ry = Math.floor(Math.random() * height);
      if (!occupiedSet.has(`${rx},${ry}`)) {
        return face ? { x: rx, y: ry, face } : { x: rx, y: ry };
      }
    }

    // Fallback: collect all free cells and pick one randomly
    const freeCells = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!occupiedSet.has(`${x},${y}`)) {
          freeCells.push({ x, y });
        }
      }
    }

    if (freeCells.length === 0) return null;
    const chosen = freeCells[Math.floor(Math.random() * freeCells.length)];
    return face ? { ...chosen, face } : chosen;
  }

  /**
   * Resolves collisions deterministically for an array of active snakes in a 2D or Cube tick.
   *
   * Collision resolution order:
   * 1. Wall Collisions (lethal if boundaries not wrapped)
   * 2. Self-Collisions (head hits own body)
   * 3. Head-to-Head Collisions (same cell: longer wins, equal both die)
   * 4. Head-to-Body Collisions (head hits another's body: head snake eliminated)
   *
   * @param {Array<Object>} snakes - Array of snake objects { id, alive, segments, length, score, face }
   * @param {Object} arenaBounds - { width, height, allowWallWrap?: boolean }
   * @returns {{
   *   eliminations: Array<{ snakeId: string, killerId: string|null, reason: string }>,
   *   scoreBonuses: Array<{ snakeId: string, bonus: number, growth: number }>
   * }}
   */
  static resolveCollisions(snakes, arenaBounds) {
    const activeSnakes = snakes.filter(s => s.alive && s.segments.length > 0);
    const eliminations = [];
    const scoreBonuses = [];
    const eliminatedIds = new Set();

    // Helper: record elimination safely
    const eliminate = (snakeId, killerId, reason) => {
      if (!eliminatedIds.has(snakeId)) {
        eliminatedIds.add(snakeId);
        eliminations.push({ snakeId, killerId, reason });
      }
    };

    // 1. Wall Collisions (if not wrapping)
    if (!arenaBounds.allowWallWrap) {
      for (const snake of activeSnakes) {
        const head = snake.segments[0];
        if (head.x < 0 || head.x >= arenaBounds.width || head.y < 0 || head.y >= arenaBounds.height) {
          eliminate(snake.id, null, 'WALL_COLLISION');
        }
      }
    }

    // 2. Self-Collisions (snake head collides with any of its own body segments)
    for (const snake of activeSnakes) {
      if (eliminatedIds.has(snake.id)) continue;
      const head = snake.segments[0];
      for (let i = 1; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        const sameFace = !head.face || !seg.face || head.face === seg.face;
        if (sameFace && head.x === seg.x && head.y === seg.y) {
          eliminate(snake.id, null, 'SELF_COLLISION');
          break;
        }
      }
    }

    // 3. Head-to-Head Collisions
    // Group active, not-yet-eliminated snake heads by cell location
    const headsByCell = new Map();
    for (const snake of activeSnakes) {
      if (eliminatedIds.has(snake.id)) continue;
      const head = snake.segments[0];
      const key = head.face ? `${head.face}:${head.x},${head.y}` : `${head.x},${head.y}`;
      if (!headsByCell.has(key)) {
        headsByCell.set(key, []);
      }
      headsByCell.get(key).push(snake);
    }

    for (const [cellKey, snakesInCell] of headsByCell.entries()) {
      if (snakesInCell.length > 1) {
        // Sort descending by snake length
        snakesInCell.sort((a, b) => b.segments.length - a.segments.length);

        const longest = snakesInCell[0];
        const second = snakesInCell[1];

        if (longest.segments.length === second.segments.length) {
          // Equal length: all colliding snakes are eliminated
          for (const s of snakesInCell) {
            eliminate(s.id, null, 'HEAD_TO_HEAD_DRAW');
          }
        } else {
          // Longest snake survives! The rest are eliminated
          for (let i = 1; i < snakesInCell.length; i++) {
            eliminate(snakesInCell[i].id, longest.id, 'HEAD_TO_HEAD_LOSS');
          }
          // Reward the surviving longest snake
          scoreBonuses.push({
            snakeId: longest.id,
            bonus: GAME_RULES.ELIMINATION_SCORE * (snakesInCell.length - 1),
            growth: GAME_RULES.ELIMINATION_GROWTH_BONUS * (snakesInCell.length - 1)
          });
        }
      }
    }

    // 4. Head-to-Body Collisions
    // For each surviving snake head, check against every other snake's body segments
    for (const snake of activeSnakes) {
      if (eliminatedIds.has(snake.id)) continue;
      const head = snake.segments[0];

      for (const otherSnake of activeSnakes) {
        if (snake.id === otherSnake.id) continue;
        // Even if otherSnake was eliminated this tick, its body in this tick existed
        for (let i = 1; i < otherSnake.segments.length; i++) {
          const seg = otherSnake.segments[i];
          const sameFace = !head.face || !seg.face || head.face === seg.face;
          if (sameFace && head.x === seg.x && head.y === seg.y) {
            eliminate(snake.id, otherSnake.id, 'HEAD_TO_BODY');
            // Give killer snake an elimination reward if killer wasn't eliminated
            if (!eliminatedIds.has(otherSnake.id)) {
              scoreBonuses.push({
                snakeId: otherSnake.id,
                bonus: GAME_RULES.ELIMINATION_SCORE,
                growth: GAME_RULES.ELIMINATION_GROWTH_BONUS
              });
            }
            break;
          }
        }
        if (eliminatedIds.has(snake.id)) break;
      }
    }

    return { eliminations, scoreBonuses };
  }
}

