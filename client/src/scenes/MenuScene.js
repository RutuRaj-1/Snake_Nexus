/**
 * Snake Nexus — MenuScene
 * Home screen and mode selector.
 */

import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Hide Three.js container and 3D controls if returning from Cube mode
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) threeContainer.style.display = 'none';

    const cubeBar = document.getElementById('cube-controls-bar');
    if (cubeBar) cubeBar.style.display = 'none';

    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer) phaserContainer.style.display = 'flex';

    // Update Top HUD
    const hudBadge = document.getElementById('hud-mode-badge');
    if (hudBadge) hudBadge.innerText = 'SNAKE NEXUS';
    const hudScore = document.getElementById('hud-right');
    if (hudScore) hudScore.style.display = 'none';

    // Build Menu UI Overlay
    this.renderMenuUI();
  }

  renderMenuUI() {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
        <div style="text-align:center; margin-bottom: 24px;">
          <h1 style="font-size: 52px; font-weight: 900; letter-spacing: 4px; color: var(--cyan); text-shadow: 0 0 20px rgba(0,240,255,0.6); margin-bottom: 6px;">
            SNAKE NEXUS
          </h1>
          <p style="font-size: 16px; letter-spacing: 2px; color: var(--text-dim); text-transform: uppercase;">
            Grow. Battle. Conquer Every Dimension.
          </p>
        </div>

        <!-- Mode Selection Cards Grid -->
        <div style="display: flex; gap: 24px; max-width: 1000px; width: 92%; justify-content: center; flex-wrap: wrap;">
          
          <!-- Card 1: Classic Snake -->
          <div class="nexus-modal interactive-panel" style="flex: 1; min-width: 270px; max-width: 310px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(0,240,255,0.4);">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--cyan); background: rgba(0,240,255,0.1); padding: 3px 8px; border-radius: 4px;">MODE 01</span>
                <span style="font-size: 11px; color: var(--text-dim);">1 PLAYER</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Classic Snake</h2>
              <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 18px;">
                Standard single-player arena. Dynamic speed scaling, wall and self-collision physics, and score persistence.
              </p>
            </div>
            <button id="btn-play-classic" class="nexus-btn" style="width: 100%;">
              Play Classic
            </button>
          </div>

          <!-- Card 2: 2D Battle Arena -->
          <div class="nexus-modal interactive-panel" style="flex: 1; min-width: 270px; max-width: 310px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(255,0,127,0.4);">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--magenta); background: rgba(255,0,127,0.1); padding: 3px 8px; border-radius: 4px;">MODE 02</span>
                <span style="font-size: 11px; color: var(--text-dim);">4 PLAYERS</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">2D Battle Arena</h2>
              <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 18px;">
                Four snakes clash! Size-based combat rules, kill bonuses, live ranking, and paired portal gates.
              </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button id="btn-play-battle-local" class="nexus-btn magenta" style="width: 100%;">
                Local 4-Player Battle
              </button>
              <button id="btn-play-battle-online" class="nexus-btn" style="width: 100%; font-size: 12px;">
                Online Multiplayer Room
              </button>
            </div>
          </div>

          <!-- Card 3: 3D Cube Conquest -->
          <div class="nexus-modal interactive-panel" style="flex: 1; min-width: 270px; max-width: 310px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(255,234,0,0.4);">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--gold); background: rgba(255,234,0,0.1); padding: 3px 8px; border-radius: 4px;">MODE 03</span>
                <span style="font-size: 11px; color: var(--text-dim);">UP TO 24 PLAYERS</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">3D Cube Conquest</h2>
              <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 18px;">
                Six connected cube faces. Stage 1 face battles crown 6 champions; Stage 2 enables cross-face 3D edge traversal!
              </p>
            </div>
            <button id="btn-play-cube" class="nexus-btn gold" style="width: 100%;">
              Enter 3D Cube Conquest
            </button>
          </div>

        </div>

        <!-- Instructions Footer -->
        <div class="interactive-panel" style="margin-top: 24px; font-size: 13px; color: var(--text-dim); text-align: center;">
          Controls: <span style="color:var(--cyan); font-weight:600;">Arrow Keys</span> or <span style="color:var(--cyan); font-weight:600;">W A S D</span> to Steer | <span style="color:var(--cyan); font-weight:600;">Space</span> to Pause
        </div>
      </div>
    `;

    // Hook buttons
    document.getElementById('btn-play-classic')?.addEventListener('click', () => {
      window.__playNexusSfx?.('turn');
      overlay.innerHTML = '';
      this.scene.start('ClassicScene');
    });

    document.getElementById('btn-play-battle-local')?.addEventListener('click', () => {
      window.__playNexusSfx?.('turn');
      overlay.innerHTML = '';
      this.scene.start('Battle2DScene', { isLocalMultiplayer: true });
    });

    document.getElementById('btn-play-battle-online')?.addEventListener('click', () => {
      window.__playNexusSfx?.('turn');
      this.showRoomModal('BATTLE_2D');
    });

    document.getElementById('btn-play-cube')?.addEventListener('click', () => {
      window.__playNexusSfx?.('turn');
      this.showRoomModal('CUBE_CONQUEST');
    });
  }

  showRoomModal(mode) {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const modeTitle = mode === 'CUBE_CONQUEST' ? '3D Cube Conquest Lobby' : '2D Battle Arena Online';

    overlay.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%;">
        <div class="nexus-modal interactive-panel" style="width: 420px; text-align: center;">
          <h2 style="font-size: 22px; color: var(--cyan); margin-bottom: 6px;">${modeTitle}</h2>
          <p style="font-size: 13px; color: var(--text-dim); margin-bottom: 20px;">
            Enter pilot callsign to host or join an authoritative match.
          </p>

          <div style="margin-bottom: 16px; text-align: left;">
            <label style="font-size: 12px; color: var(--text-dim); display:block; margin-bottom: 4px;">PILOT CALLSIGN</label>
            <input id="input-player-name" type="text" value="Pilot" maxlength="14" 
              style="width: 100%; padding: 8px 12px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-neon); border-radius: 6px; color: #fff; font-size: 14px; outline: none;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="btn-modal-create" class="nexus-btn" style="width: 100%;">
              Create New Match Room
            </button>

            <div style="display:flex; align-items:center; gap: 10px; margin: 6px 0;">
              <hr style="flex:1; border:none; border-top: 1px solid rgba(255,255,255,0.1);" />
              <span style="font-size: 11px; color: var(--text-dim);">OR JOIN EXISTING</span>
              <hr style="flex:1; border:none; border-top: 1px solid rgba(255,255,255,0.1);" />
            </div>

            <div style="display: flex; gap: 8px;">
              <input id="input-room-code" type="text" placeholder="ROOM CODE" maxlength="6" 
                style="flex: 1; text-transform: uppercase; padding: 8px 12px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-neon); border-radius: 6px; color: #fff; font-size: 14px; text-align:center; letter-spacing: 2px; outline: none;" />
              <button id="btn-modal-join" class="nexus-btn magenta">
                Join
              </button>
            </div>

            <button id="btn-modal-cancel" class="nexus-btn" style="background: transparent; border-color: rgba(255,255,255,0.2); color: var(--text-dim); margin-top: 8px;">
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-modal-cancel')?.addEventListener('click', () => {
      this.renderMenuUI();
    });

    document.getElementById('btn-modal-create')?.addEventListener('click', () => {
      const name = document.getElementById('input-player-name')?.value || 'Pilot';
      overlay.innerHTML = '';
      if (mode === 'CUBE_CONQUEST') {
        this.scene.start('CubeLobbyScene', { isHost: true, mode, playerName: name });
      } else {
        this.scene.start('Battle2DScene', { isOnline: true, isHost: true, mode, playerName: name });
      }
    });

    document.getElementById('btn-modal-join')?.addEventListener('click', () => {
      const name = document.getElementById('input-player-name')?.value || 'Pilot';
      const code = document.getElementById('input-room-code')?.value?.trim().toUpperCase();
      if (!code) return;
      overlay.innerHTML = '';
      if (mode === 'CUBE_CONQUEST') {
        this.scene.start('CubeLobbyScene', { isHost: false, mode, playerName: name, roomCode: code });
      } else {
        this.scene.start('Battle2DScene', { isOnline: true, isHost: false, mode, playerName: name, roomCode: code });
      }
    });
  }
}

