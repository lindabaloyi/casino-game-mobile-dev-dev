# **Auto-Capture Modal Plan**

## **Problem Statement**
Current flow requires validation → parent component → server action. User wants direct capture when clicking modal "Capture" button.

## **Current Flow**
```
1. Player creates temp stack
2. Player clicks "Accept" button
3. Modal opens with validation
4. Player clicks "Capture" in modal
5. Modal calls onCapture(validationResult) → parent component
6. Parent component calls executeAction() → sends to server
7. Server processes finalizeStagingStack/createBuildWithValue
```

## **Desired Flow**
```
1. Player creates temp stack
2. Player clicks "Accept" button
3. Modal opens with validation
4. Player clicks "Capture" in modal
5. Modal directly calls captureTempStack server action
6. Temp stack + capture card automatically moved to captures
```

## **Key Changes Required**

### **1. Modal Integration**
**File:** `components/AcceptValidationModal.tsx`

**Add sendAction prop:**
```typescript
interface AcceptValidationModalProps {
  visible: boolean;
  onClose: () => void;
  tempStack: any;
  playerHand: Card[];
  onCapture: (validation: any) => void;
  sendAction: (action: any) => void; // NEW: Direct server access
}
```

**Modify handleCapture to call server directly:**
```typescript
const handleCapture = () => {
  console.log('🎯 [MODAL] handleCapture called', { validationResult });
  if (!validationResult?.valid) {
    console.log('❌ [MODAL] Validation not valid, returning');
    return;
  }

  console.log('✅ [MODAL] Auto-capturing temp stack...');

  // NEW: Direct server call instead of onCapture callback
  sendAction({
    type: 'captureTempStack',
    payload: {
      tempStackId: tempStack.stackId,
      captureValue: validationResult.target
    }
  });

  onClose();

  Alert.alert(
    'Capture Successful!',
    `Captured ${tempStack.cards?.length || 0} cards`,
    [{ text: 'OK' }]
  );
};
```

### **2. Parent Component Update**
**File:** `components/GameBoard.tsx` (or wherever modal is used)

**Pass sendAction to modal:**
```typescript
<AcceptValidationModal
  visible={showValidationModal}
  onClose={() => setShowValidationModal(false)}
  tempStack={selectedTempStack}
  playerHand={gameState.playerHands[gameState.currentPlayer]}
  onCapture={handleCaptureValidation} // Keep for backward compatibility
  sendAction={sendAction} // NEW: Direct server access
/>
```

### **3. Server Action Verification**
**File:** `multiplayer/server/game/actions/captureTempStack.js`

**Current implementation already supports:**
- Takes `tempStackId` and `captureValue`
- Finds temp stack, removes capture card, moves all cards to captures
- No validation (client already validated)

**No changes needed to server action.**

### **4. Error Handling**
**Add error handling for failed captures:**
```typescript
const handleCapture = () => {
  try {
    sendAction({
      type: 'captureTempStack',
      payload: {
        tempStackId: tempStack.stackId,
        captureValue: validationResult.target
      }
    });
    onClose();
    Alert.alert('Success!', 'Cards captured');
  } catch (error) {
    console.error('Capture failed:', error);
    Alert.alert('Error', 'Failed to capture cards');
  }
};
```

## **Benefits**

1. **Simpler Flow:** Modal directly controls capture
2. **Faster Response:** No intermediate callbacks
3. **Cleaner Code:** Less indirection
4. **Consistent UX:** Immediate action feedback

## **Backward Compatibility**

- Keep `onCapture` prop for existing implementations
- Modal can use either direct server call or callback
- Existing functionality unchanged

## **Testing Scenarios**

| Scenario | Expected Behavior |
|----------|-------------------|
| Valid capture | Modal closes, cards moved to captures, success alert |
| Server error | Error alert, modal stays open |
| Invalid state | Graceful error handling |

## **Implementation Steps**

1. ✅ Add `sendAction` prop to modal interface
2. ✅ Modify `handleCapture` to call server directly
3. ✅ Update parent component to pass `sendAction`
4. ✅ Add error handling
5. ✅ Test with various scenarios
6. ✅ Remove console logs after testing

## **Risks & Mitigations**

| Risk | Mitigation |
|------|------------|
| Server action fails | Add try/catch, show error alert |
| Race conditions | Keep modal validation checks |
| State desync | Server handles all state updates |

## **Success Criteria**

- ✅ Modal "Capture" button immediately captures temp stack
- ✅ No intermediate callbacks or parent component involvement
- ✅ Clean error handling for edge cases
- ✅ Backward compatibility maintained
- ✅ Performance improved (fewer function calls)

---

**This plan transforms the modal from a "validation display" into an "action trigger" that directly executes the capture operation.**
