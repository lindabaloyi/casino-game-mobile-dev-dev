// Simple test to verify the guardrail for multiple builds per player

const handleCreateBuildFromTempStack = require('./multiplayer/server/game/actions/build/createBuildFromTempStack');

// Mock game manager
const mockGameManager = {
  getGameState: (gameId) => {
    return {
      tableCards: [
        // Existing build for player 0
        {
          type: 'build',
          buildId: 'build-0',
          cards: [{ suit: 'hearts', rank: '5', value: 5 }],
          value: 5,
          owner: 0,
        },
        // Temp stack to convert
        {
          type: 'temporary_stack',
          stackId: 'temp-123',
          cards: [{ suit: 'clubs', rank: '7', value: 7 }],
          owner: 0,
        }
      ]
    };
  }
};

const action = {
  payload: {
    tempStackId: 'temp-123',
    buildValue: 7,
    hasBase: false,
  }
};

try {
  handleCreateBuildFromTempStack(mockGameManager, 0, action, 'test-game');
  console.log('❌ FAIL: Should have thrown error for multiple builds');
} catch (error) {
  if (error.message === 'Player can only have one active build at a time') {
    console.log('✅ PASS: Guardrail correctly prevented multiple builds');
  } else {
    console.log('❌ FAIL: Wrong error message:', error.message);
  }
}
