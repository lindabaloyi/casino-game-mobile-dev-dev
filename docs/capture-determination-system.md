# Capture Determination System Documentation

## Overview

This document comprehensively explains how the casino card game determines captures, including the complete flow from contact detection to action execution.

## 🎯 System Architecture

The capture system consists of multiple layers working together:

```
Contact Detection → Rule Engine → Action Handlers → Server Processing
```

### 1. Contact Detection Layer
**Location**: `src/utils/contactDetection.ts`
**Purpose**: Finds what the player is dropping cards on

- **Global Registry**: All interactive elements register their screen positions
- **Distance-Based**: Uses 80px threshold to find closest contact
- **Priority System**: Builds prioritized over loose cards when within 40px
- **Real-time Updates**: Positions updated as elements move

### 2. Rule Engine Layer
**Location**: `multiplayer/server/game/logic/rules/`
**Purpose**: Determines valid actions based on game rules

- **Priority-Based Evaluation**: Rules evaluated in descending priority order
- **Exclusive Rules**: Can stop further evaluation when triggered
- **Modal vs Direct**: Some actions require user confirmation, others execute immediately

### 3. Action Handlers Layer
**Location**: `multiplayer/server/game/actions/`
**Purpose**: Execute the determined actions on server-side

- **State Modification**: Update game state (hands, table, captures, turns)
- **Validation**: Ensure actions are legal before execution
- **Broadcasting**: Send updates to all players

## 📋 Capture Rules Priority Hierarchy

Rules are evaluated in this exact order (higher number = higher priority):

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
 40: augment-own-build           ← Add to existing player builds
 38: buildExtension              ← Extend opponent builds (NEW)
 35: create-own-build            ← Create new builds
