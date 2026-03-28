# Unified GameOverModal Style System Plan

## Overview
Create a centralized game over UI system that applies consistent formatting, styling, animations, and point display across all multiplayer game modes. This ensures players have a consistent experience regardless of which game mode they play.

## Current Analysis

### Existing Implementation
- **Location**: `components/modals/GameOverModal.tsx` (713 lines)
- **Current Support**: 2-player, 3-player, 4-player (party mode & free-for-all), tournament mode
- **Unified Elements**:
  - Color scheme: Green background (#1B5E20), gold accents (#FFD700), white text
  - Animation: Fade + spring scale on appear
  - Layout containers for each player count
  - Shared components: PlayerPanel, TeamPanel, breakdown rows

### Gap Analysis
1. **Party Mode Display**: Uses TeamPanel but styling differs from multiplayer format
2. **Scoring Elements**: Only shows cards, spades, 10♦, 2♠, Aces, bonuses - no jackpots/other scoring
3. **Negative/Zero Handling**: Not explicitly handled - just displays values as-is
4. **Style Configuration**: All styles are inline in component - no centralized config

## Proposed Solution

### 1. Create Style Configuration
Create `shared/config/gameOverStyles.ts`:
```typescript
export const GAME_OVER_COLORS = {
  background: '#1B5E20',
  gold: '#FFD700',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.85)',
  panelBg: 'rgba(255, 255, 255, 0.08)',
  separator: 'rgba(255, 255, 255, 0.2)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.75)',
};

export const GAME_OVER_SIZES = {
  modalRadius: 12,
  panelRadius: 8,
  titleSize: 28,
  scoreSize: 22,
  labelSize: 11,
  winnerSize: 20,
};

export const GAME_OVER_ANIMATION = {
  fadeDuration: 500,
  springConfig: { friction: 8, tension: 40 },
  initialScale: 0.8,
};

export const SCORING_LABELS = {
  tenDiamond: '10♦',
  twoSpade: '2♠',
  aces: 'Aces',
  spades: 'Spades',
  cards: 'Cards',
  contributions: 'Contributions',
};
```

### 2. Add Extended Scoring Types
Extend the interface to support additional scoring:
```typescript
interface ExtendedScoreData {
  // Existing
  tenDiamondPoints?: number;
  twoSpadePoints?: number;
  acePoints?: number;
  spadeBonus?: number;
  cardCountBonus?: number;
  
  // New
  jackpotAmount?: number;
  bonusAmount?: number;
  penaltyAmount?: number;
  winMultiplier?: number;
}
```

### 3. Standardize Party Mode Display
Ensure party mode uses identical styling to multiplayer:
- TeamPanel styling matches PlayerPanel
- Team scores displayed with same typography as player scores
- Win/loss indicators consistent across all modes

### 4. Handle Edge Cases
- **Negative scores**: Display in red, prefix with minus sign
- **Zero scores**: Display "0" with neutral styling
- **Tie games**: Consistent "It's a Tie!" message format

### 5. Refactor GameOverModal
Update to use centralized styles:
```typescript
import { 
  GAME_OVER_COLORS, 
  GAME_OVER_SIZES, 
  GAME_OVER_ANIMATION,
  SCORING_LABELS 
} from '../../shared/config/gameOverStyles';
```

## Implementation Steps

### Step 1: Create Style Configuration
- Create `shared/config/gameOverStyles.ts`
- Define all colors, sizes, animations, labels
- Export type-safe constants

### Step 2: Update GameOverModal Imports
- Replace inline styles with config imports
- Ensure all mode types use same style references

### Step 3: Add Extended Scoring Display
- Add render functions for new score types
- Handle display for jackpots, bonuses, penalties

### Step 4: Standardize Party Mode
- Update TeamPanel to use identical styling
- Ensure team score display matches player score format

### Step 5: Handle Edge Cases
- Add conditional styling for negative/zero values
- Update winner text generation logic

### Step 6: Test All Modes
- 2-player: Verify player panel display
- 3-player: Verify 3-column layout
- 4-player: Verify grid layout
- Party mode: Verify team panel matches player style
- Tournament: Verify badges and status display

## Files to Modify
1. Create: `shared/config/gameOverStyles.ts`
2. Modify: `components/modals/GameOverModal.tsx`

## Testing Checklist
- [ ] 2-player mode displays correctly
- [ ] 3-player mode displays correctly
- [ ] 4-player free-for-all displays correctly
- [ ] Party mode team display matches player style
- [ ] Tournament mode shows badges correctly
- [ ] Negative scores display with proper styling
- [ ] Zero scores display with proper styling
- [ ] Animation plays on all modes
- [ ] All scoring elements (10♦, 2♠, Aces, etc.) display
- [ ] Jackpot/bonus display works when provided

## Notes
- The current implementation already has a strong foundation with unified colors and animations
- Main work is creating the config file and ensuring party mode matches the established format
- Extended scoring types are optional based on backend support