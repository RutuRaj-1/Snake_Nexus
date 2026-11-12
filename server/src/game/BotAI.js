/**
 * Snake Nexus — Lightweight Autonomous Bot Controller
 */

import { DIRECTIONS, OPPOSITE_DIRECTIONS } from '../../../shared/constants.js';

export class BotAI {
  /**
   * Decide the next direction for an AI-controlled snake
   */
  static getNextDirection(snake, simulation) {
    if (!snake.alive) return snake.direction;

    const currentDir = snake.direction;
    const head = snake.segments[0];
    const candidateDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'].filter(
      d => d !== OPPOSITE_DIRECTIONS[currentDir]
    );

    // Build set of obstacle cells
    const obstacles = new Set();
    for (const other of simulation.snakes.values()) {
      if (!other.alive) continue;
      // All segments of all active snakes are obstacles
      for (const seg of other.segments) {
        if (!head.face || !seg.face || head.face === seg.face) {
          obstacles.add(`${seg.x},${seg.y}`);
        }
      }
    }

    // Find closest food on same face (or any food in 2D)
    const relevantFoods = simulation.foods.filter(
      f => !head.face || !f.face || f.face === head.face
    );

    let bestDir = currentDir;
    let bestScore = -Infinity;

    for (const dir of candidateDirections) {
      const delta = DIRECTIONS[dir];
      let nx = head.x + delta.x;
      let ny = head.y + delta.y;
      let nFace = head.face;

      let score = 0;

      // Handle cube final stage crossing or boundary check
      if (simulation.mode === 'CUBE_CONQUEST' && simulation.stage === 'STAGE_2_FINAL') {
        const trans = simulation.cubeTopology.resolveTransition(head.face, nx, ny, dir);
        nx = trans.x;
        ny = trans.y;
        nFace = trans.face;
      } else {
        // Lethal wall check
        if (nx < 0 || nx >= simulation.gridWidth || ny < 0 || ny >= simulation.gridHeight) {
          score -= 50000;
        }
      }

      // Check obstacle collision
      if (obstacles.has(`${nx},${ny}`)) {
        score -= 50000;
      }

      // Distance to food preference
      if (relevantFoods.length > 0) {
        let minDist = Infinity;
        for (const food of relevantFoods) {
          const dist = Math.abs(food.x - nx) + Math.abs(food.y - ny);
          if (dist < minDist) {
            minDist = dist;
          }
        }
        score += Math.max(0, 100 - minDist * 5);
      }

      // Prefer continuing current direction slightly to avoid jitter
      if (dir === currentDir) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }
}

