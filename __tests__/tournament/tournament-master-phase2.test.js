/**
 * TournamentMaster Clean Implementation Test Suite
 * Tests the clean tournament architecture
 * 
 * Run with: npm test -- --testPathPattern=tournament-master
 */

const TournamentMaster = require('../../multiplayer/server/services/TournamentMaster');

describe('TournamentMaster Clean Implementation', () => {
  
  describe('Utility Methods', () => {
    test('generateNewGameId generates unique IDs', () => {
      const id1 = TournamentMaster.generateNewGameId();
      const id2 = TournamentMaster.generateNewGameId();
      expect(typeof id1).toBe('number');
      expect(id1).not.toBe(id2);
    });
  });

  describe('State Validation', () => {
    test('isTournamentActive returns true for knockout', () => {
      const state = { tournamentMode: 'knockout' };
      expect(TournamentMaster.isTournamentActive(state)).toBe(true);
    });

    test('isTournamentActive returns true for round_robin', () => {
      const state = { tournamentMode: 'round_robin' };
      expect(TournamentMaster.isTournamentActive(state)).toBe(true);
    });

    test('isTournamentActive returns false for regular games', () => {
      const state = { tournamentMode: 'two-hands' };
      expect(TournamentMaster.isTournamentActive(state)).toBe(false);
    });

    test('getCurrentPhase returns tournamentPhase', () => {
      const state = { tournamentPhase: 'QUALIFYING' };
      expect(TournamentMaster.getCurrentPhase(state)).toBe('QUALIFYING');
    });

    test('getTournamentRound returns round number', () => {
      const state = { tournamentRound: 3 };
      expect(TournamentMaster.getTournamentRound(state)).toBe(3);
    });
  });

  describe('Round End Detection', () => {
    test('isRoundEnd returns true when roundEndTriggered', () => {
      const state = { roundEndTriggered: true };
      expect(TournamentMaster.isRoundEnd(state)).toBe(true);
    });

    test('isRoundEnd returns true when maxHands reached', () => {
      const state = { handsPlayed: 5, maxHands: 5 };
      expect(TournamentMaster.isRoundEnd(state)).toBe(true);
    });

    test('isRoundEnd returns false when neither triggered', () => {
      const state = { handsPlayed: 2, maxHands: 5 };
      expect(TournamentMaster.isRoundEnd(state)).toBe(false);
    });

    test('isQualifyingRoundEnd returns true for qualifying phase', () => {
      const state = { tournamentPhase: 'QUALIFYING', roundEndTriggered: true };
      expect(TournamentMaster.isQualifyingRoundEnd(state)).toBe(true);
    });

    test('isQualifyingRoundEnd returns false for other phases', () => {
      const state = { tournamentPhase: 'SEMI_FINAL', roundEndTriggered: true };
      expect(TournamentMaster.isQualifyingRoundEnd(state)).toBe(false);
    });
  });

  describe('Qualified Player Computation', () => {
    test('computeQualifiedPlayers returns correct order by score', () => {
      const state = {
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
          'player_0': 10,
          'player_1': 5,
          'player_2': 15,
          'player_3': 8
        }
      };
      
      const qualified = TournamentMaster.computeQualifiedPlayers(state, 3);
      expect(qualified).toEqual(['player_2', 'player_0', 'player_3']);
    });

    test('computeQualifiedPlayers excludes ELIMINATED players', () => {
      const state = {
        players: [
          { id: 'player_0' },
          { id: 'player_1' },
          { id: 'player_2' },
          { id: 'player_3' }
        ],
        playerStatuses: {
          'player_0': 'ACTIVE',
          'player_1': 'ELIMINATED',
          'player_2': 'ACTIVE',
          'player_3': 'ACTIVE'
        },
        tournamentScores: {
          'player_0': 10,
          'player_1': 5,
          'player_2': 15,
          'player_3': 8
        }
      };
      
      const qualified = TournamentMaster.computeQualifiedPlayers(state, 3);
      expect(qualified).toEqual(['player_2', 'player_0', 'player_3']);
      expect(qualified).not.toContain('player_1');
    });
  });

  describe('Fresh Game Creation', () => {
    test('createFreshGameState creates new game with correct structure', () => {
      const oldState = {
        gameId: 100,
        tournamentMode: 'knockout',
        tournamentPhase: 'QUALIFYING',
        tournamentScores: { 'player_0': 10, 'player_1': 5, 'player_2': 8 },
        players: [
          { id: 'player_0', hand: [1,2], captures: [], score: 5 },
          { id: 'player_1', hand: [3,4], captures: [], score: 2 },
          { id: 'player_2', hand: [5,6], captures: [], score: 3 }
        ]
      };
      
      const qualified = ['player_0', 'player_2'];
      const { newGameId, newState } = TournamentMaster.createFreshGameState(oldState, qualified, 'SEMI_FINAL');
      
      expect(newGameId).not.toBe(100);
      expect(newState.tournamentPhase).toBe('SEMI_FINAL');
      expect(newState.playerCount).toBe(2);
      expect(newState.players.length).toBe(2);
      expect(newState.players[0].id).toBe('player_0');
      expect(newState.players[1].id).toBe('player_2');
      expect(newState.players[0].hand.length).toBe(4); // Cards dealt
    });
  });

  describe('Debug Info', () => {
    test('getDebugInfo returns valid string', () => {
      const state = {
        tournamentPhase: 'QUALIFYING',
        tournamentRound: 1,
        tournamentScores: { 'player_0': 10 },
        players: [{ id: 'player_0' }],
        qualifiedPlayers: []
      };
      
      const info = TournamentMaster.getDebugInfo(state);
      expect(typeof info).toBe('string');
      expect(info).toContain('QUALIFYING');
    });
  });
});
