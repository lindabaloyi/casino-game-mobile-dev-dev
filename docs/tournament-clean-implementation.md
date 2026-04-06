# Clean Tournament Implementation Guide

## Overview

This guide documents how to implement a clean tournament architecture where:
- `GameCoordinatorService` handles generic game flow only
- `TournamentMaster` handles ALL tournament-specific logic
- No socket remapping - fresh games for each phase

## Architecture

```
GameCoordinatorService (Generic Only)
├── handleGameAction()
├── _resolvePlayer() - basic socket lookup
├── _handleRoundEnd() - delegates to TournamentMaster
└── _handleGameOver()

TournamentMaster (All Tournament Logic)
├── isTournamentActive()
├── handleRoundEnd() - main entry point
├── createFreshGameState()
├── migrateSockets()
├── broadcastTransition()
└── getGameTransitionPayload()
```

## Key Return Structure

`TournamentMaster.handleRoundEnd` MUST return:

```javascript
// Transition to new game
{
  gameOver: false,
  newGameId: 12345,           // ID of the new game
  state: newGameState,         // The new game state
  oldGameId: 100,              // ID of the old game (for cleanup)
  transition: {
    type: 'PHASE_TRANSITION',
    nextPhase: 'SEMI_FINAL',
    qualifiedPlayers: ['player_0', 'player_2', 'player_3']
  }
}

// Same game continues
{
  gameOver: false,
  newGameId: null,
  state: updatedState,
  transition: null
}

// Tournament ends
{
  gameOver: true,
  state: finalState,
  winner: 'player_0',
  transition: null
}
```

## Implementation

### 1. TournamentMaster.handleRoundEnd

```javascript
static handleRoundEnd(gameState, gameId, gameManager, matchmaking, broadcaster) {
  const phase = this.getCurrentPhase(gameState);
  const roundEnded = this.isRoundEnd(gameState);
  
  if (!roundEnded) {
    return { gameOver: false, newGameId: null, state: gameState };
  }
  
  // Determine next action based on phase
  switch (phase) {
    case 'QUALIFYING':
      return this.handleQualifyingEnd(gameState, gameId, gameManager, matchmaking, broadcaster);
    case 'SEMI_FINAL':
      return this.handleSemifinalEnd(gameState, gameId, gameManager, matchmaking, broadcaster);
    case 'FINAL_SHOWDOWN':
      return this.handleFinalShowdownEnd(gameState, gameId, gameManager);
    default:
      return { gameOver: false, newGameId: null, state: gameState };
  }
}
```

### 2. Handle Phase Transition

```javascript
static handleQualifyingEnd(gameState, gameId, gameManager, matchmaking, broadcaster) {
  // Compute qualified players
  const qualified = this.computeQualifiedPlayers(gameState, 3);
  
  // Create fresh game for semifinal
  const { newGameId, newState } = this.createFreshGameState(gameState, qualified, 'SEMI_FINAL');
  
  // Migrate sockets from old game to new game
  this.migrateSockets(gameId, newGameId, qualified, gameManager, matchmaking);
  
  // Broadcast transition event to old game
  const transitionPayload = {
    type: 'TOURNAMENT_TRANSITION',
    gameOver: true,
    nextGameId: newGameId,
    nextPhase: 'SEMI_FINAL',
    qualifiedPlayers: qualified,
    message: `Moving to SEMI_FINAL with ${qualified.length} players`
  };
  broadcaster.broadcastToGame(gameId, 'tournament-transition', transitionPayload, matchmaking);
  
  // Broadcast new game start to new game
  broadcaster.broadcastToGame(newGameId, 'game-start', newState, matchmaking);
  
  return {
    gameOver: false,
    newGameId: newGameId,
    state: newState,
    oldGameId: gameId,
    transition: {
      type: 'PHASE_TRANSITION',
      nextPhase: 'SEMI_FINAL',
      qualifiedPlayers: qualified
    }
  };
}
```

### 3. Fresh Game Creation (No Remapping)

```javascript
static createFreshGameState(oldState, qualifiedPlayerIds, nextPhase) {
  const newGameId = this.generateNewGameId();
  
  // Create clean game state
  const newState = {
    ...oldState,
    gameId: newGameId,
    tournamentPhase: nextPhase,
    playerCount: qualifiedPlayerIds.length,
    qualifiedPlayers: qualifiedPlayerIds,
    currentPlayer: 0,
    round: 1,
    roundEndTriggered: false,
    handsPlayed: 0,
    maxHands: nextPhase === 'SEMI_FINAL' ? 5 : 3,
    tableCards: [],
    deck: [],
    roundPlayers: {},
    scores: qualifiedPlayerIds.map(() => 0),
    tournamentScores: { ...oldState.tournamentScores }
  };
  
  // Build players array with only qualified players
  newState.players = oldState.players
    .filter(p => qualifiedPlayerIds.includes(p.id))
    .map((p, idx) => ({
      ...p,
      index: idx,
      hand: [],
      captures: [],
      score: 0
    }));
  
  // Deal cards for new game
  this.dealCardsForNewGame(newState);
  
  return { newGameId, newState };
}

static dealCardsForNewGame(state) {
  // Simple card dealing logic
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  state.deck = deck;
  state.tableCards = [];
  
  // Deal to players
  for (const player of state.players) {
    player.hand = deck.splice(0, 4);
  }
}
```

