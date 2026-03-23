# Tournament Qualification Confirmation UI System

## Overview

This document outlines the architectural plan for implementing a qualification confirmation UI system for the Casino game tournament. The system displays qualified players with detailed score breakdowns, includes a 10-second countdown timer, and automatically transitions to the semifinal round.

## Current State

Currently, the tournament has these phases:
- `QUALIFYING` - Initial rounds where players are eliminated
- `SEMI_FINAL` - When 3 players remain
- `FINAL_SHOWDOWN` - When 2 players remain
- `COMPLETED` - Tournament finished

## Requirements

### 1. Qualification Screen UI
- Display all qualified players (top 2 after qualifying rounds)
- Show detailed score breakdown for each qualified player:
  - Points from captured cards
  - 10 of diamonds bonus
  - 2 of spades points
  - Ace points
  - Spade suit bonuses
  - Card count bonuses

### 2. Countdown Timer
- 10-second countdown displayed prominently
- Visual indication of semifinal start time
- Automatic transition when countdown reaches zero

### 3. Semifinal Initialization
- Initialize game state with only qualified players
- Set up appropriate table configuration
- Trigger first deal of semifinal hands

## Architecture Plan

### 1. New Tournament Phase

Add a new phase to the tournament:
```
tournamentPhase: 'QUALIFYING' | 'QUALIFICATION_REVIEW' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED'
```

### 2. State Management Updates

#### Game State (`shared/game/initialization.js`)
Add new fields:
```javascript
tournamentPhase: 'QUALIFICATION_REVIEW',
qualificationCountdown: 10, // seconds remaining
qualifiedPlayers: [playerIndex1, playerIndex2], // players advancing to semifinal
qualificationScores: {
  [playerIndex]: {
    totalPoints: number,
    cardPoints: number,
    tenDiamondPoints: number,
    twoSpadePoints: number,
    acePoints: number,
    spadeBonus: number,
    cardCountBonus: number,
  }
}
```

#### Server Action (`shared/game/actions/endTournamentRound.js`)
Modify to:
1. Calculate detailed score breakdown for each player
2. Determine top 2 qualified players
3. Set `tournamentPhase` to `QUALIFICATION_REVIEW`
4. Initialize countdown and qualified players data

### 3. UI Components

#### New Component: `QualificationReviewModal.tsx`
Location: `components/tournament/QualificationReviewModal.tsx`

Features:
- Display qualified players list with rank (1st, 2nd)
- Show score breakdown for each qualified player
- Prominent 10-second countdown timer
- Visual countdown progress (circular or bar)
- Handle "Ready" button to skip wait (optional)

#### Component Structure:
```typescript
interface QualificationData {
  qualifiedPlayers: Array<{
    playerIndex: number;
    rank: 1 | 2;
    score: {
      totalPoints: number;
      cardPoints: number;
      tenDiamondPoints: number;
      twoSpadePoints: number;
      acePoints: number;
      spadeBonus: number;
      cardCountBonus: number;
    };
  }>;
  countdownSeconds: number;
}
```

#### Score Breakdown Display:
```
┌─────────────────────────────────────────┐
│      🎉 QUALIFICATION COMPLETE! 🎉      │
├─────────────────────────────────────────┤
│  🥇 Player 1 - 1st Place              │
│  ┌─────────────────────────────────┐   │
│  │ Total Points: 7                 │   │
│  │   • Card Points: 4             │   │
│  │   • 10♦ Bonus: 2               │   │
│  │   • 2♠ Points: 0               │   │
│  │   • Ace Points: 2              │   │
│  │   • Spade Bonus: 0             │   │
│  │   • Card Count Bonus: 1       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🥈 Player 3 - 2nd Place               │
│  ┌─────────────────────────────────┐   │
│  │ Total Points: 4                 │   │
│  │   • Card Points: 2             │   │
│  │   • 10♦ Bonus: 0               │   │
│  │   • 2♠ Points: 1               │   │
│  │   • Ace Points: 1              │   │
│  │   • Spade Bonus: 0             │   │
│  │   • Card Count Bonus: 0        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ⏰ SEMIFINAL STARTS IN:               │
│  ┌─────────────────────────────────┐   │
│  │          🔟 10                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 4. Timer Logic

#### Client-Side Timer (`hooks/useTournamentStatus.ts`)
- Sync countdown with server state
- Display countdown in UI
- Handle timer expiration

#### Server-Side Timer (`shared/game/actions/startQualificationReview.js`)
New action to:
1. Set qualification review phase
2. Start 10-second countdown
3. Broadcast to all clients

```javascript
function startQualificationReview(state) {
  // Calculate qualified players (top 2 by score)
  const sortedPlayers = getSortedPlayersByScore(state);
  const qualified = sortedPlayers.slice(0, 2);
  
  // Calculate detailed score breakdowns
  const qualificationScores = {};
  for (const player of qualified) {
    qualificationScores[player.index] = getScoreBreakdown(player.captures);
  }
  
  return {
    ...state,
    tournamentPhase: 'QUALIFICATION_REVIEW',
    qualifiedPlayers: qualified.map(p => p.index),
    qualificationScores,
    qualificationCountdown: 10,
  };
}
```

### 5. Game Flow Transitions

#### Flow Diagram:
```
QUALIFYING Round End
       │
       ▼
