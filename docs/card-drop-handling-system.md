# Card Drop Handling System

## Overview

The card drop handling system in this casino game manages how players can drag and drop cards onto various targets on the table (builds, loose cards, staging stacks, etc.). This document explains the complete flow from drag gesture to drop resolution, including bounds measurement and priority-based zone selection.

## System Architecture

### Core Components

1. **Drop Zone Registration** - Components register interactive areas
2. **Bounds Measurement** - `measureInWindow()` calculates screen coordinates
3. **Priority System** - Higher priority zones win conflicts
4. **Drop Zone Resolution** - Finds the best zone for a drop position
5. **Action Handling** - Executes the appropriate game action

### Key Files

- `hooks/useDropZoneResolver.ts` - Core drop zone resolution logic
- `hooks/useDropZoneRegistration.ts` - Zone registration utilities
- `components/table/BuildCardRenderer.tsx` - Build drop zone example
- `components/DraggableCard.tsx` - Initiates drag operations
- `constants/dropZonePriorities.ts` - Priority definitions

## Bounds Measurement

### How Windows Are Measured

Bounds measurement uses React Native's `measureInWindow()` method to calculate the screen coordinates of interactive elements. This is crucial for determining if a drop position falls within a drop zone.

#### Code Example: Build Bounds Measurement

```typescript
// From BuildCardRenderer.tsx
React.useEffect(() => {
  if (!stackRef.current) return;

  const measureBounds = () => {
    stackRef.current?.measureInWindow((x, y, width, height) => {
      // Skip invalid measurements
      if (x === 0 && y === 0) return;

      // Calculate expanded bounds for easier hitting
      const expansionFactor = 0.5; // 50% expansion
      const expandedWidth = width * (1 + expansionFactor);
      const expandedHeight = height * (1 + expansionFactor);
      const expandedX = x - (expandedWidth - width) / 2;
      const expandedY = y - (expandedHeight - height) / 2;

      const expandedBounds = {
        x: expandedX,
        y: expandedY,
        width: expandedWidth,
        height: expandedHeight
      };

      setDropZoneBounds(expandedBounds);
    });
  };

  measureBounds();
  const timeoutId = setTimeout(measureBounds, 100);
  return () => clearTimeout(timeoutId);
}, [stackId]);
```

#### Key Points

1. **`measureInWindow()`** returns coordinates relative to the screen
2. **Expansion Factor** makes zones easier to hit (50% larger in this case)
3. **Centering** ensures expansion is symmetrical around the original bounds
4. **Re-measurement** occurs on layout changes to handle dynamic content

#### Bounds Structure

```typescript
interface DropZoneBounds {
  x: number;      // Left edge X coordinate
  y: number;      // Top edge Y coordinate
  width: number;  // Zone width
  height: number; // Zone height
}
```

## Priority System

### Priority Levels

Drop zones have priority levels to resolve conflicts when multiple zones overlap. Higher priority zones take precedence.

#### Priority Constants (from `constants/dropZonePriorities.ts`)

```typescript
export const DROP_ZONE_PRIORITIES = {
  BUILD: 1000,           // Highest - Builds take precedence
  TEMP_STACK: 900,       // High - Active staging stacks
  LOOSE_CARD: 100,       // Medium - Individual loose cards
  TRAIL_TABLE: 0         // Lowest - Empty table areas
} as const;
```

### Priority Resolution Logic

```typescript
// From useDropZoneResolver.ts
let bestZone: DropZone | null = null;
let highestPriority = -1;

for (const zone of dropZones) {
  const inBounds = isPointInBounds(dropPosition, zone.bounds);

  if (inBounds) {
    const zonePriority = zone.priority || 0;
    if (zonePriority > highestPriority) {
      highestPriority = zonePriority;
      bestZone = zone;
    }
  }
}
```

#### Priority Examples

1. **Build zones (1000)** win over everything else
2. **Temp stacks (900)** win over loose cards
3. **Loose cards (100)** win over empty table
4. **Trail zones (0)** only activate when nothing else is available

## Complete Drop Flow

### Phase 1: Drag Start

```typescript
// From DraggableCard.tsx
const handleDragStart = (gestureState) => {
  // Create dragged item representation
  const draggedItem = {
    card: cardData,
    source: 'hand', // or 'table', 'captured', etc.
    originalPosition: index
  };

  // Notify drop zone system
  setGlobalDraggedItem(draggedItem);
};
```

