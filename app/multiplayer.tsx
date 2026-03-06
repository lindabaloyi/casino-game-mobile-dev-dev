import { StyleSheet, Text, View } from 'react-native';
import { GameBoard } from '../components/game/GameBoard';
import { useGameState } from '../hooks/useGameState';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  const { gameState, gameOverData, playerNumber, sendAction, startNextRound, error, clearError, opponentDrag, emitDragStart, emitDragMove, emitDragEnd } = useGameState();

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for another player to join...
        </Text>
      </View>
    );
  }

  // Show game over - just continue showing the game board
  // The round end modal will handle displaying final scores
  if (gameState.gameOver) {
    console.log('[MultiplayerScreen] Game over - showing final state');
  }

  return (
    <GameBoard
      gameState={gameState}
      gameOverData={gameOverData}
      playerNumber={playerNumber ?? 0}
      sendAction={sendAction}
      startNextRound={startNextRound}
      onRestart={() => console.log('Restart')}
      onBackToMenu={() => console.log('Back to menu')}
      serverError={error ? { message: error } : null}
      onServerErrorClose={clearError}
      opponentDrag={opponentDrag}
      emitDragStart={emitDragStart}
      emitDragMove={emitDragMove}
      emitDragEnd={emitDragEnd}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
  },
});
