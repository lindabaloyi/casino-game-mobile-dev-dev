# GameCoordinatorService Separation of Concerns Refactor Plan

## 🎯 **Problem Statement**

`GameCoordinatorService` has become a **"god object"** violating separation of concerns:

### ❌ **Current Violations**
1. **Direct access to internal maps** - Reaches into `unifiedMatchmaking.socketGameMap` and `gameManager.socketPlayerMap`
2. **State repair logic** - Silently fixes broken matchmaking state instead of failing fast
3. **Multiple responsibilities** - Game actions, round transitions, tournaments, drag events, stats
4. **Tight coupling** - Knows internal structures of multiple services
5. **Interleaved logic** - Round transitions mixed with action handling

### 💥 **Impact on Socket-Mixing Bugs**
The coordinator's fallback logic that writes to `socketGameMap` directly contributes to socket mixing - it can create conflicting entries when the matchmaking service correctly removed a socket.

## 🏗️ **Target Architecture**

```
GameCoordinatorService (Thin Orchestrator)
    ↓ delegates to
Specialized Services (Single Responsibility)
    ↓ use
Core Services (Public APIs only)
```

**Service Responsibilities**:
- **PlayerContextService** - Player → game resolution using public APIs
- **RoundTransitionService** - Round end logic, tournament phase detection
- **DragBroadcastService** - Drag event handling (or move to handlers)
- **StatsService** - Player statistics aggregation
- **GameCoordinatorService** - Thin orchestration layer

## 📋 **Implementation Plan**

### **Phase 1: Remove Direct Map Access (HIGH PRIORITY)**

**Goal**: Coordinator uses only public APIs, eliminates silent state repair

#### **A. Create PlayerContextService**
```javascript
class PlayerContextService {
  constructor(unifiedMatchmaking, gameManager) {
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.gameManager = gameManager;
  }

  resolvePlayer(socketId) {
    const gameId = this.unifiedMatchmaking.getGameId(socketId);
    const gameType = this.unifiedMatchmaking.getGameType(socketId);

    if (!gameId) {
      return null; // No silent repair - fail fast
    }

    // Find player index in game
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState?.players) {
      return null;
    }

    const playerIndex = gameState.players.findIndex(player =>
      player.socketId === socketId
    );

    if (playerIndex === -1) {
      return null;
    }

    return {
      gameId,
      playerIndex,
      gameType,
      isPartyGame: gameType === 'party'
    };
  }
}
```

#### **B. Replace _resolvePlayer method**
**Before**:
```javascript
_resolvePlayer(socket) {
  let socketInfo = this.unifiedMatchmaking.socketGameMap.get(socket.id); // ❌ Direct access
  // ... complex fallback logic that writes to maps ❌
}
```

**After**:
```javascript
_resolvePlayer(socket) {
  return this.playerContextService.resolvePlayer(socket.id);
}
```

#### **C. Add public remapping method to GameManager**
**Add to GameManager**:
```javascript
remapPlayerIndices(gameId, indexMapping) {
  const socketMap = this.socketPlayerMap.get(gameId);
  if (!socketMap) return false;

  // Apply the mapping to internal structures
  // This encapsulates the remapping logic
  Object.entries(indexMapping).forEach(([oldIndex, newIndex]) => {
    // Remap logic here
  });
  return true;
}
```

**Update coordinator usage**:
```javascript
// Before: Direct access ❌
const socketMap = this.gameManager.socketPlayerMap.get(gameId);
TournamentManager.remapPlayerIndices(socketMap, qualifiedPlayers);

// After: Public API ✅
const mapping = TournamentManager.computeIndexMapping(qualifiedPlayers);
this.gameManager.remapPlayerIndices(gameId, mapping);
```

### **Phase 2: Extract Round Transition Logic**

**Goal**: Separate action execution from round management

#### **A. Create RoundTransitionService**
```javascript
class RoundTransitionService {
  constructor(gameManager, tournamentManager, roundValidator) {
    this.gameManager = gameManager;
    this.tournamentManager = tournamentManager;
    this.roundValidator = roundValidator;
  }

  processActionResult(gameId, newState, lastAction, ctx) {
    const { isPartyGame } = ctx;

    // Check for round end
    if (allPlayersTurnEnded(newState)) {
      return this._handleRoundEnd(gameId, newState, lastAction, isPartyGame);
    }

    // Check for tournament phase changes
    if (this._tournamentPhaseChanged(newState, oldTournamentPhase)) {
      return this._handleTournamentPhaseChange(gameId, newState, qualifiedPlayers);
    }

    return { type: 'continue', state: newState };
  }

  _handleRoundEnd(gameId, newState, lastAction, isPartyGame) {
    // Extract round end logic from handleGameAction
    const roundCheck = RoundValidator.checkRoundEnd(newState);

    if (roundCheck.shouldEnd) {
      // Round end logic here
      return {
        type: 'round_end',
        summary: RoundValidator.getRoundSummary(newState),
        nextState: newState
      };
    }

    return { type: 'continue', state: newState };
  }
}
```