### Phase 2: Drop Zone Registration

Components register their drop zones during rendering:

```typescript
// From BuildCardRenderer.tsx
React.useEffect(() => {
  if (!dropZoneBounds) return;

  const dropZone = {
    stackId: buildItem.buildId, // ✅ Use actual build ID
    priority: 1000,             // Highest priority for builds
    bounds: dropZoneBounds,
    zoneType: 'BUILD',
    onDrop: handleBuildDrop
  };

  // Register globally
  (global as any).dropZones.push(dropZone);

  return () => {
    // Cleanup on unmount
    (global as any).dropZones = (global as any).dropZones.filter(
      (zone: any) => zone.stackId !== stackId
    );
  };
}, [dropZoneBounds]);
```

### Phase 3: Drag End & Drop Resolution

```typescript
// From DraggableCard.tsx
const handleDragEnd = (gestureState) => {
  const dropPosition = {
    x: gestureState.moveX,
    y: gestureState.moveY
  };

  // Resolve which zone was dropped on
  const resolution = resolveDropZone(dropPosition, 'hand');

  if (resolution.bestZone) {
    // Execute the drop
    resolution.bestZone.onDrop({
      card: cardData,
      source: 'hand',
      dropPosition
    });
  } else {
    // Snap back to original position
    snapBackToOrigin();
  }
};
```

## Drop Zone Resolution Algorithm

### Detailed Resolution Process

```typescript
// From useDropZoneResolver.ts
export const useDropZoneResolver = () => {
  const resolveDropZone = useCallback((dropPosition, source) => {
    const dropZones = (global as any).dropZones || [];

    console.log(`[useDropZoneResolver] 🔍 Checking ${source} drop against ${dropZones.length} zones at (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);

    let bestZone = null;
    let highestPriority = -1;

    // Check each zone for collision
    for (const zone of dropZones) {
      const { x, y, width, height } = zone.bounds;

      // Bounds check
      const inBounds = dropPosition.x >= x &&
          dropPosition.x <= x + width &&
          dropPosition.y >= y &&
          dropPosition.y <= y + height;

      if (zone.zoneType === 'BUILD') {
        // Enhanced build zone debugging
        console.log('[DROP_POSITION] 🔍 BUILD ZONE ANALYSIS:', {
          zoneId: zone.stackId,
          dropPosition: { x: dropPosition.x.toFixed(1), y: dropPosition.y.toFixed(1) },
          zoneBounds: { x: x.toFixed(1), y: y.toFixed(1), width: width.toFixed(1), height: height.toFixed(1) },
          inBounds,
          boundaryDistances: {
            left: (dropPosition.x - x).toFixed(1),
            right: ((x + width) - dropPosition.x).toFixed(1),
            top: (dropPosition.y - y).toFixed(1),
            bottom: ((y + height) - dropPosition.y).toFixed(1)
          }
        });
      }

      if (inBounds) {
        const zonePriority = zone.priority || 0;
        if (zonePriority > highestPriority) {
          highestPriority = zonePriority;
          bestZone = zone;
          console.log(`[useDropZoneResolver] 🎯 NEW BEST ZONE: ${zone.stackId} (${zone.zoneType}, priority: ${zonePriority})`);
        }
      }
    }

    return {
      bestZone,
      bestZoneType: bestZone?.zoneType || 'NONE',
      priority: highestPriority,
      totalZones: dropZones.length,
      dropPosition
    };
  }, []);

  return { resolveDropZone };
};
```

### Resolution Output

```typescript
interface DropZoneResolutionResult {
  bestZone: DropZone | null;      // The winning drop zone
  bestZoneType: string;           // Type of winning zone ('BUILD', 'TEMP_STACK', etc.)
  priority: number;               // Priority level of winner
  totalZones: number;             // Total zones checked
  dropPosition: { x: number, y: number }; // Where the drop occurred
}
```

## Action Handling

### Build Augmentation Example

```typescript
// From BuildCardRenderer.tsx
const handleBuildDrop = React.useCallback((draggedItem: any) => {
  console.log('[FUNCTION] 🚀 ENTERING handleBuildDrop', {
    buildId: buildItem.buildId,
    draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
    timestamp: Date.now()
  });

  // Validation checks
  if (!draggedItem.card) return false;
  if (buildItem.owner !== currentPlayer) return false;

  // Send server action
  sendAction({
    type: 'addToBuilding',
    payload: {
      buildId: buildItem.buildId,  // ✅ Actual build ID
      card: draggedItem.card,
      source: draggedItem.source
    }
  });

  return true;
}, [buildItem.buildId, buildItem.owner, currentPlayer, sendAction]);
```

## Troubleshooting Common Issues

### Issue 1: Drop Zones Not Registering

**Symptoms:** Cards snap back immediately, no drop zones detected

**Causes:**
- Bounds measurement failed (x=0, y=0)
- Component unmounted before bounds measured
- Global drop zones registry not initialized

**Debug Steps:**
```typescript
// Check if zones are registered
console.log('Registered zones:', (global as any).dropZones);

