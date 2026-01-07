# Casino Game Rule System Documentation

## Overview

This document outlines the complete rule system for the casino card game, including rule priorities, implementations, and the same-value auto-capture behavior.

## 🎯 Rule Priority Hierarchy

Rules are evaluated in descending priority order. Higher priority rules execute before lower priority rules. Exclusive rules stop further evaluation

### Complete Rule Priority Order:

```
205: same-value-auto-capture     ← HIGHEST: Auto-capture when no build options
200: single-card-capture         ← Capture single matching cards
195: build-capture               ← Capture entire builds
190: temp-stack-capture          ← Capture temp stacks
188: same-value-modal-options    ← Modal for same-value with build options
100: temp-stack-addition         ← Add to existing temp stacks
 95: same-value-temp-stack-actions ← Legacy modal for temp stacks
 90: table-to-table-staging      ← Create temp from table cards
 85: hand-to-table-staging       ← Create temp from hand+table cards
 40: augment-own-build           ← Add to existing builds
 35: create-own-build            ← Create new builds
```

## 📋 Rule Categories

### 1. **Capture Rules** (Priorities 190-205)
**Purpose**: Immediate captures when cards match values
**Modal**: Usually false (immediate execution)
**Exclusive**: Some rules stop further evaluation

#### `same-value-auto-capture` (Priority 205)
- **Purpose**: Auto-capture same-value cards when NO build options exist
- **Exclusive**: `true` - stops other rules if triggered
- **Modal**: `false` - immediate capture
- **Conditions**:
  - Hand card matches target card value
  - Player has NO spare same-value cards
  - For cards 6+, no sum builds possible (only 1-5 can do sum builds)
- **Action**: Direct capture with both cards included

#### `single-card-capture` (Priority 200)
- **Purpose**: Capture single matching loose cards
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Hand card value equals loose card value
  - Target is loose card (not build/temp stack)

#### `build-capture` (Priority 195)
- **Purpose**: Capture entire builds when hand card matches build value
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Hand card value equals build total value
  - Target is build (not loose/temp)

#### `temp-stack-capture` (Priority 190)
- **Purpose**: Capture temp stacks when hand card matches stack value
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Hand card value equals temp stack capture value
  - Target is temp stack

### 2. **Modal Rules** (Priorities 188-95)
**Purpose**: Show options when multiple choices exist
**Modal**: `true` - requires user selection

#### `same-value-modal-options` (Priority 188)
- **Purpose**: Show modal for same-value interactions when build options exist
- **Exclusive**: `false`
- **Modal**: `true`
- **Conditions**:
  - Hand card matches target card value
  - Player HAS build options (spare cards or sum cards)
- **Action**: Return data packet with capture + build options

#### `same-value-temp-stack-actions` (Priority 95)
- **Purpose**: Legacy modal for temp stacks with strategic options
- **Exclusive**: `false`
- **Modal**: `true`
- **Conditions**:
  - Target is same-value temp stack (`isSameValueStack: true`)
- **Action**: Return data packet with capture + build options

### 3. **Temp Stack Rules** (Priorities 85-100)
**Purpose**: Create temp stacks when no capture is possible
**Modal**: `false` - automatic temp stack creation

#### `temp-stack-addition` (Priority 100)
- **Purpose**: Add cards to existing temp stacks
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Target is existing temp stack
  - Any valid card source

#### `hand-to-table-staging` (Priority 85)
- **Purpose**: Create temp stack from hand card + table card
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Hand card + loose table card
  - No capture rules triggered

#### `table-to-table-staging` (Priority 90)
- **Purpose**: Create temp stack from two table cards
- **Exclusive**: `true`
- **Modal**: `false`
- **Conditions**:
  - Two table cards dragged together

### 4. **Build Rules** (Priorities 35-40)
**Purpose**: Create and extend builds
**Modal**: Varies

#### `augment-own-build` (Priority 40)
- **Purpose**: Add cards to existing player builds
- **Exclusive**: `false`
- **Modal**: `false`
- **Conditions**:
  - Target is player's own build
  - Card can extend build value

#### `create-own-build` (Priority 35)
- **Purpose**: Create new builds from staging stacks
- **Exclusive**: `false`
- **Modal**: `true`
- **Conditions**:
  - Round 1 OR player has existing build
  - Target is loose card

## 🎮 Same-Value Card Interactions

### **Auto-Capture Logic**

When player drops a hand card on a same-value target:

1. **Check Build Options**:
   - Spare same-value cards (e.g., 5♠ + 5♥)
   - Sum build cards (only for 1-5, e.g., 5 + 5 = 10)

2. **Auto-Capture Decision**:
   ```
   IF build_options.length === 0:
     → AUTO-CAPTURE immediately
     → No modal shown
     → Both cards captured together

   ELSE:
     → Show modal with options
     → Player chooses: capture, build, or both
   ```

### **Examples**:

#### **Auto-Capture Cases**:
- **5♠ on 5♣**: No spare 5s, no 10 → Auto-capture [5♣, 5♠]
- **9♠ on 9♣**: No spare 9s, 9>5 (no sum builds) → Auto-capture [9♣, 9♠]
- **2♠ on 2♣**: No spare 2s, no 4 → Auto-capture [2♣, 2♠]

