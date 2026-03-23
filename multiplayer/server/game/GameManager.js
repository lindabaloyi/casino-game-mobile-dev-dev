/**
 * GameManager
 * Manages the lifecycle of active games.
 * Stores game states in memory and exposes get/save/end helpers.
 * No game logic here — delegates to ActionRouter.
 */

const { initializeGame, initializeTestGame } = require('../../../shared/game');
const startTournamentAction = require('../../../shared/game/actions/startTournament');

class GameManager {
  constructor() {
    /** gameId → gameState */
    this.activeGames = new Map();

    /** gameId → Map(socketId → playerIndex) */
    this.socketPlayerMap = new Map();

    /** gameId → Map(socketId → userId) */
    this.socketUserIdMap = new Map();

    this._nextId = 1;
  }

  // ── Game lifecycle ──────────────────────────────────────────────────────────

  /**
   * Create a new game, deal cards, store state.
   * Set USE_TEST_GAME = true for debugging with specific cards.
   * @param {number} playerCount - Number of players (2, 3, or 4)
   * @param {boolean} isPartyMode - Whether this is party mode (with teams)
   * @returns {{ gameId: number, gameState: object }}
   */
  startGame(playerCount = 2, isPartyMode = false) {
    const gameId = this._nextId++;
    
    // Set to true to use test deal with specific cards
    const USE_TEST_GAME = false;
    
    const gameState = USE_TEST_GAME ? initializeTestGame(playerCount) : initializeGame(playerCount, isPartyMode);

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());
    this.socketUserIdMap.set(gameId, new Map());

    return { gameId, gameState };
  }

  /**
   * Create a new 4-player party game.
   * @returns {{ gameId: number, gameState: object }}
   */
  startPartyGame() {
    const gameId = this._nextId++;
    
    // Party games always use regular initialization (not test deal)
    // Pass isPartyMode = true to enable 2v2 teams
    const gameState = initializeGame(4, true); // 4 players, party mode with teams

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());
    this.socketUserIdMap.set(gameId, new Map());

    return { gameId, gameState };
  }
  
  /**
   * Create a new 3-player three-hands game.
   * @returns {{ gameId: number, gameState: object }}
   */
  startThreeHandsGame() {
    const gameId = this._nextId++;
    
    // Three-hands games use 3 players
    const gameState = initializeGame(3); // 3 players

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());
    this.socketUserIdMap.set(gameId, new Map());

    return { gameId, gameState };
  }

  /**
   * Create a new 4-player free-for-all game.
   * @returns {{ gameId: number, gameState: object }}
   */
  startFreeForAllGame() {
    const gameId = this._nextId++;
    
    // Free-for-all uses 4 players but without team mechanics
    const gameState = initializeGame(4); // 4 players

    this.activeGames.set(gameId, gameState);
    this.socketPlayerMap.set(gameId, new Map());
    this.socketUserIdMap.set(gameId, new Map());

    return { gameId, gameState };
  }

  /**
   * Create a new 4-player tournament (knockout) game.
   * @returns {{ gameId: number, gameState: object }}
   */
  startTournamentGame() {
    const gameId = this._nextId++;
    
    console.log(`[GameManager] Starting tournament game ${gameId}`);
    
    // Free-for-all uses 4 players but without team mechanics
    const gameState = initializeGame(4); // 4 players
    
    // Initialize tournament state using the shared action
    // The action requires (state, payload, playerIndex) - we pass null for payload and 0 for playerIndex
    const tournamentState = startTournamentAction(gameState, null, 0);

    this.activeGames.set(gameId, tournamentState);
    this.socketPlayerMap.set(gameId, new Map());
    this.socketUserIdMap.set(gameId, new Map());

    console.log(`[GameManager] Tournament game ${gameId} created with tournamentMode=${tournamentState.tournamentMode}`);
    return { gameId, gameState: tournamentState };
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
    this.socketUserIdMap.delete(gameId);
  }

  // ── Player ↔ Socket mapping ─────────────────────────────────────────────────

  addPlayerToGame(gameId, socketId, playerIndex, userId = null) {
    const map = this.socketPlayerMap.get(gameId);
    if (map) map.set(socketId, playerIndex);
    
    // Store userId mapping if provided
    if (userId) {
      const userIdMap = this.socketUserIdMap.get(gameId);
      if (userIdMap) userIdMap.set(socketId, userId);
    }
  }

  getPlayerIndex(gameId, socketId) {
    const map = this.socketPlayerMap.get(gameId);
    return map ? (map.get(socketId) ?? null) : null;
  }

  getUserId(gameId, socketId) {
    const map = this.socketUserIdMap.get(gameId);
    return map ? (map.get(socketId) ?? null) : null;
  }

  getAllUserIds(gameId) {
    const map = this.socketUserIdMap.get(gameId);
    return map ? Array.from(map.values()).filter(Boolean) : [];
  }

  setPlayerUserId(gameId, playerIndex, userId) {
    const gameState = this.activeGames.get(gameId);
    if (gameState && gameState.players && gameState.players[playerIndex]) {
      gameState.players[playerIndex].userId = userId;
      console.log(`[GameManager] Set player ${playerIndex} userId to ${userId}`);
    }
  }

  removePlayerFromGame(gameId, socketId) {
    const map = this.socketPlayerMap.get(gameId);
    if (map) map.delete(socketId);
    
    const userIdMap = this.socketUserIdMap.get(gameId);
    if (userIdMap) userIdMap.delete(socketId);
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