```

## 🎮 Capture Determination Flow

### **Step 1: Contact Detection**

When a player drops a card, the system:

1. **Finds Contacts**: Searches within 80px radius of drop point
2. **Ranks by Distance**: Closest contact wins
3. **Applies Priority**: Builds beat loose cards when within 40px
4. **Returns Target**: `{id, type, distance, data}`

```typescript
const contact = findContactAtPoint(dropX, dropY, 80);
// Returns: {id: "build-1", type: "build", distance: 25.6, data: {...}}
```

### **Step 2: Action Determination**

For each contact type, different logic applies:

#### **Loose Cards (`type: 'card'`)**
- Direct contact handler: `handleLooseCardContact()`
- Checks value match for capture
- Returns `capture` action or `null`

#### **Builds (`type: 'build'`)**
- First: **Direct Build Extension Check** (NEW)
- Then: Rule engine for captures/augmentation
- Priority: Extensions > Captures > Augmentation

#### **Temp Stacks (`type: 'temporary_stack'`)**
- Rule engine determines capture vs addition
- Complex logic for same-value scenarios

### **Step 3: Rule Engine Evaluation**

For complex scenarios, the rule engine evaluates all applicable rules:

```javascript
const result = determineActions(draggedItem, targetInfo, gameState);
// Returns: {actions: [...], requiresModal: true/false, dataPackets: [...]}
```

**Rule Evaluation Process:**
1. **Priority Order**: Highest to lowest priority
2. **Condition Check**: Each rule's `condition()` function
3. **Exclusive Rules**: Can stop evaluation if triggered
4. **Action Creation**: Winning rules create actions via `action()` function

## 🎯 Specific Capture Scenarios

### **1. Single Card Capture**

**Trigger**: Hand card value matches loose card value
**Rule**: `single-card-capture` (Priority 200)
**Action**: Direct capture, no modal

```javascript
// Example: 5♥ dropped on 5♣
// Result: {type: 'capture', payload: {targetCards: [5♣, 5♥], capturingCard: 5♥}}
```

### **2. Build Capture**

**Trigger**: Hand card value matches build total
**Rule**: `build-capture` (Priority 195)
**Action**: Direct capture of entire build

```javascript
// Example: 8♦ dropped on build totaling 8
// Result: {type: 'capture', payload: {targetCards: [...buildCards, 8♦], capturingCard: 8♦}}
```

### **3. Temp Stack Capture**

**Trigger**: Hand card value matches temp stack value
**Rule**: `temp-stack-capture` (Priority 190)
**Action**: Capture entire temp stack

### **4. Opponent Build Extension (NEW)**

**Trigger**: Hand card ≠ build value + opponent owns build
**Rule**: `buildExtension` (Priority 38)
**Action**: Direct extension with ownership transfer

```javascript
// Example: 3♠ dropped on opponent build (value: 7)
// Result: {type: 'BuildExtension', payload: {extensionCard: 3♠, targetBuildId: 'build-1'}}
```

## 🎮 Same-Value Auto-Capture Logic

### **The Critical Decision**

When dropping a same-value card, the system must decide:
- **Auto-Capture**: Immediate capture (no modal)
- **Show Modal**: User chooses from multiple options

### **Decision Algorithm**

```javascript
function shouldAutoCapture(draggedCard, targetCard, playerHand) {
  // 1. Check for spare same-value cards
  const hasSpareSameValue = playerHand.some(card =>
    card.value === draggedCard.value &&
    card.id !== draggedCard.id
  );

  // 2. Check for sum build cards (only for 1-5)
  const hasSumBuild = draggedCard.value <= 5 &&
    playerHand.some(card => card.value === (draggedCard.value * 2));

  // 3. Auto-capture only if NO build options exist
  return !hasSpareSameValue && !hasSumBuild;
}
```

### **Examples**

#### **Auto-Capture Cases**
- **5♠ on 5♣**: No spare 5s, no 10s → ✅ Auto-capture
- **9♠ on 9♣**: No spare 9s, 9>5 → ✅ Auto-capture
- **2♠ on 2♣**: No spare 2s, no 4s → ✅ Auto-capture

#### **Modal Cases**
- **5♠ on 5♣**: Has spare 5♥ → 🎯 Modal: "Capture" or "Build 5"
- **5♠ on 5♣**: Has 10♦ → 🎯 Modal: "Capture" or "Build 10"
- **5♠ on 5♣**: Has both → 🎯 Modal: "Capture", "Build 5", "Build 10"

## 🔄 Build Extension System (NEW)

### **Architecture**

The new build extension system bypasses complex rule engine logic:

```
Contact Detection → Direct Value Check → BuildExtension Action → Server Handler
```

### **Extension Conditions**

A card can extend an opponent build if:
- Card value ≠ build value (different, not same)
- Target is opponent's build (not player's own)
- Build meets eligibility criteria

### **Server-Side Processing**

The `BuildExtension` action handler:
1. **Validates Extension**: Ensures legal move
2. **Transfers Ownership**: Updates build owner
3. **Updates Value**: Adds card value to build total
4. **Advances Turn**: Extensions end the current player's turn

## 📊 Technical Implementation Details

### **Contact Detection Algorithm**

```typescript
function findContactAtPoint(x: number, y: number, threshold: number) {
  let closestContact = null;
  let minDistance = threshold;

  for (const [id, position] of contactPositions) {
    const centerX = position.x + position.width / 2;
    const centerY = position.y + position.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    if (distance < minDistance) {
      minDistance = distance;
      closestContact = { id, type: position.type, distance, data: position.data };
    }
  }

  // Build priority: if build is within 40px of closest contact, prefer build
  if (closestContact) {
    const buildContacts = Array.from(contactPositions.values())
      .filter(pos => pos.type === 'build')
      .map(pos => ({
        id: Object.keys(contactPositions).find(k => contactPositions[k] === pos),
        distance: Math.sqrt(Math.pow(x - (pos.x + pos.width/2), 2) + Math.pow(y - (pos.y + pos.height/2), 2)),
        data: pos.data
      }));

    for (const build of buildContacts) {
      if (build.distance <= minDistance + 40) {
        return { id: build.id, type: 'build', distance: build.distance, data: build.data };
      }
    }
  }

  return closestContact;
}
```

### **Rule Engine Structure**

```javascript
const rule = {
  id: 'rule-name',
  condition: (context) => {
    // Return true if rule applies
    return boolean;
  },
  action: (context) => {
    // Return action object if rule wins
    return { type: 'actionType', payload: {...} };
  },
  requiresModal: false, // true for user confirmation
  priority: 100,       // Higher = evaluated first
  description: 'Human readable description'
};
```

### **Action Handler Pattern**

```javascript
function handleAction(gameManager, playerIndex, action, gameId) {
  const gameState = gameManager.getGameState(gameId);

  // Validate action
  if (!isValidAction(action, gameState, playerIndex)) {
    throw new Error('Invalid action');
  }

  // Execute action logic
  const newGameState = executeActionLogic(gameState, action, playerIndex);

  // Handle turn management
  if (actionEndsTurn(action.type)) {
    newGameState.currentPlayer = (playerIndex + 1) % 2;
  }

  return newGameState;
}
```

## 🧪 Testing Scenarios

### **Auto-Capture Test Cases**
```javascript
{ hand: [5♠, 7♣, 3♥], table: [5♣] } → Auto-capture ✅
{ hand: [9♠, 7♣, 3♥], table: [9♣] } → Auto-capture ✅
{ hand: [6♠, 7♣, 3♥], table: [6♣] } → Auto-capture ✅
{ hand: [5♠, 5♥, 10♦], table: [5♣] } → Modal ✅
```

### **Build Extension Test Cases**
```javascript
{ hand: [3♠], build: {value: 7, owner: 1} } → Extension ✅
{ hand: [7♠], build: {value: 7, owner: 1} } → Capture (not extension) ✅
{ hand: [3♠], build: {value: 7, owner: 0} } → No action (own build) ✅
```

### **Priority Test Cases**
```javascript
// Build within 40px of loose card = build wins
{ dropPoint: {x: 100, y: 100} }
{ build: {x: 90, y: 95, w: 80, h: 120}, distance: 15 }
{ card: {x: 175, y: 100, w: 64, h: 88}, distance: 10 }
// Result: Build prioritized despite closer card
```

## 📈 Performance Considerations

### **Contact Detection**
- **Spatial Indexing**: Could optimize with quadtree for large table counts
- **Update Frequency**: Currently updates on every layout change
- **Memory Usage**: O(n) where n = interactive elements

### **Rule Engine**
- **Early Exit**: Exclusive rules prevent unnecessary evaluation
- **Caching**: Rule results could be cached for repeated scenarios
- **Complexity**: O(r) where r = number of rules (currently ~13)

### **Action Handlers**
- **Atomic Operations**: Each action is fully validated before execution
- **Rollback Support**: Failed actions don't modify state
- **Broadcasting**: State changes sent to all clients immediately

## 🔧 Configuration & Tuning

### **Contact Detection Parameters**
```javascript
const CONTACT_CONFIG = {
  baseThreshold: 80,      // px - maximum contact distance
  buildPriorityBonus: 40, // px - extra range for build priority
  updateDebounce: 16      // ms - layout update frequency
};
```

### **Rule Priorities**
```javascript
const RULE_PRIORITIES = {
  autoCapture: 205,
  singleCapture: 200,
  buildCapture: 195,
  tempCapture: 190,
  modalOptions: 188,
  // ... etc
};
```

## 🎯 Future Enhancements

### **Planned Improvements**
1. **Spatial Optimization**: Quadtree for contact detection
2. **Rule Caching**: Cache rule evaluation results
3. **Prediction**: Pre-calculate valid drop zones
4. **Multi-Touch**: Support for multiple simultaneous drops
5. **Accessibility**: Voice feedback for contact detection

### **Potential New Rules**
1. **Multi-Card Capture**: Capture multiple same-value cards at once
2. **Build Merging**: Combine compatible builds
3. **Strategic Extensions**: Allow players to choose extension outcomes
4. **Undo System**: Allow reverting certain actions

## 📚 Related Documentation

- [Rule System Documentation](rule-system-documentation.md)
- [Active Build Capture](active-build-capture.md)
- [Same-Value Card Detection](same-value-card-detection.md)
- [Temp Stack Build Recognition](temp-stack-build-recognition.md)

---

**Last Updated**: January 10, 2026
**System Version**: Direct Build Extension (v2.0)
**Contact Detection**: Priority-based with build preference
**Rule Engine**: Priority-based with exclusive rules
**Action System**: Direct execution with turn management