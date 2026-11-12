/**
 * Snake Nexus — BootScene
 * Generates procedural textures and audio synthesis for zero-asset offline reliability.
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.createProceduralTextures();
    this.initAudioSynthesizer();
    this.scene.start('MenuScene');
  }

  createProceduralTextures() {
    // 1. Grid cell texture (32x32)
    const gCell = this.make.graphics({ x: 0, y: 0, add: false });
    gCell.fillStyle(0x131a29, 0.4);
    gCell.fillRoundedRect(2, 2, 28, 28, 4);
    gCell.lineStyle(1, 0x1e293b, 0.3);
    gCell.strokeRoundedRect(2, 2, 28, 28, 4);
    gCell.generateTexture('cell_bg', 32, 32);

    // 2. Food / Energy Pellet texture (32x32)
    const gFood = this.make.graphics({ x: 0, y: 0, add: false });
    gFood.fillStyle(0xff007f, 0.3);
    gFood.fillCircle(16, 16, 14); // glow
    gFood.fillStyle(0xff0055, 0.7);
    gFood.fillCircle(16, 16, 10);
    gFood.fillStyle(0xffffff, 1);
    gFood.fillCircle(16, 16, 5); // core
    gFood.generateTexture('food', 32, 32);

    // 3. Portal texture (32x32)
    const gPortal = this.make.graphics({ x: 0, y: 0, add: false });
    gPortal.lineStyle(3, 0x00f0ff, 0.9);
    gPortal.strokeCircle(16, 16, 13);
    gPortal.fillStyle(0x00f0ff, 0.3);
    gPortal.fillCircle(16, 16, 10);
    gPortal.generateTexture('portal', 32, 32);

    // 4. Snake Segment Base (32x32)
    const gSeg = this.make.graphics({ x: 0, y: 0, add: false });
    gSeg.fillStyle(0xffffff, 1);
    gSeg.fillRoundedRect(2, 2, 28, 28, 6);
    gSeg.generateTexture('snake_segment', 32, 32);
  }

  initAudioSynthesizer() {
    // Simple WebAudio sound effects
    const ctx = this.sound.context;
    if (!ctx) return;

    window.__playNexusSfx = (type) => {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'eat') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'turn') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
        }
      } catch {
        // Audio synthesis fallback silent
      }
    };
  }
}

