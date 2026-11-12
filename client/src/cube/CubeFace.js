/**
 * Snake Nexus — Dynamic Canvas Texture for Cube Face
 */

import { CUBE_FACE_THEMES, PLAYER_COLORS } from '../../../shared/constants.js';

export class CubeFace {
  /**
   * @param {string} faceName - e.g. 'FRONT', 'BACK', etc.
   * @param {number} gridSize - Grid cell count (e.g. 16)
   * @param {number} resolution - Texture resolution (e.g. 512)
   */
  constructor(faceName, gridSize = 16, resolution = 512) {
    this.faceName = faceName;
    this.gridSize = gridSize;
    this.resolution = resolution;
    this.cellSize = resolution / gridSize;
    this.theme = CUBE_FACE_THEMES[faceName] || { name: faceName, color: 0x00f0ff, css: '#00f0ff' };

    // Offscreen canvas for Three.js CanvasTexture
    this.canvas = document.createElement('canvas');
    this.canvas.width = resolution;
    this.canvas.height = resolution;
    this.ctx = this.canvas.getContext('2d');

    this.isCleared = false;
    this.championName = null;
    this.needsUpdate = true;
  }

  /**
   * Render face state onto offscreen canvas
   * @param {Array<Object>} snakes
   * @param {Array<Object>} foods
   * @param {boolean} isFinalStage
   */
  render(snakes = [], foods = [], isFinalStage = false) {
    const ctx = this.ctx;
    const R = this.resolution;
    const S = this.cellSize;
    const N = this.gridSize;

    // 1. Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, R, R);

    // 2. Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(i * S, 0);
      ctx.lineTo(i * S, R);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * S);
      ctx.lineTo(R, i * S);
      ctx.stroke();
    }

    // 3. Face Header Title Watermark
    ctx.save();
    ctx.fillStyle = this.theme.css;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.35;
    ctx.fillText(`${this.theme.name.toUpperCase()}`, R / 2, 34);
    if (this.isCleared && !isFinalStage) {
      ctx.fillStyle = '#39ff14';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`CHAMPION: ${this.championName || 'QUALIFIED'}`, R / 2, R / 2);
    }
    ctx.restore();

    // 4. Outer Border / Gateway Glow
    ctx.save();
    if (isFinalStage) {
      // Open gateway: pulsing cyan/lime border
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 8;
      ctx.setLineDash([16, 8]);
    } else {
      ctx.strokeStyle = this.theme.css;
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
    }
    ctx.strokeRect(3, 3, R - 6, R - 6);
    ctx.restore();

    // 5. Render Foods on this face
    for (const food of foods) {
      if (!food.face || food.face === this.faceName) {
        const cx = food.x * S + S / 2;
        const cy = food.y * S + S / 2;

        ctx.save();
        // Glow
        ctx.fillStyle = 'rgba(255, 0, 127, 0.35)';
        ctx.beginPath();
        ctx.arc(cx, cy, S * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(cx, cy, S * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, S * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 6. Render Snakes on this face
    for (const snake of snakes) {
      if (!snake.alive) continue;

      const colorDef = PLAYER_COLORS[snake.slotIndex % PLAYER_COLORS.length];
      const headColor = colorDef.css;

      for (let i = 0; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        if (seg.face && seg.face !== this.faceName) continue;

        const sx = seg.x * S;
        const sy = seg.y * S;

        ctx.save();
        if (i === 0) {
          // Head
          ctx.fillStyle = headColor;
          ctx.shadowColor = headColor;
          ctx.shadowBlur = 10;
          this.drawRoundedRect(ctx, sx + 2, sy + 2, S - 4, S - 4, 6);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          this.drawRoundedRect(ctx, sx + 2, sy + 2, S - 4, S - 4, 6);
          ctx.stroke();
        } else {
          // Body
          ctx.fillStyle = headColor;
          ctx.globalAlpha = 0.75;
          this.drawRoundedRect(ctx, sx + 3, sy + 3, S - 6, S - 6, 4);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    this.needsUpdate = true;
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

