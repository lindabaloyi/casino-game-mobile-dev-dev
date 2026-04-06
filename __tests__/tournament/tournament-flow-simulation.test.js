/**
 * Tournament Flow Simulation Tests
 * Tests the complete tournament lifecycle through the refactored services
 */

const TournamentManager = require('../../multiplayer/server/services/TournamentManager');
const TournamentPhaseManager = require('../../multiplayer/server/services/TournamentPhaseManager');
const TournamentTurnManager = require('../../multiplayer/server/services/TournamentTurnManager');
const TournamentSocketManager = require('../../multiplayer/server/services/TournamentSocketManager');

describe('TournamentManager', () => {
  describe('isTournamentActive', () => {
    test('returns true for knockout tournament', () => {
      const state = { tournamentMode: 'knockout' };
      expect(TournamentManager.isTournamentActive(state)).toBe(true);
    });

    test('returns false for non-tournament', () => {
      const state = { tournamentMode: false };
      expect(TournamentManager.isTournamentActive(state)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(TournamentManager.isTournamentActive({})).toBe(false);
      expect(TournamentManager.isTournamentActive(null)).toBe(false);
    });
  });

  describe('getQualifiedPlayers', () => {
    test('returns qualifiedPlayers array from state', () => {
      const state = {
        qualifiedPlayers: ['player_0', 'player_2', 'player_3']
      };
      expect(TournamentManager.getQualifiedPlayers(state)).toEqual(['player_0', 'player_2', 'player_3']);
    });

    test('returns empty array when not defined', () => {
      expect(TournamentManager.getQualifiedPlayers({})).toEqual([]);
    });
  });

  describe('handleRoundEnd', () => {
    test('returns gameOver: true when tournament completes', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'FINAL_SHOWDOWN',
        tournamentRound: 2,
        playerCount: 2,
        players: [
          { id: 'player_0', captures: [] },
          { id: 'player_1', captures: [] }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE'
        },
        tournamentScores: {
          'player_0': 5,
          'player_1': 3
        },
        finalShowdownHandsPlayed: 2,
        qualifiedPlayers: ['player_0', 'player_1'],
        eliminationOrder: ['player_2', 'player_3']
      };

      const result = TournamentManager.handleRoundEnd(state, {}, 1, {});
      
      expect(result.state.tournamentPhase).toBe('COMPLETED');
      expect(result.gameOver).toBe(true);
    });

    test('returns gameOver: false for ongoing tournament round', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'QUALIFYING',
        tournamentRound: 1,
        playerCount: 4,
        players: [
          { id: 'player_0', captures: [] },
          { id: 'player_1', captures: [] },
          { id: 'player_2', captures: [] },
          { id: 'player_3', captures: [] }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        },
        tournamentScores: {
          'player_0': 0,
          'player_1': 0,
          'player_2': 0,
          'player_3': 0
        },
        qualifiedPlayers: ['player_0', 'player_1', 'player_2', 'player_3'],
        eliminationOrder: []
      };

      const result = TournamentManager.handleRoundEnd(state, { type: 'playCard' }, 1, {});
      
      expect(result.gameOver).toBe(false);
      expect(result.state).toBeDefined();
      // Should transition to qualification review with 4 players
      expect(result.state.tournamentPhase).toBe('QUALIFICATION_REVIEW');
    });
  });

  describe('handleAdvanceFromQualificationReview', () => {
    test('transitions to SEMI_FINAL with 3 qualified players', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'QUALIFICATION_REVIEW',
        playerCount: 3,
        players: [
          { id: 'player_0', captures: [] },
          { id: 'player_2', captures: [] },
          { id: 'player_3', captures: [] }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        },
        tournamentScores: {
          'player_0': 10,
          'player_2': 8,
          'player_3': 5
        },
        qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
        eliminationOrder: ['player_1']
      };

      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0],
          ['socket-2', 2],
          ['socket-3', 3]
        ]),
        clientReadyMap: new Map()
      };

      const result = TournamentManager.handleAdvanceFromQualificationReview(state, 1, mockGameManager);
      
      // With 3 qualified players, should transition to SEMI_FINAL
      expect(result.state.tournamentPhase).toBe('SEMI_FINAL');
      expect(result.gameOver).toBe(false);
    });

    test('transitions to FINAL_SHOWDOWN with 2 qualified players', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'QUALIFICATION_REVIEW',
        playerCount: 2,
        players: [
          { id: 'player_0', captures: [] },
          { id: 'player_2', captures: [] }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_2': 'ACTIVE'
        },
        tournamentScores: {
          'player_0': 20,
          'player_2': 18
        },
        qualifiedPlayers: ['player_0', 'player_2'],
        eliminationOrder: ['player_1', 'player_3']
      };

      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0],
          ['socket-2', 2]
        ]),
        clientReadyMap: new Map()
      };

      const result = TournamentManager.handleAdvanceFromQualificationReview(state, 1, mockGameManager);
      
      // With 2 qualified players, should transition to FINAL_SHOWDOWN
      expect(result.state.tournamentPhase).toBe('FINAL_SHOWDOWN');
      expect(result.gameOver).toBe(false);
    });
  });
});

