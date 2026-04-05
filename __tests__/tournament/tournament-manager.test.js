/**
 * Tournament Manager Tests
 * Tests for TournamentTurnManager, TournamentSocketManager, TournamentPhaseManager
 */

const TournamentTurnManager = require('../../multiplayer/server/services/TournamentTurnManager');
const TournamentSocketManager = require('../../multiplayer/server/services/TournamentSocketManager');
const TournamentPhaseManager = require('../../multiplayer/server/services/TournamentPhaseManager');

describe('TournamentTurnManager', () => {
  describe('getNextPlayer', () => {
    test('returns next player when no eliminations', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 0,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        }
      };
      
      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
      expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(2);
      expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(3);
      expect(TournamentTurnManager.getNextPlayer(state, 3)).toBe(0);
    });

    test('skips eliminated player in 4-player game', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 0,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        }
      };
      
      // 0 -> 2 (skip 1)
      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(2);
      // 2 -> 3
      expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(3);
      // 3 -> 0 (skip 1)
      expect(TournamentTurnManager.getNextPlayer(state, 3)).toBe(0);
    });

    test('skips multiple eliminated players', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 0,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ELIMINATED',
          'player_3': 'ACTIVE'
        }
      };
      
      // 0 -> 3 (skip 1, 2)
      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(3);
      // 3 -> 0
      expect(TournamentTurnManager.getNextPlayer(state, 3)).toBe(0);
    });

    test('returns current player when only one active', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 0,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ELIMINATED',
          'player_3': 'ELIMINATED'
        }
      };
      
      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(0);
    });

    test('handles 3-player game with elimination', () => {
      const state = {
        playerCount: 3,
        currentPlayer: 0,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ELIMINATED'
        }
      };
      
      // 0 -> 1
      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
      // 1 -> 0 (skip 2)
      expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(0);
    });
  });

  describe('canAct', () => {
    test('allows active player to act', () => {
      const state = {
        currentPlayer: 0,
        tournamentPhase: 'SEMI_FINAL',
        playerStatuses: {
          'player_0': 'ACTIVE'
        }
      };
      
      const result = TournamentTurnManager.canAct(state, 0);
      expect(result.canAct).toBe(true);
    });

    test('rejects eliminated player', () => {
      const state = {
        currentPlayer: 0,
        tournamentPhase: 'SEMI_FINAL',
        playerStatuses: {
          'player_0': 'ELIMINATED',
          'player_1': 'ACTIVE'
        }
      };
      
      const result = TournamentTurnManager.canAct(state, 0);
      expect(result.canAct).toBe(false);
      expect(result.reason).toContain('ELIMINATED');
    });

    test('rejects wrong player when not their turn', () => {
      const state = {
        currentPlayer: 0,
        tournamentPhase: 'SEMI_FINAL',
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE'
        }
      };
      
      const result = TournamentTurnManager.canAct(state, 1);
      expect(result.canAct).toBe(false);
      expect(result.reason).toContain('Not your turn');
    });

    test('allows out-of-turn during qualification review', () => {
      const state = {
        currentPlayer: 0,
        tournamentPhase: 'QUALIFICATION_REVIEW',
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE'
        }
      };
      
      const result = TournamentTurnManager.canAct(state, 1);
      // In qualification review, should allow (turn check is bypassed)
      expect(result.canAct).toBe(true);
    });
  });

  describe('getActivePlayers', () => {
    test('returns only active player indices', () => {
      const state = {
        playerCount: 4,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE',
          'player_3': 'ELIMINATED'
        }
      };
      
      const active = TournamentTurnManager.getActivePlayers(state);
      expect(active).toEqual([0, 2]);
    });
  });

  describe('allActivePlayersTurnEnded', () => {
    test('returns true when all active players ended turn', () => {
      const state = {
        playerCount: 4,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        },
        roundPlayers: {
          0: { turnEnded: true },
          1: { turnEnded: false }, // eliminated - should be skipped
          2: { turnEnded: true },
          3: { turnEnded: true }
        }
      };
      
      expect(TournamentTurnManager.allActivePlayersTurnEnded(state)).toBe(true);
    });

    test('returns false when active player has not ended turn', () => {
      const state = {
        playerCount: 4,
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        },
        roundPlayers: {
          0: { turnEnded: true },
          1: { turnEnded: false },
          2: { turnEnded: true },
          3: { turnEnded: true }
        }
      };
      
      expect(TournamentTurnManager.allActivePlayersTurnEnded(state)).toBe(false);
    });
  });
});

