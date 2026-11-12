/**
 * Snake Nexus — 3D Cube Match Controller
 * Manages Stage 1 face qualification and Stage 2 final cube edge transitions.
 */

import { CUBE_FACE_LIST, MATCH_STATES } from '../../../shared/constants.js';

export class CubeMatchController {
  constructor(renderer, socketClient, options = {}) {
    this.renderer = renderer;
    this.socketClient = socketClient;
    this.myFace = options.myFace || 'FRONT';
    this.stage = MATCH_STATES.STAGE_1_QUALIFY;
    this.champions = new Map();
  }

  handleTick(state, events) {
    if (!state) return;
    this.stage = state.stage;

    const isFinal = this.stage === MATCH_STATES.STAGE_2_FINAL;

    // Render all 6 faces
    for (const faceName of CUBE_FACE_LIST) {
      const faceSnakes = state.snakes.filter(s => {
        if (isFinal) {
          // In final stage, a snake may have segments on this face
          return s.segments.some(seg => seg.face === faceName);
        }
        return s.face === faceName;
      });

      const faceFoods = state.foods.filter(f => f.face === faceName);

      this.renderer.updateFace(faceName, faceSnakes, faceFoods, isFinal);
    }

    // Process events (face qualifications, stage transition)
    for (const ev of events || []) {
      if (ev.type === 'FACE_CHAMPION_QUALIFIED') {
        const faceObj = this.renderer.faces[ev.face];
        if (faceObj) {
          faceObj.isCleared = true;
          faceObj.championName = ev.championName;
        }
      }
    }
  }
}

