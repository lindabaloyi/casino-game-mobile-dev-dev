# Build Augmentation Overlay System - Reuse Staging Logic

## Overview

Instead of creating a new overlay system, we can **reuse the existing StagingOverlay component and logic** for build augmentation. The staging system already has the overlay UI and flow we need.

## Current Staging System (What We Reuse)

### 1. StagingOverlay Component (`components/StagingOverlay.tsx`)

The existing staging overlay provides Accept/Cancel buttons with proper styling and animations. We can reuse this component for builds.

### 2. How Staging Overlays Work

**GameBoard.tsx - handleAcceptClick:**
```typescript
const handleAcceptClick = (stackId: string) => {
  const tempStack = gameState.tableCards.find(card =>
    card.type === 'temporary_stack' && card.stackId === stackId
  );

  if (tempStack?.isBuildAugmentation) {
    // Build augmentation path - calls validateBuildAugmentation
    sendAction({
      type: 'validateBuildAugmentation',
      payload: { buildId: tempStack.targetBuildId, tempStackId: stackId }
    });
  } else {
    // Regular staging path - opens AcceptValidationModal
    setSelectedTempStack(tempStack);
    setShowValidationModal(true);
  }
};
```

## Simplified Build Augmentation Implementation

### 1. Extend StagingOverlay for Builds

**Modify StagingOverlay.tsx to detect build context:**

```typescript
// In StagingOverlay component
const isBuildAugmentation = stackId && stackId.includes('build-augment');

// Dynamic text based on context
const overlayTitle = isBuildAugmentation ? 'BUILD AUGMENTATION' : 'STAGING';
const indicatorColor = isBuildAugmentation ? '#007bff' : '#17a2b8'; // Blue for builds, cyan for staging
```

### 2. Update BuildStack to Use StagingOverlay

**File:** `components/stacks/BuildStack.tsx`

```typescript
interface BuildStackProps {
  // ... existing props
  pendingBuildAddition?: {
    buildId: string;
    card: { rank: string; suit: string };
  };
  onAcceptBuildAddition?: (buildId: string) => void;
  onRejectBuildAddition?: () => void;
}

export const BuildStack: React.FC<BuildStackProps> = ({
  // ... existing props
  pendingBuildAddition,
  onAcceptBuildAddition,
  onRejectBuildAddition
}) => {
  const showOverlay = pendingBuildAddition &&
                     pendingBuildAddition.buildId === buildId;

  return (
    <View style={styles.container}>
      {/* Existing build rendering */}

      {showOverlay && (
        <StagingOverlay
          isVisible={true}
          stackId={`build-augment-${buildId}`}  // Special ID to indicate build context
          onAccept={(stackId) => onAcceptBuildAddition?.(buildId)}
          onReject={onRejectBuildAddition || (() => {})}
        />
      )}
    </View>
  );
};
```

### 3. Update GameBoard handleAcceptClick

**Extend the existing logic to handle build augmentation overlays:**

```typescript
const handleAcceptClick = (stackId: string) => {
  // Check if this is a build augmentation overlay
  if (stackId.startsWith('build-augment-')) {
    const buildId = stackId.replace('build-augment-', '');
    console.log('[GameBoard] Build augmentation accepted for build:', buildId);

    // Immediately add the card (like addToStagingStack logic)
    sendAction({
      type: 'acceptBuildAddition',
      payload: { buildId }
    });
    return;
  }

  // Existing staging logic...
  const tempStack = gameState.tableCards.find(card =>
    card.type === 'temporary_stack' && card.stackId === stackId
  );

  if (tempStack?.isBuildAugmentation) {
    // Build augmentation path - calls validateBuildAugmentation
    sendAction({
      type: 'validateBuildAugmentation',
      payload: { buildId: tempStack.targetBuildId, tempStackId: stackId }
    });
  } else {
    // Regular staging path - opens AcceptValidationModal
    setSelectedTempStack(tempStack);
    setShowValidationModal(true);
  }
};
```

### 4. Add Build-Specific Staging Reject Handler

**File:** `components/stacks/BuildStack.tsx`

```typescript
const handleRejectBuildAddition = () => {
  sendAction({
    type: 'rejectBuildAddition',
    payload: { buildId }
  });
};
```

### 5. Server-Side Handlers (Same as before)

**acceptBuildAddition.js & rejectBuildAddition.js** - reuse the logic from the previous implementation.

## Build Augmentation Flow (Using Existing Staging Logic)

```
1. Drag card onto build → augment-own-build rule matches
2. addToOwnBuild action → creates pendingBuildAddition state
3. StagingOverlay appears on build (with "BUILD AUGMENTATION" text)
4. User clicks Accept → handleAcceptClick detects build-augment-* → acceptBuildAddition
5. User clicks Cancel → rejectBuildAddition → pending state cleared
```

## Key Reused Components

| Component | Original Use | Build Use |
|-----------|-------------|-----------|
| **StagingOverlay** | Temp stacks | Build augmentation |
| **handleAcceptClick** | Staging acceptance | Build acceptance |
| **acceptBuildAddition** | New handler | Immediate card addition |
| **rejectBuildAddition** | New handler | Clear pending state |

## Benefits of Reusing Staging Logic

- ✅ **Zero new UI components** - reuse existing StagingOverlay
- ✅ **Consistent UX** - same look and feel as staging
- ✅ **Less code** - reuse existing event handlers and flows
- ✅ **Easier maintenance** - one overlay system for both features
- ✅ **Faster implementation** - no new component development

## Implementation Steps

1. **Modify StagingOverlay** to detect build context from `stackId`
2. **Update BuildStack** to show StagingOverlay for pending additions
3. **Extend handleAcceptClick** to handle `build-augment-*` IDs
4. **Create server handlers** for accept/reject build addition
5. **Test the flow** with existing staging overlay UI

This approach reuses 90% of the existing staging overlay system while providing the same user experience for build augmentation.
