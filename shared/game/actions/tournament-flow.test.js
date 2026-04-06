/**
 * Tournament Flow Integration Tests
 * Tests the full flow from QUALIFYING → QUALIFICATION_REVIEW → SEMI_FINAL
 * 
 * Run with: npm test -- --testPathPattern=tournament-flow
 */

const { cloneState } = require('../clone');
const startTournament = require('./startTournament');
const { endTournamentRound } = require('./endTournamentRound');
const startQualificationReview = require('./startQualificationReview');
const advanceFromQualificationReview = require('./advanceFromQualificationReview');
const { createDeck } = require('../deck');

describe('Tournament Flow Integration', () => {
  
  /**
   * Helper to create a complete initial tournament state
   */
  function createInitialTournamentState() {
    const deck = createDeck();
    const state = cloneState({
      gameId: 'test-game',
      tournamentMode: 'knockout',
      tournamentPhase: 'QUALIFYING',
      tournamentRound: 1,
      playerCount: 4,
      players: [
        { id: 'player_0', index: 0, hand: deck.splice(0, 10), captures: [], score: 0 },
        { id: 'player_1', index: 1, hand: deck.splice(0, 10), captures: [], score: 0 },
        { id: 'player_2', index: 2, hand: deck.splice(0, 10), captures: [], score: 0 },
        { id: 'player_3', index: 3, hand: deck.splice(0, 10), captures: [], score: 0 }
      ],
      tableCards: deck.splice(0, 4),
      deck,
      playerStatuses: {
        player_0: 'ACTIVE',
        player_1: 'ACTIVE',
        player_2: 'ACTIVE',
        player_3: 'ACTIVE'
      },
      tournamentScores: {
        player_0: 0,
        player_1: 0,
        player_2: 0,
        player_3: 0
      },
      eliminationOrder: [],
      gameOver: false,
      round: 1,
      currentPlayer: 0,
      turnCounter: 1,
      moveCount: 0,
      scores: [0, 0, 0, 0]
    });
    return state;
  }

  /**
   * Helper to simulate a round ending with scores
   */
  function simulateRoundEnd(state, scores) {
    const newState = cloneState(state);
    for (let i = 0; i < newState.players.length; i++) {
      newState.players[i].hand = []; // All cards played
      newState.players[i].captures = [];
    }
    // Apply scores
    newState.tournamentScores = {
      player_0: scores[0] || 0,
      player_1: scores[1] || 0,
      player_2: scores[2] || 0,
      player_3: scores[3] || 0
    };
    return newState;
  }

  describe('Full Flow: 4 Players → 3 Qualify → SEMI_FINAL', () => {
    
    it('Step 1: Initial tournament state is correct', () => {
      const state = createInitialTournamentState();
      
      console.log('\n=== Step 1: Initial State ===');
      console.log('tournamentPhase:', state.tournamentPhase);
      console.log('playerCount:', state.playerCount);
      console.log('players.length:', state.players.length);
      
      expect(state.tournamentPhase).toBe('QUALIFYING');
      expect(state.playerCount).toBe(4);
      expect(state.players.length).toBe(4);
    });

    it('Step 2: Round ends and triggers QUALIFICATION_REVIEW (3 qualify)', () => {
      // Start with initial state
      let state = createInitialTournamentState();
      
      // Simulate round end with scores (player_1 has lowest score)
      const stateAfterRound = simulateRoundEnd(state, [10, 3, 8, 5]);
      
      console.log('\n=== Step 2: Round End ===');
      console.log('Scores after round:', stateAfterRound.tournamentScores);
      
      // End the tournament round - should trigger qualification review
      const resultState = endTournamentRound(stateAfterRound, {}, 0);
      
      console.log('After endTournamentRound:');
      console.log('  tournamentPhase:', resultState.tournamentPhase);
      console.log('  qualifiedPlayers:', resultState.qualifiedPlayers);
      console.log('  playerCount:', resultState.playerCount);
      
      expect(resultState.tournamentPhase).toBe('QUALIFICATION_REVIEW');
      expect(resultState.qualifiedPlayers).toHaveLength(3);
    });

    it('Step 3: Advance from QUALIFICATION_REVIEW to SEMI_FINAL', () => {
      // Start with initial state
      let state = createInitialTournamentState();
      
      // Simulate round end with scores (player_1 has lowest score)
      const stateAfterRound = simulateRoundEnd(state, [10, 3, 8, 5]);
      
      // End the tournament round - triggers qualification review
      let reviewState = endTournamentRound(stateAfterRound, {}, 0);
      
      console.log('\n=== Step 3: Advance to SEMI_FINAL ===');
      console.log('Before advance - tournamentPhase:', reviewState.tournamentPhase);
      console.log('Before advance - qualifiedPlayers:', reviewState.qualifiedPlayers);
      
      // Advance from qualification review
      const semifinalState = advanceFromQualificationReview(reviewState, {});
      
      console.log('After advance - tournamentPhase:', semifinalState.tournamentPhase);
      console.log('After advance - players.length:', semifinalState.players.length);
      console.log('After advance - playerCount:', semifinalState.playerCount);
      console.log('After advance - gameMode:', semifinalState.gameMode);
      console.log('After advance - tournamentRound:', semifinalState.tournamentRound);
      
      expect(semifinalState.tournamentPhase).toBe('SEMI_FINAL');
      expect(semifinalState.players.length).toBe(3);
      expect(semifinalState.playerCount).toBe(3);
      expect(semifinalState.gameMode).toBe('three-hands');
      expect(semifinalState.tournamentRound).toBe(2);
    });

    it('Complete flow: QUALIFYING → QUALIFICATION_REVIEW → SEMI_FINAL', () => {
      console.log('\n=== COMPLETE FLOW TEST ===');
      
      // Step 1: Initial state
      let state = createInitialTournamentState();
      console.log('1. Initial - phase:', state.tournamentPhase, 'players:', state.players.length);
      
      // Step 2: Simulate round end
      const stateAfterRound = simulateRoundEnd(state, [10, 3, 8, 5]);
      console.log('2. Scores - player_0:', stateAfterRound.tournamentScores.player_0, ', player_1:', stateAfterRound.tournamentScores.player_1);
      
      // Step 3: End tournament round
      let reviewState = endTournamentRound(stateAfterRound, {}, 0);
      console.log('3. QUALIFICATION_REVIEW - qualified:', reviewState.qualifiedPlayers, 'phase:', reviewState.tournamentPhase);
      
      // Step 4: Advance to semifinal
      let semifinalState = advanceFromQualificationReview(reviewState, {});
      console.log('4. SEMI_FINAL - players:', semifinalState.players.length, 'phase:', semifinalState.tournamentPhase, 'gameMode:', semifinalState.gameMode);
      
      // Verify final state
      expect(semifinalState.tournamentPhase).toBe('SEMI_FINAL');
      expect(semifinalState.playerCount).toBe(3);
      expect(semifinalState.players.length).toBe(3);
      expect(semifinalState.gameMode).toBe('three-hands');
      
      // Verify player_1 was eliminated (lowest score)
      expect(semifinalState.playerStatuses.player_1).toBe('ELIMINATED');
      
      // Verify qualified players are ACTIVE
      expect(semifinalState.playerStatuses.player_0).toBe('ACTIVE');
      expect(semifinalState.playerStatuses.player_2).toBe('ACTIVE');
      expect(semifinalState.playerStatuses.player_3).toBe('ACTIVE');
      
      console.log('\n✅ Complete flow test PASSED!');
    });
  });

  describe('Flow: 3 Players → 2 Qualify → FINAL_SHOWDOWN', () => {
    
    it('Advances from SEMI_FINAL QUALIFICATION_REVIEW to FINAL_SHOWDOWN', () => {
      console.log('\n=== SEMI_FINAL → FINAL_SHOWDOWN TEST ===');
      
      // Start with a 3-player semifinal state - only 2 qualify for FINAL_SHOWDOWN
      let state = cloneState({
        tournamentPhase: 'QUALIFICATION_REVIEW',
        tournamentRound: 2,
        qualifiedPlayers: ['player_0', 'player_2'], // 2 players = FINAL_SHOWDOWN
        players: [
          { id: 'player_0', index: 0, hand: [], captures: [], score: 0 },
          { id: 'player_2', index: 2, hand: [], captures: [], score: 0 }
        ],
        playerCount: 2,
        playerStatuses: {
          player_0: 'ACTIVE',
          player_2: 'ACTIVE'
        },
        tournamentScores: {
          player_0: 15,
          player_2: 12
        },
        eliminationOrder: ['player_1', 'player_3'],
        gameOver: false,
        round: 1
      });
      
      console.log('Before advance - phase:', state.tournamentPhase, 'qualified:', state.qualifiedPlayers);
      
      const finalState = advanceFromQualificationReview(state, {});
      
      console.log('After advance - phase:', finalState.tournamentPhase, 'players:', finalState.players.length, 'gameMode:', finalState.gameMode);
      
      expect(finalState.tournamentPhase).toBe('FINAL_SHOWDOWN');
      expect(finalState.players.length).toBe(2);
      expect(finalState.playerCount).toBe(2);
      expect(finalState.gameMode).toBe('two-hands');
      
      console.log('\n✅ SEMI_FINAL → FINAL_SHOWDOWN test PASSED!');
    });
  });

  describe('Edge Cases', () => {
    
    it('Handles advance when already not in QUALIFICATION_REVIEW', () => {
      const state = cloneState({
        tournamentPhase: 'QUALIFYING',
        players: []
      });
      
      console.log('\n=== Edge Case: Wrong Phase ===');
      console.log('Input phase:', state.tournamentPhase);
      
      const result = advanceFromQualificationReview(state, {});
      
      console.log('Output phase:', result.tournamentPhase);
      
      expect(result.tournamentPhase).toBe('QUALIFYING');
    });

    it('Handles empty qualifiedPlayers with fallback', () => {
      const state = cloneState({
        tournamentPhase: 'QUALIFICATION_REVIEW',
        tournamentRound: 1,
        qualifiedPlayers: [],
        players: [
          { id: 'player_0', index: 0, captures: [], hand: [], score: 0 },
          { id: 'player_1', index: 1, captures: [], hand: [], score: 0 },
          { id: 'player_2', index: 2, captures: [], hand: [], score: 0 }
        ],
        playerCount: 3,
        playerStatuses: {
          player_0: 'ACTIVE',
          player_1: 'ACTIVE',
          player_2: 'ACTIVE'
        },
        tournamentScores: { player_0: 10, player_1: 8, player_2: 5 },
        eliminationOrder: [],
        gameOver: false
      });
      
      console.log('\n=== Edge Case: Empty Qualified ===');
      console.log('Input qualifiedPlayers:', state.qualifiedPlayers);
      
      const result = advanceFromQualificationReview(state, {});
      
      console.log('Output phase:', result.tournamentPhase);
      console.log('Output players:', result.players.length);
      
      // Should default to final showdown (2 players)
      expect(result.tournamentPhase).toBe('FINAL_SHOWDOWN');
      expect(result.players.length).toBe(2);
    });
  });
});