describe('TournamentPhaseManager', () => {
  describe('ensureCorrectPlayerIndex', () => {
    test('returns same index for non-tournament game', () => {
      const state = { tournamentMode: false };
      const result = TournamentPhaseManager.ensureCorrectPlayerIndex(state, 'socket-0', 0, {});
      expect(result).toBe(0);
    });

    test('returns same index when player exists at same position', () => {
      const state = {
        tournamentMode: 'knockout',
        players: [
          { id: 'player_0' },
          { id: 'player_1' }
        ]
      };
      const result = TournamentPhaseManager.ensureCorrectPlayerIndex(state, 'socket-0', 0, {});
      expect(result).toBe(0);
    });

    test('corrects index when player moved to different position', () => {
      const state = {
        tournamentMode: 'knockout',
        players: [
          { id: 'player_2' },
          { id: 'player_0' }
        ]
      };
      // socket was at index 0 (player_0), but now player_0 is at index 1
      const result = TournamentPhaseManager.ensureCorrectPlayerIndex(state, 'socket-0', 0, {});
      expect(result).toBe(1);
    });

    test('returns null when player is eliminated', () => {
      const state = {
        tournamentMode: 'knockout',
        players: [
          { id: 'player_2' },
          { id: 'player_3' }
        ]
      };
      // socket was at index 0 (player_0), but player_0 is not in players array
      const result = TournamentPhaseManager.ensureCorrectPlayerIndex(state, 'socket-0', 0, {});
      expect(result).toBeNull();
    });
  });

  describe('handlePhaseTransition', () => {
    test('remaps sockets and clears ready on QUALIFICATION_REVIEW -> SEMI_FINAL', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        qualifiedPlayers: ['player_2', 'player_0', 'player_3']
      };

      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0], // player_0
          ['socket-2', 2], // player_2
          ['socket-3', 3]  // player_3
        ]),
        clientReadyMap: new Map([
          [1, new Set([0, 2, 3])]
        ])
      };

      const clearReadyStatus = jest.fn();
      mockGameManager.clearClientReadyStatus = clearReadyStatus;

      TournamentPhaseManager.handlePhaseTransition(
        state,
        'QUALIFICATION_REVIEW',
        'SEMI_FINAL',
        1,
        mockGameManager
      );

      // Should clear ready status
      expect(clearReadyStatus).toHaveBeenCalledWith(1, mockGameManager);
    });

    test('does nothing for non-qualification transitions', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL'
      };

      const mockGameManager = {
        socketPlayerMap: new Map(),
        clientReadyMap: new Map()
      };

      // Should not throw
      expect(() => {
        TournamentPhaseManager.handlePhaseTransition(
          state,
          'QUALIFYING',
          'SEMI_FINAL',
          1,
          mockGameManager
        );
      }).not.toThrow();
    });
  });

  describe('remapSocketIndices', () => {
    test('remaps socket indices based on qualifiedPlayers order', () => {
      const state = {
        qualifiedPlayers: ['player_2', 'player_0', 'player_3']
      };

      const mockGameManager = {
        socketPlayerMap: new Map([
          ['socket-0', 0], // player_0 -> should become index 1
          ['socket-2', 2], // player_2 -> should become index 0
          ['socket-3', 3]  // player_3 -> should become index 2
        ])
      };

      TournamentPhaseManager.remapSocketIndices(state, 1, mockGameManager);

      const socketMap = mockGameManager.socketPlayerMap.get(1);
      expect(socketMap.get('socket-2')).toBe(0); // player_2 is now index 0
      expect(socketMap.get('socket-0')).toBe(1); // player_0 is now index 1
      expect(socketMap.get('socket-3')).toBe(2); // player_3 is now index 2
    });
  });
});

