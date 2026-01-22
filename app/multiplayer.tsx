import { StyleSheet, Text, View } from 'react-native';
import { GameBoard } from '../components/core/GameBoard';
import GameOverScreen from './game-over';
import { useGameServer } from '../hooks/useGameServer';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  console.log('[SCREEN] MultiplayerScreen rendered');
  const { gameState, playerNumber, sendAction, buildOptions, actionChoices, error, clearError } = useGameServer();

  console.log('[SCREEN] gameState:', gameState, 'playerNumber:', playerNumber);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for another player to join...
        </Text>
      </View>
    );
  }

  // Show game over screen if game is finished
  if (gameState.gameOver) {
    return (
      <GameOverScreen
        gameState={gameState}
        onPlayAgain={() => console.log('Play again')}
        onBackToMenu={() => console.log('Back to menu')}
      />
    );
  }

  // Render the game board when game is active
  return (
    <GameBoard
      gameState={gameState}
      playerNumber={playerNumber || 0}
      sendAction={sendAction}
      onRestart={() => console.log('Restart game')}
      onBackToMenu={() => console.log('Back to menu')}
      buildOptions={buildOptions}
      actionChoices={actionChoices}
      serverError={error}
      onServerErrorClose={clearError}
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
  gameText: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
  },
});
