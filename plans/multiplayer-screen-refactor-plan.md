# Multiplayer Screen Refactor Plan

## Overview
Refactor `app/multiplayer.tsx` (and `app/party-game.tsx`) from monolithic screens into modular, composable components with clear separation of concerns.

## Current Problems
- Single file handling connection, game state, UI, animations, notifications
- ~550+ lines in multiplayer.tsx with mixed responsibilities
- Hard to maintain, test, and reuse
- Styles mixed with logic

## Target Architecture

```
app/
├── multiplayer.tsx          # Container component (thin)
└── party-game.tsx           # Container component (thin)

components/
├── lobby/                   # NEW: Lobby-specific components
│   ├── index.ts
│   ├── ConnectingScreen.tsx
│   ├── LobbyHeader.tsx
│   ├── DuelCard.tsx         # VS card for duel mode
│   ├── PlayerCard.tsx       # Reusable player card
│   ├── ReadyButton.tsx
│   ├── StatusSection.tsx
│   ├── NotificationBanner.tsx
│   └── PartyGrid.tsx        # 2x2 grid for party mode
│
├── game/                    # Existing game components
│   └── GameBoard.tsx
│
└── ui/                      # Shared UI components
    └── ...

hooks/
├── useMultiplayerGame.ts    # Existing - game logic
├── useLobbyState.ts         # NEW: Lobby-specific state
├── useNotification.ts       # NEW: Notification logic
└── usePlayerProfile.ts      # Existing

styles/
└── lobby.ts                 # NEW: Shared lobby styles
```

## Implementation Phases

### Phase 1: Create Lobby Components
**Goal:** Extract UI into presentational components

1. **Create `components/lobby/` directory**
2. **Extract `ConnectingScreen.tsx`**
   - Props: `title`, `subtitle`, `mode` (duel/party)
   - No internal state

3. **Extract `LobbyHeader.tsx`**
   - Props: `title`, `subtitle`, `connectionStatus`, `onBack`
   - Compact design without back button

4. **Extract `DuelCard.tsx`** (for multiplayer.tsx)
   - Props: `player`, `opponent`, `isReady`, `opponentReady`
   - VS layout with two player sides

5. **Extract `PlayerCard.tsx`**
   - Props: `username`, `avatar`, `isReady`, `ping`, `isEmpty`
   - Reusable for both duel and party modes

6. **Extract `ReadyButton.tsx`**
   - Props: `isReady`, `onToggle`, `disabled`
   - Handles press animation

7. **Extract `StatusSection.tsx`**
   - Props: `status` (waiting/ready/error), `message`
   - Different visual states

8. **Extract `NotificationBanner.tsx`**
   - Props: `message`, `visible`
   - Handles slide animation internally

### Phase 2: Create Custom Hooks
**Goal:** Extract stateful logic into hooks

1. **Create `hooks/useLobbyState.ts`**
   - Manages: `isReady`, `opponentReady` (for demo), ready toggle
   - Returns: state + callbacks
   - Can be extended for real socket events later

2. **Create `hooks/useNotification.ts`**
   - Manages: notification message, show/hide logic
   - Handles: Animated.Value, show/hide timing
   - Returns: `notification`, `showNotification`, `clearNotification`

3. **Create `hooks/useGameNavigation.ts`**
   - Manages: back button, routing
   - Returns: `goBack`, `restart`, `exitToMenu`

### Phase 3: Refactor MultiplayerScreen
**Goal:** Make it a thin container

1. **Simplify `app/multiplayer.tsx`**
   ```tsx
   export default function MultiplayerScreen() {
     const { isConnected, gameState, ... } = useMultiplayerGame({ mode: 'duel' });
     const { profile } = usePlayerProfile();
     const { isReady, opponentReady, toggleReady } = useLobbyState();
     const { notification, showNotification } = useNotification();

     // Effects for notifications
     useEffect(() => {
       if (gameState == null && isConnected) {
         showNotification('Opponent joined! Game starting...');
       }
     }, [gameState, isConnected]);

     if (!isConnected) return <ConnectingScreen title="Connecting..." subtitle="Finding opponent" />;
     if (!gameState) return (
       <LobbyScreen
         profile={profile}
         isReady={isReady}
         opponentReady={opponentReady}
         onToggleReady={toggleReady}
         notification={notification}
       />
     );
     return <GameBoardWrapper ... />;
   }
   ```

2. **Extract styles to `styles/lobby.ts`**
   - Shared styles between screens
   - Theme constants

### Phase 4: Apply Same to Party Game
**Goal:** Consistency across modes

1. **Extract `components/lobby/PartyGrid.tsx`**
   - 2x2 grid layout for 4 players
   - Uses PlayerCard internally

2. **Refactor `app/party-game.tsx`**
   - Same pattern as multiplayer.tsx
   - Uses PartyGrid instead of DuelCard

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Lines in screen | ~550 | ~80 |
| Testability | Hard | Easy (mock hooks) |
| Reusability | Low | High (PlayerCard shared) |
| Maintainability | Single huge file | Small focused files |
| Readability | Mixed concerns | Clear separation |

## Files to Create

```
components/lobby/
├── index.ts                 # Barrel export
├── ConnectingScreen.tsx     # ~30 lines
├── LobbyHeader.tsx          # ~40 lines
├── DuelCard.tsx             # ~80 lines
├── PlayerCard.tsx           # ~60 lines
├── ReadyButton.tsx          # ~40 lines
├── StatusSection.tsx        # ~50 lines
├── NotificationBanner.tsx   # ~50 lines
└── PartyGrid.tsx            # ~80 lines

hooks/
├── useLobbyState.ts         # ~40 lines
├── useNotification.ts       # ~50 lines
└── useGameNavigation.ts     # ~30 lines

styles/
└── lobby.ts                 # ~100 lines (shared styles)
```

## Implementation Order

1. Create directory structure
2. Create styles file (styles/lobby.ts)
3. Create hooks (useLobbyState, useNotification)
4. Create components (bottom-up: simplest first)
5. Refactor multiplayer.tsx
6. Refactor party-game.tsx
7. Test both modes

## Notes
- Keep the existing GameBoard import as-is
- Maintain current visual design (no design changes)
- Ensure no breaking changes to existing functionality
- Party game will share most components with duel mode
