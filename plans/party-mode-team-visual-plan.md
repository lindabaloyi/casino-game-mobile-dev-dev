# Party Mode Team Visual Enhancement Plan

## Overview
Enhance the party mode (4-player) implementation with team-based visual differentiation. This includes distinct team colors, player identification tags for build ownership, and dynamic UI elements that change based on the current player's team.

## Current Implementation Status
- ✅ Turn sequence: `[0, 2, 1, 3]` - alternates teams every turn
- ✅ Team assignments: Team A = players 0,1 | Team B = players 2,3
- ✅ Helper functions in `shared/game/team.js` and `types/game.types.ts`

---

## Requirements Summary

1. **Team Colors**: Distinct colors for Team A and Team B throughout the UI
2. **Build Ownership Tags**: Visual indication of which team/player owns each build
3. **Friendly vs Enemy Recognition**: Clear visual distinction between own/team builds vs opponent builds
4. **Dynamic Current Player Highlighting**: UI elements change based on current player's team
5. **Team-based Iconography**: Icons reflect team membership

---

## Implementation Plan

### Step 1: Define Team Color System

**New File: `constants/teamColors.ts`**

```typescript
export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export const TEAM_A_COLORS: TeamColors = {
  primary: '#FF6B6B',    // Coral red
  secondary: '#FFE3E3',  // Light pink
  accent: '#C92A2A',     // Dark red
  background: '#FFF5F5', // Very light red
  text: '#8B0000',       // Dark red text
};

export const TEAM_B_COLORS: TeamColors = {
  primary: '#4DABF7',    // Blue
  secondary: '#E3F2FD',  // Light blue
  accent: '#1864AB',     // Dark blue
  background: '#F0F7FF', // Very light blue
  text: '#0D47A1',       // Dark blue text
};

export function getTeamColors(teamId: 'A' | 'B'): TeamColors {
  return teamId === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
}

export function getOppositeTeamColors(teamId: 'A' | 'B'): TeamColors {
  return teamId === 'A' ? TEAM_B_COLORS : TEAM_A_COLORS;
}
```

### Step 2: Add Team Helper for Player Identification

**Update: `shared/game/team.js`**

```javascript
/**
 * Get player position label (P1 or P2) within their team
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} 'P1' or 'P2'
 */
function getPlayerPositionLabel(playerIndex) {
  // Team A: 0=P1, 1=P2 | Team B: 2=P1, 3=P2
  return playerIndex % 2 === 0 ? 'P1' : 'P2';
}

/**
 * Get full player tag (e.g., "Team A P1")
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} Human-readable player tag
 */
function getPlayerTag(playerIndex) {
  const team = getTeamFromIndex(playerIndex);
  const position = getPlayerPositionLabel(playerIndex);
  return `Team ${team} ${position}`;
}

/**
 * Check if two players are teammates
 * @param {number} player1 - First player index
 * @param {number} player2 - Second player index
 * @returns {boolean} True if teammates
 */
function areTeammates(player1, player2) {
  return getTeamFromIndex(player1) === getTeamFromIndex(player2);
}
```

### Step 3: Update TypeScript Types

**Update: `types/game.types.ts`**

```typescript
export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export const TEAM_A_COLORS: TeamColors = { /* ... */ };
export const TEAM_B_COLORS: TeamColors = { /* ... */ };
export function getTeamColors(teamId: TeamId): TeamColors;
export function getOppositeTeamColors(teamId: TeamId): TeamColors;

export function getPlayerPositionLabel(playerIndex: number): 'P1' | 'P2';
export function getPlayerTag(playerIndex: number): string;
export function areTeammates(player1: number, player2: number): boolean;
```

### Step 4: Update Build Stack Component

**File: `components/table/BuildStackView.tsx`**

Changes needed:
1. Add team color border/background based on build owner
2. Display player tag (Team A P1, Team B P2, etc.)
3. Show "friendly" vs "enemy" indicator for current player

