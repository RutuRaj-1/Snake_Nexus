/**
 * Snake Nexus — Authoritative Multiplayer Game Server
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { MatchManager } from './matches/MatchManager.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    game: 'SNAKE NEXUS',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

const matchManager = new MatchManager(io);
setupSocketHandlers(io, matchManager);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  SNAKE NEXUS — MULTIPLAYER AUTHORITATIVE SERVER`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...');
  server.close(() => process.exit(0));
});

