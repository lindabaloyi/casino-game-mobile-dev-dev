# Fresh Game Per Hand Tournament Implementation

## Overview

Each tournament hand is a **completely independent game** with its own:
- `gameId` (database record)
- Socket.IO room (`game-{gameId}`)
- Game state (fresh deck, fresh dealing)
- Statistics record

Players move between rooms after each hand; eliminated players simply don't get moved.

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOURNAMENT COORDINATOR                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   HAND 1     │    │   HAND 2     │    │   HAND N     │      │
│  │  game-1001   │───▶│  game-1002   │───▶│  game-100N   │      │
│  │  (4 players) │    │  (4 players) │    │  (N players) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            SOCKET.IO ROOM MIGRATION                     │    │
│  │  1. Fetch sockets in old room                            │    │
│  │  2. Leave old room                                      │    │
│  │  3. Join new room                                       │    │
│  │  4. Emit 'game-start' with new game state               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            STATS AGGREGATION                            │    │
│  │  Hand 1: {P0: 5, P1: 3, P2: 2, P3: 1}                   │    │
│  │  Hand 2: {P0: 8, P1: 5, P2: 4, P3: 3} (cumulative)      │    │
│  │  Hand N: ... (sum pointsKept from each hand)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. TournamentCoordinator Class

```javascript
// tournament/TournamentCoordinator.js
class TournamentCoordinator {
  constructor(gameManager, io) {
    this.gameManager = gameManager;
    this.io = io;
    this.activeTournaments = new Map();
  }

  async createTournament(players, config = {}) {
    const tournamentId = `tournament-${Date.now()}`;
    const tournament = {
      id: tournamentId,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        cumulativeScore: 0,
        handsPlayed: 0,
        eliminated: false
      })),
      phase: 'QUALIFYING',
      handNumber: 0,
      config: {
        qualifyingHands: config.qualifyingHands || 4,
        qualifyingPlayers: config.qualifyingPlayers || 3,
        semifinalHands: config.semifinalHands || 3,
        finalHands: config.finalHands || 2,
        ...config
      },
      createdAt: new Date()
    };

    this.activeTournaments.set(tournamentId, tournament);
    await this._startQualifyingPhase(tournamentId);
    
    return tournament;
  }

  async _startQualifyingPhase(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    tournament.phase = 'QUALIFYING';
    tournament.handNumber = 0;
    
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    await this._startNextHand(tournamentId, activePlayers, 1);
  }

  async _startSemiFinalPhase(tournamentId, qualifiedPlayers) {
    const tournament = this.activeTournaments.get(tournamentId);
    tournament.phase = 'SEMI_FINAL';
    tournament.handNumber = 0;
    
    qualifiedPlayers.forEach(p => {
      p.cumulativeScore = 0;
      p.handsPlayed = 0;
    });
    
    await this._startNextHand(tournamentId, qualifiedPlayers, 1);
  }

  async _startFinalPhase(tournamentId, finalists) {
    const tournament = this.activeTournaments.get(tournamentId);
    tournament.phase = 'FINAL';
    tournament.handNumber = 0;
    
    finalists.forEach(p => {
      p.cumulativeScore = 0;
      p.handsPlayed = 0;
    });
    
    await this._startNextHand(tournamentId, finalists, 1);
  }

  async _startNextHand(tournamentId, players, handNumber) {
    const tournament = this.activeTournaments.get(tournamentId);
    const gameId = Date.now();
    const handConfig = this._getPhaseConfig(tournament.phase);
    
    const gameState = {
      gameId,
      tournamentId,
      tournamentPhase: tournament.phase,
      tournamentHand: handNumber,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        score: 0,
        cardsCaptured: [],
        ready: false
      })),
      round: 1,
      phase: 'bidding',
      deck: this._createShuffledDeck(),
      hands: [],
      bids: {},
      tricks: [],
      currentPlayer: 0,
      tournamentMode: true,
      handNumber,
      maxHands: handConfig.hands
    };

    await this.gameManager.saveGameState(gameId, gameState);
    await this._moveSocketsToNewGame(players, gameId);
    await this._broadcastHandStart(tournamentId, gameState);

    tournament.currentGameId = gameId;
    tournament.currentHandNumber = handNumber;

    return { gameId, gameState };
  }

  async handleHandComplete(tournamentId, gameState, results) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return;

    this._updateCumulativeScores(tournament, results);
    await this.gameManager.closeGame(gameState.gameId);

    const { maxHands, minPlayers, qualifyCount } = this._getPhaseConfig(tournament.phase);
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    
    if (tournament.currentHandNumber >= maxHands || activePlayers.length <= minPlayers) {
      await this._endPhase(tournamentId);
    } else {
      await this._startNextHand(tournamentId, activePlayers, tournament.currentHandNumber + 1);
    }
  }

  _updateCumulativeScores(tournament, results) {
    results.finalScores.forEach((points, index) => {
      const player = tournament.players.find(p => p.id === results.playerIds[index]);
      if (player) {
        player.cumulativeScore += points;
        player.handsPlayed++;
      }
    });
  }

  async _endPhase(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    activePlayers.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

    if (tournament.phase === 'QUALIFYING') {
      const qualified = activePlayers.slice(0, tournament.config.qualifyingPlayers);
      const eliminated = activePlayers.slice(tournament.config.qualifyingPlayers);
      
      eliminated.forEach(p => p.eliminated = true);
      await this._notifyEliminated(tournamentId, eliminated);
      await this._startSemiFinalPhase(tournamentId, qualified);
      
    } else if (tournament.phase === 'SEMI_FINAL') {
      const finalists = activePlayers.slice(0, 2);
      const eliminated = activePlayers.slice(2);
      
      eliminated.forEach(p => p.eliminated = true);
      await this._notifyEliminated(tournamentId, eliminated);
      await this._startFinalPhase(tournamentId, finalists);
      
    } else if (tournament.phase === 'FINAL') {
      await this._concludeTournament(tournamentId, activePlayers);
    }
  }

  async _moveSocketsToNewGame(players, newGameId) {
    const oldGameId = this.activeTournaments.get(
      Array.from(this.activeTournaments.keys()).find(
        t => this.activeTournaments.get(t).currentGameId
      )
    )?.currentGameId;

    if (!oldGameId) return;

    const oldRoom = `game-${oldGameId}`;
    const newRoom = `game-${newGameId}`;
    const sockets = await this.io.in(oldRoom).fetchSockets();

    for (const socket of sockets) {
      if (players.find(p => p.id === socket.playerId)) {
        socket.leave(oldRoom);
        socket.join(newRoom);
      }
    }
  }

  async _broadcastHandStart(tournamentId, gameState) {
    this.io.to(`game-${gameState.gameId}`).emit('game-start', {
      gameId: gameState.gameId,
      tournamentId,
      tournamentPhase: gameState.tournamentPhase,
      tournamentHand: gameState.tournamentHand,
      players: gameState.players,
      round: gameState.round,
      phase: gameState.phase,
      message: `Hand ${gameState.tournamentHand} - ${gameState.tournamentPhase}`
    });
  }

  _getPhaseConfig(phase) {
    const configs = {
      QUALIFYING: { hands: 4, minPlayers: 4, qualifyCount: 3 },
      SEMI_FINAL: { hands: 3, minPlayers: 3, qualifyCount: 2 },
      FINAL: { hands: 2, minPlayers: 2, qualifyCount: 1 }
    };
    return configs[phase];
  }

  getTournamentState(tournamentId) {
    return this.activeTournaments.get(tournamentId);
  }

  getLeaderboard(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return null;
    
    return tournament.players
      .filter(p => p.handsPlayed > 0)
      .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
      .map(p => ({
        playerId: p.id,
        name: p.name,
        score: p.cumulativeScore,
        handsPlayed: p.handsPlayed,
        phase: p.eliminated ? 'ELIMINATED' : tournament.phase
      }));
  }
}

module.exports = TournamentCoordinator;
```

