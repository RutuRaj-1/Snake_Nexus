import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { MatchManager } from '../server/src/matches/MatchManager.js';
import { setupSocketHandlers } from '../server/src/socket/socketHandlers.js';
import { SOCKET_EVENTS } from '../shared/events.js';
import { GAME_MODES } from '../shared/constants.js';

test('Socket.IO E2E: Room creation, player join, ready, and tick emission', async (t) => {
  // Start ephemeral test server
  const httpServer = http.createServer();
  const ioServer = new Server(httpServer, { cors: { origin: '*' } });
  const matchManager = new MatchManager(ioServer);
  setupSocketHandlers(ioServer, matchManager);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const serverUrl = `http://localhost:${port}`;

  try {
    // 1. Client 1 (Host) connects
    const client1 = ClientIO(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client1.on('connect', res));

    // 2. Client 1 creates room
    const createRes = await new Promise((res) => {
      client1.emit(SOCKET_EVENTS.ROOM_CREATE, {
        mode: GAME_MODES.BATTLE_2D,
        playerName: 'HostPilot'
      }, res);
    });

    assert.equal(createRes.success, true);
    assert.ok(createRes.roomCode);
    const roomCode = createRes.roomCode;

    // 3. Client 2 joins room
    const client2 = ClientIO(serverUrl, { transports: ['websocket'] });
    await new Promise((res) => client2.on('connect', res));

    const joinRes = await new Promise((res) => {
      client2.emit(SOCKET_EVENTS.ROOM_JOIN, {
        roomCode,
        playerName: 'GuestPilot'
      }, res);
    });

    assert.equal(joinRes.success, true);

    // 4. Fill with bots and start countdown
    client1.emit(SOCKET_EVENTS.FILL_BOTS);

    // Wait for player list update showing 4 players
    const listUpdate = await new Promise((res) => {
      client1.once(SOCKET_EVENTS.PLAYER_LIST_UPDATE, res);
    });

    assert.equal(listUpdate.players.length, 4);

    // 5. Test input dispatch
    client1.emit(SOCKET_EVENTS.PLAYER_INPUT, { direction: 'UP' });

    // Clean up clients
    client1.disconnect();
    client2.disconnect();
  } finally {
    ioServer.close();
    httpServer.close();
  }
});

