# Strategic Build Capture via Play Options

## Overview

The strategic build capture feature allows build owners to choose between capturing their own build or reinforcing it when they have multiple cards that can capture the build value. This provides strategic depth to the Casino card game by giving players meaningful choices about their build management.

## How It Works

### Trigger Conditions

The "Play Options" modal appears when:

1. A player drags a card toward their own build
2. The dragged card can capture the build (card.value === build.value)
3. The player has **multiple cards** in their hand that can capture the build
4. The player is the **owner** of the build

### Modal Options

When triggered, the modal shows:

- **CAPTURE**: Capture the build using the dragged card
- **REINFORCE**: Add another card to the build instead of capturing

### Flow Diagram

```
Player drags card toward owned build
    ↓
Strategic analysis checks:
- Is player the build owner?
- Can dragged card capture build?
- Does player have multiple capture cards?
    ↓
If all conditions met → Show "Play Options" modal
    ↓
Player selects CAPTURE or REINFORCE
    ↓
Send appropriate action to server
```

## Key Code Components

### 1. Strategic Capture Analysis (`src/utils/strategicCaptureAnalysis.ts`)

```typescript
export function shouldAnalyzeStrategicCapture(
  contactType: string,
  draggedCard: Card,
  build: Build,
  playerHand: Card[],
  playerNumber: number,
): boolean {
  // Only analyze for build contacts
  if (contactType !== "build") return false;

  // Only analyze player's own builds (key security check)
  if (build.owner !== playerNumber) return false;

  // Check if dragged card can capture this build
  if (draggedCard.value !== build.value) return false;

  // Check if player has multiple cards of this value
  const captureCards = playerHand.filter((card) => card.value === build.value);
  return captureCards.length > 1; // Need multiple for strategic choice
}

export function analyzeStrategicCaptureOptions(
  build: Build,
  draggedCard: Card,
  playerHand: Card[],
  playerNumber: number,
): StrategicCaptureOption[] | null {
  // Generate CAPTURE and REINFORCE options
  const options: StrategicCaptureOption[] = [];

  // Option 1: Direct capture
  options.push({
    type: "capture",
    label: "CAPTURE",
    payload: {
      buildId: build.buildId,
      captureValue: build.value,
      draggedCard: draggedCard,
      selectedTableCards: build.cards,
    },
  });

  // Option 2+: Reinforce with other cards
  const extensionCards = playerHand.filter(
    (card) =>
      card.value === build.value &&
      card.rank !== draggedCard.rank &&
      card.suit !== draggedCard.suit,
  );

  extensionCards.forEach((card) => {
    options.push({
      type: "ReinforceBuild",
      label: "REINFORCE",
      payload: {
        buildId: build.buildId,
        card: card,
        extensionType: "strategic_build_reinforcement",
      },
    });
  });

  return options.length > 1 ? options : null;
}
```

### 2. Modal Implementation (`components/modals/AcceptValidationModal.tsx`)

```typescript
// Special handling for capture actions in strategic mode
if (action.type === "capture") {
  console.log("🎯 [MODAL] Strategic capture - using regular capture logic");

  // Use the correct payload structure for build captures
  sendAction({
    type: "capture",
    payload: {
      buildId: action.payload.buildId,
      captureValue: action.payload.captureValue,
      capturingCard: action.payload.draggedCard, // Card used for capture
    },
  });
} else {
  // Other strategic actions (like ReinforceBuild)
  sendAction({
    type: action.type,
    payload: action.payload,
  });
}
```

### 3. Drag Handler Integration (`hooks/dragHandlers/useHandCardDragHandler.ts`)

```typescript
// 🎯 STRATEGIC CAPTURE ANALYSIS: Check for multiple capture options on builds
if (
  shouldAnalyzeStrategicCapture(
    contact.type,
    draggedItem.card,
    contact.data || contact,
    gameState.playerHands[playerNumber],
    playerNumber,
  )
) {
  const strategicOptions = analyzeStrategicCaptureOptions(
    contact.data || contact,
    draggedItem.card,
    gameState.playerHands[playerNumber],
    playerNumber,
  );

  if (strategicOptions) {
    // Convert to modal format and display
    const modalOptions = strategicOptions.map((option) => ({
      type: option.type,
      label: option.label,
      payload: option.payload,
    }));
    setStrategicModal(modalOptions);
    return { validContact: true }; // Keep card in position during modal
  }
}
```

## Implementation Details

### Security & Access Control