describe('Tournament Turn Integration', () => {
  test('complete tournament round cycle', () => {
    // Start of tournament - 4 players
    let state = {
      tournamentMode: 'knockout',
      tournamentPhase: 'QUALIFYING',
      tournamentRound: 1,
      playerCount: 4,
      currentPlayer: 0,
      players: [
        { id: 'player_0' },
        { id: 'player_1' },
        { id: 'player_2' },
        { id: 'player_3' }
      ],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_1': 'ACTIVE',
        'player_2': 'ACTIVE',
        'player_3': 'ACTIVE'
      },
      tournamentScores: {
        'player_0': 0,
        'player_1': 0,
        'player_2': 0,
        'player_3': 0
      },
      qualifiedPlayers: ['player_0', 'player_1', 'player_2', 'player_3'],
      eliminationOrder: []
    };

    // Verify turn order works
    expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
    expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(2);
    expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(3);
    expect(TournamentTurnManager.getNextPlayer(state, 3)).toBe(0);

    // Verify all players can act
    expect(TournamentTurnManager.canAct(state, 0).canAct).toBe(true);
    expect(TournamentTurnManager.canAct(state, 1).canAct).toBe(true);
    expect(TournamentTurnManager.canAct(state, 2).canAct).toBe(true);
    expect(TournamentTurnManager.canAct(state, 3).canAct).toBe(true);

    // After round ends, player_1 gets eliminated (lowest score simulation)
    state.playerStatuses['player_1'] = 'ELIMINATED';
    state.tournamentScores['player_1'] = 2;
    state.tournamentScores['player_0'] = 10;
    state.tournamentScores['player_2'] = 8;
    state.tournamentScores['player_3'] = 5;
    state.eliminationOrder.push('player_1');
    state.qualifiedPlayers = ['player_0', 'player_2', 'player_3'];
    state.playerCount = 3;

    // Turn order should skip eliminated player
    expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(2); // 0 -> 2 (skip 1)
    expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(3);  // 2 -> 3
    expect(TournamentTurnManager.getNextPlayer(state, 3)).toBe(0); // 3 -> 0 (skip 1)

    // canAct should reject eliminated player
    expect(TournamentTurnManager.canAct(state, 1).canAct).toBe(false);

    // Active players should still work
    expect(TournamentTurnManager.canAct(state, 0).canAct).toBe(true);
    expect(TournamentTurnManager.canAct(state, 2).canAct).toBe(true);
  });

  test('semi-final with 2 eliminations reaches final', () => {
    let state = {
      tournamentMode: 'knockout',
      tournamentPhase: 'SEMI_FINAL',
      tournamentRound: 2,
      playerCount: 2,
      currentPlayer: 0,
      players: [
        { id: 'player_0' },
        { id: 'player_3' }
      ],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_3': 'ACTIVE'
      },
      tournamentScores: {
        'player_0': 10,
        'player_3': 8
      },
      qualifiedPlayers: ['player_0', 'player_3'],
      eliminationOrder: ['player_1', 'player_2']
    };

    // Only 2 players remain - should work normally
    expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
    expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(0);

    // Both should be able to act
    expect(TournamentTurnManager.canAct(state, 0).canAct).toBe(true);
    expect(TournamentTurnManager.canAct(state, 1).canAct).toBe(true);
  });
});

describe('TournamentSocketManager Integration', () => {
  const mockGameManager = {
    socketPlayerMap: new Map([
      ['socket-0', 0],
      ['socket-1', 1],
      ['socket-2', 2],
      ['socket-3', 3]
    ])
  };

  test('isEliminated correctly identifies eliminated players', () => {
    const activeState = {
      tournamentMode: 'knockout',
      gameId: 1,
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_1': 'ACTIVE',
        'player_2': 'ELIMINATED',
        'player_3': 'ACTIVE'
      }
    };

    expect(TournamentSocketManager.isEliminated('socket-0', activeState, mockGameManager)).toBe(false);
    expect(TournamentSocketManager.isEliminated('socket-1', activeState, mockGameManager)).toBe(false);
    expect(TournamentSocketManager.isEliminated('socket-2', activeState, mockGameManager)).toBe(true);
    expect(TournamentSocketManager.isEliminated('socket-3', activeState, mockGameManager)).toBe(false);
  });

  test('getPlayerNumberForClient returns null for eliminated', () => {
    const eliminatedState = {
      tournamentMode: 'knockout',
      gameId: 1,
      playerStatuses: {
        'player_0': 'ELIMINATED',
        'player_1': 'ACTIVE'
      }
    };

    expect(TournamentSocketManager.getPlayerNumberForClient('socket-0', 1, eliminatedState, mockGameManager)).toBeNull();
    expect(TournamentSocketManager.getPlayerNumberForClient('socket-1', 1, eliminatedState, mockGameManager)).toBe(1);
  });

  test('checkAllReady counts only qualified players', () => {
    const state = {
      tournamentMode: 'knockout',
      gameId: 1,
      qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_1': 'ELIMINATED',
        'player_2': 'ACTIVE',
        'player_3': 'ACTIVE'
      }
    };

    const gameManagerWithReady = {
      socketPlayerMap: mockGameManager.socketPlayerMap,
      clientReadyMap: new Map([
        [1, new Set([0, 2])] // player 0 and 2 ready
      ])
    };

    const result = TournamentSocketManager.checkAllReady(1, state, gameManagerWithReady);
    
    expect(result.readyCount).toBe(2);
    expect(result.expectedCount).toBe(3); // Only qualified (0, 2, 3)
    expect(result.allReady).toBe(false);
  });
});

