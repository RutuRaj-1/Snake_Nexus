/**
 * Snake Nexus — Socket Event Handlers & Input Validator
 */

import { SOCKET_EVENTS } from '../../../shared/events.js';
import { GAME_MODES } from '../../../shared/constants.js';

export function setupSocketHandlers(io, matchManager) {
  io.on('connection', (socket) => {
    let currentRoomCode = null;

    console.log(`[Socket] Client connected: ${socket.id}`);

    // Create a new match room
    socket.on(SOCKET_EVENTS.ROOM_CREATE, ({ mode = GAME_MODES.BATTLE_2D, playerName = 'Pilot', options = {} } = {}, callback) => {
      try {
        const room = matchManager.createRoom(mode, options);
        currentRoomCode = room.roomCode;
        socket.join(room.roomCode);

        const joinResult = room.addPlayer(socket.id, playerName);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: room.roomCode,
            player: joinResult.player,
            mode: room.mode
          });
        }
      } catch (err) {
        console.error('ROOM_CREATE error:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Join existing room by code
    socket.on(SOCKET_EVENTS.ROOM_JOIN, ({ roomCode, playerName = 'Pilot', requestedFace = null } = {}, callback) => {
      try {
        const code = roomCode?.toUpperCase();
        const room = matchManager.getRoom(code);

        if (!room) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Room not found' });
          }
          return;
        }

        const joinResult = room.addPlayer(socket.id, playerName, requestedFace);
        if (!joinResult.success) {
          if (typeof callback === 'function') {
            callback({ success: false, error: joinResult.error });
          }
          return;
        }

        currentRoomCode = room.roomCode;
        socket.join(room.roomCode);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: room.roomCode,
            player: joinResult.player,
            mode: room.mode
          });
        }
      } catch (err) {
        console.error('ROOM_JOIN error:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Set player ready
    socket.on(SOCKET_EVENTS.PLAYER_READY, ({ ready } = {}) => {
      if (!currentRoomCode) return;
      const room = matchManager.getRoom(currentRoomCode);
      if (room) {
        room.setPlayerReady(socket.id, ready);
      }
    });

    // Host fills empty slots with bots
    socket.on(SOCKET_EVENTS.FILL_BOTS, () => {
      if (!currentRoomCode) return;
      const room = matchManager.getRoom(currentRoomCode);
      if (room && room.hostSocketId === socket.id) {
        room.fillWithBots();
      }
    });

    // Host starts match countdown
    socket.on(SOCKET_EVENTS.MATCH_COUNTDOWN, () => {
      if (!currentRoomCode) return;
      const room = matchManager.getRoom(currentRoomCode);
      if (room && room.hostSocketId === socket.id) {
        room.startCountdown();
      }
    });

    // Authoritative player direction input
    socket.on(SOCKET_EVENTS.PLAYER_INPUT, ({ direction } = {}) => {
      if (!currentRoomCode || !direction) return;
      const room = matchManager.getRoom(currentRoomCode);
      if (room) {
        room.handlePlayerInput(socket.id, direction);
      }
    });

    // Rematch vote
    socket.on(SOCKET_EVENTS.REMATCH_REQUEST, () => {
      if (!currentRoomCode) return;
      const room = matchManager.getRoom(currentRoomCode);
      if (room) {
        room.requestRematch(socket.id);
      }
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
      if (currentRoomCode) {
        const room = matchManager.getRoom(currentRoomCode);
        if (room) {
          room.handleDisconnect(socket.id);
          matchManager.cleanEmptyRooms();
        }
      }
    });
  });
}