- **Owner-only access**: Only build owners can trigger strategic capture
- **Multiple cards required**: Single capture cards use direct drag-and-drop
- **Value matching**: Dragged card must match build value exactly

### Payload Structures

#### Strategic Capture Payload

```typescript
{
  buildId: "build-0",
  captureValue: 5,
  draggedCard: { rank: "5", suit: "♠", value: 5 },
  selectedTableCards: [
    { rank: "3", suit: "♠", value: 3 },
    { rank: "2", suit: "♥", value: 2 }
  ]
}
```

#### Server Action Payload (after modal processing)

```typescript
{
  type: "capture",
  payload: {
    buildId: "build-0",
    captureValue: 5,
    capturingCard: { rank: "5", suit: "♠", value: 5 }
  }
}
```

### Modal UI

```jsx
<Modal visible={visible} transparent={true} animationType="fade">
  <View style={styles.overlay}>
    <View style={styles.modalContent}>
      <Text style={styles.title}>Play Options</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>CAPTURE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>REINFORCE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

## Testing

### Unit Tests (`__tests__/strategic-build-capture.test.js`)

```javascript
describe("Strategic Build Capture Integration", () => {
  test("should trigger strategic modal when build owner has multiple capture cards", () => {
    const build = { buildId: "build-0", cards: [...], value: 5, owner: 0 };
    const playerHand = [
      { rank: "5", suit: "♠", value: 5 },
      { rank: "5", suit: "♦", value: 5 } // Multiple 5s
    ];
    const draggedCard = { rank: "5", suit: "♠", value: 5 };

    const shouldTrigger = shouldAnalyzeStrategicCapture(
      "build", draggedCard, build, playerHand, 0 // player 0 owns build
    );
    expect(shouldTrigger).toBe(true);

    const options = analyzeStrategicCaptureOptions(build, draggedCard, playerHand, 0);
    expect(options).toHaveLength(2); // CAPTURE + REINFORCE
  });

  test("should not trigger for non-build-owners", () => {
    const shouldTrigger = shouldAnalyzeStrategicCapture(
      "build", draggedCard, build, playerHand, 1 // player 1 doesn't own build
    );
    expect(shouldTrigger).toBe(false);
  });
});
```

### Integration Test Scenarios

1. **Valid Strategic Capture**:
   - Build owner drags card that can capture
   - Has multiple cards of capture value
   - Modal shows CAPTURE and REINFORCE options

2. **Direct Capture (No Modal)**:
   - Build owner drags card that can capture
   - Has only one card of capture value
   - No modal, direct capture occurs

3. **No Strategic Options**:
   - Non-owner drags card toward build
   - No modal, normal game flow continues

## Usage Examples

### Example 1: Player with 5♠, 5♦, 5♣

```
Build: [3♠, 2♥] = value 5
Player drags: 5♠
Result: "Play Options" modal appears with:
- CAPTURE (with 5♠)
- REINFORCE (with 5♦)
- REINFORCE (with 5♣)
```

### Example 2: Player with only 5♠

```
Build: [3♠, 2♥] = value 5
Player drags: 5♠
Result: Direct capture, no modal
```

### Example 3: Opponent tries to access

```
Build: [3♠, 2♥] = value 5 (owned by player 1)
Player 2 drags: 5♠
Result: No modal, normal drag behavior
```

## Files Modified

- `src/utils/strategicCaptureAnalysis.ts` - Core analysis logic
- `components/modals/AcceptValidationModal.tsx` - Modal handling
- `hooks/dragHandlers/useHandCardDragHandler.ts` - Drag integration
- `__tests__/strategic-build-capture.test.js` - Comprehensive tests

## Benefits

1. **Strategic Depth**: Players make meaningful decisions about build management
2. **Security**: Only build owners can access strategic options
3. **Performance**: Only triggers when multiple options exist
4. **Consistency**: Uses same server logic as direct captures
5. **User Experience**: Clean modal with clear CAPTURE/REINFORCE choices

## Future Enhancements

- Add visual indicators for strategic builds
- Allow keyboard shortcuts for quick selections
- Add animations for modal transitions
- Support for complex multi-card captures

## Troubleshooting

### Modal Not Appearing

- Check if player owns the build
- Verify player has multiple cards of capture value
- Ensure dragged card value matches build value

### Capture Not Working

- Check server capture action handles buildId payloads
- Verify capturingCard is removed from hand
- Ensure build is removed from tableCards array

### Performance Issues

- Strategic analysis only runs on build contacts
- Early returns prevent unnecessary processing
- Modal only shows when beneficial choices exist
