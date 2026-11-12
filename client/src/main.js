/**
 * Snake Nexus — Main Client Application Entry Point
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ClassicScene } from './scenes/ClassicScene.js';
import { Battle2DScene } from './scenes/Battle2DScene.js';
import { CubeLobbyScene } from './scenes/CubeLobbyScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-container',
  width: 1280,
  height: 768,
  backgroundColor: '#0a0c14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    MenuScene,
    ClassicScene,
    Battle2DScene,
    CubeLobbyScene
  ]
};

// Initialize Phaser Game instance
window.addEventListener('DOMContentLoaded', () => {
  window.nexusGame = new Phaser.Game(config);
});

