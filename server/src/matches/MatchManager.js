/**
 * Snake Nexus — Matchmaking & Room Management Hub
 */

import { MatchRoom } from './MatchRoom.js';
import { GAME_MODES } from '../../../shared/constants.js';

export class MatchManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> MatchRoom
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(mode = GAME_MODES.BATTLE_2D, options = {}) {
    const roomCode = this.generateRoomCode();
    const room = new MatchRoom(roomCode, mode, this.io, options);
    this.rooms.set(roomCode, room);
    console.log(`[MatchManager] Room created: ${roomCode} (Mode: ${mode})`);
    return room;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode?.toUpperCase());
  }

  deleteRoom(roomCode) {
    const code = roomCode?.toUpperCase();
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
      console.log(`[MatchManager] Room destroyed: ${code}`);
    }
  }

  cleanEmptyRooms() {
    for (const [code, room] of this.rooms.entries()) {
      const activeCount = room.players.size + room.disconnectedPlayers.size;
      if (activeCount === 0) {
        this.deleteRoom(code);
      }
    }
  }
}