---

## 2. Database Schema

### Game Record (per hand)

```javascript
{
  gameId: Number,
  tournamentId: String,
  tournamentMode: true,
  tournamentPhase: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL',
  tournamentHand: Number,
  playerCount: Number,
  players: [
    { playerId: String, name: String }
  ],
  finalScores: [5, 3, 2, 1],  // pointsKept per player
  scoreBreakdown: {
    cards: [5, 3, 2, 1],
    spades: [1, 0, 0, 0],
    aces: [1, 0, 0, 0],
    tenOfDiamonds: [1, 0, 0, 0],
    twoOfSpades: [0, 1, 0, 0]
  },
  winner: String,  // playerId
  completedAt: Date,
  duration: Number  // milliseconds
}
```

### Tournament Record

```javascript
{
  tournamentId: String,
  status: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL' | 'COMPLETED',
  players: [
    {
      playerId: String,
      name: String,
      cumulativeScore: Number,
      handsPlayed: Number,
      eliminated: Boolean,
      finalPosition: Number
    }
  ],
  createdAt: Date,
  completedAt: Date,
  totalHands: Number
}
```

---

## 3. Socket.IO Event Flow

```
CLIENT                              SERVER
  │                                    │
  ├─ emit('join-tournament') ──────▶ │
  │                                    │
  │  ◀── emit('tournament-start') ───┤
  │                                    │
  │  ◀── emit('game-start') ──────────┤  (Hand 1)
  │     { gameId: 1001, room: 'g-1001' }
  │                                    │
  │  ◀── emit('hand-complete') ───────┤
  │     { gameId: 1001, scores: {...} }
  │                                    │
  │  ◀── emit('game-start') ──────────┤  (Hand 2)
  │     { gameId: 1002, room: 'g-1002' }
  │                                    │
  │         ... (repeat for all hands) ...
  │                                    │
  │  ◀── emit('phase-end') ───────────┤
  │     { qualified: [P0, P2, P3] }
  │                                    │
  │  ◀── emit('eliminated') ──────────┤ (if applicable)
  │     { position: 4, score: 6 }
  │                                    │
  │  ◀── emit('tournament-complete') ─┤
  │     { winner: P0, leaderboard: [] }
```