#### **B. Simplify handleGameAction**
**Before**: 150+ line method with interleaved logic
**After**:
```javascript
handleGameAction(socket, data) {
  const ctx = this._resolvePlayer(socket);
  if (!ctx) return;

  const newState = this.actionRouter.executeAction(ctx.gameId, ctx.playerIndex, data);

  // Delegate round logic to service
  const result = this.roundTransitionService.processActionResult(
    ctx.gameId, newState, data, ctx
  );

  if (result.type === 'round_end') {
    this.broadcaster.broadcastRoundEnd(ctx.gameId, result.summary);
  } else if (result.type === 'tournament_phase_change') {
    this._handleTournamentPhaseChange(result);
  }

  this.broadcaster.broadcastGameUpdate(ctx.gameId, newState);
}
```

### **Phase 3: Extract Drag and Stats Handling**

#### **A. Move Drag Events to Handler Layer**
Drag events are simple broadcasts - no business logic needed in coordinator.

**Remove from coordinator**:
```javascript
handleDragStart(socket, data) { /* simple broadcast */ }
handleDragMove(socket, data) { /* simple broadcast */ }
handleDragEnd(socket, data) { /* simple broadcast */ }
```

**Add to handlers/index.js**:
```javascript
socket.on('drag-start', (data) => {
  const gameId = unifiedMatchmaking.getGameId(socket.id);
  if (gameId) {
    socket.to(gameId).emit('drag-start', { ...data, socketId: socket.id });
  }
});
```

#### **B. Create StatsService (Optional)**
```javascript
class StatsService {
  getPlayerStats(gameId, playerIndex) {
    // Extract stats logic from coordinator
  }
}
```

### **Phase 4: Refactor Coordinator as Pure Orchestrator**

**Final Coordinator Structure**:
```javascript
class GameCoordinatorService {
  constructor(services) {
    this.playerContext = services.playerContext;
    this.roundTransition = services.roundTransition;
    this.actionRouter = services.actionRouter;
    this.broadcaster = services.broadcaster;
    this.stats = services.stats;
  }

  // Thin orchestration methods
  handleGameAction(socket, data) {
    const ctx = this.playerContext.resolvePlayer(socket.id);
    if (!ctx) return this._sendError(socket, 'Not in game');

    const newState = this.actionRouter.executeAction(ctx.gameId, ctx.playerIndex, data);
    const result = this.roundTransition.processActionResult(ctx.gameId, newState, data, ctx);

    this._handleTransitionResult(result, ctx);
  }

  handleClientReady(socket, data) {
    // Simplified client ready logic
  }

  handleStartNextRound(socket) {
    // Simplified round start logic
  }

  handleGetPlayerStats(socket, data) {
    const stats = this.stats.getPlayerStats(data.gameId, data.playerIndex);
    socket.emit('player-stats', stats);
  }
}
```

## 📊 **Success Metrics**

- **Method complexity**: `handleGameAction` reduces from 150+ lines to <30 lines
- **Direct map access**: 0 instances (currently ~5 violations)
- **Service dependencies**: Coordinator uses only service interfaces, not internals
- **Testability**: Each service can be unit tested independently
- **Coupling**: No service reaches into another's internal data structures

## 🚨 **Risk Assessment**

| Phase | Risk Level | Impact if Issues | Mitigation |
|-------|------------|------------------|------------|
| Phase 1 | Medium | Socket resolution failures | Comprehensive testing of player context resolution |
| Phase 2 | Low | Round transition bugs | Extract existing logic, test thoroughly |
| Phase 3 | Low | Drag/stats functionality | Simple delegation, easy rollback |
| Phase 4 | Low | Integration issues | Keep existing public interface |

## 📅 **Implementation Timeline**

- **Phase 1**: 2-3 hours (critical for socket-mixing fix)
- **Phase 2**: 1-2 hours (round logic extraction)
- **Phase 3**: 30-60 minutes (drag/stats cleanup)
- **Phase 4**: 1 hour (orchestrator refactor)

**Total**: 4-6 hours for complete separation

## 🎯 **Immediate Benefits**

1. **Eliminates socket mixing root cause** - No more silent state repair
2. **Prevents future coupling bugs** - Services use clean interfaces
3. **Improves testability** - Isolated services, mockable dependencies
4. **Reduces complexity** - Smaller, focused methods
5. **Enables future changes** - Internal refactoring won't break coordinator

## 🔍 **Validation Checklist**

- [ ] `handleGameAction` < 50 lines total
- [ ] No direct access to `socketGameMap` or `socketPlayerMap`
- [ ] No state repair/fallback logic in coordinator
- [ ] All services use public APIs only
- [ ] Player context resolution works for all game types
- [ ] Round transitions work correctly
- [ ] Tournament phase changes handled properly
- [ ] All existing functionality preserved
- [ ] 95%+ test coverage for new services

**Ready for review and implementation!** 🚀

This refactor directly addresses the socket-mixing bugs by eliminating the coordinator's ability to create conflicting state entries, while establishing a maintainable architecture for the future.