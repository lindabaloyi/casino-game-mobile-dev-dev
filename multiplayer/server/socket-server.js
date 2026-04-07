/**
 * socket-server.js
 * Network layer only — sets up Express + Socket.IO and wires services together.
 * No game logic here. Socket handlers are in socket/handlers/.
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

// Database
const db = require('./db/connection');

// Routes
const { authRoutes, profileRoutes, gameRoutes, friendsRoutes, usersRoutes, statsRoutes } = require('./routes');

// Services
const UnifiedMatchmakingService = require('./services/UnifiedMatchmakingService');
const RoomService = require('./services/RoomService');
const BroadcasterService = require('./services/BroadcasterService');
const GameCoordinatorService = require('./services/GameCoordinatorService');
const GameManager = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');

// Socket handlers
const { attachSocketHandlers } = require('./socket/handlers');

// ── HTTP + Socket.IO setup ──
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;

// ── Service instances ──
let gameManager, actionRouter, unifiedMatchmaking, roomService, broadcaster, coordinator;

// ── Connection handling ──
io.on('connection', socket => {
  const services = { io, gameManager, roomService, unifiedMatchmaking, broadcaster, coordinator };
  attachSocketHandlers(socket, services);
});

// ── Server control ──
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const entry of (interfaces[name] || [])) {
      if (!entry.internal && entry.family === 'IPv4') return entry.address;
    }
  }
  return null;
}

async function startServer() {
  try { await db.connect(); console.log('[Server] ✅ MongoDB connected'); }
  catch (e) { console.error('[Server] ❌ MongoDB error:', e.message); }

  gameManager = new GameManager();
  actionRouter = new ActionRouter(gameManager);
  unifiedMatchmaking = new UnifiedMatchmakingService(gameManager, io);
  roomService = new RoomService(gameManager, unifiedMatchmaking, null, io);
  broadcaster = new BroadcasterService(unifiedMatchmaking, gameManager, io);
  coordinator = new GameCoordinatorService(gameManager, actionRouter, unifiedMatchmaking, broadcaster, io);
  roomService.broadcaster = broadcaster; // Wire broadcaster to roomService

  server.listen(PORT, '0.0.0.0', () => {
    const lanIp = getLocalIPAddress();
    console.log(`[Server] ═══════════════════════════════════════`);
    console.log(`[Server] 🎮 Casino Game Server Started!`);
    console.log(`[Server] Local: http://localhost:${PORT}`);
    if (lanIp) { console.log(`[Server] LAN: http://${lanIp}:${PORT}`); }
    console.log(`[Server] ═══════════════════════════════════════`);
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() { 
  if (unifiedMatchmaking) {
    unifiedMatchmaking.shutdown();
  }
  if (server.listening) server.close(); 
}
function getIO() { return io; }

module.exports = { startServer, stopServer, getIO };