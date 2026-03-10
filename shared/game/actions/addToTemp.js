/**
 * addToTemp
 * Player adds a card to their existing temp stack.
 */

const { cloneState } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function addToTemp(state, payload, playerIndex) {
  const card = payload.card || payload.tableCard || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToTemp: missing card or stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];

  let source = 'unknown';
  let cardFound = false;

  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    newState.tableCards.splice(tableIdx, 1);
    source = 'table';
    cardFound = true;
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      hand.splice(handIdx, 1);
      source = 'hand';
      cardFound = true;
    } else {
      // Check own captures first
      let ownCaptureIdx = newState.players[playerIndex].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (ownCaptureIdx !== -1) {
        newState.players[playerIndex].captures.splice(ownCaptureIdx, 1);
        source = 'captured';
        cardFound = true;
      } else {
        // Check teammate's captures (party mode only)
        let teammateCaptured = false;
        if (state.isPartyMode) {
          const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
          const teammateCaptureIdx = newState.players[teammateIndex].captures.findIndex(
            c => c.rank === card.rank && c.suit === card.suit,
          );
          if (teammateCaptureIdx !== -1) {
            newState.players[teammateIndex].captures.splice(teammateCaptureIdx, 1);
            source = 'captured';
            cardFound = true;
            teammateCaptured = true;
          }
        }
        
        // Check opponents' captures (all opponents in party mode, single opponent in duel mode)
        if (!cardFound && !teammateCaptured) {
          if (state.isPartyMode) {
            // Party mode: check both opponents
            const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
            for (const oIdx of opponentIndices) {
              const oppCaptureIdx = newState.players[oIdx].captures.findIndex(
                c => c.rank === card.rank && c.suit === card.suit,
              );
              if (oppCaptureIdx !== -1) {
                newState.players[oIdx].captures.splice(oppCaptureIdx, 1);
                source = 'captured';
                cardFound = true;
                break;
              }
            }
          } else {
            // Duel mode: check single opponent
            const opponentIndex = playerIndex === 0 ? 1 : 0;
            const opponentCaptures = newState.players[opponentIndex].captures;
            const captureIdx = opponentCaptures.findIndex(
              c => c.rank === card.rank && c.suit === card.suit,
            );
            if (captureIdx !== -1) {
              opponentCaptures.splice(captureIdx, 1);
              source = 'captured';
              cardFound = true;
            }
          }
        }
      }
    }
  }

  if (!cardFound) {
    return state;
  }

  // LIMIT: Max 2 cards from player's hand per temp stack per turn
  // Cards from table or captures don't count toward this limit
  console.log(`[addToTemp] Card source: ${source}, stackId: ${stackId}`);
  console.log(`[addToTemp] Total cards in stack before add: ${stack.cards.length}`);
  console.log(`[addToTemp] Stack cards breakdown:`, stack.cards.map(c => `${c.rank}${c.suit}(${c.source})`).join(', '));
  
  if (source === 'hand') {
    const handCardsCount = stack.cards.filter(c => c.source === 'hand').length;
    console.log(`[addToTemp] Hand cards count: ${handCardsCount}, limit: 1 (can add max 1 more from hand after initial)`);
    if (handCardsCount >= 1) {
      console.log(`[addToTemp] REJECTED: Cannot add more than 1 card from hand (limit is 1)`);
      throw new Error('Cannot add more than 1 card from hand to temp stack (limit is 1)');
    }
    console.log(`[addToTemp] ALLOWED: Adding card from hand`);
  } else {
    console.log(`[addToTemp] ALLOWED: Source is ${source} - no hand card limit applies`);
  }

  stack.cards.push({ ...card, source });

  // Use the shared build calculator to compute value for multi-card builds
  const values = stack.cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  stack.value = buildInfo.value;
  stack.base = buildInfo.value;
  stack.need = buildInfo.need;
  stack.buildType = buildInfo.buildType;

  // Debug: Log the full stack state after update
  console.log('[addToTemp] Updated stack:', {
    stackId: stack.stackId,
    cards: stack.cards.map(c => `${c.rank}${c.suit}(${c.source})`),
    value: stack.value,
    base: stack.base,
    need: stack.need,
    buildType: stack.buildType
  });

  return newState;
}

module.exports = addToTemp;
