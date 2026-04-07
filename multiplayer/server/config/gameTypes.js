module.exports = {
  'two-hands': {
    minPlayers: 2,
    createGame: (gameManager) => gameManager.startGame(2, false),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  },
  'three-hands': {
    minPlayers: 3,
    createGame: (gameManager) => gameManager.startGame(3, false),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 3; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  },
  'four-hands': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  },
  'party': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  },
  'freeforall': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  }
};
