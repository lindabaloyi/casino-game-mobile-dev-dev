# Eliminate After Every Hand Plan

## Goal
Change tournament elimination from \
after
4
hands\ to \after
every
hand\

## Current Behavior
- 4 players play hand 1
- 4 players play hand 2  
- 4 players play hand 3
- 4 players play hand 4
- Only AFTER hand 4: eliminate lowest, start semi-final

## Desired Behavior
- Hand 1 (4 players) → eliminate lowest → 3 players for hand 2
- Hand 2 (3 players) → eliminate lowest → 2 players for hand 3
- Hand 3 (2 players) → eliminate lowest → winner (tournament ends)

## Implementation Plan

### Change 1: Replace handleHandComplete Logic

Replace the current logic (lines 305-363) with:

`javascript
async handleHandComplete(gameState, results) {
  const tournament = this.activeTournaments.get(gameState.tournamentId);
  if (!tournament) return;

  // Update cumulative stats (KEEP existing code - lines 255-270)
  for (let i = 0; i < tournament.players.length; i++) {
    const player = tournament.players[i];
    if (player) {
      player.cumulativeScore += gameState.scores[i] || 0;
      const captures = gameState.players[i]?.captures || [];
      player.cumulativeCards += captures.length;
      player.cumulativeSpades += captures.filter(c => c.suit === '♠').length;
      player.handsPlayed++;
    }
  }

  // Get active (non-eliminated) players
  const active = tournament.players.filter(p => !p.eliminated);
  console.log([HAND_END] Active players before elimination: );

  // ELIMINATE AFTER EVERY HAND (if more than 1 player remains)
  if (active.length > 1) {
    // Sort by score (ascending) - lowest first
    // Tie-break: higher spades, higher cards, deterministic hash
    const sorted = [...active].sort((a, b) => {
      if (a.cumulativeScore !== b.cumulativeScore) 
        return a.cumulativeScore - b.cumulativeScore;
      // Tie-break: more spades wins (keep player with more)
      if (a.cumulativeSpades !== b.cumulativeSpades)
        return b.cumulativeSpades - a.cumulativeSpades;
      if (a.cumulativeCards !== b.cumulativeCards)
        return b.cumulativeCards - a.cumulativeCards;
      // Deterministic hash tie-break
      return a.id.localeCompare(b.id);
    });

    const lowest = sorted[0];
    lowest.eliminated = true;
    console.log([HAND_END] Eliminated  (score: , spades: , cards: ));
  }

  // Check remaining players
  const remaining = tournament.players.filter(p => !p.eliminated);
  console.log([HAND_END] Remaining players: );

  if (remaining.length > 1) {
    // More than 1 player - start next hand with delay
    console.log([HAND_END] Starting next hand with  players...);
    setTimeout(async () => {
      await this._startNextHand(tournament.id);
    }, 10000);
  } else if (remaining.length === 1) {
    // Only 1 player left - declare winner
    console.log([HAND_END] Tournament complete! Winner: );
    // TODO: Call _endTournament or emit tournament-complete
  } else {
    console.log([HAND_END] ERROR: No players remaining!);
  }
}
`

### Change 2: Remove Old Logic

Remove or comment out:
- phaseComplete check (line 305-306)
- if (phaseComplete) block (lines 308-346)
- lse block that calls _startNextHand

### Change 3: Keep Existing Functions

- _startNextHand - filters !p.eliminated, gets gameType automatically
- gameTypes['three-hands'] - already correct (13 cards + 1 table)
- gameTypes['two-hands'] - already correct

## Files to Modify
- multiplayer/server/services/TournamentCoordinator.js
  - Replace handleHandComplete logic (lines ~305-363)

## Expected Results

| Hand | Before | After Elim | Next Hand Players |
|------|--------|-----------|------------------|
| 1    | 4p     | 1 eliminated | 3p |
| 2    | 3p     | 1 eliminated | 2p |
| 3    | 2p     | 1 eliminated | Winner |

## Tie-Breaking Order
1. Lower cumulative score loses
2. Fewer cumulative spades loses  
3. Fewer cumulative cards loses
4. Deterministic ID comparison (localeCompare)

