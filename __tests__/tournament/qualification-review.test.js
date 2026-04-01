/**
 * Tournament 4->3 Transition Tests
 * Tests the fix for qualification review handling when transitioning from 4 to 3 players
 */

const { initializeGame } = require('../../shared/game/initialization');
const startTournament = require('../../shared/game/actions/startTournament');
const endTournamentRound = require('../../shared/game/actions/endTournamentRound');
const advanceFromQualificationReview = require('../../shared/game/actions/advanceFromQualificationReview');

describe('Tournament 4->3 Transition', () => {
  let state;

  beforeEach(() => {
    // Initialize 4-player tournament
    state = initializeGame(4, false);
    state = startTournament(state);
    
    // Set scores where player_1 has lowest score
    state.tournamentScores = { 
      'player_0': 10, 
      'player_1': 5, 
      'player_2': 15, 
      'player_3': 8 
    };
    state.playerStatuses = { 
      'player_0': 'ACTIVE', 
      'player_1': 'ACTIVE', 
      'player_2': 'ACTIVE', 
      'player_3': 'ACTIVE' 
    };
  });

  test('endTournamentRound triggers qualification review with 3 players qualifying', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    
    expect(reviewState.tournamentPhase).toBe('QUALIFICATION_REVIEW');
    expect(reviewState.qualifiedPlayers).toHaveLength(3);
  });

  test('qualified players are top 3 scorers', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    
    // player_2 (15 pts), player_0 (10 pts), player_3 (8 pts) should qualify
    expect(reviewState.qualifiedPlayers).toContain('player_2');
    expect(reviewState.qualifiedPlayers).toContain('player_0');
    expect(reviewState.qualifiedPlayers).toContain('player_3');
    
    // player_1 (5 pts) should be eliminated
    expect(reviewState.playerStatuses['player_1']).toBe('ELIMINATED');
  });

  test('advanceFromQualificationReview transitions to SEMI_FINAL with 3 players', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    const semifinalState = advanceFromQualificationReview(reviewState);
    
    expect(semifinalState.tournamentPhase).toBe('SEMI_FINAL');
    expect(semifinalState.playerCount).toBe(3);
    expect(semifinalState.players).toHaveLength(3);
  });

  test('player identity preserved after transition', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    const semifinalState = advanceFromQualificationReview(reviewState);
    
    // Check that player IDs are preserved
    const playerIds = semifinalState.players.map(p => p.id);
    expect(playerIds).toContain('player_0');
    expect(playerIds).toContain('player_2');
    expect(playerIds).toContain('player_3');
    expect(playerIds).not.toContain('player_1');
  });

  test('only one player eliminated in 4->3 transition', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    
    // Count active players
    const activePlayers = Object.values(reviewState.playerStatuses)
      .filter(s => s === 'ACTIVE').length;
    
    expect(activePlayers).toBe(3);
    
    // Only player_1 should be ELIMINATED
    const eliminatedPlayers = Object.entries(reviewState.playerStatuses)
      .filter(([_, status]) => status === 'ELIMINATED')
      .map(([id]) => id);
    
    expect(eliminatedPlayers).toHaveLength(1);
    expect(eliminatedPlayers).toContain('player_1');
  });
});

describe('TournamentManager playerId string handling', () => {
  test('should parse playerId strings to numeric indices', () => {
    const TournamentManager = require('../../multiplayer/server/services/TournamentManager');
    
    // Create mock socket map
    const socketMap = new Map([
      ['socket1', 0],  // player_0
      ['socket2', 1],  // player_1 (will be eliminated)
      ['socket3', 2],  // player_2
      ['socket4', 3],  // player_3
    ]);
    
    // Call with playerId strings (qualified players) - player_1 not included
    TournamentManager.remapPlayerIndices(socketMap, ['player_0', 'player_2', 'player_3']);
    
    // socket2 (player_1) should be removed
    expect(socketMap.has('socket2')).toBe(false);
    
    // Others should be remapped:
    // player_0 (index 0) -> new index 0
    // player_2 (index 2) -> new index 1
    // player_3 (index 3) -> new index 2
    expect(socketMap.get('socket1')).toBe(0);  
    expect(socketMap.get('socket3')).toBe(1);  
    expect(socketMap.get('socket4')).toBe(2);  
  });
  
  test('should handle numeric indices for backward compatibility', () => {
    const TournamentManager = require('../../multiplayer/server/services/TournamentManager');
    
    const socketMap = new Map([
      ['socket1', 0],
      ['socket2', 1],
      ['socket3', 2],
      ['socket4', 3],
    ]);
    
    // Call with numeric indices - player_1 (index 1) not included
    TournamentManager.remapPlayerIndices(socketMap, [0, 2, 3]);
    
    // socket2 (player_1) should be removed
    expect(socketMap.has('socket2')).toBe(false);
    
    // Others should be remapped
    expect(socketMap.get('socket1')).toBe(0);
    expect(socketMap.get('socket3')).toBe(1);
    expect(socketMap.get('socket4')).toBe(2);
  });
});

describe('3->2 Tournament Transition', () => {
  let state;

  beforeEach(() => {
    // Initialize 4-player tournament then transition manually to SEMI_FINAL with 3 players
    state = initializeGame(4, false);
    state = startTournament(state);
    state.tournamentPhase = 'SEMI_FINAL';
    state.playerCount = 3;
    state.qualifiedPlayers = ['player_0', 'player_1', 'player_2'];
    state.tournamentScores = { 
      'player_0': 10, 
      'player_1': 5, 
      'player_2': 15 
    };
    state.playerStatuses = { 
      'player_0': 'ACTIVE', 
      'player_1': 'ACTIVE', 
      'player_2': 'ACTIVE' 
    };
    
    // Update players array to only have 3 players
    state.players = state.players.slice(0, 3);
  });

  test('endTournamentRound triggers qualification review with 2 players qualifying', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    
    expect(reviewState.tournamentPhase).toBe('QUALIFICATION_REVIEW');
    expect(reviewState.qualifiedPlayers).toHaveLength(2);
  });

  test('qualified players are top 2 scorers for 3->2', () => {
    const reviewState = endTournamentRound(state, {}, 0);
    
    // player_2 (15 pts), player_0 (10 pts) should qualify
    expect(reviewState.qualifiedPlayers).toContain('player_2');
    expect(reviewState.qualifiedPlayers).toContain('player_0');
    
    // player_1 (5 pts) should be eliminated
    expect(reviewState.playerStatuses['player_1']).toBe('ELIMINATED');
  });
});
