# Safe Area & Navigation Bar Implementation Plan

## Objective
1. Wrap game screens with SafeAreaView to respect device safe areas (notches, home indicators)
2. Hide navigation bar for full-screen game experience

## Current State
- `react-native-safe-area-context` is already installed (v5.6.0)
- `expo-navigation-bar` is already configured in app.json
- GameBoard.tsx uses regular `<View>` as root component

---

## TODO List

### [x] Task 1: Add SafeAreaView to GameBoard.tsx
- Import SafeAreaView from 'react-native-safe-area-context'
- Wrap root View with SafeAreaView
- Update style prop to work with SafeAreaView

### [x] Task 2: Hide Navigation Bar in GameBoard
- Import NavigationBar from 'expo-navigation-bar'
- Add useEffect to hide navigation bar on mount
- Restore visibility on unmount
- Use 'overlay-swipe' behavior for temporary show

### [ ] Task 3: Test Implementation
- Test on iPhone with notch
- Test on Android with punch-hole camera
- Verify navigation bar is hidden
- Verify content not cut off

---

## Implementation Details

### Task 1: SafeAreaView

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export function GameBoard({ ... }) {
  return (
    <SafeAreaView style={styles.root}>
      {/* existing content */}
    </SafeAreaView>
  );
}
```

### Task 2: Navigation Bar

```tsx
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

export function GameBoard({ ... }) {
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    
    return () => {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setBehaviorAsync('inset-swipe');
    };
  }, []);
  
  // ... rest of component
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `components/game/GameBoard.tsx` | Add SafeAreaView + NavigationBar hiding |

---

## Testing Checklist

- [ ] iPhone notch handled correctly
- [ ] Android punch-hole camera handled
- [ ] Navigation bar hidden
- [ ] Swipe up shows nav bar temporarily (with overlay-swipe)
- [ ] Game fills screen properly
