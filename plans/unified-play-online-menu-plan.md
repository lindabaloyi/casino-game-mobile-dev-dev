# Unified "Play Online" Menu Structure Plan

## Overview
Refactor the game mode navigation to create a unified "Play Online" entry point that consolidates all multiplayer game modes under a hierarchical menu structure.

## Current State Analysis

### Existing Game Modes
| Mode ID | Display Name | Route | Players |
|---------|-------------|-------|---------|
| `duel` | Multiplayer | `/multiplayer` | 2 |
| `three-hands` | Three Hands | `/multiplayer?mode=three-hands` | 3 |
| `party` | Party Mode | `/party-game` | 4 |

### Current Navigation Flow
```
HomeScreen
├── Vs AI → /cpu-game
├── Multiplayer → /multiplayer (duel)
├── Private Room → /private-room
├── Party Mode → /party-game
└── Three Hands → /multiplayer?mode=three-hands
```

## Target State

### New Game Mode Structure
| Mode ID | Display Name | Route | Players | Icon |
|---------|-------------|-------|---------|------|
| `two-hands` | 2 Hands | `/multiplayer?mode=two-hands` | 2 | 👥 |
| `three-hands` | 3 Hands | `/multiplayer?mode=three-hands` | 3 | 👥👥 |
| `party` | Party Mode | `/multiplayer?mode=party` | 4 | 🎉 |

### New Navigation Flow
```
HomeScreen
├── Vs AI → /cpu-game
├── Play Online (dropdown/modal)
│   ├── 2 Hands (1v1) → /multiplayer?mode=two-hands
│   ├── 3 Hands (Solo) → /multiplayer?mode=three-hands
│   └── Party Mode (2v2) → /multiplayer?mode=party
├── Private Room → /private-room
└── Party Mode → (removed, now under Play Online)
└── Three Hands → (removed, now under Play Online)
```

## Implementation Plan

### Phase 1: Update Type Definitions

#### 1.1 Rename 'duel' to 'two-hands'
- Update `hooks/multiplayer/useRoom.ts` - GameMode type
- Update `hooks/multiplayer/useSocketConnection.ts` - GameMode type
- Update `hooks/useMultiplayerGame.ts` - GameMode type
- Update all references in game logic files

### Phase 2: Create Play Online Menu Component

#### 2.1 Create PlayOnlineMenu component
- Location: `components/home/PlayOnlineMenu.tsx`
- Features:
  - Modal or dropdown overlay
  - Three game mode options with icons and descriptions
  - Player count indicator
  - Animated selection

#### 2.2 Update HomeScreen
- Replace individual multiplayer buttons with single "Play Online" button
- Import and render PlayOnlineMenu component
- Manage modal visibility state

### Phase 3: Update Navigation Handlers

#### 3.1 Update useHomeScreen
- Remove `handleMultiplayer`, `handlePartyMode`, `handleThreeHands`
- Add `handlePlayOnline` to open menu modal
- Add `navigateToGameMode(mode)` for menu selections

#### 3.2 Update GameButtons
- Replace multiple buttons with single "Play Online" button
- Remove Private Room button (can be under Play Online too)

### Phase 4: Update Screen Components

#### 4.1 Update multiplayer.tsx
- Change default mode from 'duel' to 'two-hands'
- Update getModeInfo() to use new mode IDs:
  - 'two-hands': "⚔️ 2 Hands", "1v1 Battle"
  - 'three-hands': "🎴 3 Hands", "3 Player Solo"
  - 'party': "🎉 Party Mode", "2v2 Battle"

### Phase 5: Socket Queue Updates

#### 5.1 Update useSocketConnection
- Handle 'join-two-hands-queue' (renamed from 'join-duel-queue' or add new)
- Keep existing 'join-three-hands-queue'
- Keep existing 'join-party-queue'

## Files to Modify

### New Files
- `components/home/PlayOnlineMenu.tsx` - New menu component

### Modified Files
1. `hooks/multiplayer/useRoom.ts` - Update GameMode type
2. `hooks/multiplayer/useSocketConnection.ts` - Update GameMode + queue handlers
3. `hooks/useMultiplayerGame.ts` - Update GameMode type
4. `components/home/useHomeScreen.ts` - Add menu handlers
5. `components/home/GameButtons.tsx` - Simplify to single Play Online button
6. `app/multiplayer.tsx` - Update default mode and labels

### Optional: Remove/Deprecate
- Potentially remove `/party-game.tsx` route (can redirect to `/multiplayer?mode=party`)

## UI Mockup

```
┌─────────────────────────────────┐
│         Play Online             │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ ⚔️  2 Hands               │  │
│  │    1v1 Battle             │  │
│  │    ─────────────────────  │  │
│  │    Find opponent for      │  │
│  │    classic duel match     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🎴  3 Hands              │  │
│  │    Solo Play             │  │
│  │    ─────────────────────  │  │
│  │    Face off against      │  │
│  │    two opponents         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🎉  Party Mode            │  │
│  │    2v2 Team Battle       │  │
│  │    ─────────────────────  │  │
│  │    Team up with a        │  │
│  │    friend for 2v2 match   │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## Implementation Order

1. Update type definitions (GameMode: 'two-hands' instead of 'duel')
2. Create PlayOnlineMenu component
3. Update useHomeScreen with new handlers
4. Update GameButtons
5. Update multiplayer.tsx for new mode handling
6. Update socket connection for queue events
7. Test all game modes work correctly

## Risks and Considerations

1. **Server compatibility**: Ensure server handles new queue events ('join-two-hands-queue')
2. **Backward compatibility**: May need to support 'duel' for existing saved games/room codes
3. **Private Room**: Decide if it stays separate or moves under Play Online
4. **Party Game route**: Consider redirecting `/party-game` to `/multiplayer?mode=party`
