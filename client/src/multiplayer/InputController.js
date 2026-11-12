/**
 * Snake Nexus — Multi-Scheme Input Controller
 */

import { GameRules } from '../../../shared/gameRules.js';

export class InputController {
  constructor(options = {}) {
    this.onDirectionChange = options.onDirectionChange || (() => {});
    this.onLocalPlayerDirection = options.onLocalPlayerDirection || (() => {});
    this.onPauseToggle = options.onPauseToggle || (() => {});
    this.enabled = true;
    this.enableMultiKeySets = options.enableMultiKeySets || false;

    this.keyMap = {
      // Primary / P1
      ArrowUp: { player: 0, dir: 'UP' },
      ArrowDown: { player: 0, dir: 'DOWN' },
      ArrowLeft: { player: 0, dir: 'LEFT' },
      ArrowRight: { player: 0, dir: 'RIGHT' },

      // WASD / P2 (or fallback P1 if multi-set disabled)
      KeyW: { player: 1, dir: 'UP' },
      KeyS: { player: 1, dir: 'DOWN' },
      KeyA: { player: 1, dir: 'LEFT' },
      KeyD: { player: 1, dir: 'RIGHT' },

      // P3: I, J, K, L
      KeyI: { player: 2, dir: 'UP' },
      KeyK: { player: 2, dir: 'DOWN' },
      KeyJ: { player: 2, dir: 'LEFT' },
      KeyL: { player: 2, dir: 'RIGHT' },

      // P4: T, F, G, H
      KeyT: { player: 3, dir: 'UP' },
      KeyG: { player: 3, dir: 'DOWN' },
      KeyF: { player: 3, dir: 'LEFT' },
      KeyH: { player: 3, dir: 'RIGHT' }
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    if (!this.enabled) return;

    if (event.code === 'Space') {
      event.preventDefault();
      this.onPauseToggle();
      return;
    }

    const mapping = this.keyMap[event.code];
    if (!mapping) return;

    // Prevent arrow keys from scrolling the browser window
    if (event.code.startsWith('Arrow')) {
      event.preventDefault();
    }

    if (this.enableMultiKeySets) {
      this.onLocalPlayerDirection(mapping.player, mapping.dir);
    } else {
      // In single-player or online client mode, both Arrows and WASD control the player
      if (mapping.player === 0 || mapping.player === 1) {
        this.onDirectionChange(mapping.dir);
      }
    }
  }

  destroy() {
    this.enabled = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

