# Modal Visual Design Specification

## Overview
This document captures the visual design spec for all casino-game modals. The UI uses a phone-shell mockup to demonstrate the exact styling for each modal.

## Design System

### Fonts
- Titles: **Playfair Display**, serif (700, 900 weight)
- Body/Buttons: **Nunito**, sans-serif (700, 800, 900 weight)

### Color Palette

| Name | Background | Border | Title Color | Use Case |
|------|------------|--------|--------------|----------|
| Green | #163520 | #28a745 | #e8f5e9 | Standard builds |
| Red | #2a0e0e | #dc2626 | #fca5a5 | Steal/capture/eliminated |
| Gold | #1e1505 | #c8a84b | #fde68a | Game over |

### Phone Shell
```
┌─────────────────────┐
│ ▪▪▪▪▪▪▪▪▪▪▪    │ ← 28px notch bar
│  ┌─────────────┐   │
│  │   MODAL    │   │ ← overlay with dim background
│  │   CONTENT  │   │
│  └─────────────┘   │
└─────────────────────┘
```

---

## Modal Designs

### 1. Build Options (Green)
- **Title:** "Build Options"
- **Subtitle:** "Choose a build value"
- **Layout:** Card fan (spread angles), value chips grid
- **Buttons:** "Build 4" (green), "Cancel" (ghost)

### 2. Steal Build (Green)
- **Title:** "STEAL Build" (all caps, gold accent)
- **Subtitle:** "Combined build"
- **Layout:** Table cards row with (+) and hand card, info box "New Value: 9"
- **Tag:** "Build will belong to you!" (green)
- **Buttons:** "✓ Confirm" (green), "Cancel" (ghost)

### 3. Capture or Steal (Red)
- **Title:** "Choose Action"
- **Subtitle:** "What to do with 5♣"
- **Layout:** Single card display
- **Buttons:** "Capture 5 / Take the build" (red), "Extend to 10 / Add to build" (green), "Cancel" (ghost)
- **Button subtext:** Small text below main button text

### 4. Extend Build (Green)
- **Title:** "Extend Build"
- **Subtitle:** "Add your card to the existing build"
- **Layout:** Table cards with (+), info box "New Value: 10"
- **Buttons:** "Extend" (green), "Cancel" (ghost)

### 5. Confirm Build (Green)  
- **Title:** "Confirm Build"
- **Subtitle:** "Finalise — opponents can still steal!"
- **Layout:** Card fan (support 8+ cards), info box with value and card count
- **Buttons:** "✓ Confirm" (gold), "Cancel" (ghost)

### 6. Eliminated (Red)
- **Title:** "Eliminated"
- **Layout:** Center-aligned, ✕ icon, message
- **Buttons:** "Return to Lobby" (outlined red), "Watch Tournament" (ghost)

### 7. Game Over (Gold)
- **Title:** "Game Over" (centered)
- **Icon:** 🏆 trophy
- **Layout:** Leaderboard with gold/silver/bronze rankings
- **Buttons:** "New Game" (gold), "Lobby" (ghost)

---

## Key Visual Elements

### Card Fan Display
- Fixed 96px height zone
- Cards fan from bottom-center anchor
- Angles scale down for many cards
- Cards pinned inside 28px horizontal padding

### Info Box
- Semi-transparent black background (#000, 32% opacity)
- Border radius: 11px
- Displays build value and contextual info

### Buttons
- Border radius: 13px
- Primary: Full background color
- Secondary/Ghost: 7% white background, 10% border
- Subtext: 12px, 78% opacity

### Modal Top Bar
- Fixed 5px height accent bar
- Matches modal theme color

---

## Implementation Notes

All modals should follow this spec:
1. Use consistent phone-shell dimensions (300px width)
2. Green/red/gold theme per modal type
3. Playfair Display for titles, Nunito for body
4. Card fan for multi-card displays
5. Info boxes for value summaries
6. Subtext on action buttons