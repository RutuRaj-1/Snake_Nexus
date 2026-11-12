/**
 * Snake Nexus — ClassicScene
 * Single-player Classic Snake implementing all 10 core assignment requirements.
 */

import Phaser from 'phaser';
import { GRID_CONFIG, DIRECTIONS, GAME_RULES } from '../../../shared/constants.js';
import { GameRules } from '../../../shared/gameRules.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { InputController } from '../multiplayer/InputController.js';

export class ClassicScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClassicScene' });
  }

  create() {
    this.gridWidth = GRID_CONFIG.CLASSIC.width;
    this.gridHeight = GRID_CONFIG.CLASSIC.height;
    this.cellSize = GRID_CONFIG.CLASSIC.cellSize;

    // Center arena within Phaser canvas
    const arenaPixelW = this.gridWidth * this.cellSize;
    const arenaPixelH = this.gridHeight * this.cellSize;
    this.arenaX = Math.floor((this.scale.width - arenaPixelW) / 2);
    this.arenaY = Math.floor((this.scale.height - arenaPixelH) / 2) + 20;

    this.bestScore = ScoreManager.getBestScore();
    this.score = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.tickMs = GAME_RULES.CLASSIC_START_TICK_MS;
    this.lastTickTime = 0;

    // Snake state
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
    this.segments = [];
    this.food = null;

    // Graphics layers
    this.gridGraphics = this.add.graphics();
    this.foodGraphics = this.add.graphics();
    this.snakeGraphics = this.add.graphics();

    this.drawArenaGrid();
    this.initSnake();
    this.spawnFood();

    // Input Controller
    this.inputController = new InputController({
      onDirectionChange: (dir) => {
        if (!this.isGameOver && !this.isPaused) {
          if (GameRules.isValidDirectionChange(this.direction, dir)) {
            this.nextDirection = dir;
            window.__playNexusSfx?.('turn');
          }
        }
      },
      onPauseToggle: () => {
        if (!this.isGameOver) {
          this.togglePause();
        }
      }
    });

    // Update Top HUD
    const hudBadge = document.getElementById('hud-mode-badge');
    if (hudBadge) hudBadge.innerText = 'CLASSIC SNAKE';

    const hudScore = document.getElementById('hud-right');
    if (hudScore) {
      hudScore.style.display = 'flex';
      hudScore.innerHTML = `<span>SCORE: <b id="val-score" style="color:#fff;">0</b></span> | <span style="color:var(--text-dim);">BEST: <b id="val-best" style="color:var(--gold);">${this.bestScore}</b></span>`;
    }

    // Clean up when scene shuts down
    this.events.on('shutdown', () => {
      this.inputController?.destroy();
      const overlay = document.getElementById('ui-overlay');
      if (overlay) overlay.innerHTML = '';
    });
  }

  drawArenaGrid() {
    this.gridGraphics.clear();

    // Outer glow border
    this.gridGraphics.lineStyle(3, 0x00f0ff, 0.8);
    this.gridGraphics.strokeRoundedRect(
      this.arenaX - 4,
      this.arenaY - 4,
      this.gridWidth * this.cellSize + 8,
      this.gridHeight * this.cellSize + 8,
      8
    );

    // Inner arena background
    this.gridGraphics.fillStyle(0x0e1422, 0.95);
    this.gridGraphics.fillRoundedRect(
      this.arenaX,
      this.arenaY,
      this.gridWidth * this.cellSize,
      this.gridHeight * this.cellSize,
      6
    );

    // Grid lines
    this.gridGraphics.lineStyle(1, 0x1e293b, 0.4);
    for (let x = 0; x <= this.gridWidth; x++) {
      this.gridGraphics.lineBetween(
        this.arenaX + x * this.cellSize,
        this.arenaY,
        this.arenaX + x * this.cellSize,
        this.arenaY + this.gridHeight * this.cellSize
      );
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      this.gridGraphics.lineBetween(
        this.arenaX,
        this.arenaY + y * this.cellSize,
        this.arenaX + this.gridWidth * this.cellSize,
        this.arenaY + y * this.cellSize
      );
    }
  }

  initSnake() {
    const startX = 6;
    const startY = 10;
    this.segments = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
      { x: startX - 3, y: startY }
    ];
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
  }

  spawnFood() {
    const freeCell = GameRules.getRandomFreeCell(
      this.gridWidth,
      this.gridHeight,
      this.segments
    );
    if (freeCell) {
      this.food = freeCell;
    }
  }

  update(time) {
    if (this.isGameOver || this.isPaused) return;

    if (time - this.lastTickTime >= this.tickMs) {
      this.lastTickTime = time;
      this.step();
    }

    this.render();
  }

  step() {
    this.direction = this.nextDirection;
    const delta = DIRECTIONS[this.direction];
    const head = this.segments[0];

    const nextX = head.x + delta.x;
    const nextY = head.y + delta.y;

    // 1. Wall collision check
    if (nextX < 0 || nextX >= this.gridWidth || nextY < 0 || nextY >= this.gridHeight) {
      this.triggerGameOver('WALL_COLLISION');
      return;
    }

    // 2. Self collision check
    for (let i = 0; i < this.segments.length; i++) {
      if (this.segments[i].x === nextX && this.segments[i].y === nextY) {
        this.triggerGameOver('SELF_COLLISION');
        return;
      }
    }

    // Advance head
    const newHead = { x: nextX, y: nextY };
    this.segments.unshift(newHead);

    // 3. Food check
    if (this.food && nextX === this.food.x && nextY === this.food.y) {
      // Eat food
      this.score += GAME_RULES.FOOD_SCORE;
      window.__playNexusSfx?.('eat');

      // Update HUD
      const valScore = document.getElementById('val-score');
      if (valScore) valScore.innerText = this.score;

      // Dynamic speed scaling (increases speed as snake grows)
      this.tickMs = Math.max(
        GAME_RULES.CLASSIC_MIN_TICK_MS,
        GAME_RULES.CLASSIC_START_TICK_MS - Math.floor(this.score / 20) * GAME_RULES.CLASSIC_SPEEDUP_PER_FOOD
      );

      this.spawnFood();
    } else {
      // Pop tail
      this.segments.pop();
    }
  }

  render() {
    // Render Food
    this.foodGraphics.clear();
    if (this.food) {
      const fx = this.arenaX + this.food.x * this.cellSize + this.cellSize / 2;
      const fy = this.arenaY + this.food.y * this.cellSize + this.cellSize / 2;

      this.foodGraphics.fillStyle(0xff007f, 0.4);
      this.foodGraphics.fillCircle(fx, fy, this.cellSize / 2);
      this.foodGraphics.fillStyle(0xff0055, 0.8);
      this.foodGraphics.fillCircle(fx, fy, this.cellSize / 2 - 3);
      this.foodGraphics.fillStyle(0xffffff, 1);
      this.foodGraphics.fillCircle(fx, fy, 4);
    }

    // Render Snake
    this.snakeGraphics.clear();
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const px = this.arenaX + seg.x * this.cellSize;
      const py = this.arenaY + seg.y * this.cellSize;

      if (i === 0) {
        // Head: bright cyan with glowing outline
        this.snakeGraphics.fillStyle(0x00f0ff, 1);
        this.snakeGraphics.fillRoundedRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4, 6);
        this.snakeGraphics.lineStyle(2, 0xffffff, 0.9);
        this.snakeGraphics.strokeRoundedRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4, 6);
      } else {
        // Body: cyber cyan
        const alpha = Math.max(0.4, 1 - i / (this.segments.length * 1.5));
        this.snakeGraphics.fillStyle(0x00b4d8, alpha);
        this.snakeGraphics.fillRoundedRect(px + 3, py + 3, this.cellSize - 6, this.cellSize - 6, 4);
      }
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    if (this.isPaused) {
      overlay.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%; background:rgba(0,0,0,0.65);">
          <div class="nexus-modal interactive-panel" style="text-align:center; min-width:320px;">
            <h2 style="font-size:28px; color:var(--cyan); margin-bottom:12px;">MATCH PAUSED</h2>
            <p style="font-size:14px; color:var(--text-dim); margin-bottom:20px;">Press Space to resume simulation</p>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <button id="btn-resume" class="nexus-btn" style="width:100%;">Resume</button>
              <button id="btn-restart" class="nexus-btn gold" style="width:100%;">Restart Match</button>
              <button id="btn-quit" class="nexus-btn" style="width:100%; border-color:rgba(255,255,255,0.2); color:var(--text-dim);">Return to Menu</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause());
      document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
      document.getElementById('btn-quit')?.addEventListener('click', () => this.scene.start('MenuScene'));
    } else {
      overlay.innerHTML = '';
    }
  }

  triggerGameOver(reason) {
    this.isGameOver = true;
    window.__playNexusSfx?.('hit');

    const result = ScoreManager.saveScore(this.score);
    this.bestScore = result.bestScore;

    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const reasonText = reason === 'WALL_COLLISION' ? 'Impact with Perimeter Barrier' : 'Self-Intersection Anomaly';

    overlay.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%; background:rgba(0,0,0,0.75);">
        <div class="nexus-modal interactive-panel" style="text-align:center; min-width:340px; border-color:var(--magenta);">
          <h2 style="font-size:32px; font-weight:800; color:var(--magenta); margin-bottom:6px;">SIMULATION TERMINATED</h2>
          <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">${reasonText}</p>

          <div style="background:rgba(0,0,0,0.4); padding:14px; border-radius:8px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:13px; color:var(--text-dim); margin-bottom:4px;">FINAL SCORE</div>
            <div style="font-size:36px; font-weight:900; color:#fff;">${this.score}</div>
            ${result.isNewBest ? `<div style="font-size:12px; color:var(--gold); font-weight:bold; margin-top:4px;">★ NEW HIGH SCORE! ★</div>` : ''}
            <div style="font-size:12px; color:var(--text-dim); margin-top:6px;">ALL-TIME BEST: <span style="color:var(--gold);">${this.bestScore}</span></div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="btn-over-restart" class="nexus-btn gold" style="width:100%;">
              Restart Match (R)
            </button>
            <button id="btn-over-menu" class="nexus-btn" style="width:100%; border-color:rgba(255,255,255,0.2); color:var(--text-dim);">
              Main Menu
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-over-restart')?.addEventListener('click', () => this.restartGame());
    document.getElementById('btn-over-menu')?.addEventListener('click', () => this.scene.start('MenuScene'));
  }

  restartGame() {
    const overlay = document.getElementById('ui-overlay');
    if (overlay) overlay.innerHTML = '';
    this.score = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.tickMs = GAME_RULES.CLASSIC_START_TICK_MS;
    this.lastTickTime = 0;

    const valScore = document.getElementById('val-score');
    if (valScore) valScore.innerText = '0';

    this.initSnake();
    this.spawnFood();
  }
}

