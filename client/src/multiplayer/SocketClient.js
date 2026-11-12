/**
 * Snake Nexus — SocketClient Singleton
 */

import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/events.js';

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.currentRoom = null;
    this.player = null;
    this.listeners = new Map();
  }

  connect(serverUrl = 'http://localhost:3000') {
    if (this.socket) return this.socket;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[SocketClient] Connected to server:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('[SocketClient] Disconnected:', reason);
    });

    return this.socket;
  }

  createRoom(mode, playerName, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) this.connect();
      this.socket.emit(SOCKET_EVENTS.ROOM_CREATE, { mode, playerName, options }, (response) => {
        if (response.success) {
          this.currentRoom = response.roomCode;
          this.player = response.player;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  joinRoom(roomCode, playerName, requestedFace = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket) this.connect();
      this.socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomCode, playerName, requestedFace }, (response) => {
        if (response.success) {
          this.currentRoom = response.roomCode;
          this.player = response.player;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  setReady(ready = true) {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.PLAYER_READY, { ready });
  }

  fillBots() {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.FILL_BOTS);
  }

  startCountdown() {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.MATCH_COUNTDOWN);
  }

  sendInput(direction) {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.PLAYER_INPUT, { direction });
  }

  requestRematch() {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.REMATCH_REQUEST);
  }

  on(event, handler) {
    if (!this.socket) this.connect();
    this.socket.on(event, handler);
  }

  off(event, handler) {
    if (!this.socket) return;
    this.socket.off(event, handler);
  }
}

export const socketClient = new SocketClient();

