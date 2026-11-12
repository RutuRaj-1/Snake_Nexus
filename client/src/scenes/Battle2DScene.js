/**
 * Snake Nexus — Battle2DScene
 * 4-Player competitive 2D arena with size-based combat, portals, and local/online support.
 */

import Phaser from 'phaser';
import {
  GRID_CONFIG,
  PLAYER_COLORS,
  GAME_RULES,
  GAME_MODES
} from '../../../shared/constants.js';
import { SOCKET_EVENTS } from '../../../shared/events.js';
import { SnakeSimulation } from '../../../server/src/game/SnakeSimulation.js';
import { socketClient } from '../multiplayer/SocketClient.js';
import { InputController } from '../multiplayer/InputController.js';

export class Battle2DScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Battle2DScene' });
  }

  init(data) {
    this.isLocalMultiplayer = data.isLocalMultiplayer || false;
    this.isOnline = data.isOnline || false;
    this.isHost = data.isHost || false;
    this.playerName = data.playerName || 'Pilot';
    this.roomCode = data.roomCode || null;
  }

  create() {
    this.gridWidth = GRID_CONFIG.BATTLE_2D.width;
    this.gridHeight = GRID_CONFIG.BATTLE_2D.height;
    this.cellSize = GRID_CONFIG.BATTLE_2D.cellSize;

    const arenaPixelW = this.gridWidth * this.cellSize;
    const arenaPixelH = this.gridHeight * this.cellSize;
    this.arenaX = Math.floor((this.scale.width - arenaPixelW) / 2);
    this.arenaY = Math.floor((this.scale.height - arenaPixelH) / 2) + 20;

    // Graphics
    this.gridGraphics = this.add.graphics();
    this.portalGraphics = this.add.graphics();
    this.foodGraphics = this.add.graphics();
    this.snakeGraphics = this.add.graphics();

    this.drawArenaGrid();

    // Top HUD
    const hudBadge = document.getElementById('hud-mode-badge');
    if (hudBadge) {
      hudBadge.innerText = this.isLocalMultiplayer ? '2D BATTLE (LOCAL 4P)' : `2D BATTLE ONLINE [${this.roomCode || 'CONNECTING'}]`;
    }
    const hudScore = document.getElementById('hud-right');
    if (hudScore) hudScore.style.display = 'none';

    if (this.isLocalMultiplayer) {
      this.initLocalMatch();
    } else {
      this.initOnlineMatch();
    }

    this.events.on('shutdown', () => {
      this.inputController?.destroy();
      const overlay = document.getElementById('ui-overlay');
      if (overlay) overlay.innerHTML = '';
      if (this.isOnline) {
        socketClient.off(SOCKET_EVENTS.GAME_STATE_TICK);
        socketClient.off(SOCKET_EVENTS.MATCH_END);
      }
    });
  }

  drawArenaGrid() {
    this.gridGraphics.clear();

    // Border
    this.gridGraphics.lineStyle(3, 0xff007f, 0.8);
    this.gridGraphics.strokeRoundedRect(
      this.arenaX - 4,
      this.arenaY - 4,
      this.gridWidth * this.cellSize + 8,
      this.gridHeight * this.cellSize + 8,
      8
    );

    // Background
    this.gridGraphics.fillStyle(0x0c101d, 0.95);
    this.gridGraphics.fillRoundedRect(
      this.arenaX,
      this.arenaY,
      this.gridWidth * this.cellSize,
      this.gridHeight * this.cellSize,
      6
    );

    // Subtle grid lines
    this.gridGraphics.lineStyle(1, 0x1e293b, 0.35);
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

  initLocalMatch() {
    this.simulation = new SnakeSimulation(GAME_MODES.BATTLE_2D, { enablePortals: true });

    // Add 4 players
    const names = ['P1 (Arrows)', 'P2 (WASD)', 'P3 (IJKL)', 'P4 (TFGH)'];
    this.localPlayerIds = [];

    for (let i = 0; i < 4; i++) {
      const id = `local-p${i}`;
      this.localPlayerIds.push(id);
      this.simulation.addSnake({
        id,
        name: names[i],
        slotIndex: i,
        face: null,
        isBot: false
      });
    }

    this.simulation.spawnInitialFood();

    // Input Controller with 4 multi-key sets
    this.inputController = new InputController({
      enableMultiKeySets: true,
      onLocalPlayerDirection: (playerIndex, dir) => {
        const id = this.localPlayerIds[playerIndex];
        if (id) {
          this.simulation.setDirection(id, dir);
        }
      }
    });

    this.lastTickTime = 0;
    this.tickMs = GAME_RULES.DEFAULT_TICK_RATE_MS;
    this.isMatchFinished = false;

    this.renderScoreboard(this.simulation.getState());
  }

  async initOnlineMatch() {
    try {
      if (this.isHost) {
        const res = await socketClient.createRoom(GAME_MODES.BATTLE_2D, this.playerName, { enablePortals: true });
        this.roomCode = res.roomCode;
        socketClient.fillBots(); // Fill remaining slots with bots
        socketClient.startCountdown();
      } else {
        const res = await socketClient.joinRoom(this.roomCode, this.playerName);
        this.roomCode = res.roomCode;
        socketClient.setReady(true);
      }

      const hudBadge = document.getElementById('hud-mode-badge');
      if (hudBadge) hudBadge.innerText = `2D BATTLE ONLINE [${this.roomCode}]`;

      // Input controller for online client (Arrows + WASD)
      this.inputController = new InputController({
        enableMultiKeySets: false,
        onDirectionChange: (dir) => {
          socketClient.sendInput(dir);
        }
      });

      // Socket event listeners
      socketClient.on(SOCKET_EVENTS.GAME_STATE_TICK, ({ tick, events, state }) => {
        this.latestState = state;
        this.renderState(state);
        this.renderScoreboard(state);
      });

      socketClient.on(SOCKET_EVENTS.MATCH_END, (results) => {
        this.showMatchResults(results);
      });
    } catch (err) {
      alert(`Failed to connect: ${err.message}`);
      this.scene.start('MenuScene');
    }
  }

  update(time) {
    if (this.isLocalMultiplayer && !this.isMatchFinished) {
      if (time - this.lastTickTime >= this.tickMs) {
        this.lastTickTime = time;
        const { events, state } = this.simulation.tick();
        this.renderState(state);
        this.renderScoreboard(state);

        if (this.simulation.stage === 'FINISHED') {
          this.isMatchFinished = true;
          const winner = Array.from(this.simulation.snakes.values()).find(s => s.alive);
          this.showMatchResults({
            stats: Array.from(this.simulation.stats.values()),
            winner: winner ? { name: winner.name, score: winner.score } : null
          });
        }
      }
    }
  }

  renderState(state) {
    if (!state) return;

    // 1. Render Portals
    this.portalGraphics.clear();
    if (state.portals) {
      for (const p of state.portals) {
        const px = this.arenaX + p.x * this.cellSize + this.cellSize / 2;
        const py = this.arenaY + p.y * this.cellSize + this.cellSize / 2;
        this.portalGraphics.lineStyle(2, 0x00f0ff, 0.8);
        this.portalGraphics.strokeCircle(px, py, this.cellSize / 2 - 2);
        this.portalGraphics.fillStyle(0x00f0ff, 0.25);
        this.portalGraphics.fillCircle(px, py, this.cellSize / 2 - 5);
      }
    }

    // 2. Render Foods
    this.foodGraphics.clear();
    for (const food of state.foods) {
      const fx = this.arenaX + food.x * this.cellSize + this.cellSize / 2;
      const fy = this.arenaY + food.y * this.cellSize + this.cellSize / 2;
      this.foodGraphics.fillStyle(0xff007f, 0.4);
      this.foodGraphics.fillCircle(fx, fy, this.cellSize / 2);
      this.foodGraphics.fillStyle(0xff0055, 0.85);
      this.foodGraphics.fillCircle(fx, fy, this.cellSize / 2 - 3);
      this.foodGraphics.fillStyle(0xffffff, 1);
      this.foodGraphics.fillCircle(fx, fy, 3);
    }

    // 3. Render Snakes
    this.snakeGraphics.clear();
    for (const snake of state.snakes) {
      if (!snake.alive) continue;

      const colorDef = PLAYER_COLORS[snake.slotIndex % PLAYER_COLORS.length];
      const headColor = colorDef.hex;

      for (let i = 0; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        const sx = this.arenaX + seg.x * this.cellSize;
        const sy = this.arenaY + seg.y * this.cellSize;

        if (i === 0) {
          // Head
          this.snakeGraphics.fillStyle(headColor, 1);
          this.snakeGraphics.fillRoundedRect(sx + 2, sy + 2, this.cellSize - 4, this.cellSize - 4, 6);
          this.snakeGraphics.lineStyle(2, 0xffffff, 0.9);
          this.snakeGraphics.strokeRoundedRect(sx + 2, sy + 2, this.cellSize - 4, this.cellSize - 4, 6);
        } else {
          // Body
          this.snakeGraphics.fillStyle(headColor, 0.7);
          this.snakeGraphics.fillRoundedRect(sx + 3, sy + 3, this.cellSize - 6, this.cellSize - 6, 4);
        }
      }
    }
  }

  renderScoreboard(state) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay || !state) return;

    let sb = document.getElementById('battle-live-scoreboard');
    if (!sb) {
      sb = document.createElement('div');
      sb.id = 'battle-live-scoreboard';
      sb.className = 'nexus-modal interactive-panel';
      sb.style.position = 'absolute';
      sb.style.top = '70px';
      sb.style.right = '20px';
      sb.style.minWidth = '220px';
      sb.style.padding = '12px 16px';
      overlay.appendChild(sb);
    }

    const sorted = [...state.snakes].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.score - a.score;
    });

    let html = `
      <div style="font-size:12px; font-weight:700; color:var(--text-dim); margin-bottom:8px; letter-spacing:1px;">
        LIVE COMBATANTS
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
    `;

    for (const s of sorted) {
      const colorDef = PLAYER_COLORS[s.slotIndex % PLAYER_COLORS.length];
      const statusBadge = s.alive
        ? `<span style="color:var(--lime); font-size:10px; font-weight:700;">ALIVE</span>`
        : `<span style="color:var(--text-dim); font-size:10px;">ELIMINATED</span>`;

      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; opacity:${s.alive ? '1' : '0.45'};">
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:10px; height:10px; border-radius:2px; background:${colorDef.css};"></div>
            <span style="font-size:12px; font-weight:600; color:#fff;">${s.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:12px; font-weight:bold; color:var(--cyan);">${s.score}</span>
            ${statusBadge}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    sb.innerHTML = html;
  }

  showMatchResults(results) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const winner = results.winner || (results.stats?.length ? results.stats.sort((a, b) => b.score - a.score)[0] : null);

    overlay.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%; background:rgba(0,0,0,0.8);">
        <div class="nexus-modal interactive-panel" style="text-align:center; min-width:380px;">
          <h2 style="font-size:32px; font-weight:800; color:var(--gold); margin-bottom:6px;">ARENA CONQUERED</h2>
          <p style="font-size:14px; color:var(--text-dim); margin-bottom:20px;">
            Winner: <b style="color:var(--cyan); font-size:16px;">${winner ? winner.name : 'Stalemate'}</b>
          </p>

          <div style="background:rgba(0,0,0,0.4); border-radius:8px; padding:12px; margin-bottom:20px; text-align:left;">
            <div style="font-size:12px; color:var(--text-dim); margin-bottom:8px; font-weight:bold;">FINAL STANDINGS</div>
            ${(results.stats || []).map((s, idx) => `
              <div style="display:flex; justify-content:space-between; font-size:13px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>#${idx + 1} <b>${s.name}</b> (${s.kills || 0} Kills, ${s.foodEaten || 0} Pellets)</span>
                <span style="color:var(--gold); font-weight:bold;">${s.score} pts</span>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="btn-results-rematch" class="nexus-btn gold" style="width:100%;">
              Rematch Arena
            </button>
            <button id="btn-results-menu" class="nexus-btn" style="width:100%; border-color:rgba(255,255,255,0.2); color:var(--text-dim);">
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-results-rematch')?.addEventListener('click', () => {
      if (this.isLocalMultiplayer) {
        overlay.innerHTML = '';
        this.scene.restart({ isLocalMultiplayer: true });
      } else {
        socketClient.requestRematch();
      }
    });

    document.getElementById('btn-results-menu')?.addEventListener('click', () => {
      this.scene.start('MenuScene');
    });
  }
}

