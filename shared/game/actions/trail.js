/**
 * trail
 * Player places a card from their hand onto the table (trailing).
 *
 * Rules:
 *  - Player must have the card in their hand
 *  - Card is removed from hand and added to tableCards
 *  - Player CANNOT play a card whose rank already exists on the table
 *  - Turn advances to the other player
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');

/**
 * @param {object} state       Current game state
 * @param {{ card: object }} payload  Card to trail
 * @param {number} playerIndex Who is trailing
 * @returns {object} New game state
 */
function trail(state, payload, playerIndex) {
  const { card } = payload;

  // Validate card payload
  if (!card || !card.rank || !card.suit) {
    throw new Error('trail: invalid card payload');
  }

  // Check if a card with the same rank already exists on the table as a LOOSE card only
  // (temp_stack and build_stack objects don't block trailing - they have cards inside)
  // NOTE: This rule does NOT apply in free-for-all mode - any card can be played
  const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);
  if (isPartyMode) {
    const looseCards = state.tableCards.filter(tc => !tc.type);
    const existingCardOfSameRank = looseCards.some(
      looseCard => looseCard.rank === card.rank
    );
    
    if (existingCardOfSameRank) {
      throw new Error(
        `trail: Cannot play ${card.rank}${card.suit} - ` +
        `there's already a ${card.rank} on the table`
      );
    }
  }

  // NEW VALIDATION: Check if there's an existing build on the table with the same value
  // as the card being trailed. This prevents players from trailing a card that matches
  // an active build value on the table.
  // This applies to ALL game modes (not just party mode)
  const buildsOnTable = state.tableCards.filter(tc => tc.type === 'temp_stack' || tc.type === 'build_stack');
  const matchingBuild = buildsOnTable.find(build => {
    // Check if the build value matches the card's value
    return build.value === card.value;
  });

  if (matchingBuild) {
    throw new Error(
      `trail: Cannot play ${card.rank}${card.suit} (value ${card.value}) - ` +
      `there's an active build with value ${matchingBuild.value} on the table`
    );
  }

  // Clone state for pure function
  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;

  // Find the card in the player's hand (match by rank + suit)
  const cardIndex = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );

  if (cardIndex === -1) {
    throw new Error(
      `trail: card ${card.rank}${card.suit} not found in player ${playerIndex}'s hand`,
    );
  }

  // Remove from hand, add to table
  const [trailedCard] = hand.splice(cardIndex, 1);
  newState.tableCards.push(trailedCard);

  console.log(`[trail] Player ${playerIndex} played ${card.rank}${card.suit}, cards in hand: ${hand.length}`);

  // --- DYNAMIC: Remove teamCapturedBuilds when original owner trails a matching card ---
  // If the player who trailed is the originalOwner of any build in teamCapturedBuilds,
  // remove those builds from all teammates' lists since they can no longer be rebuilt
  if (newState.teamCapturedBuilds) {
    const trailedCardValue = trailedCard.value;
    
    // Check all players' teamCapturedBuilds lists
    for (const playerKey of Object.keys(newState.teamCapturedBuilds)) {
      const playerNum = parseInt(playerKey, 10);
      const buildsList = newState.teamCapturedBuilds[playerNum];
      
      if (buildsList && Array.isArray(buildsList)) {
        const originalLength = buildsList.length;
        
        // Filter out builds where:
        // 1. The originalOwner is the player who just trailed
        // 2. The build value matches the trailed card value
        const updatedBuilds = buildsList.filter(build => {
          return !(build.originalOwner === playerIndex && build.value === trailedCardValue);
        });
        
        if (updatedBuilds.length !== originalLength) {
          newState.teamCapturedBuilds[playerNum] = updatedBuilds;
          console.log(`[trail] Removed teamCapturedBuilds for Player ${playerNum}: ${originalLength} -> ${updatedBuilds.length} (originalOwner=${playerIndex} trailed ${trailedCardValue})`);
        }
      }
    }
  }

  // Mark turn as started and ended (trail auto-ends turn)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  // Explicitly set turnEnded since trail ends the turn
  if (newState.roundPlayers && newState.roundPlayers[playerIndex]) {
    newState.roundPlayers[playerIndex].turnEnded = true;
    console.log(`[trail] Player ${playerIndex} turnEnded set to true`);
  }

  // Advance turn
  const resultState = nextTurn(newState);
  
  // Check if game is over (deck empty and all hands empty)
  const deckEmpty = resultState.deck.length === 0;
  const allHandsEmpty = resultState.players.every(p => p.hand.length === 0);
  
  if (deckEmpty && allHandsEmpty) {
    return finalizeGame(resultState);
  }
  
  return resultState;
}

module.exports = trail;
