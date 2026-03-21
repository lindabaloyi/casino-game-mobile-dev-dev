# Plan: Disable Auto-Capture for Cards Rank 1-4

## Goal
When dropping a card on a loose card of the same rank:
- **Cards 1-4 (A-4)**: Always stack (create temp), never auto-capture
- **Cards 5+ (5-K)**: Keep existing auto-capture behavior

This allows players to add low cards to builds instead of forced captures.

## Files to Modify

### 1. `shared/game/smart-router/routers/LooseCardRouter.js`

**New Logic:**
```javascript
// Cards 1-4: Always create temp (no auto-capture)
// Cards 5+: Keep existing capture behavior

const isLowRank = cardValue <= 4;

if (isLowRank) {
  // LOW RANKS (A-4): Always create temp - no auto-capture
  return { type: 'createTemp', payload: { card, targetCard, source } };
} else {
  // HIGH RANKS (5-K): Keep existing behavior
  if (hasSpare) {
    return { type: 'createTemp', payload: { card, targetCard, source } };
  } else {
    return {
      type: 'captureOwn',
      payload: { card, targetType: 'loose', targetRank: targetCard.rank, targetSuit: targetCard.suit }
    };
  }
}
```

## Summary

| Card Rank | Behavior |
|-----------|----------|
| A-4 (1-4) | Always stack (create temp) - no auto-capture |
| 5-K (5-13) | Auto-capture if no spare, else stack |
