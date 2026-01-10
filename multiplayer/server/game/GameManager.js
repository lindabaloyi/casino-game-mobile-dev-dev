/**
 * Game Manager Module
 * Orchestrates game state and actions. Holds game instances and coordinates
 * with ActionRouter to execute actions and determineActions logic.
 */

const { initializeGame, validateGameState } = require('./GameState');
const { createLogger } = require('../utils/logger');
const { determineActions } = require('./logic/actionDetermination');

const logger = createLogger('GameManager');

class GameManager {
  constructor(actionRouter = null) {
    this.activeGames = new Map(); // gameId -> gameState
    this.gameIdCounter = 0;
    this.actionRouter = actionRouter; // Dependency injection
    this.socketPlayerMap = new Map(); // gameId -> Map(socketId -> playerIndex)
  }

  /**
   * Start a new game
   * Returns gameId for reference
   */
  startGame() {
    const gameId = ++this.gameIdCounter;
    const gameState = initializeGame();

    // Validate initial state
    const validation = validateGameState(gameState);
    if (!validation.valid) {
      logger.error('Failed to create valid initial game state', { errors: validation.errors });
      throw new Error('Invalid game state: ' + validation.errors.join(', '));
    }

    this.activeGames.set(gameId, gameState);
    // Initialize socket player mapping for this game
    this.socketPlayerMap.set(gameId, new Map());

    logger.info('Game started', { gameId, initialPlayer: gameState.currentPlayer });

    return { gameId, gameState };
  }

  /**
   * Get game state by ID
   */
  getGameState(gameId) {
    return this.activeGames.get(gameId);
  }

  /**
   * Apply an action to a game
   * Validates turn, delegates to ActionRouter
   */
  applyAction(gameId, playerIndex, action) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Turn validation
    if (playerIndex !== gameState.currentPlayer) {
      logger.warn('Turn violation', { gameId, playerIndex, currentPlayer: gameState.currentPlayer, action: action.type });
      throw new Error(`It's not player ${playerIndex}'s turn`);
    }

    if (!this.actionRouter) {
      throw new Error('ActionRouter not initialized');
    }

    logger.info('Routing action through ActionRouter', { gameId, playerIndex, actionType: action.type });

    try {
      // Delegate to ActionRouter - it will route to appropriate action module
      const newGameState = this.actionRouter.executeAction(gameId, playerIndex, action);

      // Store updated state (ActionRouter should update our internal state)
      logger.debug('Action executed successfully by ActionRouter', { gameId, actionType: action.type });



      return newGameState;
    } catch (error) {
      logger.error('Action execution failed', { gameId, actionType: action.type, error: error.message });
      throw error; // Re-throw with ActionRouter's error details
    }
  }

  /**
   * Determine possible actions for a drag
   * Delegates to determineActions logic module
   */
  determineActions(gameId, draggedItem, targetInfo) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    logger.debug('Determining actions', { gameId, draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`, targetType: targetInfo.type });

    try {
      // Delegate to logic module
      const result = determineActions(draggedItem, targetInfo, gameState);

      logger.debug('Actions determined successfully', { gameId, actionCount: result.actions.length, requiresModal: result.requiresModal });
      return result;
    } catch (error) {
      logger.error('Failed to determine actions', { gameId, error: error.message });
      return {
        actions: [],
        requiresModal: false,
        errorMessage: error.message
      };
    }
  }

  /**
   * End game and clean up
   */
  endGame(gameId) {
    if (this.activeGames.has(gameId)) {
      this.activeGames.delete(gameId);
      logger.info('Game ended', { gameId });
    }
  }

  /**
   * Get active games count
   */
  getActiveGamesCount() {
    return this.activeGames.size;
  }

  /**
   * Validate game state integrity
   */
  validateGame(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      return { valid: false, error: 'Game not found' };
    }

    const validation = validateGameState(gameState);
    if (!validation.valid) {
      logger.error('Game state validation failed', { gameId, errors: validation.errors });
    }

    return validation;
  }

  /**
   * Add player to game (maps socket ID to player index)
   */
  addPlayerToGame(gameId, socketId, playerIndex) {
    const gameMapping = this.socketPlayerMap.get(gameId);
    if (!gameMapping) {
      throw new Error(`Game ${gameId} not found`);
    }

    gameMapping.set(socketId, playerIndex);
    logger.debug('Player added to game', { gameId, socketId, playerIndex });
  }

  /**
   * Get player index for socket in game
   */
  getPlayerIndex(gameId, socketId) {
    const gameMapping = this.socketPlayerMap.get(gameId);
    if (!gameMapping) {
      return null;
    }

    return gameMapping.get(socketId) ?? null;
  }

  /**
   * Remove player from game
   */
  removePlayerFromGame(gameId, socketId) {
    const gameMapping = this.socketPlayerMap.get(gameId);
    if (gameMapping) {
      gameMapping.delete(socketId);
      logger.debug('Player removed from game', { gameId, socketId });
    }
  }

  /**
   * Get all socket IDs for a game
   */
  getGameSockets(gameId) {
    const gameMapping = this.socketPlayerMap.get(gameId);
    if (!gameMapping) {
      return [];
    }

    return Array.from(gameMapping.keys());
  }
}

module.exports = GameManager;