// Check bounds measurement
console.log('Bounds for zone:', dropZoneBounds);
```

### Issue 2: Wrong Zone Selected

**Symptoms:** Card drops on wrong target despite visual alignment

**Causes:**
- Bounds calculations incorrect
- Priority levels wrong
- Multiple overlapping zones

**Debug Steps:**
```typescript
// Enable detailed logging in useDropZoneResolver
console.log('All zones checked:', dropZones.map(z => ({
  id: z.stackId,
  type: z.zoneType,
  priority: z.priority,
  inBounds: isPointInBounds(dropPosition, z.bounds)
})));
```

### Issue 3: Bounds Too Small

**Symptoms:** Hard to drop cards on targets, need pixel-perfect precision

**Solution:** Increase expansion factor
```typescript
const expansionFactor = 0.8; // 80% expansion instead of 50%
```

### Issue 4: Bounds Too Large

**Symptoms:** Cards drop on wrong targets due to overlapping zones

**Solution:** Reduce expansion or adjust priorities
```typescript
// Lower priority for overlapping zones
const dropZone = {
  priority: 800, // Instead of 1000
  // ...
};
```

## Performance Considerations

### Optimization Techniques

1. **Debounced Measurements** - Avoid excessive `measureInWindow()` calls
2. **Lazy Registration** - Only register zones when bounds are available
3. **Cleanup** - Remove zones when components unmount
4. **Memoization** - Cache expensive calculations

### Memory Management

```typescript
// Proper cleanup prevents memory leaks
React.useEffect(() => {
  // Register
  (global as any).dropZones.push(dropZone);

  return () => {
    // Cleanup
    (global as any).dropZones = (global as any).dropZones.filter(
      zone => zone.stackId !== stackId
    );
  };
}, [dropZone]);
```

## Testing Drop Zones

### Manual Testing Checklist

1. **Visual Feedback** - Ensure drop zones are visibly indicated
2. **Edge Cases** - Test drops at zone boundaries
3. **Priority Conflicts** - Verify higher priority zones win
4. **Bounds Accuracy** - Check that zones match visual elements
5. **Performance** - Ensure smooth dragging with many zones

### Debug Logging

Enable comprehensive logging for testing:

```typescript
// In useDropZoneResolver.ts
console.log('[DROP_DEBUG] Resolution result:', {
  dropPosition,
  bestZone: bestZone?.stackId,
  allZones: dropZones.length,
  priorities: dropZones.map(z => z.priority)
});
```

## Future Enhancements

### Potential Improvements

1. **Visual Drop Zone Indicators** - Show zone boundaries during drag
2. **Haptic Feedback** - Provide tactile feedback on valid drops
3. **Snap-to-Zone** - Automatically align cards with drop zones
4. **Multi-Touch Support** - Handle multiple simultaneous drops
5. **Accessibility** - Screen reader support for drop operations

### Advanced Priority System

```typescript
// Context-aware priority adjustments
const getDynamicPriority = (zone, gameState) => {
  let basePriority = DROP_ZONE_PRIORITIES[zone.zoneType];

  // Boost priority for player's own objects
  if (zone.owner === gameState.currentPlayer) {
    basePriority += 100;
  }

  // Reduce priority for inactive objects
  if (zone.isInactive) {
    basePriority -= 200;
  }

  return basePriority;
};
```

This comprehensive drop zone system ensures reliable, intuitive card interactions while maintaining performance and providing extensive debugging capabilities for development and troubleshooting.
