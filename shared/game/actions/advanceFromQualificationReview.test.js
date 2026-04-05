/**
 * advanceFromQualificationReview.test.js
 * Unit test for the tournament qualification review advancement action.
 * 
 * Tests the transition from 4-player QUALIFYING → 3-player SEMI_FINAL
 */

const advanceFromQualificationReview = require('./advanceFromQualificationReview');

describe('advanceFromQualificationReview', () => {
  
  /**
   * Test 1: Transition from QUALIFICATION_REVIEW with 3 qualified to SEMI_FINAL
   * This is the primary flow: 4 players → 1 eliminated → 3 qualify for SEMI_FINAL
   */
  it('transitions from QUALIFICATION_REVIEW (3 qualified) to SEMI_FINAL', () => {
    // Mock state after a 4-player round where 3 players qualified for SEMI_FINAL
    const mockState = {
      gameId: 'test-game-1',
      tournamentPhase: 'QUALIFICATION_REVIEW',
      tournamentMode: 'knockout',
      tournamentRound: 1,
      qualifiedPlayers: ['player_0', 'player_2', 'player_3'], // top 3 advance
      players: [
        { id: 'player_0', index: 0, captures: [], hand: [], score: 0 },
        { id: 'player_1', index: 1, captures: [], hand: [], score: 0 },
        { id: 'player_2', index: 2, captures: [], hand: [], score: 0 },
        { id: 'player_3', index: 3, captures: [], hand: [], score: 0 }
      ],
      playerStatuses: {
        player_0: 'ACTIVE',
        player_1: 'ACTIVE',
        player_2: 'ACTIVE',
        player_3: 'ACTIVE'
      },
      tournamentScores: {
        player_0: 10,
        player_1: 5,
        player_2: 8,
        player_3: 3
      },
      eliminationOrder: [],
      gameOver: false,
      round: 1,
      currentPlayer: 0,
      turnCounter: 1,
      moveCount: 0,
      deck: [],
      tableCards: [],
      scores: [0, 0, 0, 0],
      playerCount: 4
    };

    console.log('=== Test: 3 qualified players → SEMI_FINAL ===');
    console.log('Input - qualifiedPlayers:', mockState.qualifiedPlayers);
    console.log('Input - tournamentPhase:', mockState.tournamentPhase);
    
    const newState = advanceFromQualificationReview(mockState, {});

    console.log('Output - tournamentPhase:', newState.tournamentPhase);
    console.log('Output - players.length:', newState.players?.length);
    console.log('Output - playerCount:', newState.playerCount);
    console.log('Output - gameMode:', newState.gameMode);

    // Phase changed to SEMI_FINAL
    expect(newState.tournamentPhase).toBe('SEMI_FINAL');
    
    // 3 players for SEMI_FINAL
    expect(newState.players.length).toBe(3);
    expect(newState.playerCount).toBe(3);
    
    // Game mode should be three-hands
    expect(newState.gameMode).toBe('three-hands');
    
    // Tournament round increments
    expect(newState.tournamentRound).toBe(2);
  });

  /**
   * Test 2: Transition from QUALIFICATION_REVIEW with 2 qualified to FINAL_SHOWDOWN
   */
  it('transitions from QUALIFICATION_REVIEW (2 qualified) to FINAL_SHOWDOWN', () => {
    const mockState = {
      gameId: 'test-game-1',
      tournamentPhase: 'QUALIFICATION_REVIEW',
      tournamentMode: 'knockout',
      tournamentRound: 2,
      qualifiedPlayers: ['player_0', 'player_2'], // top 2 advance to final
      players: [
        { id: 'player_0', index: 0, captures: [], hand: [], score: 0 },
        { id: 'player_2', index: 2, captures: [], hand: [], score: 0 },
        { id: 'player_1', index: 1, captures: [], hand: [], score: 0 } // eliminated
      ],
      playerStatuses: {
        player_0: 'ACTIVE',
        player_1: 'ACTIVE',
        player_2: 'ACTIVE'
      },
      tournamentScores: {
        player_0: 20,
        player_1: 15,
        player_2: 18
      },
      eliminationOrder: [],
      gameOver: false,
      round: 1,
      currentPlayer: 0,
      turnCounter: 1,
      moveCount: 0,
      deck: [],
      tableCards: [],
      scores: [0, 0, 0],
      playerCount: 3
    };

    console.log('=== Test: 2 qualified players → FINAL_SHOWDOWN ===');
    console.log('Input - qualifiedPlayers:', mockState.qualifiedPlayers);
    console.log('Input - tournamentPhase:', mockState.tournamentPhase);
    
    const newState = advanceFromQualificationReview(mockState, {});

    console.log('Output - tournamentPhase:', newState.tournamentPhase);
    console.log('Output - players.length:', newState.players?.length);
    console.log('Output - playerCount:', newState.playerCount);

    // Phase changed to FINAL_SHOWDOWN
    expect(newState.tournamentPhase).toBe('FINAL_SHOWDOWN');
    
    // 2 players for FINAL_SHOWDOWN
    expect(newState.players.length).toBe(2);
    expect(newState.playerCount).toBe(2);
    
    // Game mode should be two-hands
    expect(newState.gameMode).toBe('two-hands');
  });

  /**
   * Test 3: Does nothing if phase is not QUALIFICATION_REVIEW
   */
  it('does nothing if phase is not QUALIFICATION_REVIEW', () => {
    const mockState = {
      tournamentPhase: 'QUALIFYING',
      players: [
        { id: 'player_0', index: 0 },
        { id: 'player_1', index: 1 }
      ]
    };

    console.log('=== Test: Wrong phase - should return state unchanged ===');
    const newState = advanceFromQualificationReview(mockState, {});
    
    expect(newState.tournamentPhase).toBe('QUALIFYING');
  });

  /**
   * Test 4: Handles empty qualifiedPlayers (fallback)
   */
  it('uses fallback when qualifiedPlayers is empty', () => {
    const mockState = {
      tournamentPhase: 'QUALIFICATION_REVIEW',
      tournamentRound: 1,
      qualifiedPlayers: [], // empty - should use fallback
      players: [
        { id: 'player_0', index: 0, captures: [], hand: [], score: 0 },
        { id: 'player_1', index: 1, captures: [], hand: [], score: 0 },
        { id: 'player_2', index: 2, captures: [], hand: [], score: 0 }
      ],
      playerStatuses: {
        player_0: 'ACTIVE',
        player_1: 'ACTIVE',
        player_2: 'ACTIVE'
      },
      tournamentScores: {
        player_0: 10,
        player_1: 8,
        player_2: 5
      },
      eliminationOrder: [],
      gameOver: false,
      round: 1,
      currentPlayer: 0,
      turnCounter: 1,
      moveCount: 0,
      deck: [],
      tableCards: [],
      scores: [0, 0, 0],
      playerCount: 3
    };

    console.log('=== Test: Empty qualifiedPlayers - should use fallback ===');
    const newState = advanceFromQualificationReview(mockState, {});
    
    // Should default to final showdown with 2 players (fallback logic)
    expect(newState.tournamentPhase).toBe('FINAL_SHOWDOWN');
    expect(newState.players.length).toBe(2);
  });
});
