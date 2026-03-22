# Styling Consistency Plan

## Objective
Ensure all online play screens match the home page design with consistent fonts, colors, button shapes, and text sizes.

## Current Home Page Style Reference
- **Background**: `#0f4d0f` (dark green)
- **Title**: `#FFD700` (gold), bold, 42px
- **Subtitle**: white, 24px, fontWeight 300
- **Primary Button**: `#FFD700` background, `#0f4d0f` text, border-radius 10px
- **Secondary Button**: transparent background, `#FFD700` border, `#FFD700` text
- **Input Fields**: `rgba(0, 0, 0, 0.4)` background, `#FFD700` border

## Screens to Update

### 1. app/private-room.tsx
**Status**: Already consistent ✓
- Background: `#0f4d0f`
- Title: `#FFD700`
- Primary button: `#FFD700` background, `#0f4d0f` text
- Secondary button: transparent with `#FFD700` border

### 2. app/create-room.tsx
**Issues**:
- Title (line 184-188): `color: 'white'` → should be `#FFD700`
- Font sizes could match home page better

### 3. app/join-room.tsx
**Issues**:
- Title (line 212-216): `color: 'white'` → should be `#FFD700`
- Subtitle (line 218-221): Could use consistent styling

### 4. app/online-play.tsx
**Status**: Uses Lobby component which is consistent ✓

## Implementation Steps

1. **Create shared styling constants** (optional - for future use)
   - Add to `constants/theme.ts` or create new file

2. **Update create-room.tsx**
   - Change title color from white to `#FFD700`
   - Ensure button styles match home page

3. **Update join-room.tsx**
   - Change title color from white to `#FFD700`
   - Ensure button styles match home page

## Files to Modify
- `app/create-room.tsx`
- `app/join-room.tsx`

## Expected Outcome
All online play screens will have:
- Consistent gold (`#FFD700`) titles
- Consistent button styles matching home page
- Consistent background color
