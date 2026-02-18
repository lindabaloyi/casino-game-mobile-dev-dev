/**
 * GameManager
 * Manages the lifecycle of active games.
 * Stores game states in memory and exposes get/save/end helpers.
 * No game logic here — delegates to ActionRouter.
 */

const { initializeGame } = require('./GameState.js');

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
   * @returns {{ gameId: number, gameState: object }}
   */
  startGame() {
    const gameId = this._nextId++;
    const gameState = initializeGame();

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());

    console.log(`[GameManager] Game ${gameId} started — deck: ${gameState.deck.length} remaining`);
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
