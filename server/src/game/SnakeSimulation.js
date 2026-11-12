/**
 * Snake Nexus — Authoritative Server-Side Snake Simulation
 */

import {
  GAME_MODES,
  MATCH_STATES,
  DIRECTIONS,
  GRID_CONFIG,
  CUBE_FACES,
  CUBE_FACE_LIST,
  SPAWN_POSITIONS_2D,
  SPAWN_POSITIONS_CUBE_FACE,
  GAME_RULES
} from '../../../shared/constants.js';
import { GameRules } from '../../../shared/gameRules.js';
import { CubeTopology } from '../../../shared/cubeTopology.js';

export class SnakeSimulation {
  constructor(mode = GAME_MODES.BATTLE_2D, options = {}) {
    this.mode = mode;
    this.options = {
      enablePortals: options.enablePortals ?? false,
      gridSize: mode === GAME_MODES.CUBE_CONQUEST ? GRID_CONFIG.CUBE_FACE.width : GRID_CONFIG.BATTLE_2D.width,
      ...options
    };

    this.gridWidth = this.options.gridSize;
    this.gridHeight = this.options.gridSize;
    this.cubeTopology = new CubeTopology(this.gridWidth);

    this.stage = mode === GAME_MODES.CUBE_CONQUEST ? MATCH_STATES.STAGE_1_QUALIFY : MATCH_STATES.IN_PROGRESS;
    this.snakes = new Map(); // playerId -> snake state
    this.foods = []; // array of food objects { id, x, y, face? }
    this.portals = [];
    this.faceChampions = new Map(); // face -> playerId
    this.faceCompleted = new Map(); // face -> boolean
    this.stats = new Map(); // playerId -> stats { kills, foodEaten, transitions, score }

    if (this.options.enablePortals && this.mode === GAME_MODES.BATTLE_2D) {
      this.initPortals();
    }
  }

  initPortals() {
    const midY = Math.floor(this.gridHeight / 2);
    const midX = Math.floor(this.gridWidth / 2);
    this.portals = [
      { id: 'portal-lr-1', x: 0, y: midY, targetX: this.gridWidth - 1, targetY: midY, dir: 'LEFT', targetDir: 'LEFT' },
      { id: 'portal-lr-2', x: this.gridWidth - 1, y: midY, targetX: 0, targetY: midY, dir: 'RIGHT', targetDir: 'RIGHT' },
      { id: 'portal-tb-1', x: midX, y: 0, targetX: midX, targetY: this.gridHeight - 1, dir: 'UP', targetDir: 'UP' },
      { id: 'portal-tb-2', x: midX, y: this.gridHeight - 1, targetX: midX, targetY: 0, dir: 'DOWN', targetDir: 'DOWN' }
    ];
  }

  /**
   * Add a player's snake to the simulation
   */
  addSnake(player) {
    const { id, name, slotIndex, face = CUBE_FACES.FRONT, isBot = false } = player;

    let spawn;
    if (this.mode === GAME_MODES.CUBE_CONQUEST) {
      const pos = SPAWN_POSITIONS_CUBE_FACE[slotIndex % SPAWN_POSITIONS_CUBE_FACE.length];
      spawn = { x: pos.x, y: pos.y, dir: pos.dir, face };
    } else {
      const pos = SPAWN_POSITIONS_2D[slotIndex % SPAWN_POSITIONS_2D.length];
      spawn = { x: pos.x, y: pos.y, dir: pos.dir, face: null };
    }

    // Build initial segments
    const segments = [];
    const delta = DIRECTIONS[spawn.dir];
    for (let i = 0; i < GAME_RULES.INITIAL_SNAKE_LENGTH; i++) {
      segments.push({
        x: spawn.x - delta.x * i,
        y: spawn.y - delta.y * i,
        face: spawn.face
      });
    }

    const snake = {
      id,
      name,
      slotIndex,
      isBot,
      face: spawn.face,
      alive: true,
      segments,
      direction: spawn.dir,
      nextDirection: spawn.dir,
      pendingGrowth: 0,
      score: 0,
      eliminatedBy: null,
      eliminationReason: null
    };

    this.snakes.set(id, snake);
    this.stats.set(id, {
      id,
      name,
      score: 0,
      kills: 0,
      foodEaten: 0,
      transitions: 0,
      initialFace: spawn.face
    });

    return snake;
  }

  /**
   * Process a validated direction request from a player
   */
  setDirection(playerId, newDir) {
    const snake = this.snakes.get(playerId);
    if (!snake || !snake.alive) return false;
    if (GameRules.isValidDirectionChange(snake.direction, newDir)) {
      snake.nextDirection = newDir;
      return true;
    }
    return false;
  }

