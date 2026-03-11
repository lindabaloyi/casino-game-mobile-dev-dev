# Shiya Recall Modal Implementation Plan

## Overview
Implement an automatic modal that appears when a teammate captures a build on which the current player activated Shiya. The modal offers the option to recall the build or leave it. Includes 4-second auto-dismiss timer.

## Data Flow
1. Player 1 (Team A) activates Shiya → `build.shiyaActive = true`, `shiyaPlayer = 1`
2. Player 2 (Team A) captures that build → capture action adds entry to `teamCapturedBuilds` with `shiyaPlayer: 1`
3. On Player 1's client, `useEffect` detects new entry where `shiyaPlayer === playerNumber`
4. Modal appears with **Recall** / **Leave** options
5. If no action within 4 seconds → auto-dismisses

---

## Implementation Steps

### Phase 1: Server – Store `shiyaPlayer` in `teamCapturedBuilds`

**File:** `shared/game/actions/captureOwn.js`

Replace existing tracking block (around line 90-129) with:

```javascript
if (isPartyMode && buildStack && buildStack.type === 'build_stack') {
  const stackOwner = buildStack.owner;
  const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
  const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;

  let shouldTrack = false;
  let shiyaPlayer = null;

  // Case 1: Opponent capture (already tracked)
  if (stackOwnerTeam !== capturingPlayerTeam) {
    shouldTrack = true;
  }
  // Case 2: Same-team capture of a Shiya-activated build
  else if (stackOwnerTeam === capturingPlayerTeam && buildStack.shiyaActive) {
    shouldTrack = true;
    shiyaPlayer = buildStack.shiyaPlayer;
  }

  if (shouldTrack) {
    if (!newState.teamCapturedBuilds) {
      newState.teamCapturedBuilds = { 0: [], 1: [] };
    }
    newState.teamCapturedBuilds[capturingPlayerTeam].push({
      value: buildStack.value,
      originalOwner: stackOwner,
      capturedBy: playerIndex,
      cards: buildStack.cards,
      stackId: buildStack.stackId,
      shiyaPlayer,
    });
  }
}
```

**File:** `shared/game/actions/captureOpponent.js`

Apply same logic (around line 47-72).

---

### Phase 2: Client – Detect New Shiya Captures

**File:** `components/game/GameBoard.tsx`

**Add to state (around line 88):**
```tsx
const [recallCandidate, setRecallCandidate] = useState<any>(null);
const recallTimerRef = useRef<NodeJS.Timeout | null>(null);
const prevCapturedRef = useRef<any[]>([]);
```

**Add effect (after other useEffects, around line 158):**
```tsx
// Effect to detect new Shiya captures
useEffect(() => {
  if (gameState.playerCount !== 4) return;
  const myTeam = playerNumber < 2 ? 0 : 1;
  const current = gameState.teamCapturedBuilds?.[myTeam] || [];
  const prev = prevCapturedRef.current;

  const newRecallable = current.filter(
    build => build.shiyaPlayer === playerNumber && 
             !prev.some(p => p.stackId === build.stackId)
  );

  if (newRecallable.length > 0) {
    if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
    setRecallCandidate(newRecallable[0]);

    recallTimerRef.current = setTimeout(() => {
      setRecallCandidate(null);
      recallTimerRef.current = null;
    }, 4000);
  }

  prevCapturedRef.current = current;

  return () => {
    if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
  };
}, [gameState.teamCapturedBuilds, playerNumber, gameState.playerCount]);
```

---

### Phase 3: Create ShiyaRecallModal Component

**New File:** `components/modals/ShiyaRecallModal.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  build: any;
  onRecall: () => void;
  onClose: () => void;
  autoCloseMs?: number;
}

export function ShiyaRecallModal({ visible, build, onRecall, onClose, autoCloseMs = 4000 }: Props) {
  const [timeLeft, setTimeLeft] = useState(autoCloseMs / 1000);

  useEffect(() => {
    if (!visible) return;
    setTimeLeft(autoCloseMs / 1000);
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, autoCloseMs]);

  if (!build) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Recall Shiya Build?</Text>
          <Text style={styles.timer}>Auto-closes in {timeLeft}s</Text>

          <View style={styles.buildInfo}>
            <Text style={styles.label}>Build cards:</Text>
            <View style={styles.cardRow}>
              {build.cards?.map((card: any, idx: number) => (
                <Text key={idx} style={styles.card}>{card.rank}{card.suit}</Text>
              ))}
            </View>
            <Text style={styles.value}>Value: {build.value}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.recallButton]} onPress={onRecall}>
              <Text style={styles.buttonText}>Recall</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#2C3E50', borderRadius: 12, padding: 24, width: '80%', maxWidth: 400, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#ECF0F1', marginBottom: 8 },
  timer: { fontSize: 14, color: '#BDC3C7', marginBottom: 16 },
  buildInfo: { marginBottom: 24, alignItems: 'center' },
  label: { fontSize: 16, color: '#BDC3C7', marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  card: { fontSize: 20, fontWeight: '600', color: '#ECF0F1', marginHorizontal: 4 },
  value: { fontSize: 18, color: '#F1C40F', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, minWidth: 120, alignItems: 'center' },
  recallButton: { backgroundColor: '#27AE60' },
  leaveButton: { backgroundColor: '#E74C3C' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
```

---

### Phase 4: Integrate Modal in GameBoard

**File:** `components/game/GameBoard.tsx`

**Add import:**
```tsx
import { ShiyaRecallModal } from '../modals/ShiyaRecallModal';
```

**Add to render (after GameModals, around line 457):**
```tsx
<ShiyaRecallModal
  visible={!!recallCandidate}
  build={recallCandidate}
  onRecall={() => {
    if (recallCandidate) {
      actions.recallBuild(recallCandidate.stackId);
      setRecallCandidate(null);
      if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
    }
  }}
  onClose={() => {
    setRecallCandidate(null);
    if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
  }}
  autoCloseMs={4000}
/>
```

---

### Phase 5: Verify recallBuild Compatibility

**File:** `shared/game/actions/recallBuild.js`

Already uses `capturedBy` to locate cards - no changes needed.

---

## Files to Modify

| # | File | Change Type |
|---|------|-------------|
| 1 | `shared/game/actions/captureOwn.js` | Modify - Add Shiya tracking |
| 2 | `shared/game/actions/captureOpponent.js` | Modify - Add Shiya tracking |
| 3 | `components/game/GameBoard.tsx` | Modify - Add state, effect, modal |
| 4 | `components/modals/ShiyaRecallModal.tsx` | New file |

## Testing Checklist
- [ ] Activate Shiya on own build in party mode
- [ ] Teammate captures the Shiya build
- [ ] Modal appears automatically for Shiya activator
- [ ] 4-second countdown displays correctly
- [ ] Click "Recall" - build returns to table
- [ ] Click "Leave" - modal closes, build stays captured
- [ ] Auto-dismiss after 4 seconds
- [ ] Multiple rapid captures handled correctly