### 4. Socket Migration (No Index Remapping)

```javascript
static migrateSockets(oldGameId, newGameId, qualifiedPlayerIds, gameManager, matchmaking) {
  // Get all sockets in old game
  const oldSocketMap = gameManager.socketPlayerMap.get(oldGameId);
  if (!oldSocketMap) {
    console.warn(`[TournamentMaster] No sockets found for game ${oldGameId}`);
    return;
  }
  
  // Create new socket map for new game
  const newSocketMap = new Map();
  
  for (const [socketId, oldIndex] of oldSocketMap.entries()) {
    const oldPlayer = oldGameState?.players?.[oldIndex];
    if (!oldPlayer) continue;
    
    // Check if player qualified
    if (qualifiedPlayerIds.includes(oldPlayer.id)) {
      // Find new index in fresh game
      const newIndex = qualifiedPlayerIds.indexOf(oldPlayer.id);
      newSocketMap.set(socketId, newIndex);
      
      // Update socket registry to point to new game
      const socketEntry = matchmaking.socketRegistry.get(socketId);
      if (socketEntry) {
        matchmaking.socketRegistry.set(socketId, newGameId, socketEntry.gameType, socketEntry.userId);
      }
    }
  }
  
  // Save new socket map
  gameManager.socketPlayerMap.set(newGameId, newSocketMap);
  
  // Clean up old game
  gameManager.socketPlayerMap.delete(oldGameId);
  
  console.log(`[TournamentMaster] Migrated ${newSocketMap.size} sockets from ${oldGameId} to ${newGameId}`);
}
```

## Clean GameCoordinatorService

```javascript
class GameCoordinatorService {
  handleGameAction(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    
    const { gameId, playerIndex, isPartyGame } = ctx;
    const preState = this.gameManager.getGameState(gameId);
    
    try {
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      const roundCheck = this.checkRoundEnd(newState);
      
      if (roundCheck.ended) {
        this._handleRoundEnd(gameId, newState, isPartyGame, roundCheck);
      } else {
        this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
      }
    } catch (err) {
      this.broadcaster.sendError(socket, err.message);
    }
  }
  
  _handleRoundEnd(gameId, newState, isPartyGame, roundCheck) {
    scoring.updateScores(newState);
    
    // Delegate ALL tournament logic to TournamentMaster
    if (TournamentMaster.isTournamentActive(newState)) {
      const result = TournamentMaster.handleRoundEnd(
        newState, 
        gameId, 
        this.gameManager,
        this.unifiedMatchmaking,
        this.broadcaster
      );
      
      if (result.gameOver) {
        this._handleGameOver(gameId, result.state, isPartyGame, false);
      } else if (result.newGameId) {
        // TournamentMaster handled transition
        console.log(`[Coordinator] Tournament transitioned to game ${result.newGameId}`);
      } else {
        this.gameManager.saveGameState(gameId, result.state);
        this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
      }
      return;
    }
    
    // Regular game flow
    const gameOverCheck = RoundValidator.checkGameOver(newState);
    if (gameOverCheck.gameOver) {
      this._handleGameOver(gameId, newState, isPartyGame, false);
    } else {
      const nextState = RoundValidator.prepareNextRound(newState);
      if (nextState) {
        this.gameManager.saveGameState(gameId, nextState);
        this.broadcaster.broadcastGameUpdate(gameId, nextState, this.unifiedMatchmaking);
      } else {
        this._handleGameOver(gameId, newState, isPartyGame, true);
      }
    }
  }
  
  _resolvePlayer(socket) {
    // Simple lookup only - no tournament corrections
    const socketInfo = this.unifiedMatchmaking.socketRegistry.get(socket.id);
    const gameId = socketInfo?.gameId;
    if (!gameId) return null;
    
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) return null;
    
    return { gameId, playerIndex, isPartyGame: socketInfo?.gameType === 'party' };
  }
}
```

## What Was Removed

| Removed From GameCoordinatorService | Reason |
|--------------------------------------|--------|
| `TournamentMaster.ensureCorrectPlayerIndex` | Fresh games = correct indices |
| `TournamentBroadcaster` import | Generic broadcaster handles all |
| `transitionHandled` / `shadowGame` checks | Result has `newGameId` directly |
| Phase transition handling | All in TournamentMaster |
| Tournament-specific broadcast logic | TournamentMaster broadcasts internally |

## Benefits

1. **Single Source of Truth** - All tournament logic in one place
2. **No Socket Remapping** - Fresh games = indices always correct
3. **Clean Coordinator** - Only generic game flow
4. **Easy Testing** - Clear interfaces between components
5. **Maintainable** - Changes only in TournamentMaster
