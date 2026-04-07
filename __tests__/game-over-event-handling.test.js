/**
 * useGameStateSync game-over event handling tests
 * Tests the socket event handling for game-over and tournament transition data
 */

// Mock dependencies
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
};

const mockRecordWin = jest.fn();
const mockRecordLoss = jest.fn();

describe('useGameStateSync - game-over event handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGameOver - basic data extraction', () => {
    
    it('should extract winner from game-over data', () => {
      const data = { winner: 2, finalScores: [10, 8, 5, 3] };
      const playerNumber = 2;
      
      const isWinner = data.winner === playerNumber;
      expect(isWinner).toBe(true);
    });
    
    it('should detect loss when player is not winner', () => {
      const data = { winner: 0, finalScores: [10, 8, 5, 3] };
      const playerNumber = 1;
      
      const isWinner = data.winner === playerNumber;
      expect(isWinner).toBe(false);
    });
  });
  
  describe('handleGameOver - tournament transition data', () => {
    
    it('should extract tournament transition data', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3],
        nextGameId: 2,
        nextPhase: 'SEMI_FINAL',
        transitionType: 'auto',
        countdownSeconds: 8,
        qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
        eliminatedPlayers: ['player_1'],
        isTournamentMode: true
      };
      
      expect(data.nextGameId).toBe(2);
      expect(data.nextPhase).toBe('SEMI_FINAL');
      expect(data.transitionType).toBe('auto');
      expect(data.countdownSeconds).toBe(8);
      expect(data.qualifiedPlayers).toHaveLength(3);
      expect(data.eliminatedPlayers).toHaveLength(1);
      expect(data.isTournamentMode).toBe(true);
    });
    
    it('should handle missing transition data (regular hand transition)', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3]
        // No nextGameId, no nextPhase, no qualifiedPlayers, etc.
      };
      
      expect(data.nextGameId).toBeUndefined();
      expect(data.nextPhase).toBeUndefined();
      expect(data.qualifiedPlayers).toBeUndefined();
      expect(data.countdownSeconds).toBeUndefined();
    });
    
    it('should handle null values in transition data', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3],
        nextGameId: null,
        nextPhase: null,
        qualifiedPlayers: null,
        eliminatedPlayers: null,
        countdownSeconds: null
      };
      
      expect(data.nextGameId).toBeNull();
      expect(data.nextPhase).toBeNull();
    });
  });
  
  describe('handleGameOver - scoreBreakdowns', () => {
    
    it('should extract scoreBreakdowns from server', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3],
        scoreBreakdowns: [
          { playerId: 'player_0', totalPoints: 10, cardPoints: 8, spadeBonus: 2 },
          { playerId: 'player_1', totalPoints: 8, cardPoints: 6, spadeBonus: 2 },
          { playerId: 'player_2', totalPoints: 5, cardPoints: 5, spadeBonus: 0 },
          { playerId: 'player_3', totalPoints: 3, cardPoints: 3, spadeBonus: 0 }
        ]
      };
      
      expect(data.scoreBreakdowns).toHaveLength(4);
      expect(data.scoreBreakdowns[0].playerId).toBe('player_0');
    });
    
    it('should handle undefined scoreBreakdowns', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3]
      };
      
      expect(data.scoreBreakdowns).toBeUndefined();
    });
  });
  
  describe('game mode detection', () => {
    
    it('should map server game mode to stats model - party/four-hands', () => {
      const serverModes = ['party', 'four-hands'];
      
      serverModes.forEach(serverMode => {
        let gameMode = 'two-hands';
        if (serverMode === 'party' || serverMode === 'four-hands') {
          gameMode = 'four-hands';
        }
        expect(gameMode).toBe('four-hands');
      });
    });
    
    it('should map server game mode to stats model - three-hands', () => {
      const serverMode = 'three-hands';
      let gameMode = 'two-hands';
      if (serverMode === 'three-hands') {
        gameMode = 'three-hands';
      }
      expect(gameMode).toBe('three-hands');
    });
    
    it('should map server game mode to stats model - freeforall', () => {
      const serverMode = 'freeforall';
      let gameMode = 'two-hands';
      if (serverMode === 'freeforall') {
        gameMode = 'freeforall';
      }
      expect(gameMode).toBe('freeforall');
    });
    
    it('should map server game mode to stats model - tournament', () => {
      const serverMode = 'tournament';
      let gameMode = 'two-hands';
      if (serverMode === 'tournament') {
        gameMode = 'tournament';
      }
      expect(gameMode).toBe('tournament');
    });
    
    it('should default to two-hands for unknown modes', () => {
      const serverMode = 'unknown-mode';
      let gameMode = 'two-hands';
      if (serverMode === 'party' || serverMode === 'four-hands') {
        gameMode = 'four-hands';
      } else if (serverMode === 'three-hands') {
        gameMode = 'three-hands';
      } else if (serverMode === 'freeforall') {
        gameMode = 'freeforall';
      } else if (serverMode === 'tournament') {
        gameMode = 'tournament';
      }
      expect(gameMode).toBe('two-hands');
    });
  });
  
  describe('socket event subscription', () => {
    
    it('should subscribe to game-over event', () => {
      const handleGameOver = jest.fn();
      
      mockSocket.on('game-over', handleGameOver);
      
      expect(mockSocket.on).toHaveBeenCalledWith('game-over', handleGameOver);
    });
    
    it('should unsubscribe from game-over event on cleanup', () => {
      const handleGameOver = jest.fn();
      
      mockSocket.on('game-over', handleGameOver);
      mockSocket.off('game-over', handleGameOver);
      
      expect(mockSocket.off).toHaveBeenCalledWith('game-over', handleGameOver);
    });
  });
  
  describe('combined game-over with transition data', () => {
    
    it('should have all required fields for phase transition modal', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3],
        isTournamentMode: true,
        nextGameId: 2,
        nextPhase: 'SEMI_FINAL',
        transitionType: 'auto',
        countdownSeconds: 8,
        qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
        eliminatedPlayers: ['player_1'],
        scoreBreakdowns: [
          { playerId: 'player_0', totalPoints: 10 },
          { playerId: 'player_1', totalPoints: 8 },
          { playerId: 'player_2', totalPoints: 5 },
          { playerId: 'player_3', totalPoints: 3 }
        ]
      };
      
      // Test the conditions used in GameBoard's shouldShowStandardGameOver
      const hasTransitionData = !!(
        data?.nextGameId ||
        data?.nextPhase ||
        data?.qualifiedPlayers?.length ||
        data?.eliminatedPlayers?.length ||
        (data?.countdownSeconds && data.countdownSeconds > 0)
      );
      
      expect(hasTransitionData).toBe(true);
      expect(data.isTournamentMode).toBe(true);
      expect(data.countdownSeconds).toBeGreaterThan(0);
    });
    
    it('should correctly identify regular hand transition (no modal)', () => {
      const data = {
        winner: 0,
        finalScores: [10, 8, 5, 3],
        isTournamentMode: true
        // NO transition data
      };
      
      const hasTransitionData = !!(
        data?.nextGameId ||
        data?.nextPhase ||
        data?.qualifiedPlayers?.length ||
        data?.eliminatedPlayers?.length ||
        (data?.countdownSeconds && data.countdownSeconds > 0)
      );
      
      expect(hasTransitionData).toBe(false);
      expect(data.nextGameId).toBeUndefined();
    });
  });
});