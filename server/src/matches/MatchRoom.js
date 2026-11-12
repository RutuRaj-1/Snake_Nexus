/**
 * Snake Nexus — Multiplayer Match Room Manager
 */

import {
  GAME_MODES,
  MATCH_STATES,
  CUBE_FACES,
  CUBE_FACE_LIST,
  GAME_RULES
} from '../../../shared/constants.js';
import { SOCKET_EVENTS } from '../../../shared/events.js';
import { SnakeSimulation } from '../game/SnakeSimulation.js';
import { BotAI } from '../game/BotAI.js';
import { GameLoop } from './GameLoop.js';

export class MatchRoom {
  /**
   * @param {string} roomCode - Unique alphanumeric room identifier
   * @param {string} mode - 'BATTLE_2D' or 'CUBE_CONQUEST'
   * @param {Object} io - Socket.IO server instance
   * @param {Object} options - Match configuration options
   */
  constructor(roomCode, mode = GAME_MODES.BATTLE_2D, io, options = {}) {
    this.roomCode = roomCode;
    this.mode = mode;
    this.io = io;
    this.options = {
      enablePortals: options.enablePortals ?? false,
      tickRateMs: options.tickRateMs ?? GAME_RULES.DEFAULT_TICK_RATE_MS,
      ...options
    };

    this.maxPlayers = mode === GAME_MODES.CUBE_CONQUEST ? 24 : 4;
    this.minPlayersToStart = mode === GAME_MODES.CUBE_CONQUEST ? 1 : 2; // Can fill rest with bots

    this.state = MATCH_STATES.LOBBY;
    this.players = new Map(); // socketId -> player object
    this.disconnectedPlayers = new Map(); // socketId -> { player, timer }
    this.hostSocketId = null;

    this.simulation = null;
    this.gameLoop = null;
    this.rematchVotes = new Set();
  }