  /**
   * Spawn initial food items
   */
  spawnInitialFood() {
    this.foods = [];
    if (this.mode === GAME_MODES.CUBE_CONQUEST) {
      // Spawn 2 foods per face initially
      for (const face of CUBE_FACE_LIST) {
        for (let i = 0; i < 2; i++) {
          this.spawnFoodForFace(face);
        }
      }
    } else {
      // Spawn 3 foods in 2D arena
      for (let i = 0; i < 3; i++) {
        this.spawnFood2D();
      }
    }
  }

  spawnFood2D() {
    const occupied = [];
    for (const snake of this.snakes.values()) {
      if (snake.alive) occupied.push(...snake.segments);
    }
    occupied.push(...this.foods);

    const cell = GameRules.getRandomFreeCell(this.gridWidth, this.gridHeight, occupied);
    if (cell) {
      this.foods.push({
        id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        x: cell.x,
        y: cell.y
      });
    }
  }

  spawnFoodForFace(face) {
    const occupied = [];
    for (const snake of this.snakes.values()) {
      if (snake.alive && snake.face === face) occupied.push(...snake.segments);
    }
    occupied.push(...this.foods.filter(f => f.face === face));

    const cell = GameRules.getRandomFreeCell(this.gridWidth, this.gridHeight, occupied, face);
    if (cell) {
      this.foods.push({
        id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        x: cell.x,
        y: cell.y,
        face
      });
    }
  }

  /**
   * Step the authoritative simulation forward by one tick
   */
  tick() {
    if (this.stage === MATCH_STATES.FINISHED) {
      return { events: [], state: this.getState() };
    }

    const events = [];

    // 1. Move snakes
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;

      snake.direction = snake.nextDirection;
      const delta = DIRECTIONS[snake.direction];
      const head = snake.segments[0];

      let nextX = head.x + delta.x;
      let nextY = head.y + delta.y;
      let nextFace = head.face;
      let nextDir = snake.direction;

      // Check portals in 2D Battle mode
      if (this.mode === GAME_MODES.BATTLE_2D && this.options.enablePortals) {
        const portal = this.portals.find(p => p.x === nextX && p.y === nextY && p.dir === snake.direction);
        if (portal) {
          nextX = portal.targetX;
          nextY = portal.targetY;
          events.push({ type: 'PORTAL_USE', snakeId: snake.id, portalId: portal.id });
        }
      }

      // Check 3D Cube face transition
      if (this.mode === GAME_MODES.CUBE_CONQUEST && this.stage === MATCH_STATES.STAGE_2_FINAL) {
        const transition = this.cubeTopology.resolveTransition(head.face, nextX, nextY, snake.direction);
        if (transition.crossed) {
          nextFace = transition.face;
          nextX = transition.x;
          nextY = transition.y;
          nextDir = transition.dir;
          snake.nextDirection = nextDir;
          snake.direction = nextDir;
          snake.face = nextFace;

          const stat = this.stats.get(snake.id);
          if (stat) stat.transitions++;

          events.push({
            type: 'FACE_TRANSITION',
            snakeId: snake.id,
            fromFace: head.face,
            toFace: nextFace,
            x: nextX,
            y: nextY,
            dir: nextDir
          });
        }
      }

      // Prepend new head
      const newHead = { x: nextX, y: nextY, face: nextFace };
      snake.segments.unshift(newHead);

      // Handle growth or pop tail
      if (snake.pendingGrowth > 0) {
        snake.pendingGrowth--;
      } else {
        snake.segments.pop();
      }
    }

    // 2. Resolve collisions
    const snakeList = Array.from(this.snakes.values());
    const allowWallWrap = (this.mode === GAME_MODES.CUBE_CONQUEST && this.stage === MATCH_STATES.STAGE_2_FINAL);
    const { eliminations, scoreBonuses } = GameRules.resolveCollisions(snakeList, {
      width: this.gridWidth,
      height: this.gridHeight,
      allowWallWrap
    });

    // Apply eliminations
    for (const elim of eliminations) {
      const snake = this.snakes.get(elim.snakeId);
      if (snake && snake.alive) {
        snake.alive = false;
        snake.eliminatedBy = elim.killerId;
        snake.eliminationReason = elim.reason;

        events.push({
          type: 'ELIMINATION',
          snakeId: snake.id,
          killerId: elim.killerId,
          reason: elim.reason
        });
      }
    }

    // Apply score bonuses for kills
    for (const bonus of scoreBonuses) {
      const snake = this.snakes.get(bonus.snakeId);
      if (snake && snake.alive) {
        snake.score += bonus.bonus;
        snake.pendingGrowth += bonus.growth;

        const stat = this.stats.get(snake.id);
        if (stat) {
          stat.kills++;
          stat.score = snake.score;
        }

        events.push({
          type: 'KILL_BONUS',
          snakeId: snake.id,
          bonus: bonus.bonus,
          growth: bonus.growth
        });
      }
    }

