const GameFactory = require('../server/services/GameFactory');

describe('GameFactory', () => {
  let gameFactory;
  let mockGameManager;
  let mockSocketRegistry;
  let mockPlayers;

  beforeEach(() => {
    gameFactory = new GameFactory();

    mockGameManager = {
      startGame: jest.fn(),
      addPlayerToGame: jest.fn(),
      setPlayerUserId: jest.fn()
    };

    mockSocketRegistry = {
      set: jest.fn()
    };

    mockPlayers = [
      { id: 'socket1', socket: { id: 'socket1' }, userId: 'user1' },
      { id: 'socket2', socket: { id: 'socket2' }, userId: 'user2' }
    ];

    jest.clearAllMocks();
  });

  describe('register()', () => {
    test('should register game type configuration', () => {
      const config = {
        minPlayers: 2,
        createGame: jest.fn(),
        registerPlayers: jest.fn()
      };

      gameFactory.register('two-hands', config);

      const registeredConfig = gameFactory.getConfig('two-hands');
      expect(registeredConfig).toEqual(config);
    });

    test('should override existing configuration', () => {
      const config1 = { minPlayers: 2, createGame: jest.fn(), registerPlayers: jest.fn() };
      const config2 = { minPlayers: 3, createGame: jest.fn(), registerPlayers: jest.fn() };

      gameFactory.register('two-hands', config1);
      gameFactory.register('two-hands', config2);

      const registeredConfig = gameFactory.getConfig('two-hands');
      expect(registeredConfig.minPlayers).toBe(3);
    });
  });

  describe('createAndRegister()', () => {
    beforeEach(() => {
      const config = {
        minPlayers: 2,
        createGame: (gameManager) => {
          mockGameManager.startGame(2, false);
          return { gameId: 42, gameState: {} };
        },
        registerPlayers: (gameId, players, gameManager, userIds) => {
          mockGameManager.addPlayerToGame(gameId, players[0].id, 0, userIds[0]);
          mockGameManager.addPlayerToGame(gameId, players[1].id, 1, userIds[1]);
        }
      };
      gameFactory.register('two-hands', config);
    });

    test('should successfully create and register game', () => {
      const result = gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(result).not.toBeNull();
      expect(result.gameId).toBe(42);
      expect(result.players).toHaveLength(2);
      expect(result.players[0].socket.id).toBe('socket1');
      expect(result.players[1].userId).toBe('user2');
    });

    test('should call game creation function', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.startGame).toHaveBeenCalledWith(2, false);
    });

    test('should register players with game manager', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledTimes(2);
      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledWith(42, 'socket1', 0, 'user1');
      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledWith(42, 'socket2', 1, 'user2');
    });

    test('should register sockets with registry', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockSocketRegistry.set).toHaveBeenCalledTimes(2);
      expect(mockSocketRegistry.set).toHaveBeenCalledWith('socket1', 42, 'two-hands', 'user1');
      expect(mockSocketRegistry.set).toHaveBeenCalledWith('socket2', 42, 'two-hands', 'user2');
    });

    test('should set user IDs on game state', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledTimes(2);
      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledWith(42, 0, 'user1');
      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledWith(42, 1, 'user2');
    });

    test('should successfully create and register game', () => {
      const result = gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(result).not.toBeNull();
      expect(result.gameId).toBe(42);
      expect(result.players).toHaveLength(2);
      expect(result.players[0].socket.id).toBe('socket1');
      expect(result.players[1].userId).toBe('user2');
    });

    test('should call game creation function', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.startGame).toHaveBeenCalledWith(2, false);
    });

    test('should register players with game manager', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledTimes(2);
      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledWith(42, 'socket1', 0, 'user1');
      expect(mockGameManager.addPlayerToGame).toHaveBeenCalledWith(42, 'socket2', 1, 'user2');
    });

    test('should register sockets with registry', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockSocketRegistry.set).toHaveBeenCalledTimes(2);
      expect(mockSocketRegistry.set).toHaveBeenCalledWith('socket1', 42, 'two-hands', 'user1');
      expect(mockSocketRegistry.set).toHaveBeenCalledWith('socket2', 42, 'two-hands', 'user2');
    });

    test('should set user IDs on game state', () => {
      gameFactory.createAndRegister('two-hands', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledTimes(2);
      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledWith(42, 0, 'user1');
      expect(mockGameManager.setPlayerUserId).toHaveBeenCalledWith(42, 1, 'user2');
    });

    test('should return null for unknown game type', () => {
      const result = gameFactory.createAndRegister('unknown-game', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(result).toBeNull();
    });

    test('should return null when wrong number of players', () => {
      const onePlayer = [mockPlayers[0]];

      const result = gameFactory.createAndRegister('two-hands', onePlayer, mockGameManager, mockSocketRegistry);

      expect(result).toBeNull();
    });

    test('should return null when game creation fails', () => {
      const config = {
        minPlayers: 2,
        createGame: jest.fn().mockReturnValue({ gameId: null, gameState: null }),
        registerPlayers: jest.fn()
      };
      gameFactory.register('failing-game', config);

      const result = gameFactory.createAndRegister('failing-game', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(result).toBeNull();
    });

    test('should handle errors during game creation', () => {
      const config = {
        minPlayers: 2,
        createGame: jest.fn().mockImplementation(() => {
          throw new Error('Game creation failed');
        }),
        registerPlayers: jest.fn()
      };
      gameFactory.register('error-game', config);

      const result = gameFactory.createAndRegister('error-game', mockPlayers, mockGameManager, mockSocketRegistry);

      expect(result).toBeNull();
    });
  });

  describe('getConfig()', () => {
    test('should return config for registered game type', () => {
      const config = { minPlayers: 2, createGame: jest.fn(), registerPlayers: jest.fn() };
      gameFactory.register('two-hands', config);

      const retrievedConfig = gameFactory.getConfig('two-hands');

      expect(retrievedConfig).toEqual(config);
    });

    test('should return null for unregistered game type', () => {
      const config = gameFactory.getConfig('unknown');

      expect(config).toBeNull();
    });
  });

  describe('getRegisteredTypes()', () => {
    test('should return all registered game types', () => {
      gameFactory.register('two-hands', {});
      gameFactory.register('three-hands', {});
      gameFactory.register('four-hands', {});

      const types = gameFactory.getRegisteredTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('two-hands');
      expect(types).toContain('three-hands');
      expect(types).toContain('four-hands');
    });

    test('should return empty array when no types registered', () => {
      const types = gameFactory.getRegisteredTypes();

      expect(types).toEqual([]);
    });
  });
});