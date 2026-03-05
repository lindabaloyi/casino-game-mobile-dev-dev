/**
 * GameManager
 * Manages the lifecycle of active games.
 * Stores game states in memory and exposes get/save/end helpers.
 * No game logic here — delegates to ActionRouter.
 */

const { initializeGame, initializeTestGame } = require('../../../shared/game/GameState');

class GameManager {
  constructor() {
    /** gameId → gameState */
    this.activeGames = new Map();

    /** gameId → Map(socketId → playerIndex) */
    this.socketPlayerMap = new Map();

    this._nextId = 1;
  }

  // ── Game lifecycle ──────────────────────────────────────────────────────────

  /**
   * Create a new game, deal cards, store state.
   * Set USE_TEST_GAME = true for debugging with specific cards.
   * @returns {{ gameId: number, gameState: object }}
   */
  startGame() {
    const gameId = this._nextId++;
    
    // Set to true to use test deal with specific cards
    const USE_TEST_GAME = true;
    
    const gameState = USE_TEST_GAME ? initializeTestGame() : initializeGame();

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());

    console.log(`[GameManager] Game ${gameId} started — deck: ${gameState.deck.length} remaining`);
    
    // Log player hands for debugging
    console.log(`[GameManager] Player 0 hand:`, gameState.players[0].hand.map(c => `${c.rank}${c.suit}`).join(', '));
    console.log(`[GameManager] Player 1 hand:`, gameState.players[1].hand.map(c => `${c.rank}${c.suit}`).join(', '));
    console.log(`[GameManager] Table cards:`, gameState.tableCards.map(c => `${c.rank}${c.suit}`).join(', '));
    
    return { gameId, gameState };
  }

  /**
   * Create a new 4-player party game.
   * @returns {{ gameId: number, gameState: object }}
   */
  startPartyGame() {
    const gameId = this._nextId++;
    
    // Party games always use regular deal (not test deal)
    const gameState = initializeGame(4); // 4 players

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());

    console.log(`[GameManager] Party Game ${gameId} started — deck: ${gameState.deck.length} remaining, players: ${gameState.playerCount}`);
    
    // Log player hands for debugging
    for (let i = 0; i < 4; i++) {
      console.log(`[GameManager] Player ${i} (Team ${gameState.players[i].team}) hand:`, gameState.players[i].hand.map(c => `${c.rank}${c.suit}`).join(', '));
    }
    console.log(`[GameManager] Table cards:`, gameState.tableCards.map(c => `${c.rank}${c.suit}`).join(', '));
    
    return { gameId, gameState };
  }

  /**
   * Retrieve game state (returns undefined if not found).
   */
  getGameState(gameId) {
    return this.activeGames.get(gameId);
  }

  /**
   * Persist updated game state (called by ActionRouter after each action).
   */
  saveGameState(gameId, newState) {
    this.activeGames.set(gameId, newState);
  }

  /**
   * Remove a game from memory.
   */
  endGame(gameId) {
    this.activeGames.delete(gameId);
    this.socketPlayerMap.delete(gameId);
    console.log(`[GameManager] Game ${gameId} ended`);
  }

  // ── Player ↔ Socket mapping ─────────────────────────────────────────────────

  addPlayerToGame(gameId, socketId, playerIndex) {
    const map = this.socketPlayerMap.get(gameId);
    if (map) map.set(socketId, playerIndex);
  }

  getPlayerIndex(gameId, socketId) {
    const map = this.socketPlayerMap.get(gameId);
    return map ? (map.get(socketId) ?? null) : null;
  }

  removePlayerFromGame(gameId, socketId) {
    const map = this.socketPlayerMap.get(gameId);
    if (map) map.delete(socketId);
  }

  getGameSockets(gameId) {
    const map = this.socketPlayerMap.get(gameId);
    return map ? Array.from(map.keys()) : [];
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────────

  getActiveGamesCount() {
    return this.activeGames.size;
  }
}

module.exports = GameManager;