┌──────────────────┐
│ Calculate Scores │
│ Determine Top 2 │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Start Qualification     │
│ Review (10 sec)         │
│ • Show qualified players│
│ • Display score breakdown│
│ • Start countdown       │
└────────┬───────────────┘
         │
    Countdown = 0
         │
         ▼
┌──────────────────────────┐
│ Initialize Semifinal     │
│ • Filter to 2 players   │
│ • Reset deck            │
│ • Deal cards            │
│ • Set phase SEMI_FINAL  │
└──────────────────────────┘
         │
         ▼
   SEMI_FINAL Round
```

### 6. Edge Cases

#### Late Qualifiers
- If a player reconnects during qualification review, immediately show them the qualification screen
- Their score data should already be in state

#### Reconnection During Countdown
- Server maintains authoritative countdown
- On reconnect, client receives current state including countdown value
- If countdown expired while disconnected, server immediately starts semifinal

#### Player Disconnection Before Semifinal
- If a qualified player disconnects:
  - Wait for reconnection (timeout: 30 seconds)
  - If they don't reconnect, the remaining player automatically advances
  - OR: Start semifinal with available player + AI (future feature)

#### Semifinal Start Failure
- If semifinal initialization fails, retry up to 3 times
- Log errors for debugging

### 7. Implementation Steps

#### Phase 1: State & Logic
1. [ ] Update tournament phase enum to include `QUALIFICATION_REVIEW`
2. [ ] Add new state fields to initialization.js
3. [ ] Create `startQualificationReview.js` action
4. [ ] Update `endTournamentRound.js` to call qualification review

#### Phase 2: UI Components
1. [ ] Create `QualificationReviewModal.tsx`
2. [ ] Add score breakdown display component
3. [ ] Add countdown timer component
4. [ ] Update GameBoard to show modal for qualification review phase

#### Phase 3: Integration
1. [ ] Update useTournamentStatus hook
2. [ ] Update GameModals to include new modal
3. [ ] Test full flow

#### Phase 4: Edge Cases
1. [ ] Handle disconnection during qualification
2. [ ] Handle reconnection
3. [ ] Test countdown synchronization

### 8. Files to Modify

#### New Files:
- `shared/game/actions/startQualificationReview.js` - New action
- `components/tournament/QualificationReviewModal.tsx` - New UI

#### Modified Files:
- `shared/game/initialization.js` - Add state fields
- `shared/game/actions/endTournamentRound.js` - Trigger qualification
- `shared/game/index.js` - Export new action
- `hooks/useTournamentStatus.ts` - Handle new phase
- `components/game/GameModals.tsx` - Include new modal
- `components/game/GameBoard.tsx` - Render modal for phase
- `app/online-play.tsx` - Handle new phase display

### 9. Score Breakdown Calculation

Using existing scoring module (`shared/game/scoring.js`):

```javascript
const breakdown = getScoreBreakdown(player.captures);
// Returns:
// {
//   totalCards: number,
//   spadeCount: number,
//   cardPoints: number,      // 10♦ + 2♠ + Aces
//   spadeBonus: number,       // 6+ spades = 2
//   cardCountBonus: number,   // 20 cards = 1, 21+ = 2
//   totalScore: number        // cardPoints + spadeBonus + cardCountBonus
// }
```

### 10. Testing Checklist

- [ ] Qualification screen displays correctly after qualifying round
- [ ] Score breakdown shows all components
- [ ] Countdown timer starts at 10
- [ ] Countdown decrements every second
- [ ] Transition to semifinal occurs at 0
- [ ] Semifinal has correct 2 players
- [ ] Disconnected player sees qualification on reconnect
- [ ] Timer handles background/foreground transitions

## Summary

This plan provides a complete qualification confirmation UI system that:
1. Shows qualified players with detailed score breakdowns
2. Provides a clear 10-second countdown
3. Automatically transitions to semifinal
4. Handles edge cases gracefully

The implementation should follow the phased approach to ensure each component is tested before integration.