    // 3. Check food consumption
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      const head = snake.segments[0];

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        const sameFace = !head.face || !food.face || head.face === food.face;
        if (sameFace && head.x === food.x && head.y === food.y) {
          // Food eaten!
          snake.score += GAME_RULES.FOOD_SCORE;
          snake.pendingGrowth += 1;

          const stat = this.stats.get(snake.id);
          if (stat) {
            stat.foodEaten++;
            stat.score = snake.score;
          }

          events.push({
            type: 'FOOD_EATEN',
            snakeId: snake.id,
            foodId: food.id,
            score: snake.score
          });

          // Remove eaten food and spawn a replacement
          this.foods.splice(i, 1);
          if (this.mode === GAME_MODES.CUBE_CONQUEST) {
            this.spawnFoodForFace(food.face);
          } else {
            this.spawnFood2D();
          }
        }
      }
    }

    // 4. Check stage progression and match victory
    this.checkMatchProgression(events);

    return { events, state: this.getState() };
  }

  /**
   * Check 2D match victory or 3D Cube stage progression
   */
  checkMatchProgression(events) {
    if (this.mode === GAME_MODES.BATTLE_2D) {
      const active = Array.from(this.snakes.values()).filter(s => s.alive);
      if (active.length <= 1) {
        this.stage = MATCH_STATES.FINISHED;
        const winner = active.length === 1 ? active[0] : null;
        events.push({
          type: 'MATCH_FINISHED',
          winner: winner ? { id: winner.id, name: winner.name, score: winner.score } : null,
          isDraw: active.length === 0
        });
      }
    } else if (this.mode === GAME_MODES.CUBE_CONQUEST) {
      if (this.stage === MATCH_STATES.STAGE_1_QUALIFY) {
        // Check each face for a champion
        for (const face of CUBE_FACE_LIST) {
          if (this.faceCompleted.get(face)) continue;

          const faceSnakes = Array.from(this.snakes.values()).filter(s => s.face === face);
          const aliveOnFace = faceSnakes.filter(s => s.alive);

          if (aliveOnFace.length <= 1 && faceSnakes.length > 0) {
            this.faceCompleted.set(face, true);
            const champ = aliveOnFace.length === 1 ? aliveOnFace[0] : faceSnakes[0]; // fallback if draw
            this.faceChampions.set(face, champ.id);

            events.push({
              type: 'FACE_CHAMPION_QUALIFIED',
              face,
              championId: champ.id,
              championName: champ.name
            });
          }
        }

        // Check if all faces completed qualification
        const completedCount = Array.from(this.faceCompleted.values()).filter(Boolean).length;
        if (completedCount >= 6) {
          // Advance to Stage 2: Cube Final!
          this.stage = MATCH_STATES.STAGE_2_FINAL;
          events.push({
            type: 'STAGE_2_FINAL_START',
            champions: Array.from(this.faceChampions.entries()).map(([face, champId]) => {
              const s = this.snakes.get(champId);
              return { face, id: champId, name: s ? s.name : champId };
            })
          });
        }
      } else if (this.stage === MATCH_STATES.STAGE_2_FINAL) {
        // In final stage: last surviving champion wins!
        const finalists = Array.from(this.faceChampions.values()).map(id => this.snakes.get(id)).filter(Boolean);
        const aliveFinalists = finalists.filter(s => s.alive);

        if (aliveFinalists.length <= 1) {
          this.stage = MATCH_STATES.FINISHED;
          const conqueror = aliveFinalists.length === 1 ? aliveFinalists[0] : null;
          const stat = conqueror ? this.stats.get(conqueror.id) : null;

          events.push({
            type: 'CUBE_CONQUEROR_DECLARED',
            winner: conqueror ? {
              id: conqueror.id,
              name: conqueror.name,
              score: conqueror.score,
              face: stat?.initialFace,
              transitions: stat?.transitions || 0,
              kills: stat?.kills || 0,
              foodEaten: stat?.foodEaten || 0
            } : null,
            isDraw: aliveFinalists.length === 0
          });
        }
      }
    }
  }

  /**
   * Return a lightweight snapshot of the current state for clients
   */
  getState() {
    const snakes = [];
    for (const s of this.snakes.values()) {
      snakes.push({
        id: s.id,
        name: s.name,
        slotIndex: s.slotIndex,
        alive: s.alive,
        direction: s.direction,
        score: s.score,
        face: s.face,
        segments: s.segments,
        isBot: s.isBot
      });
    }

    return {
      mode: this.mode,
      stage: this.stage,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      snakes,
      foods: this.foods,
      portals: this.portals,
      faceChampions: Object.fromEntries(this.faceChampions),
      faceCompleted: Object.fromEntries(this.faceCompleted)
    };
  }
}

