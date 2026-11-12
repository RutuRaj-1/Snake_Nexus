/**
 * Snake Nexus — 3D Cube Topology & Edge Transition Mathematics
 *
 * Models a genuine 3D cube with 6 connected square grid faces:
 * FRONT (+Z), BACK (-Z), LEFT (-X), RIGHT (+X), TOP (+Y), BOTTOM (-Y)
 *
 * Implements mathematically continuous edge coordinate transformations
 * with involution consistency: transition(transition(pos, dir), -newDir) == (pos, -dir)
 */

import { CUBE_FACES, DIRECTIONS, OPPOSITE_DIRECTIONS } from './constants.js';

export class CubeTopology {
  /**
   * @param {number} gridSize - Grid dimensions per face (e.g. 16 for a 16x16 grid)
   */
  constructor(gridSize = 16) {
    this.gridSize = gridSize;
  }

  /**
   * Calculate 3D position (x, y, z) for a cell on a given face in normalized coordinates [-0.5, 0.5]
   * @param {string} face - Face identifier
   * @param {number} u - Horizontal grid coordinate [0, gridSize - 1]
   * @param {number} v - Vertical grid coordinate [0, gridSize - 1]
   * @param {number} offset - Outward normal offset (e.g. for snake height)
   * @returns {{x: number, y: number, z: number, normal: {x: number, y: number, z: number}}}
   */
  getCell3DPosition(face, u, v, offset = 0.02) {
    const half = 0.5;
    // Map grid coords to normalized face plane [-half, half]
    // u goes 0 -> gridSize-1 (left to right)
    // v goes 0 -> gridSize-1 (top to bottom, so top is +half or depending on axis)
    const normU = ((u + 0.5) / this.gridSize - 0.5); // [-0.5, 0.5]
    const normV = (0.5 - (v + 0.5) / this.gridSize); // [0.5, -0.5] (top is positive)

    let x = 0, y = 0, z = 0;
    let normal = { x: 0, y: 0, z: 0 };

    switch (face) {
      case CUBE_FACES.FRONT: // +Z
        x = normU;
        y = normV;
        z = half + offset;
        normal = { x: 0, y: 0, z: 1 };
        break;
      case CUBE_FACES.BACK: // -Z
        x = -normU;
        y = normV;
        z = -half - offset;
        normal = { x: 0, y: 0, z: -1 };
        break;
      case CUBE_FACES.LEFT: // -X
        x = -half - offset;
        y = normV;
        z = normU;
        normal = { x: -1, y: 0, z: 0 };
        break;
      case CUBE_FACES.RIGHT: // +X
        x = half + offset;
        y = normV;
        z = -normU;
        normal = { x: 1, y: 0, z: 0 };
        break;
      case CUBE_FACES.TOP: // +Y
        x = normU;
        y = half + offset;
        z = -normV;
        normal = { x: 0, y: 1, z: 0 };
        break;
      case CUBE_FACES.BOTTOM: // -Y
        x = normU;
        y = -half - offset;
        z = normV;
        normal = { x: 0, y: -1, z: 0 };
        break;
      default:
        throw new Error(`Unknown face: ${face}`);
    }

    return { x, y, z, normal };
  }

