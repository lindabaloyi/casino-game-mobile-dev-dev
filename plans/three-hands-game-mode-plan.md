# Three-Hands Game Mode Implementation Plan

## Overview

This document outlines the implementation plan for adding a new "Three-Hands" game mode to the Casino card game. This is a 3-player variant with specific initialization rules.

## Game Mode Specifications

| Feature | Current Modes | Three-Hands Mode |
|---------|---------------|------------------|
| **Player Count** | 2 (Duel), 4 (Party) | **3** |
| **Starting Cards** | 10 per player | **13 per player** |
| **Deck Size** | 40 cards | 40 cards |
| **Initial Trail** | None (Round 1 starts empty) | **1 random card** |
| **Total Cards Used** | 20 (2 players) or 40 (4 players) | 39 (3 × 13 + 1 trail) |
| **Remaining Deck** | 20 (2 players) or 0 (4 players) | 1 card |
| **Team Structure** | 1v1 or 2v2 | **Solo (every player for themselves)** |
| **Rounds** | 2 (duel) or 1 (party) | **1 (single round)** |

## Architecture Analysis

### Current Game Mode Detection

The codebase uses `playerCount` to determine game behavior:
- `playerCount === 2` → Duel mode (1v1)
- `playerCount === 4` → Party mode (2v2 teams)

Three-hands will require `playerCount === 3`.

### Key Files Requiring Changes

1. **`shared/game/constants.js`**
   - Add `STARTING_CARDS_THREE_HANDS = 13`
   - Potentially add new constant for game mode

2. **`shared/game/initialization.js`**
   - Update `initializeGame()` to handle 3 players
   - Add initial trail card logic for three-hands mode
   - Update `initializeTestGame()` similarly

3. **`shared/game/round.js`**
   - Disable round progression for 3-player (like 4-player)
   - Update card dealing logic

4. **`shared/game/team.js`**
   - Handle 3-player team logic (all solo, no teams)

5. **`shared/game/actions/` (multiple files)**
   - Update player count checks: `playerCount === 3` for three-hands
   - Modify teammate/opponent detection logic

6. **Frontend UI**
   - `app/private-room.tsx` - Add "Three-Hands" option
   - `app/create-room.tsx` - Handle 3-player rooms
   - `app/join-room.tsx` - Handle 3-player rooms

## Implementation Steps

### Phase 1: Core Game Logic

1. **Add Constants**
   ```javascript
   // shared/game/constants.js
   const THREE_HANDS_STARTING_CARDS = 13;
   ```

2. **Update Initialization**
   - Modify `initializeGame(playerCount)` to:
     - Deal 13 cards per player when `playerCount === 3`
     - Place 1 random card on table as initial trail
     - Set appropriate game rules

3. **Update Round Logic**
   - For 3-player: no Round 2 (like 4-player)
   - Cannot start new round with only 1 card remaining

4. **Update Team Logic**
   - `getTeamFromIndex(2)` → Currently returns 'B', needs update for 3-player
   - `areTeammates()` - All players are solo in 3-player mode

### Phase 2: Game Action Updates

Update all actions that check `playerCount` to handle the 3-player case:

| Action File | Required Changes |
|-------------|------------------|
| `stealBuild.js` | Add 3-player opponent check logic |
| `capture.js` | Remove team logic for solo play |
| `addToBuild.js` | No teammate merging in 3-player |
| `startBuildExtension.js` | No teammate checks |
| `acceptBuildExtension.js` | No teammate checks |

Key logic changes:
- **No teammate concept** - All players are opponents
- **No team scoring** - Individual scores only
- **Build stealing** - Can steal from any player

### Phase 3: Frontend Integration

1. **Mode Selection UI**
   ```typescript
   // app/private-room.tsx
   const gameModeOptions = [
     { value: 'duel', label: 'Duel (2 Players)', players: 2 },
     { value: 'party', label: 'Party (4 Players)', players: 4 },
     { value: 'three-hands', label: 'Three Hands (3 Players)', players: 3 },
   ];
   ```

2. **Room Creation/Joining**
   - Set maxPlayers = 3 for three-hands
   - Handle 3-player game state sync

3. **Game Screen**
   - Create or reuse existing game component
   - Ensure 3-player table layout works

## Card Distribution Summary

```
Deck: 40 cards (A,2,3,4,5,6,7,8,9,10 × 4 suits)

Three-Hands Distribution:
- Player 1: 13 cards
- Player 2: 13 cards
- Player 3: 13 cards
- Table (trail): 1 card
- Remaining in deck: 1 card (unplayable, for scoring reference)

Total: 40 cards used
```

## Turn Order

Three-hands will use sequential turn order:
- Player 0 → Player 1 → Player 2 → repeat

This differs from:
- Duel: 0 → 1 → repeat
- Party: 0 → 2 → 1 → 3 (team-interleaved)

## Validation Checklist

- [ ] Game initializes with 3 players and 13 cards each
- [ ] One random card is placed on table as initial trail
- [ ] No duplicate rank on initial trail card
- [ ] Round progression disabled (single round)
- [ ] All players can steal from each other
- [ ] No team scoring - individual only
- [ ] Build merging works between any players
- [ ] Frontend shows 3-player mode option
- [ ] Game ends correctly when all hands empty

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Card dealing edge case | Ensure 1 card always goes to table as trail |
| Build stealing logic | Reuse party mode code without team checks |
| UI layout for 3 players | Test table rendering with 3 seats |
| Single remaining card | Handle gracefully in game end scoring |

## Implementation Priority

1. **P0 - Must Have**
   - Core game logic in `shared/game/`
   - Constants and initialization

2. **P1 - Critical**
   - Action handlers updated for 3-player
   - Turn order works correctly

3. **P2 - Important**
   - Frontend mode selection
   - Room creation/joining

4. **P3 - Nice to Have**
   - Specialized 3-player UI
   - Scoring variations
