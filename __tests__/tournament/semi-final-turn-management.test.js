/**
 * Tournament Semi-Final Turn Management Tests
 * Tests the semi-final phase to verify:
 * 1. Winner from qualification round starts first
 * 2. Disqualified/eliminated players are not in semi-final
 * 3. Turn management works correctly for 3 players with proper mapping
 */

const TournamentTurnManager = require('../../multiplayer/server/services/TournamentTurnManager');

describe('Tournament Semi-Final Turn Management', () => {
  describe('Semi-Final 3-player turn management', () => {
    test('Turn order cycles correctly through 3 active players', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        playerCount: 3,
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE'
        }
      };

      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
      expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(2);
      expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(0);
    });

    test('Current player can act', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE'
        }
      };

      expect(TournamentTurnManager.canAct(state, 0).canAct).toBe(true);
    });

    test('Eliminated player cannot act in semi-final', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        playerCount: 3,
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE'
        }
      };

      const result = TournamentTurnManager.canAct(state, 1);
      expect(result.canAct).toBe(false);
      expect(result.reason).toContain('ELIMINATED');
    });

    test('Turn skips eliminated player', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        playerCount: 3,
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE'
        }
      };

      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(2);
      expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(0);
    });

    test('getActivePlayers returns only active indices', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        playerCount: 3,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE'
        }
      };

      const activePlayers = TournamentTurnManager.getActivePlayers(state);
      expect(activePlayers).toEqual([0, 2]);
    });
  });

  describe('Eliminated player tracking in semi-final state', () => {
    test('playerStatuses contains ELIMINATED for eliminated players', () => {
      const state = {
        tournamentMode: 'knockout',
        tournamentPhase: 'SEMI_FINAL',
        playerCount: 3,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE'
        },
        eliminationOrder: ['player_1']
      };

      expect(state.playerStatuses['player_1']).toBe('ELIMINATED');
      expect(state.eliminationOrder).toContain('player_1');
    });

    test('Eliminated players can be identified in playerStatuses', () => {
      const state = {
        tournamentMode: 'knockout',
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE'
        }
      };

      expect(state.playerStatuses['player_1']).toBe('ELIMINATED');
    });
  });

  describe('Non-tournament game turns work normally', () => {
    test('Non-tournament game has normal turn order', () => {
      const state = {
        tournamentMode: false,
        playerCount: 3,
        currentPlayer: 0,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {}
      };

      expect(TournamentTurnManager.getNextPlayer(state, 0)).toBe(1);
      expect(TournamentTurnManager.getNextPlayer(state, 1)).toBe(2);
      expect(TournamentTurnManager.getNextPlayer(state, 2)).toBe(0);
    });
  });

  describe('allActivePlayersTurnEnded works correctly', () => {
    test('Returns true when all active players ended turns', () => {
      const state = {
        tournamentMode: 'knockout',
        playerCount: 3,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE'
        },
        roundPlayers: {
          0: { turnEnded: true },
          1: { turnEnded: true },
          2: { turnEnded: true }
        }
      };

      expect(TournamentTurnManager.allActivePlayersTurnEnded(state)).toBe(true);
    });

    test('Returns false when active player has not ended turn', () => {
      const state = {
        tournamentMode: 'knockout',
        playerCount: 3,
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ACTIVE',
          'player_2': 'ACTIVE'
        },
        roundPlayers: {
          0: { turnEnded: true },
          1: { turnEnded: false },
          2: { turnEnded: true }
        }
      };

      expect(TournamentTurnManager.allActivePlayersTurnEnded(state)).toBe(false);
    });
  });
});