#### **Modal Cases**:
- **5♠ on 5♣**: Has spare 5♥ → Modal: "Capture" or "Build 5"
- **5♠ on 5♣**: Has 10♦ → Modal: "Capture" or "Build 10"
- **5♠ on 5♣**: Has both → Modal: "Capture", "Build 5", "Build 10"

### **Build Feasibility Checking**

#### **Helper Functions**:

```javascript
// Check if player has spare same-value card
function hasSpareSameValue(value, playerHand, currentCard) {
  return playerHand.some(card =>
    card.value === value &&
    !(card.rank === currentCard.rank && card.suit === currentCard.suit)
  );
}

// Check if player has sum card (for low cards 1-5 only)
function hasSumCard(sumValue, playerHand) {
  return playerHand.some(card => card.value === sumValue);
}

// Combined build feasibility check
function canBuildWithCards(handCard, target, playerHand) {
  const buildOptions = [];

  // Same-value build option
  if (hasSpareSameValue(handCard.value, playerHand, handCard)) {
    buildOptions.push('BUILD_SAME');
  }

  // Sum-value build option (only for 1-5)
  if (handCard.value <= 5) {
    let totalValue;
    if (target.type === 'loose') {
      totalValue = handCard.value + target.card.value;
    } else if (target.type === 'temporary_stack') {
      totalValue = handCard.value * (target.card.cards?.length || 1);
    }

    if (totalValue && hasSumCard(totalValue, playerHand)) {
      buildOptions.push('BUILD_SUM');
    }
  }

  return buildOptions;
}
```

## 🔄 Rule Execution Flow

### **Complete Flow Example: 5♠ on 5♣ (auto-capture)**

```
1. Player drags 5♠ → drops on 5♣
2. Rule processor evaluates in priority order:

   205: same-value-auto-capture
        ✓ Hand card matches target
        ✓ Build options check:
           - Spare 5s? ❌ No
           - Sum card (10)? ❌ No
           - canAutoCapture: ✅ TRUE
        → EXCLUSIVE RULE FIRES
        → Returns capture action
        → Stops further rule evaluation

3. Capture handler:
   - Cards to capture: [5♣, 5♠]
   - Remove 5♠ from hand
   - Add [5♣, 5♠] to captures
   - Turn passes

4. Result: Immediate capture, no modal
```

### **Complete Flow Example: 5♠ on 5♣ (modal)**

```
1. Player drags 5♠ → drops on 5♣
2. Rule processor evaluates in priority order:

   205: same-value-auto-capture
        ✓ Hand card matches target
        ✓ Build options check:
           - Spare 5s? ✅ Yes (5♥)
           - Sum card (10)? ❌ No
           - canAutoCapture: ❌ FALSE
        → Rule fails, continue

   200: single-card-capture
        ✓ Values match (5=5)
        → Rule fires (not exclusive)
        → Continue evaluation

   188: same-value-modal-options
        ✓ Values match
        ✓ Has build options
        → Rule fires (modal required)
        → Returns data packet with options

3. Modal shows: "Capture", "Build 5"
4. Player selects option
5. Action executes based on choice
```

## 📊 Rule Implementation Details

### **File Locations**:

- **Capture Rules**: `multiplayer/server/game/logic/rules/captureRules.js`
- **Temp Stack Rules**: `multiplayer/server/game/logic/rules/tempRules.js`
- **Build Rules**: `multiplayer/server/game/logic/rules/buildRules.js`
- **Action Processor**: `multiplayer/server/game/logic/actionDetermination.js`
- **Capture Handler**: `multiplayer/server/game/actions/capture/capture.js`

### **Key Technical Patterns**:

1. **Priority-Based Evaluation**: Higher numbers = higher priority
2. **Exclusive Rules**: Stop further evaluation when triggered
3. **Modal vs Direct**: Some rules show UI, others execute immediately
4. **Build Feasibility**: Complex logic for determining available options
5. **Card Inclusion**: Capturing cards always included in captured sets

### **Testing Scenarios**:

```javascript
// Auto-capture test cases
{ hand: [5♠, 7♣, 3♥], table: [5♣] } → Auto-capture ✅
{ hand: [9♠, 7♣, 3♥], table: [9♣] } → Auto-capture ✅
{ hand: [6♠, 7♣, 3♥], table: [6♣] } → Auto-capture ✅

// Modal test cases
{ hand: [5♠, 5♥, 10♦], table: [5♣] } → Modal ✅
{ hand: [5♠, 7♣, 10♦], table: [5♣] } → Modal ✅
{ hand: [5♠, 5♥, 7♣], table: [5♣] } → Modal ✅
```

## 🎯 **Same-Value Capture Principle**

**"If a player has only one valid option when dropping a same-value card, the game MUST capture immediately without showing a modal. Only show modals when multiple genuine strategic choices exist."**

This ensures optimal UX:
- **No unnecessary clicks** when outcome is obvious
- **Strategic choice preserved** when decisions matter
- **Consistent with build capture** behavior
- **Follows casino game expectations**