/**
 * Snake Nexus — CubeLobbyScene
 * 3D Cube Tournament Lobby & Match Orchestrator.
 */

import Phaser from 'phaser';
import { CubeRenderer } from '../cube/CubeRenderer.js';
import { CubeMatchController } from '../cube/CubeMatchController.js';
import { InputController } from '../multiplayer/InputController.js';
import { socketClient } from '../multiplayer/SocketClient.js';
import {
  GAME_MODES,
  CUBE_FACES,
  CUBE_FACE_LIST,
  CUBE_FACE_THEMES,
  MATCH_STATES
} from '../../../shared/constants.js';
import { SOCKET_EVENTS } from '../../../shared/events.js';

export class CubeLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CubeLobbyScene' });
  }

  init(data) {
    this.isHost = data.isHost || false;
    this.playerName = data.playerName || 'Pilot';
    this.roomCode = data.roomCode || null;
    this.selectedFace = CUBE_FACES.FRONT;
  }

  create() {
    // 1. Switch visibility: Show Three.js container, hide Phaser canvas
    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer) phaserContainer.style.display = 'none';

    const threeContainer = document.getElementById('three-container');
    if (threeContainer) threeContainer.style.display = 'block';

    const cubeBar = document.getElementById('cube-controls-bar');
    if (cubeBar) cubeBar.style.display = 'flex';

    // 2. Instantiate Three.js Cube Renderer
    this.renderer = new THREE_CUBE_HOLDER(threeContainer);
    this.renderer.start();

    // 3. Connect Camera Controls Bar
    this.setupCameraControlsBar();

    // 4. Match Controller
    this.matchController = new CubeMatchController(this.renderer, socketClient, {
      myFace: this.selectedFace
    });

    // 5. Input Controller
    this.inputController = new InputController({
      enableMultiKeySets: false,
      onDirectionChange: (dir) => {
        socketClient.sendInput(dir);
      }
    });

    // 6. Connect or Join Room
    this.initNetworkRoom();

    // Clean up on exit
    this.events.on('shutdown', () => {
      this.cleanup();
    });
  }

  setupCameraControlsBar() {
    const bindBtn = (id, face) => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.renderer?.cubeCamera.focusFace(face);
      });
    };

    bindBtn('btn-cube-reset', 'RESET');
    bindBtn('btn-face-front', 'FRONT');
    bindBtn('btn-face-back', 'BACK');
    bindBtn('btn-face-left', 'LEFT');
    bindBtn('btn-face-right', 'RIGHT');
    bindBtn('btn-face-top', 'TOP');
    bindBtn('btn-face-bottom', 'BOTTOM');

    document.getElementById('btn-cube-rotate')?.addEventListener('click', (e) => {
      const active = this.renderer?.cubeCamera.toggleAutoRotate();
      e.target.classList.toggle('active', active);
    });

    document.getElementById('btn-cube-exit')?.addEventListener('click', () => {
      this.scene.start('MenuScene');
    });
  }

  async initNetworkRoom() {
    try {
      if (this.isHost) {
        const res = await socketClient.createRoom(
          GAME_MODES.CUBE_CONQUEST,
          this.playerName,
          { requestedFace: this.selectedFace }
        );
        this.roomCode = res.roomCode;
      } else {
        const res = await socketClient.joinRoom(
          this.roomCode,
          this.playerName,
          this.selectedFace
        );
        this.roomCode = res.roomCode;
      }

      this.selectedFace = socketClient.player?.face || CUBE_FACES.FRONT;
      this.renderer?.cubeCamera.focusFace(this.selectedFace);

      // Render Lobby UI
      this.renderLobbyUI();

      // Listeners
      socketClient.on(SOCKET_EVENTS.PLAYER_LIST_UPDATE, ({ players, canStart }) => {
        this.updateLobbyPlayerList(players, canStart);
      });

      socketClient.on(SOCKET_EVENTS.MATCH_COUNTDOWN, ({ secondsLeft }) => {
        this.showCountdown(secondsLeft);
      });

      socketClient.on(SOCKET_EVENTS.MATCH_START, ({ state }) => {
        this.onMatchStarted(state);
      });

      socketClient.on(SOCKET_EVENTS.GAME_STATE_TICK, ({ tick, events, state }) => {
        this.matchController.handleTick(state, events);
        this.renderLiveHUD(state);
      });

      socketClient.on(SOCKET_EVENTS.MATCH_END, (results) => {
        this.showVictoryCeremony(results);
      });

    } catch (err) {
      alert(`Room Connection Error: ${err.message}`);
      this.scene.start('MenuScene');
    }
  }

  renderLobbyUI() {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div id="cube-lobby-panel" style="position:absolute; top:20px; left:20px; width:360px;" class="nexus-modal interactive-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h2 style="font-size:20px; color:var(--gold);">3D CUBE TOURNAMENT</h2>
            <div style="font-size:12px; color:var(--text-dim);">ROOM CODE: <b style="color:var(--cyan); letter-spacing:1px;">${this.roomCode}</b></div>
          </div>
          <span style="font-size:11px; background:rgba(255,234,0,0.15); color:var(--gold); padding:3px 8px; border-radius:4px; font-weight:bold;">
            24 SLOTS
          </span>
        </div>

        <p style="font-size:12px; color:var(--text-dim); line-height:1.4; margin-bottom:14px;">
          Six citadel faces clash. Stage 1 face champions advance to the Stage 2 Cube Final with cross-face 3D traversal.
        </p>

        <!-- Face Assignment Badge -->
        <div style="background:rgba(0,0,0,0.4); padding:10px 14px; border-radius:8px; border:1px solid rgba(0,240,255,0.2); margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; color:var(--text-dim);">YOUR ASSIGNED FACE</div>
            <div id="lbl-assigned-face" style="font-size:14px; font-weight:bold; color:${CUBE_FACE_THEMES[this.selectedFace]?.css || '#fff'};">
              ${CUBE_FACE_THEMES[this.selectedFace]?.name || this.selectedFace}
            </div>
          </div>
          <button id="btn-focus-my-face" class="cube-pill-btn" style="font-size:11px;">Focus Face</button>
        </div>

        <!-- Player slots breakdown per face -->
        <div id="cube-slots-container" style="max-height:180px; overflow-y:auto; margin-bottom:14px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
          <div style="color:var(--text-dim);">Connecting roster...</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          ${this.isHost ? `
            <button id="btn-fill-bots" class="nexus-btn magenta" style="width:100%; font-size:12px;">
              ⚡ Fill Empty Slots with AI Bots
            </button>
            <button id="btn-start-cube" class="nexus-btn gold" style="width:100%;">
              Launch Tournament
            </button>
          ` : `
            <button id="btn-ready-toggle" class="nexus-btn" style="width:100%;">
              Set Ready
            </button>
          `}
          <button id="btn-lobby-exit" class="nexus-btn" style="width:100%; border-color:rgba(255,255,255,0.2); color:var(--text-dim); font-size:12px;">
            Leave Match
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-focus-my-face')?.addEventListener('click', () => {
      this.renderer?.cubeCamera.focusFace(this.selectedFace);
    });

    document.getElementById('btn-fill-bots')?.addEventListener('click', () => {
      socketClient.fillBots();
    });

    document.getElementById('btn-start-cube')?.addEventListener('click', () => {
      socketClient.startCountdown();
    });

    document.getElementById('btn-ready-toggle')?.addEventListener('click', (e) => {
      const isReady = e.target.classList.toggle('active');
      e.target.innerText = isReady ? 'Ready! Waiting for Host...' : 'Set Ready';
      socketClient.setReady(isReady);
    });

    document.getElementById('btn-lobby-exit')?.addEventListener('click', () => {
      this.scene.start('MenuScene');
    });
  }

  updateLobbyPlayerList(players, canStart) {
    const container = document.getElementById('cube-slots-container');
    if (!container) return;

    // Group players by face
    const byFace = {};
    for (const f of CUBE_FACE_LIST) byFace[f] = [];
    for (const p of players) {
      if (p.face && byFace[p.face]) {
        byFace[p.face].push(p);
      }
    }

    let html = '';
    for (const face of CUBE_FACE_LIST) {
      const theme = CUBE_FACE_THEMES[face];
      const count = byFace[face].length;
      html += `
        <div style="background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:6px; border-left:3px solid ${theme.css}; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:600; color:#fff;">${theme.name}</span>
          <span style="color:${count === 4 ? 'var(--lime)' : 'var(--text-dim)'}; font-weight:bold;">${count}/4</span>
        </div>
      `;
    }

    container.innerHTML = html;

    const startBtn = document.getElementById('btn-start-cube');
    if (startBtn) {
      startBtn.disabled = !canStart;
      startBtn.style.opacity = canStart ? '1' : '0.5';
    }
  }

  showCountdown(seconds) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    let cd = document.getElementById('cube-countdown-modal');
    if (!cd) {
      cd = document.createElement('div');
      cd.id = 'cube-countdown-modal';
      cd.style.position = 'absolute';
      cd.style.top = '40%';
      cd.style.left = '50%';
      cd.style.transform = 'translate(-50%, -50%)';
      cd.style.textAlign = 'center';
      cd.style.zIndex = '30';
      overlay.appendChild(cd);
    }

    cd.innerHTML = `
      <div style="font-size:72px; font-weight:900; color:var(--cyan); text-shadow:0 0 30px rgba(0,240,255,0.8);">
        ${seconds}
      </div>
      <div style="font-size:16px; font-weight:bold; color:#fff; letter-spacing:2px;">
        COMMENCING 3D TOURNAMENT
      </div>
    `;
  }

  onMatchStarted(state) {
    // Hide lobby and countdown
    document.getElementById('cube-lobby-panel')?.remove();
    document.getElementById('cube-countdown-modal')?.remove();

    // Focus camera onto player's face
    this.renderer?.cubeCamera.focusFace(this.selectedFace);
  }

  renderLiveHUD(state) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay || !state) return;

    let hud = document.getElementById('cube-live-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'cube-live-hud';
      hud.className = 'nexus-modal interactive-panel';
      hud.style.position = 'absolute';
      hud.style.top = '60px';
      hud.style.right = '20px';
      hud.style.width = '240px';
      hud.style.padding = '12px 14px';
      hud.style.fontSize = '12px';
      overlay.appendChild(hud);
    }

    const isFinal = state.stage === MATCH_STATES.STAGE_2_FINAL;
    const stageBadge = isFinal
      ? `<span style="color:var(--gold); font-weight:bold;">★ STAGE 2: CUBE FINAL ★</span>`
      : `<span style="color:var(--cyan); font-weight:bold;">STAGE 1: QUALIFICATIONS</span>`;

    let html = `
      <div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
        ${stageBadge}
      </div>
      <div style="font-size:11px; color:var(--text-dim); margin-bottom:6px;">FACE CHAMPIONS</div>
      <div style="display:flex; flex-direction:column; gap:4px;">
    `;

    for (const face of CUBE_FACE_LIST) {
      const theme = CUBE_FACE_THEMES[face];
      const champId = state.faceChampions?.[face];
      const s = champId ? state.snakes.find(sn => sn.id === champId) : null;

      html += `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:${theme.css}; font-weight:600;">${face}</span>
          <span style="color:${s ? '#fff' : 'var(--text-dim)'};">${s ? s.name : 'In Progress...'}</span>
        </div>
      `;
    }

    html += `</div>`;
    hud.innerHTML = html;
  }

  showVictoryCeremony(results) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const winner = results.stats?.sort((a, b) => b.score - a.score)[0];

    overlay.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%; background:rgba(0,0,0,0.85);">
        <div class="nexus-modal interactive-panel" style="text-align:center; min-width:440px; border-color:var(--gold);">
          <div style="font-size:12px; letter-spacing:2px; color:var(--gold); font-weight:bold; margin-bottom:4px;">
            ★ 3D CUBE TOURNAMENT COMPLETE ★
          </div>
          <h2 style="font-size:36px; font-weight:900; color:#fff; margin-bottom:6px;">
            CUBE CONQUEROR
          </h2>
          <div style="font-size:24px; font-weight:bold; color:var(--cyan); margin-bottom:18px;">
            ${winner ? winner.name : 'Chamber Anomaly'}
          </div>

          <div style="background:rgba(0,0,0,0.5); padding:16px; border-radius:8px; border:1px solid rgba(255,234,0,0.25); margin-bottom:20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
              <span style="color:var(--text-dim);">Citadel Origin:</span>
              <span style="font-weight:bold; color:var(--gold);">${winner?.initialFace || 'Citadel'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
              <span style="color:var(--text-dim);">3D Face Transitions:</span>
              <span style="font-weight:bold; color:var(--cyan);">${winner?.transitions || 0}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
              <span style="color:var(--text-dim);">Opponents Eliminated:</span>
              <span style="font-weight:bold; color:var(--magenta);">${winner?.kills || 0}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
              <span style="color:var(--text-dim);">Energy Pellets Harvested:</span>
              <span style="font-weight:bold; color:var(--lime);">${winner?.foodEaten || 0}</span>
            </div>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;" />
            <div style="display:flex; justify-content:space-between; font-size:15px;">
              <span style="font-weight:bold; color:#fff;">Final Conquest Score:</span>
              <span style="font-weight:bold; color:var(--gold); font-size:18px;">${winner?.score || 0} pts</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="btn-conquest-rematch" class="nexus-btn gold" style="width:100%;">
              Rematch Tournament
            </button>
            <button id="btn-conquest-menu" class="nexus-btn" style="width:100%; border-color:rgba(255,255,255,0.2); color:var(--text-dim);">
              Main Menu
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-conquest-rematch')?.addEventListener('click', () => {
      socketClient.requestRematch();
    });

    document.getElementById('btn-conquest-menu')?.addEventListener('click', () => {
      this.scene.start('MenuScene');
    });
  }

  cleanup() {
    this.renderer?.destroy();
    this.inputController?.destroy();

    const threeContainer = document.getElementById('three-container');
    if (threeContainer) threeContainer.style.display = 'none';

    const cubeBar = document.getElementById('cube-controls-bar');
    if (cubeBar) cubeBar.style.display = 'none';

    const overlay = document.getElementById('ui-overlay');
    if (overlay) overlay.innerHTML = '';

    socketClient.off(SOCKET_EVENTS.PLAYER_LIST_UPDATE);
    socketClient.off(SOCKET_EVENTS.MATCH_COUNTDOWN);
    socketClient.off(SOCKET_EVENTS.MATCH_START);
    socketClient.off(SOCKET_EVENTS.GAME_STATE_TICK);
    socketClient.off(SOCKET_EVENTS.MATCH_END);
  }
}

const THREE_CUBE_HOLDER = CubeRenderer;

