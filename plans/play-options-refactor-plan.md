# PlayOptionsModal Refactoring Plan

## Objective
Refactor `PlayOptionsModal.tsx` to match the button styles and card preview section styling from `StealBuildModal.tsx`, replacing the current pill tab navigation with button-style components, using green theme as the main accent.

---

## Current vs Target Comparison

### 1. Card Preview Section

| Aspect | Current (PlayOptionsModal) | Target (StealBuildModal) |
|--------|----------------------------|---------------------------|
| Container | `fanZone` with `position: relative` and fixed height (96) | `cardsRow` with flexbox row layout |
| Card Wrapper | Separate `cardWrapper` with `-4` negative margin for overlapping | Direct `PlayingCard` components with `gap: 4` |
| Card Size | Default (no explicit size) | Explicit `width={36}` `height={48}` |
| Layout | Wrapped flex container | Single horizontal row |

**Changes Needed:**
- Replace `fanZone` + `cardsRow` + `cardWrapper` with single `cardsRow` style
- Remove `marginHorizontal: -4` wrapper approach
- Add explicit card dimensions (36x48) like StealBuildModal
- Use `gap: 4` for spacing between cards

---

### 2. Build Option Buttons

| Aspect | Current (PlayOptionsModal) | Target (StealBuildModal) |
|--------|----------------------------|---------------------------|
| Layout | Pill-style chips in horizontal `valRow` | Full-width button components |
| Styling | `vchip` with 38x38 min size, circular | `btnDynamic` with 100% width, rectangular |
| Variants | `vchipSel` (selected), `vchipRv` (red variant) | Single unified style |
| Text | `vchipText` with 15px font | `btnText` with 16px font |

**Changes Needed:**
- Replace horizontal `valRow` of pill chips with stacked full-width buttons
- Apply `btnGreen` style from StealBuildModal (green theme)
- Each build value option becomes a full-width button: "Build {value}"
- Team build options remain as buttons with "(Team)" label

---

### 3. Button Styles

#### Current `btnGreen` (PlayOptionsModal):
```javascript
btnGreen: {
  width: '100%',
  paddingVertical: 13,
  paddingHorizontal: 16,
  borderRadius: 13,
  backgroundColor: '#1e7d3a',    // Dark green
  borderWidth: 1.5,
  borderColor: '#28a745',         // Bright green border
  alignItems: 'center',
  marginBottom: 7,
}
```

#### Target `btnGreen` (matching StealBuildModal pattern):
```javascript
btnGreen: {
  width: '100%',
  paddingVertical: 13,
  paddingHorizontal: 16,
  borderRadius: 13,
  backgroundColor: '#1e7d3a',    // Keep green
  borderWidth: 1.5,
  borderColor: '#28a745',         // Bright green border
  alignItems: 'center',
  marginBottom: 7,
}
```

**Changes Needed:**
- Keep `btnGreen` style but ensure consistency
- Consider adding subtle shadow like StealBuildModal's `glowWrapper`

---

### 4. Cancel Button

| Aspect | Current (PlayOptionsModal) | Target (StealBuildModal) |
|--------|----------------------------|---------------------------|
| Style | `btnGhost` with 7% white bg, muted border | `btnGhost` with 5% white bg, red-tinted border |
| Text | `btnGhostText` with muted green `#6b8a72` | `btnGhostText` with muted red `#9b5555` |

**Changes Needed:**
- Update `btnGhost` border to use subtle green tint (not red)
- Keep text color muted green `#6b8a72`

---

### 5. Color Theme

| Element | Current Color | Target Color |
|---------|--------------|--------------|
| Cards row plus sign | N/A | Green `#5a8a68` |
| Info/new value text | N/A | Gold `#fbbf24` |
| Buttons | Green `#1e7d3a` | Keep green |
| Cancel | Muted green | Muted green |

**Changes Needed:**
- Add `plusSign` style with green color
- Add `newValueText` style for displaying build summary

---

## Implementation Checklist

### Phase 1: Card Preview Refactoring
- [ ] Replace `fanZone` container with single `cardsRow` flex container
- [ ] Remove `cardWrapper` styles and negative margins
- [ ] Add explicit card dimensions (36x48)
- [ ] Add `plusSign` style with green color for visual separator

### Phase 2: Button Styling
- [ ] Replace `valRow` horizontal pill layout with stacked buttons
- [ ] Convert each build value option to full-width `btnGreen` button
- [ ] Update button text to include "Build {value}" format
- [ ] Keep team build options as separate buttons with "(Team)" suffix

### Phase 3: Cancel Button
- [ ] Update `btnGhost` to use subtle green theme tint
- [ ] Keep `btnGhostText` with muted green color

### Phase 4: Polish
- [ ] Add `marginBottom` spacing between card row and buttons
- [ ] Ensure consistent `borderRadius` (13px) across all buttons
- [ ] Verify green theme colors throughout

---

## Final Structure

```
PlayOptionsModal
├── ModalSurface (green theme)
│   ├── Card preview row (single horizontal line)
│   │   ├── PlayingCard × cards.length
│   │   └── Plus sign separator
│   ├── Build option buttons (stacked)
│   │   ├── "Build {totalSum}" (if hasTotalMatch)
│   │   ├── "Build {buildValue}" (if hasDiffMatch)
│   │   ├── "Build {val}" × other options
│   │   └── "Build {val} (Team)" × team options
│   ├── No options message (if needed)
│   └── Cancel button (ghost style)
```

---

## Files to Modify
- `components/modals/PlayOptionsModal.tsx` - Complete refactor