/**
 * Snake Nexus — Shared Constants
 */

export const GAME_MODES = {
  CLASSIC: 'CLASSIC',
  BATTLE_2D: 'BATTLE_2D',
  CUBE_CONQUEST: 'CUBE_CONQUEST'
};

export const DIRECTIONS = {
  UP: { x: 0, y: -1, name: 'UP' },
  DOWN: { x: 0, y: 1, name: 'DOWN' },
  LEFT: { x: -1, y: 0, name: 'LEFT' },
  RIGHT: { x: 1, y: 0, name: 'RIGHT' }
};

export const OPPOSITE_DIRECTIONS = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT'
};

export const GRID_CONFIG = {
  CLASSIC: { width: 22, height: 22, cellSize: 28 },
  BATTLE_2D: { width: 24, height: 24, cellSize: 26 },
  CUBE_FACE: { width: 16, height: 16, cellSize: 24 }
};

export const CUBE_FACES = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  TOP: 'TOP',
  BOTTOM: 'BOTTOM'
};

export const CUBE_FACE_LIST = [
  CUBE_FACES.FRONT,
  CUBE_FACES.BACK,
  CUBE_FACES.LEFT,
  CUBE_FACES.RIGHT,
  CUBE_FACES.TOP,
  CUBE_FACES.BOTTOM
];

export const CUBE_FACE_THEMES = {
  FRONT: { name: 'Front Citadel', color: 0x00f0ff, css: '#00f0ff', emissive: 0x003344 },
  BACK: { name: 'Back Fortress', color: 0xff007f, css: '#ff007f', emissive: 0x440022 },
  LEFT: { name: 'Left Bastion', color: 0x39ff14, css: '#39ff14', emissive: 0x113300 },
  RIGHT: { name: 'Right Redoubt', color: 0xffea00, css: '#ffea00', emissive: 0x333300 },
  TOP: { name: 'Apex Zenith', color: 0xb026ff, css: '#b026ff', emissive: 0x2b0044 },
  BOTTOM: { name: 'Chasm Nadir', color: 0xff6600, css: '#ff6600', emissive: 0x441a00 }
};

export const PLAYER_COLORS = [
  { name: 'Cyan Neon', hex: 0x00f0ff, css: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)' },
  { name: 'Magenta Pulse', hex: 0xff007f, css: '#ff007f', glow: 'rgba(255, 0, 127, 0.6)' },
  { name: 'Lime Surge', hex: 0x39ff14, css: '#39ff14', glow: 'rgba(57, 255, 20, 0.6)' },
  { name: 'Solar Flare', hex: 0xffea00, css: '#ffea00', glow: 'rgba(255, 234, 0, 0.6)' }
];

export const MATCH_STATES = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  STAGE_1_QUALIFY: 'STAGE_1_QUALIFY',
  STAGE_TRANSITION: 'STAGE_TRANSITION',
  STAGE_2_FINAL: 'STAGE_2_FINAL',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED'
};

export const GAME_RULES = {
  INITIAL_SNAKE_LENGTH: 4,
  FOOD_SCORE: 10,
  ELIMINATION_SCORE: 50,
  ELIMINATION_GROWTH_BONUS: 1,
  DEFAULT_TICK_RATE_MS: 110,
  CLASSIC_START_TICK_MS: 130,
  CLASSIC_MIN_TICK_MS: 65,
  CLASSIC_SPEEDUP_PER_FOOD: 2,
  RECONNECT_GRACE_PERIOD_MS: 8000,
  COUNTDOWN_SECONDS: 3
};

export const SPAWN_POSITIONS_2D = [
  { x: 3, y: 3, dir: 'RIGHT' },
  { x: 20, y: 3, dir: 'DOWN' },
  { x: 20, y: 20, dir: 'LEFT' },
  { x: 3, y: 20, dir: 'UP' }
];

export const SPAWN_POSITIONS_CUBE_FACE = [
  { x: 2, y: 2, dir: 'RIGHT' },
  { x: 13, y: 2, dir: 'DOWN' },
  { x: 13, y: 13, dir: 'LEFT' },
  { x: 2, y: 13, dir: 'UP' }
];

