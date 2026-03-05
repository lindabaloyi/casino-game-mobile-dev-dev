/**
 * socket-server.js
 * Network layer only — sets up Express + Socket.IO and wires services together.
 * No game logic here.
 */

const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const MatchmakingService    = require('./services/MatchmakingService');
const PartyMatchmakingService = require('./services/PartyMatchmakingService');
const BroadcasterService    = require('./services/BroadcasterService');
const GameCoordinatorService = require('./services/GameCoordinatorService');
const GameManager  = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');

// ── HTTP + Socket.IO setup ────────────────────────────────────────────────────

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// ── Service instances (populated in startServer) ──────────────────────────────

let gameManager;
let actionRouter;
let matchmaking;
let partyMatchmaking;
let broadcaster;
let coordinator;

// ── Connection handling ───────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log(`[Server] Connected: ${socket.id}`);

  // ── Matchmaking: add player to queue; start game if two are waiting ──
  const gameResult = matchmaking.addToQueue(socket);
  if (gameResult) {
    broadcaster.broadcastGameStart(gameResult);
  }

  // ── Party Matchmaking: add player to party queue; start 4-player game when ready ──
  socket.on('join-party-queue', () => {
    console.log(`[Server] ${socket.id} joining party queue`);
    const partyResult = partyMatchmaking.addToPartyQueue(socket);
    if (partyResult) {
      broadcaster.broadcastPartyGameStart(partyResult);
    } else {
      // Notify player they're in waiting
      socket.emit('party-waiting', {
        playersJoined: partyMatchmaking.getWaitingPartyPlayersCount()
      });
    }
  });

  // ── Game events ──────────────────────────────────────────────────────
  socket.on('game-action', data => coordinator.handleGameAction(socket, data));
  socket.on('start-next-round', () => coordinator.handleStartNextRound(socket));

  // ── Drag events (for real-time shared state) ────────────────────────────
  socket.on('drag-start', data => coordinator.handleDragStart(socket, data));
  socket.on('drag-move', data => coordinator.handleDragMove(socket, data));
  socket.on('drag-end', data => coordinator.handleDragEnd(socket, data));

  // ── State sync (client can request the current state at any time) ────
  socket.on('request-sync', () => {
    // Check regular matchmaking first
    let gameId = matchmaking.getGameId(socket.id);
    
    // If not in regular game, check party matchmaking
    if (!gameId) {
      gameId = partyMatchmaking.getPartyGameId(socket.id);
    }
    
    if (!gameId) { socket.emit('error', { message: 'Not in a game' }); return; }
    const state = gameManager.getGameState(gameId);
    if (!state)  { socket.emit('error', { message: 'Game not found' }); return; }
    socket.emit('game-state-sync', { gameState: state, serverTime: Date.now() });
  });

  // ── Disconnect ───────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Server] Disconnected: ${socket.id}`);
    
    // Handle regular matchmaking disconnect
    const result = matchmaking.handleDisconnection(socket);
    if (result) {
      broadcaster.broadcastDisconnection(result.gameId, socket.id);
      if (result.remainingSockets.length < 1) {
        gameManager.endGame(result.gameId);
      }
    }
    
    // Handle party matchmaking disconnect
    const partyResult = partyMatchmaking.handlePartyDisconnection(socket);
    if (partyResult) {
      broadcaster.broadcastPartyDisconnection(partyResult.gameId, socket.id);
      if (partyResult.remainingSockets.length < 1) {
        gameManager.endGame(partyResult.gameId);
      }
    }
  });
});

// ── Server control ────────────────────────────────────────────────────────────

function startServer() {
  gameManager  = new GameManager();
  actionRouter = new ActionRouter(gameManager);
  matchmaking  = new MatchmakingService(gameManager);
  partyMatchmaking = new PartyMatchmakingService(gameManager);
  broadcaster  = new BroadcasterService(matchmaking, gameManager, io, partyMatchmaking);
  coordinator  = new GameCoordinatorService(gameManager, actionRouter, matchmaking, broadcaster, partyMatchmaking);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on port ${PORT}`);
    console.log(`[Server] Registered actions: ${actionRouter.registeredActions().join(', ') || '(none yet)'}`);
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() {
  if (server.listening) server.close();
}

// Provide io reference for services that need to look up sockets
function getIO() { return io; }

module.exports = { startServer, stopServer, getIO };
