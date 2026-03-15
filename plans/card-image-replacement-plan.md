# Card Image Replacement Plan

## Executive Summary

This plan documents the replacement of code-generated playing cards (via React Native Text elements) with image assets for ranks Ace through 10, while maintaining code-rendered cards for face cards (J, Q, K) and card backs.

## Current State Analysis

### Card Components in Codebase

| Component | Location | Purpose |
|-----------|----------|---------|
| [`PlayingCard`](components/cards/PlayingCard.tsx:41) | `components/cards/` | Core card rendering - code-generated |
| [`DraggableHandCard`](components/cards/DraggableHandCard.tsx:79) | `components/cards/` | Player hand cards with drag functionality |
| `MiniCard` | `components/tutorials/` | Tutorial-specific small cards (no changes needed) |

### PlayingCard Current Implementation

**Default Dimensions:**
- Width: 56dp
- Height: 84dp
- Aspect Ratio: 1.5:1

**Responsive Logic** ([`PlayingCard.tsx:44-46`](components/cards/PlayingCard.tsx:44)):
```typescript
const responsiveWidth = Math.min(width, screenWidth / 7);
const responsiveHeight = Math.min(height, responsiveWidth * 1.5);
```

**Styling** ([`PlayingCard.tsx:92-108`](components/cards/PlayingCard.tsx:92)):
- Background: `#FAFAFA` (white-ish)
- Border: 1dp, `#D0D0D0`
- Border Radius: 7dp
- Shadow: elevation 5, shadowOpacity 0.25
- Corner rank/suit: bold Unicode characters
- Center suit: large Unicode character

### Available Image Assets

**Location:** `assets/images/cards/`

| Rank | Suits Available | Files |
|------|------------------|-------|
| 1 (Ace) | C, D, H, S | 1C.png, 1D.png, 1H.png, 1S.png |
| 2-10 | C, D, H, S | 2C.png through 10S.png |
| J, Q, K | ❌ Not available | - |
| Card Back | ❌ Not available | - |

**Total Images:** 40 (ranks 1-10, 4 suits each)

### Components Using PlayingCard

| Component | File | Usage |
|-----------|------|-------|
| [`DraggableHandCard`](components/cards/DraggableHandCard.tsx:206) | cards/ | Player's hand cards |
| [`StealBuildModal`](components/modals/StealBuildModal.tsx:58) | modals/ | Modal display |
| [`ExtendBuildModal`](components/modals/ExtendBuildModal.tsx:79) | modals/ | Modal display |
| [`ShiyaRecallModal`](components/modals/ShiyaRecallModal.tsx:77) | modals/ | Modal display |
| [`CaptureOrAddModal`](components/modals/CaptureOrAddModal.tsx:48) | modals/ | Modal display |
| [`PlayOptionsModal`](components/modals/PlayOptionsModal.tsx:191) | modals/ | Modal display |
| [`CapturePile`](components/table/CapturePile.tsx:152) | table/ | Table pile display |
| [`BuildStackView`](components/table/BuildStackView.tsx:319) | table/ | Stack display |
| [`DraggableOpponentCard`](components/table/DraggableOpponentCard.tsx:181) | table/ | Opponent cards |
| [`DraggableTableCard`](components/table/DraggableTableCard.tsx:141) | table/ | Table cards |
| [`StackCardPair`](components/table/StackCardPair.tsx:42) | table/ | Paired stack cards |
| [`TempStackView`](components/table/TempStackView.tsx:300) | table/ | Temp stack display |
| [`DragGhost`](components/game/DragGhost.tsx:15) | game/ | Drag preview |
| [`OpponentGhostCard`](components/game/OpponentGhostCard.tsx:164) | game/ | Ghost card display |
| [`PlayerHandArea`](components/game/PlayerHandArea.tsx:258) | game/ | Hand area container |

### Size Constants Across Codebase

| Location | Width | Height | Purpose |
|----------|-------|--------|---------|
| [`DraggableHandCard.tsx:34-35`](components/cards/DraggableHandCard.tsx:34) | 56 | 84 | Default card size |
| [`PlayerHandArea.tsx:102-103`](components/game/PlayerHandArea.tsx:102) | 56 | 84 | Hand area defaults |
| [`StackCardPair.tsx:14-15`](components/table/StackCardPair.tsx:14) | 56 | 84 | Stack card pair |
| [`TempStackView.tsx:27-28`](components/table/TempStackView.tsx:27) | 56 | 84 | Temp stack |

---

## Replacement Strategy

### Approach: Hybrid Rendering

The PlayingCard component will use a hybrid approach:
1. **Image assets** for ranks 1-10 (Ace through 10)
2. **Code-generated rendering** for J, Q, K (fallback to existing logic)
3. **Code-generated card back** for `faceDown={true}`

### Implementation Steps

#### Step 1: Create Card Image Map

Create a utility to map rank/suit to image require statements:

