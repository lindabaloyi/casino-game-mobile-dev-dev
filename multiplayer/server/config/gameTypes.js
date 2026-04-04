// Game type configurations - using client terminology
const GAME_TYPES = {
  'two-hands': {
    minPlayers: 2,
    maxPlayers: 2,
    createGame: (gameManager) => gameManager.startGame(2, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'three-hands': {
    minPlayers: 3,
    maxPlayers: 3,
    createGame: (gameManager) => gameManager.startGame(3, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2
      for (let i = 0; i < 3; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'four-hands': {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  party: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  // freeforall is kept for quick play matchmaking (same as four-hands but different queue)
  freeforall: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  // Tournament mode - 4-player knockout
  tournament: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startTournamentGame(),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  }
};

module.exports = GAME_TYPES;