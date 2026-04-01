# Tournament Transition System Refactoring Plan

## Executive Summary

The current tournament system suffers from a fundamental architectural flaw: **player indices are remapped during tournament transitions, but not all state objects are updated consistently**. This causes index mismatches throughout the codebase, leading to incorrect player status detection, wrong winner displays, and spectator view bugs.

## Current Architecture Problems

### Problem 1: Dual Index System
The tournament uses two different index systems simultaneously:
- **Original Indices**: Used by `playerStatuses`, `tournamentScores`, `eliminationOrder` (persists across transitions)
- **New Indices**: Used by `players` array, `currentPlayer`, client player numbers (changes after transitions)

### Problem 2: Inconsistent State Updates
When transitioning from qualifying → semifinal → final:
- `players` array is rebuilt with new indices (0, 1, 2...)
- `playerCount` is reduced (4 → 3 → 2)
- `playerStatuses` and `tournamentScores` retain original indices
- No single source of truth for index mapping

### Problem 3: Scattered Index Mapping Logic
Index mapping is done ad-hoc throughout the codebase:
- `useTournamentStatus.ts`: Maps playerIndex to original index
- `SpectatorView.tsx`: Maps original indices to display indices
- Server actions: Use qualifiedPlayers array for mapping
- Each component has its own mapping logic

---

## Proposed Solution: Unified Index System

### Core Principle: **Never Remap Player Indices**

Instead of remapping indices during tournament transitions, maintain a single index system throughout the entire tournament. This eliminates the need for complex mapping logic.

### Implementation Approach

#### 1. Use Player ID Instead of Index (Recommended)

Replace numeric indices with persistent player identifiers:

```typescript
// Instead of player index 0, 1, 2, 3
// Use player IDs: "player_0", "player_1", "player_2", "player_3"

interface Player {
  id: string;  // Persistent across all tournament phases
  // ... other fields
}

interface TournamentState {
  playerStatuses: { [playerId: string]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' };
  tournamentScores: { [playerId: string]: number };
  qualifiedPlayers: string[];  // List of player IDs, not indices
  eliminationOrder: string[];  // List of player IDs
}
```

**Benefits:**
- No index remapping needed
- Direct lookup without mapping functions
- All state objects use same identifiers

#### 2. Alternative: Centralized Index Mapper (If Keeping Indices)

If player IDs cannot be implemented, create a centralized index mapping utility:

```typescript
// shared/tournament/playerMapper.ts

interface PlayerMapping {
  originalToNew: Map<number, number>;
  newToOriginal: Map<number, number>;
}

export function getPlayerMapper(
  qualifiedPlayers: number[],
  totalPlayers: number
): PlayerMapping {
  const originalToNew = new Map<number, number>();
  const newToOriginal = new Map<number, number>();
  
  qualifiedPlayers.forEach((originalIndex, newIndex) => {
    originalToNew.set(originalIndex, newIndex);
    newToOriginal.set(newIndex, originalIndex);
  });
  
  return { originalToNew, newToOriginal };
}

export function getOriginalIndex(newIndex: number, qualifiedPlayers: number[]): number {
  return qualifiedPlayers[newIndex] ?? newIndex;
}

export function getNewIndex(originalIndex: number, qualifiedPlayers: number[]): number {
  return qualifiedPlayers.indexOf(originalIndex);
}
```

Then replace all scattered mapping logic with calls to this utility.

---

## Detailed Refactoring Steps

### Phase 1: Audit and Document Current State

1. **Map all index usages**: Find all places that access player indices
2. **Categorize by index type**: Identify which use original vs. new indices
3. **Document mapping relationships**: How qualifiedPlayers maps indices

Files to audit:
- `hooks/useTournamentStatus.ts`
- `components/tournament/SpectatorView.tsx`
- `components/tournament/TournamentStatusBar.tsx`
- `shared/game/actions/startSemifinal.js`
- `shared/game/actions/startFinalShowdown.js`
- `shared/game/actions/endFinalShowdown.js`
- `components/modals/GameOverModal.tsx`
- `components/game/GameBoard.tsx`

### Phase 2: Implement Centralized Mapping (Intermediate Solution)

If keeping numeric indices:

1. Create `shared/tournament/playerMapper.ts`
2. Add mapping functions to all server actions
3. Update all client components to use centralized mapper
4. Add runtime validation (assertions that indices are valid)

### Phase 3: Migrate to Player IDs (Long-term Solution)

1. Add `playerId` field to Player objects
2. Update all state objects to use playerId
3. Replace index-based lookups with ID-based lookups
4. Remove index mapping logic entirely

---

## Key Changes Required

### Server Actions

```javascript
// BEFORE (problematic)
newState.playerStatuses[winner] = 'WINNER';  // winner is new index?

// AFTER (if keeping indices)
const originalWinner = qualifiedPlayers[winner];
newState.playerStatuses[originalWinner] = 'WINNER';

// OR (if using player IDs)
newState.playerStatuses[winnerPlayer.id] = 'WINNER';
```

### Client Components

```typescript
// BEFORE (problematic)
const playerStatus = playerStatuses[playerIndex];  // Uses new index

// AFTER (if keeping indices)
const originalIndex = getOriginalIndex(playerIndex, qualifiedPlayers);
const playerStatus = playerStatuses[originalIndex];

// OR (if using player IDs)
const playerStatus = playerStatuses[myPlayerId];
```

### Hooks

Update `useTournamentStatus` to:
1. Accept `qualifiedPlayers` as parameter
2. Use centralized mapping function
3. Return both original index and new index if needed

---

## Validation Strategy

Add runtime checks to catch index mismatches early:

```typescript
function validatePlayerIndex(index: number, playerCount: number, playerStatuses: object) {
  if (index < 0 || index >= playerCount) {
    console.error(`Invalid player index: ${index}, playerCount: ${playerCount}`);
  }
  if (!playerStatuses.hasOwnProperty(index)) {
    console.error(`No playerStatus for index: ${index}`);
  }
}
```

---

## Testing Plan

1. **Unit Tests**: Test player mapping functions
2. **Integration Tests**: Test full tournament flow (4 → 3 → 2 players)
3. **Manual Tests**: Play through entire tournament, verify:
   - Correct players eliminated at each phase
   - SpectatorView shown only to eliminated players
   - Winner correctly identified in GameOverModal

---

## Migration Path

### Option A: Quick Fix (1-2 days)
- Implement centralized mapping utility
- Fix all known index bugs (useTournamentStatus, SpectatorView)
- Add validation logs

### Option B: Full Refactor (1-2 weeks)
- Implement player ID system
- Update all server actions
- Update all client components
- Comprehensive testing

**Recommendation**: Start with Option A to fix immediate bugs, then plan Option B for long-term solution.

---

## Summary

The core problem is **two competing index systems**. The solution is either:

1. **Unified Index**: Keep one index system throughout (use player IDs)
2. **Centralized Mapping**: Single source of truth for index mapping

Both solutions eliminate the scattered, inconsistent mapping logic that causes the current bugs. Player IDs are the cleaner long-term solution; centralized mapping is the faster intermediate fix.