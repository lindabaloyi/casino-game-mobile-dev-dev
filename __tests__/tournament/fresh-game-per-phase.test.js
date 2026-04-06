/**
 * Tournament Fresh Game Per Phase - Test Suite
 * Tests the TournamentCoordinator's fresh game per phase logic
 */

const { initializeGame } = require('../../shared/game/initialization');
const { createDeck } = require('../../shared/game/deck');
const { createRoundPlayers } = require('../../shared/game/turn');
const { cloneState } = require('../../shared/game');
const startTournamentAction = require('../../shared/game/actions/startTournament');
const endTournamentRound = require('../../shared/game/actions/endTournamentRound');
const startSemifinal = require('../../shared/game/actions/startQualificationReview').startSemifinal;
const startFinalShowdown = require('../../shared/game/actions/startQualificationReview').startFinalShowdown;

describe('TournamentCoordinator - Fresh Game Per Phase', () => {
  let TournamentCoordinator;
  let coordinator;
  let mockGameManager;
  let mockMatchmaking;
  let mockBroadcaster;
  let mockSocket1, mockSocket2, mockSocket3, mockSocket4;

  function createTournamentGame() {
    const state = initializeGame(4, false);
    const tournamentState = startTournamentAction(state, {}, 0);
    
    tournamentState.tournamentScores = {
      'player_0': 10,
      'player_1': 5,
      'player_2': 15,
      'player_3': 8
    };
    
    tournamentState.playerStatuses = {
      'player_0': 'ACTIVE',
      'player_1': 'ACTIVE',
      'player_2': 'ACTIVE',
      'player_3': 'ACTIVE'
    };
    
    return tournamentState;
  }

  beforeEach(() => {
    // Create mock sockets
    mockSocket1 = { 
      id: 'socket-1', 
      userId: 'user-1', 
      leave: jest.fn(), 
      join: jest.fn(),
      emit: jest.fn()
    };
    mockSocket2 = { 
      id: 'socket-2', 
      userId: 'user-2', 
      leave: jest.fn(), 
      join: jest.fn(),
      emit: jest.fn()
    };
    mockSocket3 = { 
      id: 'socket-3', 
      userId: 'user-3', 
      leave: jest.fn(), 
      join: jest.fn(),
      emit: jest.fn()
    };
    mockSocket4 = { 
      id: 'socket-4', 
      userId: 'user-4', 
      leave: jest.fn(), 
      join: jest.fn(),
      emit: jest.fn()
    };

    // Create mock game manager
    mockGameManager = {
      activeGames: new Map(),
      socketPlayerMap: new Map(),
      getGameState: jest.fn((gameId) => mockGameManager.activeGames.get(gameId)),
      saveGameState: jest.fn((gameId, state) => mockGameManager.activeGames.set(gameId, state)),
      closeGame: jest.fn()
    };

    // Create mock matchmaking
    mockMatchmaking = {
      getGameSockets: jest.fn((gameId) => {
        if (gameId === 1) {
          return [mockSocket1, mockSocket2, mockSocket3, mockSocket4];
        }
        if (gameId === 2) {
          return [mockSocket1, mockSocket3, mockSocket4];
        }
        return [];
      }),
      socketRegistry: {
        set: jest.fn()
      }
    };

    // Create mock broadcaster
    mockBroadcaster = {
      broadcastGameUpdate: jest.fn(),
      broadcastToGame: jest.fn()
    };

    // Load TournamentCoordinator
    TournamentCoordinator = require('../../multiplayer/server/services/TournamentCoordinator');
    coordinator = new TournamentCoordinator(mockGameManager, mockMatchmaking, mockBroadcaster);
  });

  describe('isTournamentActive', () => {
    test('returns true for knockout tournament', () => {
      const state = { tournamentMode: 'knockout' };
      expect(coordinator.isTournamentActive(state)).toBe(true);
    });

    test('returns false for non-tournament', () => {
      const state = { tournamentMode: null };
      expect(coordinator.isTournamentActive(state)).toBe(false);
    });

    test('returns false for undefined state', () => {
      expect(coordinator.isTournamentActive(null)).toBe(false);
      expect(coordinator.isTournamentActive(undefined)).toBe(false);
    });
  });

  describe('_createFreshState', () => {
    test('creates fresh state with correct player count for SEMI_FINAL', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const freshState = coordinator._createFreshState(state, 'SEMI_FINAL', qualifiedPlayers);

      expect(freshState.tournamentPhase).toBe('SEMI_FINAL');
      expect(freshState.playerCount).toBe(3);
      expect(freshState.players).toHaveLength(3);
    });

    test('creates fresh state with correct player IDs', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const freshState = coordinator._createFreshState(state, 'SEMI_FINAL', qualifiedPlayers);

      expect(freshState.players[0].id).toBe('player_0');
      expect(freshState.players[1].id).toBe('player_2');
      expect(freshState.players[2].id).toBe('player_3');
    });

    test('creates fresh state with correct player IDs for FINAL_SHOWDOWN', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2'];

      const freshState = coordinator._createFreshState(state, 'FINAL_SHOWDOWN', qualifiedPlayers);

      expect(freshState.tournamentPhase).toBe('FINAL_SHOWDOWN');
      expect(freshState.playerCount).toBe(2);
      expect(freshState.players[0].id).toBe('player_0');
      expect(freshState.players[1].id).toBe('player_2');
    });

    test('deals correct number of cards for 2-player game', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2'];

      const freshState = coordinator._createFreshState(state, 'FINAL_SHOWDOWN', qualifiedPlayers);

      expect(freshState.players[0].hand).toHaveLength(10);
      expect(freshState.players[1].hand).toHaveLength(10);
    });

    test('deals correct number of cards for 3-player game', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const freshState = coordinator._createFreshState(state, 'SEMI_FINAL', qualifiedPlayers);

      expect(freshState.players[0].hand).toHaveLength(13);
      expect(freshState.players[1].hand).toHaveLength(13);
      expect(freshState.players[2].hand).toHaveLength(13);
    });

    test('resets round-specific state', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const freshState = coordinator._createFreshState(state, 'SEMI_FINAL', qualifiedPlayers);

      expect(freshState.round).toBe(1);
      expect(freshState.currentPlayer).toBe(0);
      expect(freshState.moveCount).toBe(0);
      expect(freshState.turnCounter).toBe(1);
      expect(freshState.gameOver).toBe(false);
    });

    test('sets table cards and deck', () => {
      const state = createTournamentGame();
      const qualifiedPlayers = ['player_0', 'player_2'];

      const freshState = coordinator._createFreshState(state, 'FINAL_SHOWDOWN', qualifiedPlayers);

      expect(freshState.tableCards).toHaveLength(4);
      // Casino uses 40-card deck: 52 - 20 (players) - 4 (table) = 16 remaining
      expect(freshState.deck).toHaveLength(40 - 20 - 4);
    });
  });

  describe('_createNewGame', () => {
    test('creates new game with unique gameId', () => {
      const state = createTournamentGame();
      
      const gameId1 = coordinator._createNewGame(state);
      const gameId2 = coordinator._createNewGame(state);

      expect(gameId1).not.toBe(gameId2);
      expect(mockGameManager.saveGameState).toHaveBeenCalledTimes(2);
    });

    test('saves state with gameId', () => {
      const state = createTournamentGame();
      
      const gameId = coordinator._createNewGame(state);

      expect(mockGameManager.saveGameState).toHaveBeenCalledWith(
        gameId,
        expect.objectContaining({ gameId })
      );
    });
  });

  describe('_migrateSockets', () => {
    test('migrates only qualified sockets', () => {
      const oldGameId = 1;
      const newGameId = 2;
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      // Setup socket player map - player indices: socket-1=P0, socket-2=P1, socket-3=P2, socket-4=P3
      const socketMap = new Map([
        ['socket-1', 0],
        ['socket-2', 1],
        ['socket-3', 2],
        ['socket-4', 3],
      ]);
      mockGameManager.socketPlayerMap.set(oldGameId, socketMap);

      // Setup game state with player IDs
      const state = createTournamentGame();
      mockGameManager.activeGames.set(oldGameId, state);

      coordinator._migrateSockets(oldGameId, newGameId, qualifiedPlayers);

      // Check socketRegistry was called for qualified sockets (3 times)
      expect(mockMatchmaking.socketRegistry.set).toHaveBeenCalledTimes(3);
    });

    test('leaves old game room and joins new game room', () => {
      const oldGameId = 1;
      const newGameId = 2;
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const socketMap = new Map([
        ['socket-1', 0],
        ['socket-2', 1],
        ['socket-3', 2],
        ['socket-4', 3],
      ]);
      mockGameManager.socketPlayerMap.set(oldGameId, socketMap);

      const state = createTournamentGame();
      mockGameManager.activeGames.set(oldGameId, state);

      coordinator._migrateSockets(oldGameId, newGameId, qualifiedPlayers);

      // Qualified sockets should have left old room
      expect(mockSocket1.leave).toHaveBeenCalledWith(`game-${oldGameId}`);
      expect(mockSocket3.leave).toHaveBeenCalledWith(`game-${oldGameId}`);
      expect(mockSocket4.leave).toHaveBeenCalledWith(`game-${oldGameId}`);

      // Qualified sockets should have joined new room
      expect(mockSocket1.join).toHaveBeenCalledWith(`game-${newGameId}`);
      expect(mockSocket3.join).toHaveBeenCalledWith(`game-${newGameId}`);
      expect(mockSocket4.join).toHaveBeenCalledWith(`game-${newGameId}`);
    });

    test('does NOT migrate eliminated socket', () => {
      const oldGameId = 1;
      const newGameId = 2;
      const qualifiedPlayers = ['player_0', 'player_2', 'player_3'];

      const socketMap = new Map([
        ['socket-1', 0],
        ['socket-2', 1],
        ['socket-3', 2],
        ['socket-4', 3],
      ]);
      mockGameManager.socketPlayerMap.set(oldGameId, socketMap);

      const state = createTournamentGame();
      mockGameManager.activeGames.set(oldGameId, state);

      coordinator._migrateSockets(oldGameId, newGameId, qualifiedPlayers);

      // socket-2 (player_1, eliminated) should NOT have left
      expect(mockSocket2.leave).not.toHaveBeenCalled();
      expect(mockSocket2.join).not.toHaveBeenCalled();
    });
  });

  describe('handleClientReady', () => {
    test('allows active players', () => {
      const state = createTournamentGame();
      state.playerStatuses = {
        'player_0': 'ACTIVE',
        'player_1': 'ACTIVE',
      };
      state.players = [
        { id: 'player_0' },
        { id: 'player_1' },
      ];
      mockGameManager.activeGames.set(1, state);

      expect(coordinator.handleClientReady('socket-1', 1, 0)).toBe(true);
    });

    test('rejects eliminated players', () => {
      const state = createTournamentGame();
      state.playerStatuses = {
        'player_0': 'ACTIVE',
        'player_1': 'ELIMINATED',
      };
      state.players = [
        { id: 'player_0' },
        { id: 'player_1' },
      ];
      mockGameManager.activeGames.set(1, state);

      expect(coordinator.handleClientReady('socket-2', 1, 1)).toBe(false);
    });

    test('allows all players in non-tournament games', () => {
      const state = initializeGame(4, false);
      mockGameManager.activeGames.set(1, state);

      expect(coordinator.handleClientReady('socket-1', 1, 0)).toBe(true);
    });
  });

  describe('handleRoundEnd - routing', () => {
    test('routes to _handleQualifyingRoundEnd for QUALIFYING phase', () => {
      const state = createTournamentGame();
      state.tournamentPhase = 'QUALIFYING';
      mockGameManager.activeGames.set(1, state);

      const result = coordinator.handleRoundEnd(state, 1, {});
      
      expect(result.state).toBeDefined();
    });

    test('routes to _handleAdvanceFromQualificationReview for advance action', () => {
      const state = createTournamentGame();
      state.tournamentPhase = 'QUALIFICATION_REVIEW';
      state.qualifiedPlayers = ['player_0', 'player_2', 'player_3'];
      state.tournamentRound = 1;
      
      state.players = [
        { id: 'player_0', username: 'user1' },
        { id: 'player_2', username: 'user2' },
        { id: 'player_3', username: 'user3' },
      ];
      
      const socketMap = new Map([
        ['socket-1', 0],
        ['socket-3', 2],
        ['socket-4', 3],
      ]);
      mockGameManager.socketPlayerMap.set(1, socketMap);
      mockGameManager.activeGames.set(1, state);

      const result = coordinator.handleRoundEnd(state, 1, { type: 'advanceFromQualificationReview' });

      // Should create new game
      expect(result.newGameId).toBeDefined();
      expect(result.state.tournamentPhase).toBe('SEMI_FINAL');
    });
  });

  describe('End-to-End Flow Test', () => {
    test('QUALIFYING → SEMI_FINAL creates new game with 3 players', () => {
      // Setup: 4 players, tournament qualifying phase
      const state = createTournamentGame();
      state.tournamentPhase = 'QUALIFYING';
      state.tournamentRound = 1;
      
      // Set up socket map
      const socketMap = new Map([
        ['socket-1', 0], // player_0
        ['socket-2', 1], // player_1 (will be eliminated)
        ['socket-3', 2], // player_2
        ['socket-4', 3], // player_3
      ]);
      mockGameManager.socketPlayerMap.set(1, socketMap);
      
      state.players = [
        { id: 'player_0', username: 'user1' },
        { id: 'player_1', username: 'user2' },
        { id: 'player_2', username: 'user3' },
        { id: 'player_3', username: 'user4' },
      ];
      mockGameManager.activeGames.set(1, state);

      // Simulate round ending - goes to qualification review first
      const result = coordinator.handleRoundEnd(state, 1, {});

      // Should enter qualification review
      if (result.state.tournamentPhase === 'QUALIFICATION_REVIEW') {
        console.log('✅ Test 1: Entered QUALIFICATION_REVIEW correctly');
        expect(result.state.tournamentPhase).toBe('QUALIFICATION_REVIEW');
        expect(result.gameOver).toBe(false);
      }
    });

    test('advancing from QUALIFICATION_REVIEW creates new SEMI_FINAL game', () => {
      // Setup: in qualification review, 3 players qualified
      const state = createTournamentGame();
      state.tournamentPhase = 'QUALIFICATION_REVIEW';
      state.qualifiedPlayers = ['player_0', 'player_2', 'player_3'];
      state.tournamentRound = 1;
      
      // Set up socket map (4 sockets for 4 players)
      const socketMap = new Map([
        ['socket-1', 0], // player_0
        ['socket-2', 1], // player_1 (eliminated)
        ['socket-3', 2], // player_2
        ['socket-4', 3], // player_3
      ]);
      mockGameManager.socketPlayerMap.set(1, socketMap);
      
      state.players = [
        { id: 'player_0', username: 'user1' },
        { id: 'player_1', username: 'user2' },
        { id: 'player_2', username: 'user3' },
        { id: 'player_3', username: 'user4' },
      ];
      mockGameManager.activeGames.set(1, state);

      // Advance from qualification review
      const result = coordinator.handleRoundEnd(state, 1, { type: 'advanceFromQualificationReview' });

      // Should create new SEMI_FINAL game
      console.log('Result state tournamentPhase:', result.state.tournamentPhase);
      console.log('Result newGameId:', result.newGameId);
      console.log('Result state playerCount:', result.state.playerCount);
      
      expect(result.newGameId).toBeDefined();
      expect(result.state.tournamentPhase).toBe('SEMI_FINAL');
      expect(result.state.playerCount).toBe(3);
      expect(result.state.players).toHaveLength(3);
      
      // Verify only qualified players in new game
      const playerIds = result.state.players.map(p => p.id);
      expect(playerIds).toContain('player_0');
      expect(playerIds).toContain('player_2');
      expect(playerIds).toContain('player_3');
      expect(playerIds).not.toContain('player_1');
      
      console.log('✅ Test 2: SEMI_FINAL created with only qualified players');
    });
  });
});