```typescript
// components/cards/cardImageMap.ts
const cardImages: Record<string, any> = {
  '1C': require('../../assets/images/cards/1C.png'),
  '1D': require('../../assets/images/cards/1D.png'),
  // ... all 40 images
};

export function getCardImage(rank: string, suit: string): any | null {
  const key = `${rank}${suit}`;
  return cardImages[key] || null;
}
```

#### Step 2: Update PlayingCard Component

Modify [`PlayingCard.tsx`](components/cards/PlayingCard.tsx:41):

```typescript
export function PlayingCard({ rank, suit, faceDown = false, style, width = 56, height = 84 }: PlayingCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive dimensions
  const responsiveWidth = Math.min(width, screenWidth / 7);
  const responsiveHeight = Math.min(height, responsiveWidth * 1.5);
  
  // Check if image asset exists for this rank/suit
  const cardImage = useMemo(() => getCardImage(rank, suit), [rank, suit]);
  const hasImage = !!cardImage;
  
  // Face-down uses existing code rendering
  if (faceDown) {
    return (
      <View style={[styles.card, { width: responsiveWidth, height: responsiveHeight }, styles.cardBack, style]}>
        {/* existing card back rendering */}
      </View>
    );
  }
  
  // Use image if available, otherwise fall back to code rendering
  if (hasImage) {
    return (
      <Image 
        source={cardImage} 
        style={{ width: responsiveWidth, height: responsiveHeight, borderRadius: 7 }}
        resizeMode="contain"
      />
    );
  }
  
  // Fallback to code-rendered card (for J, Q, K)
  return (
    <View style={[styles.card, { width: responsiveWidth, height: responsiveHeight }, style]}>
      {/* existing code rendering */}
    </View>
  );
}
```

#### Step 3: Preserve All Props and Functionality

The component must maintain:
- `width` and `height` props with defaults (56, 84)
- `faceDown` prop for card backs
- `style` prop for custom styling
- Responsive behavior via `useWindowDimensions`
- All existing styling (shadows, borders, etc.) for fallbacks

#### Step 4: Add Image Loading Optimization

```typescript
import { Image } from 'react-native';

// Pre-load images for smoother UX
const imageCache = new Set<string>();
export function preloadCardImages() {
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const suits = ['C', 'D', 'H', 'S'];
  
  ranks.forEach(rank => {
    suits.forEach(suit => {
      const key = `${rank}${suit}`;
      const image = getCardImage(rank, suit);
      if (image) {
        Image.prefetch(image);
      }
    });
  });
}
```

---

## Size Compatibility Analysis

### Current Code Dimensions vs. Expected Image Dimensions

| Dimension | Current Code | Required for Exact Match |
|-----------|-------------|------------------------|
| Width | 56dp (responsive, max) | Match image pixel width |
| Height | 84dp (responsive, max) | Match image pixel height |
| Aspect Ratio | 1.5:1 (56:84) | Must match images |

**Note:** Without knowing the exact pixel dimensions of the uploaded images, we assume they should match the current 56x84dp size. If images have different dimensions, two options exist:

1. **Scale to Fit**: Use `resizeMode: 'contain'` to fit images within the allocated space
2. **Exact Sizing**: Calculate exact dimensions to match image aspect ratio

### Recommended Approach

Use responsive sizing that preserves aspect ratio:

```typescript
const aspectRatio = 56 / 84; // 1.5:1
const responsiveWidth = Math.min(width, screenWidth / 7);
const responsiveHeight = responsiveWidth / aspectRatio;
```

---

## CSS/Style Updates Required

### PlayingCard Styles (Existing)

The existing styles should be preserved for fallback rendering:

```typescript
const styles = StyleSheet.create({
  card: {
    width: 56,
    height: 84,
    backgroundColor: '#FAFAFA',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ... other styles unchanged
});
```

### Image Container Styles (New)

```typescript
const imageStyle = {
  width: responsiveWidth,
  height: responsiveHeight,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#D0D0D0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
};
```

---

## Components Requiring Updates

### Primary Update: PlayingCard.tsx

This is the only component that needs direct modification. All other components use PlayingCard and will automatically benefit from the image rendering.

### Affected Components (Automatic - No Direct Changes Needed)

| Component | Why No Change |
|-----------|---------------|
| DraggableHandCard | Uses PlayingCard internally |
| All Modals | Use PlayingCard |
| All Table Components | Use PlayingCard |
| DragGhost | Uses PlayingCard |
| OpponentGhostCard | Uses PlayingCard |
| PlayerHandArea | Uses DraggableHandCard |

---

## Implementation Checklist

- [ ] Create `cardImageMap.ts` utility with all 40 image requires
- [ ] Update `PlayingCard.tsx` to:
  - [ ] Import Image component
  - [ ] Import cardImageMap
  - [ ] Add useMemo for image lookup
  - [ ] Add conditional rendering for image vs code
  - [ ] Preserve all props and responsive logic
  - [ ] Add Image styles matching card styles
- [ ] Test with all card ranks (1-10, J, Q, K)
- [ ] Test faceDown functionality
- [ ] Verify responsive behavior on different screen sizes
- [ ] Test