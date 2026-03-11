# ShiyaRecallModal Style Upgrade Plan

## Goal
Update ShiyaRecallModal to match the style and flow of PlayOptionsModal.

## Key Differences to Address

### 1. Visual Style

| Element | Current | Target (PlayOptionsModal) |
|---------|---------|--------------------------|
| Background | `#2C3E50` | `#1a472a` (green casino theme) |
| Border | `#F1C40F` (gold) | `#28a745` (green) |
| Title color | `#ECF0F1` | `#f59e0b` (orange/gold) |
| Card rendering | Text only | PlayingCard component |
| Click outside | No | Yes - dismisses modal |

### 2. Component Imports

Add:
```typescript
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';
```

### 3. Flow Updates

- Add `onRequestClose` prop to Modal
- Add click-outside to dismiss
- Add `clickOutside` touchable opacity

### 4. Button Styling

Match PlayOptionsModal button style:
- Add border styling
- Use consistent font sizes

---

## Implementation Steps

### Step 1: Update Imports
Add PlayingCard and Card type imports

### Step 2: Update Modal Structure
- Add `onRequestClose` to Modal
- Add click outside touchable

### Step 3: Update Card Rendering
Replace text-based cards with PlayingCard component

### Step 4: Update Styles
Match PlayOptionsModal color scheme and spacing

---

## Files to Modify

- `components/modals/ShiyaRecallModal.tsx`
