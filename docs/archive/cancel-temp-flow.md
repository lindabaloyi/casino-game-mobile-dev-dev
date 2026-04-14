# Cancel Temp Stack — Flow Documentation

## Overview

When a player presses **Cancel** on a pending temp stack, **every card in the
stack** is returned to its original location — hand or table — regardless of
how many cards are in the stack.

Key properties:
- **Fully dynamic** — works for a 2-card stack or a 10-card stack with identical logic
- **Turn does NOT advance** — the player gets another chance to act
- **Source-tagged** — each card carries a `source` metadata field set at insertion
  time so `cancelTemp` never needs to guess where a card came from

---

## Card Source Contract

Every card is tagged with `source: 'hand' | 'table'` the moment it enters the stack.
The tag is set by the server action that creates/extends the stack:

| Action | Cards added to stack | `source` assigned |
|---|---|---|
| `createTemp` | 1 hand card + 1 table card | hand → `'hand'`, table → `'table'` |
| `createTempFromTable` | 2 table cards | both → `'table'` |
| `addToTemp` | 1 table card (per call) | `'table'` |

### Invariants

1. **At most one hand card** per stack — only `createTemp` introduces a hand card.
2. **Unlimited table cards** — `addToTemp` can be called repeatedly; each call appends
   one table card tagged `'table'`.
3. **Source tag is internal** — it is stripped when the card is returned so the
   clean card object (`{ rank, suit, value }`) reaches the hand or table.

---

## Dynamic Cancel Algorithm (`cancelTemp.js`)

```
cancelTemp(state, { stackId }, playerIndex):
  1. Locate temp_stack by stackId in tableCards
  2. Guard: stack must exist and be owned by playerIndex
  3. Remove temp_stack from tableCards
  4. FOR EACH card IN stack.cards   ← iterates ALL N cards, order independent
       pureCard = { rank, suit, value }   ← strip source metadata
       IF card.source === 'hand'
         playerHands[playerIndex].push(pureCard)
       ELSE
         tableCards.push(pureCard)
  5. Return newState (turn index unchanged)
```

This loop is **O(N)** and requires no knowledge of stack size — it handles any
number of cards automatically.

---

## Walkthrough — N-card stack (any N ≥ 2)

### Setup

```
Player creates stack via createTemp:
  cards[0] = A♦  { source: 'table' }   ← high value → base (bottom)
  cards[1] = 5♣  { source: 'hand'  }   ← player's hand card

Player drags 3 more table cards via addToTemp:
  cards[2] = 9♠  { source: 'table' }
  cards[3] = 9♥  { source: 'table' }
  cards[4] = 6♥  { source: 'table' }

Stack now has 5 cards.
```

### Cancel result

| Card | `source` | Returns to |
|------|----------|-----------|
| A♦ | `'table'` | `tableCards` |
| 5♣ | `'hand'` | `playerHands[playerIndex]` |
| 9♠ | `'table'` | `tableCards` |
| 9♥ | `'table'` | `tableCards` |
| 6♥ | `'table'` | `tableCards` |

The same loop handles 2 cards or 20 cards without modification.

---

## Adding a New Stack Type (build_stack, extend_build)

When implementing build actions, follow the same contract:

1. **Tag every card** with `source: 'hand' | 'table'` in `createBuild.js` /
   `addToBuild.js` — same as temp.
2. **`cancelBuild.js`** can use the identical loop pattern from `cancelTemp.js`.
3. No UI changes needed — `StackActionStrip` already uses `constants/stackActions.ts`
   config to render the correct button copy and colours for any stack type.

---

## Verification Checklist

| Scenario | Expected outcome |
|---|---|
| 2-card `createTemp` (hand + table) | Hand card → hand, table card → table |
| 2-card `createTempFromTable` (table + table) | Both cards → table |
| 3-card stack (createTemp + 1× addToTemp) | Hand card → hand, 2 table cards → table |
| N-card stack (createTemp + (N-2)× addToTemp) | 1 hand card → hand, (N-1) table cards → table |
| N-card stack (`createTempFromTable` + (N-2)× addToTemp) | All N cards → table |
| Cancel after any N ≥ 10 | All N cards returned correctly, turn unchanged |
| Turn after cancel | Same player's turn, `currentTurn` index unchanged |

---

## File references

| File | Role |
|------|------|
| `multiplayer/server/game/actions/createTemp.js` | Tags hand+table card with `source` |
| `multiplayer/server/game/actions/createTempFromTable.js` | Tags both table cards with `source: 'table'` |
| `multiplayer/server/game/actions/addToTemp.js` | Tags each additional table card with `source: 'table'` |
| `multiplayer/server/game/actions/cancelTemp.js` | Iterates all cards, routes by `source`, strips metadata |
| `constants/stackActions.ts` | Cancel button copy + colours per stack type |
| `components/table/StackActionStrip.tsx` | Renders Cancel button (reads from stackActions config) |
