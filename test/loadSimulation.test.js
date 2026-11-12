import test from 'node:test';
import assert from 'node:assert/strict';
import { SnakeSimulation } from '../server/src/game/SnakeSimulation.js';
import { BotAI } from '../server/src/game/BotAI.js';
import { GAME_MODES, CUBE_FACE_LIST } from '../shared/constants.js';

test('Load Simulation: 24-player 3D Cube Conquest simulation runs smoothly', () => {
  const sim = new SnakeSimulation(GAME_MODES.CUBE_CONQUEST, { gridSize: 16 });

  // Add 4 players per face = 24 players
  for (const face of CUBE_FACE_LIST) {
    for (let slot = 0; slot < 4; slot++) {
      sim.addSnake({
        id: `player-${face}-${slot}`,
        name: `Pilot ${face[0]}${slot}`,
        slotIndex: slot,
        face,
        isBot: true
      });
    }
  }

  assert.equal(sim.snakes.size, 24, 'All 24 players should be present in simulation');

  sim.spawnInitialFood();
  // 6 faces * 2 = 12 initial foods
  assert.equal(sim.foods.length, 12, 'Initial food should spawn on each face');

  // Run 60 simulation ticks with Bot AI
  for (let tick = 1; tick <= 60; tick++) {
    for (const snake of sim.snakes.values()) {
      if (snake.alive && snake.isBot) {
        const nextDir = BotAI.getNextDirection(snake, sim);
        sim.setDirection(snake.id, nextDir);
      }
    }

    const { events, state } = sim.tick();
    assert.ok(state, 'State snapshot must exist');
    assert.ok(Array.isArray(events), 'Events list must exist');
  }

  // Check that simulation is running, stats are tracked, and no state corruptions occurred
  for (const snake of sim.snakes.values()) {
    assert.ok(Array.isArray(snake.segments), 'Snake segments must remain array');
    for (const seg of snake.segments) {
      assert.ok(!isNaN(seg.x) && !isNaN(seg.y), 'Coordinates must not be NaN');
    }
  }
});