describe('GameCoordinator Delegation Pattern', () => {
  test('TournamentManager.handleRoundEnd returns correct structure', () => {
    const state = {
      tournamentMode: 'knockout',
      tournamentPhase: 'QUALIFYING',
      playerCount: 4,
      players: [
        { id: 'player_0', captures: [] },
        { id: 'player_1', captures: [] },
        { id: 'player_2', captures: [] },
        { id: 'player_3', captures: [] }
      ],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_1': 'ACTIVE',
        'player_2': 'ACTIVE',
        'player_3': 'ACTIVE'
      },
      tournamentScores: {},
      qualifiedPlayers: [],
      eliminationOrder: []
    };

    const result = TournamentManager.handleRoundEnd(state, { type: 'playCard' }, 1, {});

    // Should return object with state and gameOver
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('gameOver');
    expect(typeof result.gameOver).toBe('boolean');
  });

  test('Phase transition detection works correctly', () => {
    const oldState = { tournamentPhase: 'QUALIFICATION_REVIEW' };
    const newState = { tournamentPhase: 'SEMI_FINAL' };

    expect(TournamentPhaseManager.isPhaseTransition(oldState, newState)).toBe(true);

    const oldState2 = { tournamentPhase: 'QUALIFYING' };
    const newState2 = { tournamentPhase: 'QUALIFICATION_REVIEW' };
    expect(TournamentPhaseManager.isPhaseTransition(oldState2, newState2)).toBe(false);
  });
});

describe('Edge Cases', () => {
  test('handleRoundEnd with advanceFromQualificationReview action', () => {
    const state = {
      tournamentMode: 'knockout',
      tournamentPhase: 'QUALIFICATION_REVIEW',
      playerCount: 3,
      players: [
        { id: 'player_0', captures: [] },
        { id: 'player_2', captures: [] },
        { id: 'player_3', captures: [] }
      ],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_2': 'ACTIVE',
        'player_3': 'ACTIVE'
      },
      tournamentScores: {
        'player_0': 10,
        'player_2': 8,
        'player_3': 5
      },
      qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
      eliminationOrder: ['player_1']
    };

    const result = TournamentManager.handleRoundEnd(
      state,
      { type: 'advanceFromQualificationReview' },
      1,
      {}
    );

    // Should delegate to handleAdvanceFromQualificationReview
    // With 3 players in qualification review, should advance to SEMI_FINAL (not FINAL_SHOWDOWN)
    expect(result.state.tournamentPhase).toBe('SEMI_FINAL');
    expect(result.gameOver).toBe(false);
  });

  test('handleFinalShowdownRoundEnd when not yet complete', () => {
    const state = {
      tournamentMode: 'knockout',
      tournamentPhase: 'FINAL_SHOWDOWN',
      playerCount: 2,
      players: [
        { id: 'player_0', captures: [] },
        { id: 'player_3', captures: [] }
      ],
      playerStatuses: {
        'player_0': 'ACTIVE',
        'player_3': 'ACTIVE'
      },
      tournamentScores: {
        'player_0': 5,
        'player_3': 3
      },
      finalShowdownHandsPlayed: 1, // Only played 1 hand, need 2
      qualifiedPlayers: ['player_0', 'player_3'],
      eliminationOrder: ['player_1', 'player_2']
    };

    const result = TournamentManager.handleFinalShowdownRoundEnd(state, 1, {});

    expect(result.state.tournamentPhase).toBe('FINAL_SHOWDOWN');
    expect(result.gameOver).toBe(false);
    expect(result.state.finalShowdownHandsPlayed).toBe(2); // Should increment
  });
});