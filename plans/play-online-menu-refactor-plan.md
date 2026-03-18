# Play Online Menu Refactor Plan

## Goal
Refactor the Play Online submenu to match the main screen's green design language and simplify game mode options.

## Current State
- Background: `#1a1a2e` (dark blue)
- Game modes: 4 options (2 Hands, 3 Hands, Party, Free For All)
- Styling: Dark theme with gold accents

## Target State
- Background: `#1a5c1a` (green - matches main screen)
- Game modes: 4 simplified options:
  1. 2 Hands (2 players, 1v1)
  2. 3 Hands (3 players, solo)
  3. 4 Hands (4 players, free for all)
  4. 4 Hands Party (4 players, 2v2 teams)
- Styling: Match HomeMenuModal design

## Design Changes Required

### 1. Color Scheme
| Element | Current | New |
|---------|---------|-----|
| Background | `#1a1a2e` | `#1a5c1a` |
| Card BG | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.3)` |
| Border | `rgba(255,215,0,0.1)` | `rgba(255,255,255,0.1)` |

### 2. Game Mode Options
| Current | New |
|---------|-----|
| ⚔️ 2 Hands (1v1) | ⚔️ 2 Hands |
| 🎴 3 Hands (Solo) | 🎴 3 Hands |
| 🎉 Party Mode (2v2) | 🎉 4 Hands Party |
| 🏆 Free For All | 🎯 4 Hands |

### 3. Simplified Descriptions
- 2 Hands: "1v1 Battle"
- 3 Hands: "3 Player Battle"
- 4 Hands: "4 Player Battle"
- 4 Hands Party: "2v2 Team Battle"

## Implementation Steps

1. Update GAME_MODES array with new options
2. Update color scheme in styles to match HomeMenuModal
3. Ensure consistent typography (white text, gold accents)
4. Test functionality
