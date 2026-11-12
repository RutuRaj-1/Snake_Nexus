import test from 'node:test';
import assert from 'node:assert/strict';
import { CubeTopology } from '../shared/cubeTopology.js';
import { CUBE_FACES, DIRECTIONS, OPPOSITE_DIRECTIONS } from '../shared/constants.js';

test('CubeTopology: all 24 edge transitions are valid, bounded, and reversible', (t) => {
  const N = 16;
  const topology = new CubeTopology(N);
  const faces = Object.values(CUBE_FACES);
  const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  let totalTransitionsTested = 0;

  for (const face of faces) {
    for (const dir of directions) {
      // Test across all cells along that edge
      for (let i = 0; i < N; i++) {
        let startX, startY;
        let stepX, stepY;

        if (dir === 'UP') {
          startX = i;
          startY = 0;
          stepX = startX;
          stepY = -1; // cross top edge
        } else if (dir === 'DOWN') {
          startX = i;
          startY = N - 1;
          stepX = startX;
          stepY = N; // cross bottom edge
        } else if (dir === 'LEFT') {
          startX = 0;
          startY = i;
          stepX = -1; // cross left edge
          stepY = startY;
        } else if (dir === 'RIGHT') {
          startX = N - 1;
          startY = i;
          stepX = N; // cross right edge
          stepY = startY;
        }

        const transition = topology.resolveTransition(face, stepX, stepY, dir);

        // 1. Must flag as crossed
        assert.equal(transition.crossed, true, `Transition from ${face} ${dir} should be marked as crossed`);
        // 2. Target face must be different
        assert.notEqual(transition.face, face, `Target face should be different from source face ${face}`);
        // 3. Target coordinates must be strictly within bounds [0, N-1]
        assert.ok(transition.x >= 0 && transition.x < N, `Target X ${transition.x} must be within [0, ${N-1}]`);
        assert.ok(transition.y >= 0 && transition.y < N, `Target Y ${transition.y} must be within [0, ${N-1}]`);

        // 4. Involution / Reversibility test:
        // Reverse direction from transition
        const revDir = OPPOSITE_DIRECTIONS[transition.dir];
        const revDelta = DIRECTIONS[revDir];
        const revStepX = transition.x + revDelta.x;
        const revStepY = transition.y + revDelta.y;

        const returnTransition = topology.resolveTransition(
          transition.face,
          revStepX,
          revStepY,
          revDir
        );

        assert.equal(returnTransition.crossed, true);
        assert.equal(returnTransition.face, face, `Returning from ${transition.face} should land back on ${face}`);
        assert.equal(returnTransition.x, startX, `Returning X should equal startX for ${face} ${dir} at idx ${i}`);
        assert.equal(returnTransition.y, startY, `Returning Y should equal startY for ${face} ${dir} at idx ${i}`);
        assert.equal(returnTransition.dir, OPPOSITE_DIRECTIONS[dir], `Returning dir should be opposite of original dir`);

        totalTransitionsTested++;
      }
    }
  }

  // 6 faces * 4 directions * 16 edge cells = 384 discrete test steps
  assert.equal(totalTransitionsTested, 6 * 4 * N);
});

test('CubeTopology: 3D point positions are calculated for all faces without NaN', () => {
  const topology = new CubeTopology(16);
  for (const face of Object.values(CUBE_FACES)) {
    for (let u = 0; u < 16; u += 5) {
      for (let v = 0; v < 16; v += 5) {
        const p = topology.getCell3DPosition(face, u, v);
        assert.ok(!isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z));
        assert.ok(!isNaN(p.normal.x) && !isNaN(p.normal.y) && !isNaN(p.normal.z));
      }
    }
  }
});

