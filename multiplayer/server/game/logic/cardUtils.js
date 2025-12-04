/**
 * Card Utilities Module
 * Pure helper functions for card operations
 * Additional utilities beyond those in GameState.js
 */

const { rankValue } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('CardUtils');

/**
 * Check if two cards are identical
 */
function cardsEqual(card1, card2) {
  return card1.rank === card2.rank && card1.suit === card2.suit;
}

/**
 * Check if card exists in array
 */
function cardExistsIn(cards, targetCard) {
  return cards.some(card => cardsEqual(card, targetCard));
}

/**
 * Remove card from array (returns new array)
 */
function removeCard(cards, cardToRemove) {
  return cards.filter(card => !cardsEqual(card, cardToRemove));
}

/**
 * Find card in array
 */
function findCard(cards, targetCard) {
  return cards.find(card => cardsEqual(card, targetCard));
}

/**
 * Check if card can capture another card
 */
function canCaptureCard(capturingCard, targetCard) {
  return rankValue(capturingCard.rank) === rankValue(targetCard.rank);
}

/**
 * Check if card can form build with another card
 */
function canFormBuild(card1, card2, hasCaptureCard = false) {
  const value1 = rankValue(card1.rank);
  const value2 = rankValue(card2.rank);

  return hasCaptureCard && (value1 + value2) <= 10;
}

/**
 * Get all possible captures for a card
 */
function getPossibleCaptures(card, tableCards) {
  return tableCards.filter(tableCard => canCaptureCard(card, tableCard));
}

/**
 * Get card display string
 */
function cardToString(card) {
  return `${card.rank}${card.suit}`;
}

/**
 * Sort cards by value (ascending)
 */
function sortCardsByValue(cards) {
  return [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
}

module.exports = {
  cardsEqual,
  cardExistsIn,
  removeCard,
  findCard,
  canCaptureCard,
  canFormBuild,
  getPossibleCaptures,
  cardToString,
  sortCardsByValue
};