```typescript
// Example implementation concept
import { getTeamFromIndex, getPlayerTag, areTeammates } from '../../shared/game/team';
import { getTeamColors, getOppositeTeamColors } from '../../constants/teamColors';

function BuildStackView({ stack, currentPlayer }) {
  const ownerTeam = getTeamFromIndex(stack.owner);
  const ownerTag = getPlayerTag(stack.owner);
  const isFriendly = currentPlayer !== undefined && areTeammates(currentPlayer, stack.owner);
  
  const colors = isFriendly 
    ? getTeamColors(ownerTeam)
    : getOppositeTeamColors(ownerTeam);
  
  return (
    <View style={{ borderColor: colors.primary }}>
      <Text style={{ color: colors.text }}>{ownerTag}</Text>
      <Text>{isFriendly ? 'Friendly' : 'Enemy'}</Text>
    </View>
  );
}
```

### Step 5: Update Table Card Rendering

**File: `components/table/items/TableItemRenderer.tsx`**

Add team-based styling for build stacks and temp stacks:
- Owner player tag displayed
- Team color accent
- Friendly/enemy indicator

### Step 6: Update Player Hand Area

**File: `components/game/PlayerHandArea.tsx`**

Changes:
1. Highlight current player's position
2. Show team affiliation
3. Display turn indicator with team colors

```typescript
function PlayerHandArea({ playerIndex, isCurrentTurn, currentPlayer }) {
  const team = getTeamFromIndex(playerIndex);
  const position = getPlayerPositionLabel(playerIndex);
  const colors = getTeamColors(team);
  
  return (
    <View style={{
      borderColor: isCurrentTurn ? colors.primary : 'transparent',
      backgroundColor: isCurrentTurn ? colors.background : undefined
    }}>
      <Text>Team {team} - {position}</Text>
      {isCurrentTurn && <TurnIndicator colors={colors} />}
    </View>
  );
}
```

### Step 7: Update Game Status Bar

**File: `components/game/GameStatusBar.tsx`**

Show current player with team colors:
- Current turn indicator with team color
- "Team A's turn" / "Team B's turn" text

### Step 8: Create Team Context Hook

**New File: `hooks/usePartyTeam.ts`**

```typescript
import { useMemo } from 'react';
import { useGameState } from './useGameState';
import { getTeamFromIndex, areTeammates } from '../shared/game/team';
import { getTeamColors } from '../constants/teamColors';

export function usePartyTeam() {
  const { gameState } = useGameState();
  
  const currentPlayerTeam = useMemo(() => {
    if (gameState?.currentPlayer === undefined) return null;
    return getTeamFromIndex(gameState.currentPlayer);
  }, [gameState?.currentPlayer]);
  
  const currentPlayerColors = useMemo(() => {
    if (!currentPlayerTeam) return null;
    return getTeamColors(currentPlayerTeam);
  }, [currentPlayerTeam]);
  
  const isMyTurn = (playerIndex: number) => {
    return gameState?.currentPlayer === playerIndex;
  };
  
  const isMyTeam = (playerIndex: number) => {
    if (gameState?.currentPlayer === undefined) return false;
    return areTeammates(gameState.currentPlayer, playerIndex);
  };
  
  return {
    currentPlayerTeam,
    currentPlayerColors,
    isMyTurn,
    isMyTeam,
  };
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `constants/teamColors.ts` | NEW - Team color definitions |
| `shared/game/team.js` | Add player tag functions |
| `types/game.types.ts` | Add team color types |
| `components/table/BuildStackView.tsx` | Team color borders, player tags |
| `components/table/items/TableItemRenderer.tsx` | Team-based styling |
| `components/table/items/BuildStackItem.tsx` | Team ownership display |
| `components/game/PlayerHandArea.tsx` | Team highlighting |
| `components/game/GameStatusBar.tsx` | Current team indicator |
| `hooks/usePartyTeam.ts` | NEW - Team context hook |

---

## Testing Scenarios

1. **Initial Display**: All players show correct team colors and P1/P2 labels
2. **Turn Change**: Colors update when turn changes teams
3. **Build Ownership**: Own team's builds show friendly color, enemy show opposing color
4. **Multiplayer Sync**: Team colors consistent across all clients
