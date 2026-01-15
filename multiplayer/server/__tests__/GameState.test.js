const { createInitialGameState } = require('../game/GameState');

describe('GameState', () => {
  test('creates valid initial state', () => {
    const state = createInitialGameState();
    expect(state).toBeDefined();
    expect(state.round).toBe(1);
    expect(state.currentPlayer).toBe(0);
    expect(Array.isArray(state.playerHands)).toBe(true);
    expect(Array.isArray(state.tableCards)).toBe(true);
  });

  test('initial state has correct structure', () => {
    const state = createInitialGameState();
    expect(state.playerHands).toHaveLength(2);
    expect(state.playerCaptures).toHaveLength(2);
    expect(state.tableCards).toHaveLength(0);
  });
});
