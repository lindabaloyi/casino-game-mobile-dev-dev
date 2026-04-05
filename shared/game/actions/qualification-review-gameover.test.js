/**
 * Tournament Qualification Review - Game Over Edge Case Tests
 * 
 * Tests the scenario where gameOver=true but tournament is in QUALIFICATION_REVIEW phase
 * and should allow advanceFromQualificationReview action to proceed.
 * 
 * Run with: npm test -- --testPathPattern=qualification-review-gameover
 */

const { cloneState } = require('../clone');
const startTournament = require('./startTournament');
const endTournamentRound = require('./endTournamentRound');
const advanceFromQualificationReview = require('./advanceFromQualificationReview');
const { createDeck } = require('../deck');

describe('Tournament: gameOver=true during QUALIFICATION_REVIEW', () => {
  
  /**
   * Test: Advance from QUALIFICATION_REVIEW when gameOver=true
   * This is the actual scenario that was failing:
   * - Round ends, gameOver set to true
   * - Tournament enters QUALIFICATION_REVIEW phase
   * - Countdown triggers advanceFromQualificationReview action
   * - Action should succeed despite gameOver=true
   */
  it('allows advanceFromQualificationReview when gameOver=true and in QUALIFICATION_REVIEW', () => {
    // Simulate state after round ends (gameOver=true, in QUALIFICATION_REVIEW)
    const mockState = cloneState({
      gameId: 'test-game',
      tournamentPhase: 'QUALIFICATION_REVIEW',
      tournamentMode: 'knockout',
      tournamentRound: 1,
      gameOver: true, // This was causing the failure!
      qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
      players: [
        { id: 'player_0', index: 0, hand: [], captures: [], score: 0 },
        { id: 'player_1', index: 1, hand: [], captures: [], score: 0 },
        { id: 'player_2', index: 2, hand: [], captures: [], score: 0 },
        { id: 'player_3', index: 3, hand: [], captures: [], score: 0 }
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
      round: 1,
      currentPlayer: 0,
      turnCounter: 1,
      moveCount: 0,
      deck: [],
      tableCards: [],
      scores: [0, 0, 0, 0],
      playerCount: 4
    });

    console.log('\n=== Test: gameOver=true during QUALIFICATION_REVIEW ===');
    console.log('Input - gameOver:', mockState.gameOver);
    console.log('Input - tournamentPhase:', mockState.tournamentPhase);
    console.log('Input - qualifiedPlayers:', mockState.qualifiedPlayers);
    
    // This should NOT throw - it was throwing "Game is over - no more actions allowed"
    const newState = advanceFromQualificationReview(mockState, {});

    console.log('Output - tournamentPhase:', newState.tournamentPhase);
    console.log('Output - players.length:', newState.players?.length);
    console.log('Output - playerCount:', newState.playerCount);
    console.log('Output - gameMode:', newState.gameMode);
    
    // Verify transition succeeded
    expect(newState.tournamentPhase).toBe('SEMI_FINAL');
    expect(newState.players.length).toBe(3);
    expect(newState.playerCount).toBe(3);
    expect(newState.gameMode).toBe('three-hands');
    
    console.log('\n✅ PASSED: advanceFromQualificationReview works when gameOver=true');
  });

  /**
   * Test: Full flow - round ends → gameOver=true → QUALIFICATION_REVIEW → advance
   */
  it('complete flow: round ends with gameOver, then advances to SEMI_FINAL', () => {
    console.log('\n=== Test: Complete round end → advance flow ===');
    
    // Step 1: Create initial tournament state
    let state = cloneState({
      tournamentPhase: 'QUALIFYING',
      tournamentMode: 'knockout',
      tournamentRound: 1,
      gameOver: false,
      playerCount: 4,
      players: [
        { id: 'player_0', index: 0, hand: [], captures: [], score: 0 },
        { id: 'player_1', index: 1, hand: [], captures: [], score: 0 },
        { id: 'player_2', index: 2, hand: [], captures: [], score: 0 },
        { id: 'player_3', index: 3, hand: [], captures: [], score: 0 }
      ],
      playerStatuses: {
        player_0: 'ACTIVE',
        player_1: 'ACTIVE',
        player_2: 'ACTIVE',
        player_3: 'ACTIVE'
      },
      tournamentScores: { player_0: 0, player_1: 0, player_2: 0, player_3: 0 },
      eliminationOrder: [],
      round: 1
    });
    
    // Simulate round end - set all hands empty
    state.players.forEach(p => p.hand = []);
    state.tournamentScores = { player_0: 10, player_1: 3, player_2: 8, player_3: 5 };
    
    console.log('Step 1: Round ended, scores:', state.tournamentScores);
    
    // Step 2: End tournament round (this triggers QUALIFICATION_REVIEW with gameOver=true)
    let reviewState = endTournamentRound(state, {}, 0);
    
    console.log('Step 2: After endTournamentRound:');
    console.log('  tournamentPhase:', reviewState.tournamentPhase);
    console.log('  gameOver:', reviewState.gameOver);
    console.log('  qualifiedPlayers:', reviewState.qualifiedPlayers);
    
    // Verify gameOver is true (this is the condition that was failing)
    expect(reviewState.gameOver).toBe(true);
    expect(reviewState.tournamentPhase).toBe('QUALIFICATION_REVIEW');
    expect(reviewState.qualifiedPlayers).toHaveLength(3);
    
    // Step 3: Advance from qualification review
    console.log('Step 3: Attempting advanceFromQualificationReview...');
    
    // This is where it was failing - ActionRouter was throwing
    // "Game is over - no more actions allowed"
    let semifinalState;
    try {
      semifinalState = advanceFromQualificationReview(reviewState, {});
      console.log('Step 3: ✅ advanceFromQualificationReview succeeded!');
    } catch (error) {
      console.log('Step 3: ❌ FAILED with error:', error.message);
      throw error;
    }
    
    console.log('Step 3: After advance:');
    console.log('  tournamentPhase:', semifinalState.tournamentPhase);
    console.log('  players.length:', semifinalState.players?.length);
    console.log('  playerCount:', semifinalState.playerCount);
    console.log('  gameMode:', semifinalState.gameMode);
    
    // Verify final state
    expect(semifinalState.tournamentPhase).toBe('SEMI_FINAL');
    expect(semifinalState.playerCount).toBe(3);
    expect(semifinalState.players.length).toBe(3);
    expect(semifinalState.gameMode).toBe('three-hands');
    
    console.log('\n✅ PASSED: Complete flow works correctly!');
  });

  /**
   * Test: Other actions should still be blocked when gameOver=true
   */
  it('still blocks regular actions when gameOver=true (non-tournament)', () => {
    // Import the ActionRouter to test the guard directly
    const { createActionRouter } = require('../ActionRouter');
    
    const handlers = {
      advanceFromQualificationReview: require('./advanceFromQualificationReview'),
      playCard: (state, payload) => state, // Mock handler
    };
    
    const router = createActionRouter({ handlers });
    
    const stateWithGameOver = cloneState({
      gameOver: true,
      tournamentPhase: 'QUALIFYING', // Not in QUALIFICATION_REVIEW
      currentPlayer: 0,
      players: [{ id: 'p0' }, { id: 'p1' }],
      playerCount: 2
    });
    
    console.log('\n=== Test: Regular actions blocked when gameOver=true ===');
    console.log('gameOver:', stateWithGameOver.gameOver);
    console.log('tournamentPhase:', stateWithGameOver.tournamentPhase);
    
    // Regular actions should still be blocked
    expect(() => {
      router.executeAction(stateWithGameOver, 0, 'playCard', {});
    }).toThrow('Game is over - no more actions allowed');
    
    console.log('✅ PASSED: Regular actions are still blocked');
  });
});