describe('TournamentSocketManager', () => {
  describe('isEliminated', () => {
    const mockGameManager = {
      socketPlayerMap: new Map([
        ['socket-0', 0],
        ['socket-1', 1],
        ['socket-2', 2],
        ['socket-3', 3]
      ])
    };

    test('returns false for active player', () => {
      const gameState = {
        tournamentMode: true,
        gameId: 1,
        playerStatuses: {
          'player_0': 'ACTIVE'
        }
      };
      
      expect(TournamentSocketManager.isEliminated('socket-0', gameState, mockGameManager)).toBe(false);
    });

    test('returns true for eliminated player', () => {
      const gameState = {
        tournamentMode: true,
        gameId: 1,
        playerStatuses: {
          'player_0': 'ELIMINATED'
        }
      };
      
      expect(TournamentSocketManager.isEliminated('socket-0', gameState, mockGameManager)).toBe(true);
    });

    test('returns false for non-tournament game', () => {
      const gameState = {
        tournamentMode: false,
        gameId: 1,
        playerStatuses: {}
      };
      
      expect(TournamentSocketManager.isEliminated('socket-0', gameState, mockGameManager)).toBe(false);
    });
  });

  describe('getPlayerIndex', () => {
    test('returns correct player index', () => {
      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-abc', 2]
        ])
      };
      
      expect(TournamentSocketManager.getPlayerIndex('socket-abc', 1, mockGameManager)).toBe(2);
    });

    test('returns null for unknown socket', () => {
      const mockGameManager = {
        socketPlayerMap: new Map()
      };
      
      expect(TournamentSocketManager.getPlayerIndex('unknown', 1, mockGameManager)).toBeNull();
    });
  });

  describe('getPlayerNumberForClient', () => {
    test('returns original index for active player', () => {
      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0]
        ])
      };
      const gameState = {
        tournamentMode: true,
        gameId: 1,
        playerStatuses: {
          'player_0': 'ACTIVE'
        }
      };
      
      expect(TournamentSocketManager.getPlayerNumberForClient('socket-0', 1, gameState, mockGameManager)).toBe(0);
    });

    test('returns null for eliminated player', () => {
      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0]
        ])
      };
      const gameState = {
        tournamentMode: true,
        gameId: 1,
        playerStatuses: {
          'player_0': 'ELIMINATED'
        }
      };
      
      expect(TournamentSocketManager.getPlayerNumberForClient('socket-0', 1, gameState, mockGameManager)).toBeNull();
    });
  });
});

describe('TournamentPhaseManager', () => {
  describe('getQualifiedPlayers', () => {
    test('returns qualified players array', () => {
      const gameState = {
        tournamentScores: {
          'player_0': 10,
          'player_1': 5,
          'player_2': 15,
          'player_3': 8
        },
        playerCount: 4
      };
      
      const qualified = TournamentPhaseManager.getQualifiedPlayers(gameState);
      expect(qualified).toContain('player_2'); // 15 pts
      expect(qualified).toContain('player_0'); // 10 pts
      expect(qualified).toContain('player_3'); // 8 pts
      expect(qualified).not.toContain('player_1'); // 5 pts
      expect(qualified).toHaveLength(3);
    });
  });

  describe('setCurrentPlayerToFirstActive', () => {
    test('sets currentPlayer to first active player', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 1,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' },
          { id: 'player_3' }
        ],
        playerStatuses: {
          'player_0': 'ELIMINATED',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        }
      };
      
      const result = TournamentPhaseManager.setCurrentPlayerToFirstActive(state);
      expect(state.currentPlayer).toBe(1);
      expect(result).toBe(1);
    });

    test('finds first active when player 0 eliminated', () => {
      const state = {
        playerCount: 4,
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' },
          { id: 'player_3' }
        ],
        playerStatuses: {
          'player_0': 'ELIMINATED',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        }
      };
      
      TournamentPhaseManager.setCurrentPlayerToFirstActive(state);
      expect(state.currentPlayer).toBe(1);
    });
  });

  describe('isPhaseTransition', () => {
    test('returns true for phase change', () => {
      const oldState = { tournamentPhase: 'QUALIFICATION_REVIEW' };
      const newState = { tournamentPhase: 'SEMI_FINAL' };
      
      expect(TournamentPhaseManager.isPhaseTransition(oldState, newState)).toBe(true);
    });

    test('returns false for same phase', () => {
      const oldState = { tournamentPhase: 'SEMI_FINAL' };
      const newState = { tournamentPhase: 'SEMI_FINAL' };
      
      expect(TournamentPhaseManager.isPhaseTransition(oldState, newState)).toBe(false);
    });

    test('returns false for null phases', () => {
      const oldState = { tournamentPhase: null };
      const newState = { tournamentPhase: 'SEMI_FINAL' };
      
      expect(TournamentPhaseManager.isPhaseTransition(oldState, newState)).toBe(false);
    });
  });
});

// Integration test for turn cycle in 3-player semifinal
describe('Tournament Turn Cycle Integration', () => {
  test('turn cycles correctly through active players only', () => {
    // Simulating semifinal with player_1 eliminated
    const state = {
      playerCount: 3,
      currentPlayer: 0,
      playerStatuses: {
        'player_0': 'ACTIVE',   // socket-0
        'player_1': 'ELIMINATED', // socket-1 - eliminated
        'player_2': 'ACTIVE'    // socket-2
      }
    };
    
    // After player 0 plays, should go to player 2 (not 1)
    let next = TournamentTurnManager.getNextPlayer(state, state.currentPlayer);
    expect(next).toBe(2);
    
    // Update current player
    state.currentPlayer = next;
    
    // After player 2 plays, should go back to player 0
    next = TournamentTurnManager.getNextPlayer(state, state.currentPlayer);
    expect(next).toBe(0);
  });

  test('canAct rejects eliminated player trying to act', () => {
    const state = {
      currentPlayer: 1,
      tournamentPhase: 'SEMI_FINAL',
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_1': 'ELIMINATED',
        'player_2': 'ACTIVE'
      }
    };
    
    // Player 1 is eliminated - should be rejected
    const result = TournamentTurnManager.canAct(state, 1);
    expect(result.canAct).toBe(false);
    expect(result.reason).toContain('ELIMINATED');
    
    // Player 2 is active and it's their turn - should be allowed
    const result2 = TournamentTurnManager.canAct(state, 2);
    expect(result2.canAct).toBe(true);
  });
});
