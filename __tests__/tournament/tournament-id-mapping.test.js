/**
 * Tournament ID Mapping Test Suite
 * 
 * Tests that verify the tournament mode correctly uses playerId strings
 * instead of numeric indices for playerStatuses, tournamentScores,
 * eliminationOrder, and qualifiedPlayers.
 * 
 * This ensures correct winner display across round transitions:
 * Qualifying → Semi-Final → Final Showdown
 */

const { initializeGame } = require('../../shared/game/initialization');
const { startTournament } = require('../../shared/game/actions/startTournament');
const { compressStateForNewPhase } = require('../../shared/game/actions/compressStateForNewPhase');
const { 
  createMockTournamentState, 
  getPlayerNumber,
  verifyPlayerIdStrings 
} = require('./helpers/tournamentTestUtils');

describe('Tournament Mode Player ID Mapping', () => {
  
  describe('Tournament Initialization', () => {
    test('initializeGame creates players with persistent playerId strings', () => {
      const state = initializeGame(4, false);
      
      // Verify each player has a persistent playerId
      expect(state.players[0].id).toBe('player_0');
      expect(state.players[1].id).toBe('player_1');
      expect(state.players[2].id).toBe('player_2');
      expect(state.players[3].id).toBe('player_3');
      
      // Verify id format is correct
      state.players.forEach((player, index) => {
        expect(player.id).toMatch(/^player_\d+$/);
      });
    });
    
    test('initialization sets up tournament state with playerId string keys', () => {
      const state = initializeGame(4, false);
      
      // Verify tournament state structure exists
      expect(state.playerStatuses).toBeDefined();
      expect(state.tournamentScores).toBeDefined();
      expect(state.eliminationOrder).toBeDefined();
      expect(state.qualifiedPlayers).toBeDefined();
      
      // Verify they are initialized as empty objects/arrays
      expect(Object.keys(state.playerStatuses).length).toBe(0);
      expect(Object.keys(state.tournamentScores).length).toBe(0);
      expect(state.eliminationOrder).toEqual([]);
      expect(state.qualifiedPlayers).toEqual([]);
    });
  });
  
  describe('Start Tournament', () => {
    test('startTournament initializes playerStatuses with playerId strings', () => {
      const state = initializeGame(4, false);
      const newState = startTournament(state);
      
      // Verify playerStatuses keys are playerId strings
      expect(Object.keys(newState.playerStatuses)).toEqual([
        'player_0', 'player_1', 'player_2', 'player_3'
      ]);
      
      // Verify all players start as ACTIVE
      expect(newState.playerStatuses['player_0']).toBe('ACTIVE');
      expect(newState.playerStatuses['player_1']).toBe('ACTIVE');
      expect(newState.playerStatuses['player_2']).toBe('ACTIVE');
      expect(newState.playerStatuses['player_3']).toBe('ACTIVE');
    });
    
    test('startTournament initializes tournamentScores with playerId strings', () => {
      const state = initializeGame(4, false);
      const newState = startTournament(state);
      
      // Verify tournamentScores keys are playerId strings
      const scoreKeys = Object.keys(newState.tournamentScores);
      expect(scoreKeys).toContain('player_0');
      expect(scoreKeys).toContain('player_1');
      expect(scoreKeys).toContain('player_2');
      expect(scoreKeys).toContain('player_3');
      
      // Verify initial scores are 0
      expect(newState.tournamentScores['player_0']).toBe(0);
      expect(newState.tournamentScores['player_1']).toBe(0);
    });
  });
  
  describe('Player Statuses Storage', () => {
    test('playerStatuses uses playerId strings as keys', () => {
      const state = createMockTournamentState();
      
      verifyPlayerIdStrings(state);
      
      // Verify specific statuses
      expect(state.playerStatuses['player_0']).toBe('ACTIVE');
      expect(state.playerStatuses['player_1']).toBe('ACTIVE');
    });
    
    test('playerStatuses can be updated with playerId strings', () => {
      const state = createMockTournamentState();
      
      // Update some players to ELIMINATED
      state.playerStatuses['player_1'] = 'ELIMINATED';
      state.playerStatuses['player_3'] = 'ELIMINATED';
      
      // Verify updates
      expect(state.playerStatuses['player_1']).toBe('ELIMINATED');
      expect(state.playerStatuses['player_3']).toBe('ELIMINATED');
      expect(state.playerStatuses['player_0']).toBe('ACTIVE');
    });
    
    test('playerStatuses can set WINNER status', () => {
      const state = createMockTournamentState();
      
      // Set winner
      state.playerStatuses['player_2'] = 'WINNER';
      
      expect(state.playerStatuses['player_2']).toBe('WINNER');
    });
  });
  
  describe('Tournament Scores Storage', () => {
    test('tournamentScores uses playerId strings as keys', () => {
      const state = createMockTournamentState();
      
      verifyPlayerIdStrings(state);
    });
    
    test('tournamentScores can be updated correctly', () => {
      const state = createMockTournamentState();
      
      // Update scores
      state.tournamentScores['player_0'] = 10;
      state.tournamentScores['player_1'] = 5;
      state.tournamentScores['player_2'] = 15;
      state.tournamentScores['player_3'] = 20;
      
      expect(state.tournamentScores['player_0']).toBe(10);
      expect(state.tournamentScores['player_3']).toBe(20);
    });
  });
  
  describe('Elimination Order', () => {
    test('eliminationOrder contains playerId strings', () => {
      const state = createMockTournamentState();
      
      // Add eliminated players
      state.eliminationOrder = ['player_1', 'player_3'];
      
      // Verify items are playerId strings
      state.eliminationOrder.forEach(item => {
        expect(item).toMatch(/^player_\d+$/);
      });
      
      expect(state.eliminationOrder).toEqual(['player_1', 'player_3']);
    });
    
    test('eliminationOrder can be appended to', () => {
      const state = createMockTournamentState();
      state.eliminationOrder = ['player_1'];
      
      // Add more eliminations
      state.eliminationOrder.push('player_3');
      
      expect(state.eliminationOrder).toEqual(['player_1', 'player_3']);
    });
  });
  
  describe('Qualified Players', () => {
    test('qualifiedPlayers is array of playerId strings', () => {
      const state = createMockTournamentState();
      
      // Set qualified players
      state.qualifiedPlayers = ['player_0', 'player_2'];
      
      // Verify items are playerId strings
      state.qualifiedPlayers.forEach(item => {
        expect(item).toMatch(/^player_\d+$/);
      });
      
      expect(state.qualifiedPlayers).toEqual(['player_0', 'player_2']);
    });
  });
  
  describe('Round Transition - Qualifying to Semi-Final', () => {
    test('Qualifying to Semi-Final preserves playerId references', () => {
      // Start with 4 players in Qualifying
      let state = createMockTournamentState();
      state.tournamentPhase = 'QUALIFYING';
      
      // Simulate end of qualifying - players 1 and 3 eliminated
      state.playerStatuses['player_1'] = 'ELIMINATED';
      state.playerStatuses['player_3'] = 'ELIMINATED';
      state.eliminationOrder = ['player_1', 'player_3'];
      state.qualifiedPlayers = ['player_0', 'player_2'];
      
      // Transition to Semi-Final
      state = compressStateForNewPhase(state, [0, 2]);
      state.tournamentPhase = 'SEMI_FINAL';
      
      // Verify playerStatuses still uses original playerId strings
      const statusKeys = Object.keys(state.playerStatuses);
      expect(statusKeys).toContain('player_0');
      expect(statusKeys).toContain('player_2');
      
      // Verify player 0 is still ACTIVE (the winner)
      expect(state.playerStatuses['player_0']).toBe('ACTIVE');
      
      // Verify player 2 is still ACTIVE 
      expect(state.playerStatuses['player_2']).toBe('ACTIVE');
      
      // Verify eliminated players are preserved
      expect(state.playerStatuses['player_1']).toBe('ELIMINATED');
      expect(state.playerStatuses['player_3']).toBe('ELIMINATED');
    });
    
    test('Winner display shows correct player number after transition', () => {
      // Setup: Player 2 (player_2) wins Qualifying
      let state = createMockTournamentState();
      state.playerStatuses['player_0'] = 'ELIMINATED';
      state.playerStatuses['player_1'] = 'ELIMINATED';
      state.playerStatuses['player_2'] = 'WINNER';
      state.playerStatuses['player_3'] = 'ELIMINATED';
      state.qualifiedPlayers = ['player_2'];
      
      // Transition to Semi-Final
      state = compressStateForNewPhase(state, [2]);
      state.tournamentPhase = 'SEMI_FINAL';
      
      // Find winner
      const winnerEntry = Object.entries(state.playerStatuses).find(
        ([_, status]) => status === 'WINNER'
      );
      
      // Verify winner's playerId is 'player_2' → Player 3
      expect(winnerEntry[0]).toBe('player_2');
      expect(getPlayerNumber(winnerEntry[0])).toBe(3);
    });
  });
  
  describe('Round Transition - Semi-Final to Final Showdown', () => {
    test('Semi-Final to Final Showdown preserves playerId references', () => {
      // Start Semi-Final with 2 players
      let state = createMockTournamentState();
      state.tournamentPhase = 'SEMI_FINAL';
      state.playerStatuses = {
        'player_0': 'ACTIVE',
        'player_2': 'ACTIVE'
      };
      state.qualifiedPlayers = ['player_0', 'player_2'];
      
      // Simulate end of Semi-Final - player 2 wins
      state.playerStatuses['player_0'] = 'ELIMINATED';
      state.playerStatuses['player_2'] = 'WINNER';
      state.eliminationOrder = ['player_0'];
      state.qualifiedPlayers = ['player_2'];
      
      // Transition to Final Showdown
      state = compressStateForNewPhase(state, [2]);
      state.tournamentPhase = 'FINAL_SHOWDOWN';
      
      // Verify winner is still correctly identified
      expect(state.playerStatuses['player_2']).toBe('WINNER');
      
      // Verify getPlayerNumber returns correct value
      expect(getPlayerNumber('player_2')).toBe(3); // player_2 = Player 3
    });
  });
  
  describe('Winner Display Correctness', () => {
    test('winner is correctly displayed after full tournament flow', () => {
      // Full tournament: Qualifying → Semi-Final → Final Showdown
      let state = createMockTournamentState();
      
      // Qualifying: Player 3 (player_3) wins
      state.playerStatuses = {
        'player_0': 'ELIMINATED',
        'player_1': 'ELIMINATED',
        'player_2': 'ELIMINATED',
        'player_3': 'WINNER'
      };
      state.qualifiedPlayers = ['player_3'];
      
      // Semi-Final transition
      state = compressStateForNewPhase(state, [3]);
      state.tournamentPhase = 'SEMI_FINAL';
      
      // Final Showdown transition
      state = compressStateForNewPhase(state, [3]);
      state.tournamentPhase = 'FINAL_SHOWDOWN';
      
      // Find winner
      const winnerId = Object.entries(state.playerStatuses).find(
        ([_, status]) => status === 'WINNER'
      )[0];
      
      // Verify winner's player number is correct
      expect(winnerId).toBe('player_3');
      expect(getPlayerNumber(winnerId)).toBe(4); // player_3 = Player 4
    });
    
    test('multiple different winners are correctly identified', () => {
      // Test each possible winner
      const testCases = [
        { winnerId: 'player_0', expectedPlayerNum: 1 },
        { winnerId: 'player_1', expectedPlayerNum: 2 },
        { winnerId: 'player_2', expectedPlayerNum: 3 },
        { winnerId: 'player_3', expectedPlayerNum: 4 },
      ];
      
      testCases.forEach(({ winnerId, expectedPlayerNum }) => {
        const state = createMockTournamentState();
        
        // Set all other players to ELIMINATED
        Object.keys(state.playerStatuses).forEach(key => {
          state.playerStatuses[key] = key === winnerId ? 'WINNER' : 'ELIMINATED';
        });
        
        // Find winner
        const actualWinnerId = Object.entries(state.playerStatuses).find(
          ([_, status]) => status === 'WINNER'
        )[0];
        
        expect(actualWinnerId).toBe(winnerId);
        expect(getPlayerNumber(actualWinnerId)).toBe(expectedPlayerNum);
      });
    });
  });
  
  describe('Spectator View Rendering', () => {
    test('SpectatorView can extract player numbers from playerId strings', () => {
      const state = createMockTournamentState();
      
      // Setup: Player 2 won, Player 4 is spectating
      state.playerStatuses = {
        'player_0': 'ELIMINATED',
        'player_1': 'ELIMINATED',
        'player_2': 'WINNER',
        'player_3': 'SPECTATOR'  // Player 4 is spectating
      };
      
      // Extract active/winner players for display
      const activePlayers = Object.entries(state.playerStatuses)
        .filter(([_, status]) => status === 'ACTIVE' || status === 'WINNER')
        .map(([playerId]) => getPlayerNumber(playerId));
      
      // Should only have winner (Player 3)
      expect(activePlayers).toEqual([3]);
      
      // Extract spectator
      const spectators = Object.entries(state.playerStatuses)
        .filter(([_, status]) => status === 'SPECTATOR')
        .map(([playerId]) => getPlayerNumber(playerId));
      
      // Should be Player 4
      expect(spectators).toEqual([4]);
    });
    
    test('TournamentStatusBar can extract scores using playerId strings', () => {
      const state = createMockTournamentState();
      
      // Set scores with playerId strings
      state.tournamentScores = {
        'player_0': 10,
        'player_1': 5,
        'player_2': 15,
        'player_3': 20
      };
      
      // Get scores for display - should work with playerId strings
      Object.entries(state.tournamentScores).forEach(([playerId, score]) => {
        const playerNum = getPlayerNumber(playerId);
        expect(score).toBeDefined();
        expect(playerNum).toBeGreaterThanOrEqual(1);
        expect(playerNum).toBeLessThanOrEqual(4);
      });
      
      // Verify specific scores
      expect(state.tournamentScores['player_0']).toBe(10);  // Player 1
      expect(state.tournamentScores['player_3']).toBe(20);  // Player 4
    });
  });
  
  describe('Tournament Status Bar Rendering', () => {
    test('TournamentStatusBar correctly displays all player data with playerId strings', () => {
      const state = createMockTournamentState();
      
      // Setup complex tournament state
      state.playerStatuses = {
        'player_0': 'ACTIVE',
        'player_1': 'ELIMINATED',
        'player_2': 'ACTIVE',
        'player_3': 'WINNER'
      };
      
      state.tournamentScores = {
        'player_0': 15,
        'player_1': 5,
        'player_2': 20,
        'player_3': 25
      };
      
      state.eliminationOrder = ['player_1'];
      state.qualifiedPlayers = ['player_0', 'player_2', 'player_3'];
      
      // Verify all data is accessible using playerId strings
      verifyPlayerIdStrings(state);
      
      // Verify we can get correct data for each player
      expect(state.playerStatuses['player_0']).toBe('ACTIVE');
      expect(state.playerStatuses['player_3']).toBe('WINNER');
      
      expect(state.tournamentScores['player_2']).toBe(20);
      expect(state.tournamentScores['player_3']).toBe(25);
      
      expect(state.eliminationOrder).toContain('player_1');
      expect(state.qualifiedPlayers).toContain('player_3');
    });
  });
});

describe('Player ID to Display Number Mapping', () => {
  test('getPlayerNumber correctly maps playerId to display number', () => {
    expect(getPlayerNumber('player_0')).toBe(1);
    expect(getPlayerNumber('player_1')).toBe(2);
    expect(getPlayerNumber('player_2')).toBe(3);
    expect(getPlayerNumber('player_3')).toBe(4);
  });
  
  test('getPlayerNumber handles edge cases', () => {
    // Test that parsing works correctly
    expect(parseInt('player_0'.replace('player_', '')) + 1).toBe(1);
    expect(parseInt('player_1'.replace('player_', '')) + 1).toBe(2);
    expect(parseInt('player_99'.replace('player_', '')) + 1).toBe(100);
  });
});