---

## 4. Client Integration

```javascript
// Socket event handlers on client
socket.on('game-start', (data) => {
  currentGameId = data.gameId;
  currentPhase = data.tournamentPhase;
  currentHand = data.tournamentHand;
  
  showGameScreen({
    gameId: data.gameId,
    phase: data.tournamentPhase,
    hand: data.tournamentHand,
    players: data.players
  });
});

socket.on('hand-complete', (data) => {
  updateLeaderboard(data.cumulativeScores);
  showHandSummary(data.results);
});

socket.on('phase-end', (data) => {
  if (data.qualified.includes(myPlayerId)) {
    showNextPhaseMessage(data.nextPhase);
  }
});

socket.on('eliminated', (data) => {
  showEliminationScreen(data.position, data.finalScore);
});

socket.on('tournament-complete', (data) => {
  showTournamentResults(data.winner, data.leaderboard);
});
```

---

## 5. Key Benefits

| Feature | Implementation |
|---------|----------------|
| **Stats per hand** | Each hand saves as independent game record |
| **No socket leaks** | Eliminated players never join new rooms |
| **Clean round handling** | Fresh game = no round state pollution |
| **Leaderboard** | Sum `pointsKept` across all hands |
| **History** | Query by `tournamentId` for full bracket |

---

## 6. Integration with Existing GameManager

```javascript
// In your server setup
const TournamentCoordinator = require('./tournament/TournamentCoordinator');

const gameManager = new GameManager(db);
const tournamentCoordinator = new TournamentCoordinator(gameManager, io);

// Handle tournament creation
io.on('connection', (socket) => {
  socket.on('create-tournament', async (players) => {
    const tournament = await tournamentCoordinator.createTournament(players);
    socket.join(`tournament-${tournament.id}`);
    socket.emit('tournament-created', { tournamentId: tournament.id });
  });
  
  socket.on('join-tournament', async ({ tournamentId, player }) => {
    const tournament = tournamentCoordinator.getTournamentState(tournamentId);
    if (tournament) {
      socket.playerId = player.id;
      socket.join(`game-${tournament.currentGameId}`);
    }
  });
});

// Hook into game completion
gameManager.on('game-complete', async (gameId, results) => {
  const gameState = await gameManager.getGameState(gameId);
  if (gameState.tournamentMode) {
    await tournamentCoordinator.handleHandComplete(
      gameState.tournamentId,
      gameState,
      results
    );
  }
});
```

---

## Summary

1. **Each hand = fresh game** with unique `gameId` and Socket.IO room
2. **Cumulative scores** tracked in TournamentCoordinator
3. **Eliminated players** handled by not moving them to next room
4. **Stats saved** automatically via existing game save logic
5. **Phase transitions** trigger automatically when hand count reached