  /**
   * Add a player to this match room
   */
  addPlayer(socketId, name = 'Pilot', requestedFace = null) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }
    if (this.state !== MATCH_STATES.LOBBY) {
      return { success: false, error: 'Match already in progress' };
    }

    // Assign slot and face
    let slotIndex = 0;
    let face = CUBE_FACES.FRONT;

    if (this.mode === GAME_MODES.CUBE_CONQUEST) {
      // Find a face with fewer than 4 players
      const faceCounts = {};
      for (const f of CUBE_FACE_LIST) faceCounts[f] = 0;
      for (const p of this.players.values()) {
        faceCounts[p.face] = (faceCounts[p.face] || 0) + 1;
      }

      if (requestedFace && faceCounts[requestedFace] < 4) {
        face = requestedFace;
      } else {
        // Pick the face with lowest player count
        face = CUBE_FACE_LIST.reduce((a, b) => (faceCounts[a] <= faceCounts[b] ? a : b));
      }
      slotIndex = faceCounts[face];
    } else {
      // 2D Battle: slot 0 to 3
      const takenSlots = new Set(Array.from(this.players.values()).map(p => p.slotIndex));
      for (let i = 0; i < 4; i++) {
        if (!takenSlots.has(i)) {
          slotIndex = i;
          break;
        }
      }
    }

    const player = {
      id: socketId,
      socketId,
      name: name.slice(0, 16) || `Player ${slotIndex + 1}`,
      slotIndex,
      face,
      ready: false,
      isBot: false,
      isHost: this.players.size === 0
    };

    if (this.players.size === 0) {
      this.hostSocketId = socketId;
    }

    this.players.set(socketId, player);
    this.broadcastPlayerList();

    return { success: true, player };
  }

  /**
   * Handle player disconnection with grace period
   */
  handleDisconnect(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    if (this.state === MATCH_STATES.LOBBY) {
      // Remove immediately in lobby
      this.players.delete(socketId);
      if (this.hostSocketId === socketId) {
        const remaining = Array.from(this.players.keys());
        this.hostSocketId = remaining[0] || null;
        if (this.hostSocketId) {
          const nextHost = this.players.get(this.hostSocketId);
          if (nextHost) nextHost.isHost = true;
        }
      }
      this.broadcastPlayerList();
    } else {
      // In game: grace period
      const timer = setTimeout(() => {
        this.handleDisconnectExpiry(socketId);
      }, GAME_RULES.RECONNECT_GRACE_PERIOD_MS);

      this.disconnectedPlayers.set(socketId, { player, timer });
    }
  }

  handleDisconnectExpiry(socketId) {
    const entry = this.disconnectedPlayers.get(socketId);
    if (!entry) return;

    this.disconnectedPlayers.delete(socketId);
    this.players.delete(socketId);

    // Eliminate their snake in simulation
    if (this.simulation) {
      const snake = this.simulation.snakes.get(socketId);
      if (snake && snake.alive) {
        snake.alive = false;
        snake.eliminationReason = 'DISCONNECTED';
      }
    }
  }

  /**
   * Reconnect player to their ongoing snake
   */
  handleReconnect(oldSocketId, newSocketId) {
    const entry = this.disconnectedPlayers.get(oldSocketId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.disconnectedPlayers.delete(oldSocketId);

    const player = entry.player;
    player.socketId = newSocketId;
    this.players.set(newSocketId, player);

    if (this.simulation) {
      const snake = this.simulation.snakes.get(oldSocketId);
      if (snake) {
        snake.id = newSocketId;
        this.simulation.snakes.delete(oldSocketId);
        this.simulation.snakes.set(newSocketId, snake);
      }
    }

    return true;
  }

  setPlayerReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (!player || this.state !== MATCH_STATES.LOBBY) return;
    player.ready = Boolean(isReady);
    this.broadcastPlayerList();

    // If all ready and meets minimum, host can start or countdown
  }

  /**
   * Fill empty slots with bots
   */
  fillWithBots() {
    if (this.state !== MATCH_STATES.LOBBY) return;

    const botNames = [
      'CyberViper', 'NeonPython', 'QuantumCobra', 'NanoAnaconda',
      'GridStalker', 'HexHydra', 'VortexSerpent', 'PulseAsp',
      'ByteAdder', 'ZeroKrait', 'GlitchMamba', 'MatrixBasilisk',
      'CircuitTaipan', 'EchoRattler', 'SyncCoral', 'FluxBoa',
      'AeroTitan', 'ChronoGarter', 'ShadowGorgon', 'VectorViper',
      'VoidColubrid', 'SpecterRacer', 'BinaryPython', 'CyberSeraph'
    ];

    if (this.mode === GAME_MODES.CUBE_CONQUEST) {
      // Ensure 4 players on each of the 6 faces
      for (const face of CUBE_FACE_LIST) {
        const playersOnFace = Array.from(this.players.values()).filter(p => p.face === face);
        for (let slot = playersOnFace.length; slot < 4; slot++) {
          const botId = `bot-${face}-${slot}-${Date.now().toString(36)}`;
          const botIndex = this.players.size % botNames.length;
          const botName = `${botNames[botIndex]}`;
          this.players.set(botId, {
            id: botId,
            socketId: botId,
            name: botName,
            slotIndex: slot,
            face,
            ready: true,
            isBot: true,
            isHost: false
          });
        }
      }
    } else {
      // 2D Battle: fill to 4 players
      const takenSlots = new Set(Array.from(this.players.values()).map(p => p.slotIndex));
      for (let slot = 0; slot < 4; slot++) {
        if (!takenSlots.has(slot)) {
          const botId = `bot-2d-${slot}-${Date.now().toString(36)}`;
          const botName = botNames[slot % botNames.length];
          this.players.set(botId, {
            id: botId,
            socketId: botId,
            name: botName,
            slotIndex: slot,
            face: null,
            ready: true,
            isBot: true,
            isHost: false
          });
        }
      }
    }

    this.broadcastPlayerList();
  }

  startCountdown() {
    if (this.state !== MATCH_STATES.LOBBY) return;
    this.state = MATCH_STATES.COUNTDOWN;

    let secondsLeft = GAME_RULES.COUNTDOWN_SECONDS;
    this.io.to(this.roomCode).emit(SOCKET_EVENTS.MATCH_COUNTDOWN, { secondsLeft });

    const countdownTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        this.io.to(this.roomCode).emit(SOCKET_EVENTS.MATCH_COUNTDOWN, { secondsLeft });
      } else {
        clearInterval(countdownTimer);
        this.startMatch();
      }
    }, 1000);
  }

  startMatch() {
    this.state = MATCH_STATES.IN_PROGRESS;
    this.simulation = new SnakeSimulation(this.mode, this.options);

    // Add all snakes to simulation
    for (const player of this.players.values()) {
      this.simulation.addSnake(player);
    }

    this.simulation.spawnInitialFood();

    this.io.to(this.roomCode).emit(SOCKET_EVENTS.MATCH_START, {
      state: this.simulation.getState()
    });

    // Start simulation game loop
    this.gameLoop = new GameLoop(this.options.tickRateMs, (tickNumber) => {
      this.tick(tickNumber);
    });
    this.gameLoop.start();
  }

  tick(tickNumber) {
    if (!this.simulation) return;

    // Run Bot AI for bot players
    for (const snake of this.simulation.snakes.values()) {
      if (snake.alive && snake.isBot) {
        const nextDir = BotAI.getNextDirection(snake, this.simulation);
        this.simulation.setDirection(snake.id, nextDir);
      }
    }

    // Step simulation
    const { events, state } = this.simulation.tick();

    // Broadcast tick state
    this.io.to(this.roomCode).emit(SOCKET_EVENTS.GAME_STATE_TICK, {
      tick: tickNumber,
      events,
      state
    });

    // Check if match ended
    if (this.simulation.stage === MATCH_STATES.FINISHED) {
      this.endMatch();
    }
  }

  endMatch() {
    this.state = MATCH_STATES.FINISHED;
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }

    const results = {
      mode: this.mode,
      stats: Array.from(this.simulation.stats.values()),
      faceChampions: Object.fromEntries(this.simulation.faceChampions)
    };

    this.io.to(this.roomCode).emit(SOCKET_EVENTS.MATCH_END, results);
  }

  handlePlayerInput(socketId, direction) {
    if (!this.simulation || this.state !== MATCH_STATES.IN_PROGRESS) return;
    this.simulation.setDirection(socketId, direction);
  }

  requestRematch(socketId) {
    this.rematchVotes.add(socketId);
    const humanCount = Array.from(this.players.values()).filter(p => !p.isBot).length;
    if (this.rematchVotes.size >= Math.max(1, Math.floor(humanCount / 2))) {
      this.rematchVotes.clear();
      this.state = MATCH_STATES.LOBBY;
      this.startCountdown();
    }
  }

  broadcastPlayerList() {
    const list = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      slotIndex: p.slotIndex,
      face: p.face,
      ready: p.ready,
      isBot: p.isBot,
      isHost: p.isHost
    }));

    this.io.to(this.roomCode).emit(SOCKET_EVENTS.PLAYER_LIST_UPDATE, {
      roomCode: this.roomCode,
      mode: this.mode,
      players: list,
      canStart: list.length >= this.minPlayersToStart
    });
  }

  destroy() {
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
    for (const entry of this.disconnectedPlayers.values()) {
      clearTimeout(entry.timer);
    }
    this.disconnectedPlayers.clear();
    this.players.clear();
  }
}

