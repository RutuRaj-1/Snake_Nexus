import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRules } from '../shared/gameRules.js';

test('GameRules: direction change validation', () => {
  // Disallows 180 reverses
  assert.equal(GameRules.isValidDirectionChange('UP', 'DOWN'), false);
  assert.equal(GameRules.isValidDirectionChange('DOWN', 'UP'), false);
  assert.equal(GameRules.isValidDirectionChange('LEFT', 'RIGHT'), false);
  assert.equal(GameRules.isValidDirectionChange('RIGHT', 'LEFT'), false);

  // Allows 90 degree turns
  assert.equal(GameRules.isValidDirectionChange('UP', 'LEFT'), true);
  assert.equal(GameRules.isValidDirectionChange('UP', 'RIGHT'), true);
  assert.equal(GameRules.isValidDirectionChange('DOWN', 'LEFT'), true);
  assert.equal(GameRules.isValidDirectionChange('DOWN', 'RIGHT'), true);

  // Same direction is allowed (noop)
  assert.equal(GameRules.isValidDirectionChange('UP', 'UP'), true);
});

test('GameRules: Wall collision elimination', () => {
  const snakes = [
    { id: 'p1', alive: true, segments: [{ x: -1, y: 5 }, { x: 0, y: 5 }] },
    { id: 'p2', alive: true, segments: [{ x: 5, y: 5 }, { x: 5, y: 6 }] }
  ];
  const { eliminations } = GameRules.resolveCollisions(snakes, { width: 10, height: 10, allowWallWrap: false });
  assert.equal(eliminations.length, 1);
  assert.equal(eliminations[0].snakeId, 'p1');
  assert.equal(eliminations[0].reason, 'WALL_COLLISION');
});

test('GameRules: Self collision elimination', () => {
  const snakes = [
    {
      id: 'p1',
      alive: true,
      segments: [
        { x: 3, y: 3 }, // head
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 }  // loop into head
      ]
    }
  ];
  const { eliminations } = GameRules.resolveCollisions(snakes, { width: 10, height: 10 });
  assert.equal(eliminations.length, 1);
  assert.equal(eliminations[0].snakeId, 'p1');
  assert.equal(eliminations[0].reason, 'SELF_COLLISION');
});

test('GameRules: Head-to-head collision: longer snake survives, shorter eliminated', () => {
  const snakes = [
    {
      id: 'p1', // length 4
      alive: true,
      segments: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }]
    },
    {
      id: 'p2', // length 3
      alive: true,
      segments: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    }
  ];
  const { eliminations, scoreBonuses } = GameRules.resolveCollisions(snakes, { width: 10, height: 10 });
  assert.equal(eliminations.length, 1);
  assert.equal(eliminations[0].snakeId, 'p2');
  assert.equal(eliminations[0].killerId, 'p1');
  assert.equal(eliminations[0].reason, 'HEAD_TO_HEAD_LOSS');

  assert.equal(scoreBonuses.length, 1);
  assert.equal(scoreBonuses[0].snakeId, 'p1');
  assert.equal(scoreBonuses[0].bonus, 50);
  assert.equal(scoreBonuses[0].growth, 1);
});

test('GameRules: Head-to-head collision: equal size eliminated simultaneously (Draw)', () => {
  const snakes = [
    {
      id: 'p1', // length 3
      alive: true,
      segments: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]
    },
    {
      id: 'p2', // length 3
      alive: true,
      segments: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    }
  ];
  const { eliminations } = GameRules.resolveCollisions(snakes, { width: 10, height: 10 });
  assert.equal(eliminations.length, 2);
  const ids = eliminations.map(e => e.snakeId).sort();
  assert.deepEqual(ids, ['p1', 'p2']);
  assert.equal(eliminations[0].reason, 'HEAD_TO_HEAD_DRAW');
});

test('GameRules: Head-to-body collision: hitter eliminated, body survives', () => {
  const snakes = [
    {
      id: 'p1', // hits p2 body at (5, 6)
      alive: true,
      segments: [{ x: 5, y: 6 }, { x: 4, y: 6 }]
    },
    {
      id: 'p2',
      alive: true,
      segments: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }]
    }
  ];
  const { eliminations, scoreBonuses } = GameRules.resolveCollisions(snakes, { width: 10, height: 10 });
  assert.equal(eliminations.length, 1);
  assert.equal(eliminations[0].snakeId, 'p1');
  assert.equal(eliminations[0].killerId, 'p2');
  assert.equal(eliminations[0].reason, 'HEAD_TO_BODY');

  assert.equal(scoreBonuses.length, 1);
  assert.equal(scoreBonuses[0].snakeId, 'p2');
});

