/**
 * TournamentCoordinator Tests
 * Tests for TournamentCoordinator phase transitions, hand progression, and countdown behavior
 */

// Mock dependencies
const mockGameManager = {
  getGameState: jest.fn(),
  saveGameState: jest.fn(),
  closeGame: jest.fn(),
  startGame: jest.fn((playerCount, isPartyMode) => ({
    gameId: Date.now(),
    gameState: {
      players: Array(playerCount).fill(null).map((_, i) => ({
        id: `player_${i}`,
        index: i,
        name: `Player ${i + 1}`,
        hand: [],
        captures: [],
        score: 0
      })),
      deck: [],
      tableCards: [],
      round: 1,
      gameOver: false,
      tournamentMode: null
    }
  })),
  addPlayerToGame: jest.fn(),
  getPlayerIndex: jest.fn(),
  setPlayerUserId: jest.fn()
};

const mockMatchmaking = {
  socketRegistry: {
    socketGameMap: new Map(),
    gameSocketsMap: new Map(),
    set: jest.fn(),
    get: jest.fn(),
    getGameSockets: jest.fn(() => [])
  },
  gameFactory: {
    createGame: jest.fn((gameType, playerEntries) => {
      const playerCount = playerEntries.length;
      return mockGameManager.startGame(playerCount, false);
    })
  }
};

const mockBroadcaster = {
  broadcastToGame: jest.fn(),
  sendError: jest.fn()
};

const mockIO = {
  sockets: {
    sockets: new Map()
  }
};

const TournamentCoordinator = require('../../multiplayer/server/services/TournamentCoordinator');