  /**
   * Determine the adjacent face and new coordinate/direction when crossing an edge
   *
   * @param {string} face - Current face
   * @param {number} x - Candidate grid x position (may be < 0 or >= gridSize)
   * @param {number} y - Candidate grid y position (may be < 0 or >= gridSize)
   * @param {string} dir - Movement direction ('UP', 'DOWN', 'LEFT', 'RIGHT')
   * @returns {{face: string, x: number, y: number, dir: string, crossed: boolean}}
   */
  resolveTransition(face, x, y, dir) {
    const N = this.gridSize;

    // Check if within bounds of the current face
    if (x >= 0 && x < N && y >= 0 && y < N) {
      return { face, x, y, dir, crossed: false };
    }

    let targetFace = face;
    let targetX = x;
    let targetY = y;
    let targetDir = dir;

    // FRONT Face (+Z)
    if (face === CUBE_FACES.FRONT) {
      if (y < 0) { // UP -> TOP
        targetFace = CUBE_FACES.TOP;
        targetX = x;
        targetY = N - 1;
        targetDir = 'UP';
      } else if (y >= N) { // DOWN -> BOTTOM
        targetFace = CUBE_FACES.BOTTOM;
        targetX = x;
        targetY = 0;
        targetDir = 'DOWN';
      } else if (x < 0) { // LEFT -> LEFT
        targetFace = CUBE_FACES.LEFT;
        targetX = N - 1;
        targetY = y;
        targetDir = 'LEFT';
      } else if (x >= N) { // RIGHT -> RIGHT
        targetFace = CUBE_FACES.RIGHT;
        targetX = 0;
        targetY = y;
        targetDir = 'RIGHT';
      }
    }
    // BACK Face (-Z)
    else if (face === CUBE_FACES.BACK) {
      if (y < 0) { // UP -> TOP (inverted x)
        targetFace = CUBE_FACES.TOP;
        targetX = (N - 1) - x;
        targetY = 0;
        targetDir = 'DOWN';
      } else if (y >= N) { // DOWN -> BOTTOM (inverted x)
        targetFace = CUBE_FACES.BOTTOM;
        targetX = (N - 1) - x;
        targetY = N - 1;
        targetDir = 'UP';
      } else if (x < 0) { // LEFT -> RIGHT face
        targetFace = CUBE_FACES.RIGHT;
        targetX = N - 1;
        targetY = y;
        targetDir = 'LEFT';
      } else if (x >= N) { // RIGHT -> LEFT face
        targetFace = CUBE_FACES.LEFT;
        targetX = 0;
        targetY = y;
        targetDir = 'RIGHT';
      }
    }
    // LEFT Face (-X)
    else if (face === CUBE_FACES.LEFT) {
      if (y < 0) { // UP -> TOP (x becomes y)
        targetFace = CUBE_FACES.TOP;
        targetX = 0;
        targetY = x;
        targetDir = 'RIGHT';
      } else if (y >= N) { // DOWN -> BOTTOM (x becomes inverted y)
        targetFace = CUBE_FACES.BOTTOM;
        targetX = 0;
        targetY = (N - 1) - x;
        targetDir = 'RIGHT';
      } else if (x < 0) { // LEFT -> BACK
        targetFace = CUBE_FACES.BACK;
        targetX = N - 1;
        targetY = y;
        targetDir = 'LEFT';
      } else if (x >= N) { // RIGHT -> FRONT
        targetFace = CUBE_FACES.FRONT;
        targetX = 0;
        targetY = y;
        targetDir = 'RIGHT';
      }
    }
    // RIGHT Face (+X)
    else if (face === CUBE_FACES.RIGHT) {
      if (y < 0) { // UP -> TOP (x becomes inverted y)
        targetFace = CUBE_FACES.TOP;
        targetX = N - 1;
        targetY = (N - 1) - x;
        targetDir = 'LEFT';
      } else if (y >= N) { // DOWN -> BOTTOM (x becomes y)
        targetFace = CUBE_FACES.BOTTOM;
        targetX = N - 1;
        targetY = x;
        targetDir = 'LEFT';
      } else if (x < 0) { // LEFT -> FRONT
        targetFace = CUBE_FACES.FRONT;
        targetX = N - 1;
        targetY = y;
        targetDir = 'LEFT';
      } else if (x >= N) { // RIGHT -> BACK
        targetFace = CUBE_FACES.BACK;
        targetX = 0;
        targetY = y;
        targetDir = 'RIGHT';
      }
    }
    // TOP Face (+Y)
    else if (face === CUBE_FACES.TOP) {
      if (y < 0) { // UP -> BACK (inverted x)
        targetFace = CUBE_FACES.BACK;
        targetX = (N - 1) - x;
        targetY = 0;
        targetDir = 'DOWN';
      } else if (y >= N) { // DOWN -> FRONT
        targetFace = CUBE_FACES.FRONT;
        targetX = x;
        targetY = 0;
        targetDir = 'DOWN';
      } else if (x < 0) { // LEFT -> LEFT (y becomes x)
        targetFace = CUBE_FACES.LEFT;
        targetX = y;
        targetY = 0;
        targetDir = 'DOWN';
      } else if (x >= N) { // RIGHT -> RIGHT (y becomes inverted x)
        targetFace = CUBE_FACES.RIGHT;
        targetX = (N - 1) - y;
        targetY = 0;
        targetDir = 'DOWN';
      }
    }
    // BOTTOM Face (-Y)
    else if (face === CUBE_FACES.BOTTOM) {
      if (y < 0) { // UP -> FRONT
        targetFace = CUBE_FACES.FRONT;
        targetX = x;
        targetY = N - 1;
        targetDir = 'UP';
      } else if (y >= N) { // DOWN -> BACK (inverted x)
        targetFace = CUBE_FACES.BACK;
        targetX = (N - 1) - x;
        targetY = N - 1;
        targetDir = 'UP';
      } else if (x < 0) { // LEFT -> LEFT (y becomes inverted x)
        targetFace = CUBE_FACES.LEFT;
        targetX = (N - 1) - y;
        targetY = N - 1;
        targetDir = 'UP';
      } else if (x >= N) { // RIGHT -> RIGHT (y becomes x)
        targetFace = CUBE_FACES.RIGHT;
        targetX = y;
        targetY = N - 1;
        targetDir = 'UP';
      }
    }

    return {
      face: targetFace,
      x: targetX,
      y: targetY,
      dir: targetDir,
      crossed: true
    };
  }
}