describe('TournamentCoordinator', () => {
  let coordinator;
  
  beforeEach(() => {
    coordinator = new TournamentCoordinator(
      mockGameManager,
      mockMatchmaking,
      mockBroadcaster,
      mockIO
    );
    jest.clearAllMocks();
  });

  describe('isTournamentActive', () => {
    test('returns true when tournamentMode is knockout', () => {
      const gameState = { tournamentMode: 'knockout' };
      expect(coordinator.isTournamentActive(gameState)).toBe(true);
    });

    test('returns false when tournamentMode is falsy', () => {
      expect(coordinator.isTournamentActive({})).toBe(false);
      expect(coordinator.isTournamentActive({ tournamentMode: null })).toBe(false);
      expect(coordinator.isTournamentActive({ tournamentMode: 'points' })).toBe(false);
    });
  });

  describe('handleClientReady', () => {
    test('allows non-tournament game', () => {
      const gameState = { tournamentMode: null };
      expect(coordinator.handleClientReady('socket-1', 1, 0)).toBe(true);
    });

    test('allows active player in tournament', () => {
      const gameState = {
        tournamentMode: 'knockout',
        players: [{ id: 'player_0' }, { id: 'player_1' }],
        playerStatuses: { 'player_0': 'ACTIVE' }
      };
      mockGameManager.getGameState.mockReturnValue(gameState);
      expect(coordinator.handleClientReady('socket-0', 1, 0)).toBe(true);
    });

    test('rejects eliminated player in tournament', () => {
      const gameState = {
        tournamentMode: 'knockout',
        players: [{ id: 'player_0' }, { id: 'player_1' }],
        playerStatuses: { 'player_0': 'ELIMINATED' }
      };
      mockGameManager.getGameState.mockReturnValue(gameState);
      expect(coordinator.handleClientReady('socket-0', 1, 0)).toBe(false);
    });
  });

  describe('registerExistingGameAsTournament', () => {
    test('registers tournament with correct metadata', () => {
      const gameState = {
        tournamentId: 'tournament-123',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 1,
        totalHands: 4,
        gameId: 1
      };
      
      const players = [
        { userId: 'user-1', socket: { id: 'socket-1', userId: 'user-1' } },
        { userId: 'user-2', socket: { id: 'socket-2', userId: 'user-2' } },
        { userId: 'user-3', socket: { id: 'socket-3', userId: 'user-3' } },
        { userId: 'user-4', socket: { id: 'socket-4', userId: 'user-4' } }
      ];

      const result = coordinator.registerExistingGameAsTournament(gameState, players, mockIO);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('tournament-123');
      expect(result.phase).toBe('QUALIFYING');
      expect(result.totalHands).toBe(4);
      expect(result.currentHand).toBe(1);
      expect(result.players).toHaveLength(4);
      expect(result.status).toBe('active');
      expect(coordinator.activeTournaments.size).toBe(1);
    });

    test('uses fallback ID for guest players', () => {
      const gameState = {
        tournamentId: 'tournament-456',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 1,
        totalHands: 4,
        gameId: 2
      };
      
      const players = [
        { userId: null, socket: { id: 'socket-1', userId: null } },
        { userId: 'user-2', socket: { id: 'socket-2', userId: 'user-2' } }
      ];

      const result = coordinator.registerExistingGameAsTournament(gameState, players, mockIO);
      
      expect(result.players[0].id).toBe('socket-1'); // Falls back to socket.id
      expect(result.players[1].id).toBe('user-2');
    });
  });

  describe('_getGameTypeForPlayerCount', () => {
    test('returns four-hands for 4 players', () => {
      expect(coordinator._getGameTypeForPlayerCount(4)).toBe('four-hands');
    });

    test('returns three-hands for 3 players', () => {
      expect(coordinator._getGameTypeForPlayerCount(3)).toBe('three-hands');
    });

    test('returns two-hands for 2 players', () => {
      expect(coordinator._getGameTypeForPlayerCount(2)).toBe('two-hands');
    });

    test('defaults to four-hands for invalid count', () => {
      expect(coordinator._getGameTypeForPlayerCount(5)).toBe('four-hands');
      expect(coordinator._getGameTypeForPlayerCount(1)).toBe('four-hands');
    });
  });

  describe('getTournamentState', () => {
    test('returns tournament when exists', () => {
      coordinator.activeTournaments.set('tournament-1', { id: 'tournament-1', phase: 'QUALIFYING' });
      const result = coordinator.getTournamentState('tournament-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('tournament-1');
    });

    test('returns undefined when tournament not found', () => {
      const result = coordinator.getTournamentState('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getLeaderboard', () => {
    test('returns sorted leaderboard', () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        players: [
          { id: 'player-1', name: 'Alice', cumulativeScore: 10, eliminated: false },
          { id: 'player-2', name: 'Bob', cumulativeScore: 5, eliminated: false },
          { id: 'player-3', name: 'Charlie', cumulativeScore: 15, eliminated: false },
          { id: 'player-4', name: 'Dave', cumulativeScore: 3, eliminated: true }
        ]
      });

      const leaderboard = coordinator.getLeaderboard('tournament-1');
      
      expect(leaderboard).toHaveLength(4);
      expect(leaderboard[0].id).toBe('player-3'); // 15 points
      expect(leaderboard[1].id).toBe('player-1'); // 10 points
      expect(leaderboard[2].id).toBe('player-2'); // 5 points
      expect(leaderboard[3].id).toBe('player-4'); // 3 points (eliminated)
    });

    test('returns null for nonexistent tournament', () => {
      expect(coordinator.getLeaderboard('nonexistent')).toBeNull();
    });
  });

  describe('handleRoundEnd', () => {
    test('calls _handleTournamentRoundEnd for active tournament phase', () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        phase: 'QUALIFYING',
        currentHand: 1,
        totalHands: 4,
        players: [{ id: 'player_0', eliminated: false }]
      });

      const gameState = {
        tournamentId: 'tournament-1',
        tournamentPhase: 'QUALIFYING',
        round: 13,
        gameOver: true,
        scores: [5, 3, 2, 1],
        players: [{ id: 'player_0' }, { id: 'player_1' }, { id: 'player_2' }, { id: 'player_3' }],
        scoreBreakdowns: []
      };

      const result = coordinator.handleRoundEnd(gameState, 1, {});
      
      expect(result.state).toBe(gameState);
      expect(result.gameOver).toBe(true);
      expect(result.nextHand).toBe(true);
    });

    test('returns unchanged state for non-tournament game', () => {
      const gameState = { tournamentMode: null, round: 5 };
      const result = coordinator.handleRoundEnd(gameState, 1, {});
      
      expect(result.state).toBe(gameState);
      expect(result.gameOver).toBe(false);
    });

    test('returns unchanged state for unknown phase', () => {
      coordinator.activeTournaments.set('tournament-1', { phase: 'UNKNOWN' });
      const gameState = { tournamentId: 'tournament-1', tournamentPhase: 'UNKNOWN' };
      const result = coordinator.handleRoundEnd(gameState, 1, {});
      
      expect(result.gameOver).toBe(false);
    });
  });

  describe('_handleTournamentRoundEnd', () => {
    test('triggers handleHandComplete when gameOver is true', () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        phase: 'QUALIFYING',
        currentHand: 1,
        totalHands: 4,
        players: [
          { id: 'player_0', cumulativeScore: 0, handsPlayed: 0, eliminated: false },
          { id: 'player_1', cumulativeScore: 0, handsPlayed: 0, eliminated: false },
          { id: 'player_2', cumulativeScore: 0, handsPlayed: 0, eliminated: false },
          { id: 'player_3', cumulativeScore: 0, handsPlayed: 0, eliminated: false }
        ]
      });

      const gameState = {
        tournamentId: 'tournament-1',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 1,
        round: 13,
        gameOver: true,
        scores: [5, 3, 2, 1],
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' },
          { id: 'player_3' }
        ],
        scoreBreakdowns: []
      };

      // Mock handleHandComplete to prevent async issues
      coordinator.handleHandComplete = jest.fn().mockResolvedValue();

      const result = coordinator._handleTournamentRoundEnd(gameState, 1);
      
      expect(result.gameOver).toBe(true);
      expect(result.nextHand).toBe(true);
      expect(coordinator.handleHandComplete).toHaveBeenCalled();
    });

    test('does not trigger when gameOver is false', () => {
      coordinator.activeTournaments.set('tournament-1', {
        phase: 'QUALIFYING',
        currentHand: 1,
        totalHands: 4
      });

      const gameState = {
        tournamentId: 'tournament-1',
        gameOver: false,
        round: 5
      };

      const result = coordinator._handleTournamentRoundEnd(gameState, 1);
      
      expect(result.gameOver).toBe(false);
      expect(result.nextHand).toBeUndefined();
    });

    test('falls back to registration when tournament not found', () => {
      const gameState = {
        tournamentId: 'tournament-new',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 1,
        gameOver: true,
        players: [
          { id: 'player_0', userId: 'user-1' },
          { id: 'player_1', userId: 'user-2' }
        ],
        scores: [1, 2],
        scoreBreakdowns: []
      };

      // Mock _getSocketByPlayerId to return null
      coordinator._getSocketByPlayerId = jest.fn().mockReturnValue(null);

      const result = coordinator._handleTournamentRoundEnd(gameState, 1);
      
      // Should register tournament via fallback
      expect(coordinator.activeTournaments.size).toBe(1);
    });
  });

  describe('Phase transition flow', () => {
    test('handleHandComplete triggers _endPhase when phase complete', async () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        phase: 'QUALIFYING',
        currentHand: 4,
        totalHands: 4, // Phase complete
        previousGameId: null,
        currentGameId: 1,
        players: [
          { id: 'player_0', cumulativeScore: 10, handsPlayed: 4, eliminated: false },
          { id: 'player_1', cumulativeScore: 5, handsPlayed: 4, eliminated: false },
          { id: 'player_2', cumulativeScore: 15, handsPlayed: 4, eliminated: false },
          { id: 'player_3', cumulativeScore: 3, handsPlayed: 4, eliminated: false }
        ],
        config: {
          qualifyingHands: 4,
          qualifyingPlayers: 3,
          semifinalHands: 3,
          finalHands: 2
        },
        status: 'active'
      });

      const gameState = {
        tournamentId: 'tournament-1',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 4,
        scores: [10, 5, 15, 3]
      };

      const results = {
        playerIds: ['player_0', 'player_1', 'player_2', 'player_3'],
        finalScores: [10, 5, 15, 3],
        scoreBreakdowns: []
      };

      // Mock the io emit
      mockIO.to = jest.fn().mockReturnValue({
        emit: jest.fn()
      });
      mockGameManager.getGameState.mockReturnValue({ scoreBreakdowns: [] });
      coordinator._startNextHand = jest.fn().mockResolvedValue({ gameId: 2 });

      await coordinator.handleHandComplete(gameState, results);

      // Verify phase was updated
      const tournament = coordinator.activeTournaments.get('tournament-1');
      expect(tournament.phase).toBe('SEMI_FINAL');
      expect(tournament.status).toBe('transitioning');
    });

    test('_endPhase sets correct countdown seconds', async () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        phase: 'QUALIFYING',
        currentHand: 4,
        totalHands: 4,
        previousGameId: 1,
        currentGameId: 1,
        players: [
          { id: 'player_0', cumulativeScore: 10, handsPlayed: 4, eliminated: false, socketId: 'socket-0' },
          { id: 'player_1', cumulativeScore: 5, handsPlayed: 4, eliminated: false, socketId: 'socket-1' },
          { id: 'player_2', cumulativeScore: 15, handsPlayed: 4, eliminated: false, socketId: 'socket-2' },
          { id: 'player_3', cumulativeScore: 3, handsPlayed: 4, eliminated: false, socketId: 'socket-3' }
        ],
        config: { qualifyingHands: 4, qualifyingPlayers: 3, semifinalHands: 3, finalHands: 2 },
        status: 'active'
      });

      // Mock socket and _startNextHand - need to handle the transitioning status
      const mockSocket = { id: 'socket-0', join: jest.fn(), emit: jest.fn() };
      coordinator._getSocketByPlayerId = jest.fn().mockReturnValue(mockSocket);
      
      // Mock _startNextHand to return a proper result
      const mockNewGameState = { gameId: 2, players: [], tournamentPhase: 'SEMI_FINAL', tournamentHand: 1, totalHands: 3 };
      coordinator._startNextHand = jest.fn().mockResolvedValue({
        gameId: 2,
        gameState: mockNewGameState
      });
      
      mockGameManager.getGameState.mockImplementation((id) => {
        if (id === 1) return { scoreBreakdowns: [] };
        if (id === 2) return mockNewGameState;
        return null;
      });
      
      mockGameManager.saveGameState = jest.fn();
      
      mockIO.to = jest.fn().mockReturnValue({
        emit: jest.fn()
      });
      
      // Use fake timers
      jest.useFakeTimers();
      
      await coordinator._endPhase('tournament-1', { scoreBreakdowns: [] });
      
      // Check that emit was called with correct countdown AND nextGameId
      const emitCall = mockIO.to.mock.results[0].value.emit.mock.calls.find(c => c[0] === 'game-over');
      expect(emitCall).toBeDefined();
      expect(emitCall[1].countdownSeconds).toBe(8);
      expect(emitCall[1].nextGameId).toBe(2); // Game ID should be set from _startNextHand result
      expect(emitCall[1].nextPhase).toBe('SEMI_FINAL');
      expect(emitCall[1].qualifiedPlayers).toContain('player_2'); // 15 pts
      expect(emitCall[1].qualifiedPlayers).toContain('player_0'); // 10 pts
      expect(emitCall[1].qualifiedPlayers).toContain('player_1'); // 5 pts
      expect(emitCall[1].eliminatedPlayers).toContain('player_3'); // 3 pts
      
      // Verify tournament status is transitioning
      const tournament = coordinator.activeTournaments.get('tournament-1');
      expect(tournament.status).toBe('transitioning');
      
      // Advance timers to trigger the setTimeout callback
      jest.advanceTimersByTime(8000);
      
      jest.useRealTimers();
    });
  });

  describe('Hand progression within phase', () => {
    test('handleHandComplete calls _startNextHand when phase not complete', async () => {
      coordinator.activeTournaments.set('tournament-1', {
        id: 'tournament-1',
        phase: 'QUALIFYING',
        currentHand: 1,
        totalHands: 4, // Not complete
        previousGameId: null,
        currentGameId: 1,
        players: [
          { id: 'player_0', cumulativeScore: 5, handsPlayed: 1, eliminated: false },
          { id: 'player_1', cumulativeScore: 3, handsPlayed: 1, eliminated: false },
          { id: 'player_2', cumulativeScore: 7, handsPlayed: 1, eliminated: false },
          { id: 'player_3', cumulativeScore: 2, handsPlayed: 1, eliminated: false }
        ],
        config: { qualifyingHands: 4, qualifyingPlayers: 3 },
        status: 'active'
      });

      coordinator._startNextHand = jest.fn().mockResolvedValue({ gameId: 2 });

      const gameState = {
        tournamentId: 'tournament-1',
        tournamentPhase: 'QUALIFYING',
        tournamentHand: 1
      };

      const results = {
        playerIds: ['player_0', 'player_1', 'player_2', 'player_3'],
        finalScores: [5, 3, 7, 2]
      };

      await coordinator.handleHandComplete(gameState, results);

      // Should call _startNextHand, not _endPhase
      expect(coordinator._startNextHand).toHaveBeenCalledWith('tournament-1');
      
      // Verify cumulative scores were updated (initial 5 + finalScores)
      const tournament = coordinator.activeTournaments.get('tournament-1');
      expect(tournament.players[0].cumulativeScore).toBe(10); // 5 + 5
      expect(tournament.players[2].cumulativeScore).toBe(14); // 7 + 7
    });
  });
});

describe('TournamentCoordinator._startNextHand skips when transitioning', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new TournamentCoordinator(
      mockGameManager,
      mockMatchmaking,
      mockBroadcaster,
      mockIO
    );
  });

  test('_startNextHand returns early when status is transitioning', async () => {
    coordinator.activeTournaments.set('tournament-1', {
      id: 'tournament-1',
      phase: 'QUALIFYING',
      currentHand: 4,
      totalHands: 4,
      status: 'transitioning', // Countdown in progress
      players: [
        { id: 'player_0', cumulativeScore: 10, eliminated: false },
        { id: 'player_1', cumulativeScore: 5, eliminated: false },
        { id: 'player_2', cumulativeScore: 15, eliminated: false }
      ]
    });

    const result = await coordinator._startNextHand('tournament-1');
    
    // Should return early without creating game
    expect(result).toBeUndefined();
    expect(mockMatchmaking.gameFactory.createGame).not.toHaveBeenCalled();
  });
});

describe('TournamentCoordinator game type mapping', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new TournamentCoordinator(
      mockGameManager,
      mockMatchmaking,
      mockBroadcaster,
      mockIO
    );
  });

  test('maps player counts to correct game types', () => {
    expect(coordinator._getGameTypeForPlayerCount(4)).toBe('four-hands');
    expect(coordinator._getGameTypeForPlayerCount(3)).toBe('three-hands');
    expect(coordinator._getGameTypeForPlayerCount(2)).toBe('two-hands');
  });

  test('handles semifinal transition (3 players)', async () => {
    coordinator.activeTournaments.set('tournament-1', {
      id: 'tournament-1',
      phase: 'SEMI_FINAL',
      currentHand: 3,
      totalHands: 3,
      players: [
        { id: 'player_0', cumulativeScore: 8, eliminated: false, socketId: 'socket-0' },
        { id: 'player_1', cumulativeScore: 5, eliminated: false, socketId: 'socket-1' },
        { id: 'player_2', cumulativeScore: 3, eliminated: false, socketId: 'socket-2' }
      ],
      config: { qualifyingHands: 4, qualifyingPlayers: 3, semifinalHands: 3, finalHands: 2 }
    });

    // Mock socket with join method - return different sockets for different players
    const mockSockets = {
      'player_0': { id: 'socket-0', join: jest.fn(), emit: jest.fn() },
      'player_1': { id: 'socket-1', join: jest.fn(), emit: jest.fn() },
      'player_2': { id: 'socket-2', join: jest.fn(), emit: jest.fn() }
    };
    coordinator._getSocketByPlayerId = jest.fn((playerId) => mockSockets[playerId]);
    mockMatchmaking.gameFactory.createGame.mockReturnValue({
      gameId: 5,
      gameState: { players: [] }
    });

    const result = await coordinator._startNextHand('tournament-1');
    
    // Should use three-hands for semifinal (3 active players)
    expect(mockMatchmaking.gameFactory.createGame).toHaveBeenCalledWith('three-hands', expect.any(Array));
  });

  test('handles final transition (2 players)', async () => {
    coordinator.activeTournaments.set('tournament-1', {
      id: 'tournament-1',
      phase: 'FINAL',
      currentHand: 2,
      totalHands: 2,
      players: [
        { id: 'player_0', cumulativeScore: 6, eliminated: false },
        { id: 'player_1', cumulativeScore: 4, eliminated: false }
      ],
      config: { finalHands: 2 }
    });

    const mockSocket = {
      id: 'socket-1',
      join: jest.fn(),
      emit: jest.fn()
    };
    coordinator._getSocketByPlayerId = jest.fn().mockReturnValue(mockSocket);
    mockMatchmaking.gameFactory.createGame.mockReturnValue({
      gameId: 6,
      gameState: { players: [] }
    });

    await coordinator._startNextHand('tournament-1');
    
    // Should use two-hands for final
    expect(mockMatchmaking.gameFactory.createGame).toHaveBeenCalledWith('two-hands', expect.any(Array));
  });
});