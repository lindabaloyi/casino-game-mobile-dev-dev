import { StyleSheet, Text, View } from 'react-native';
import { GameBoard } from '../components/core/GameBoard';
import GameOverScreen from './game-over';
import { useGameState } from '../hooks/useGameState';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  const { gameState, playerNumber, sendAction, error, clearError } = useGameState();

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for another player to join...
        </Text>
      </View>
    );
  }

  if (gameState.gameOver) {
    return (
      <GameOverScreen
        gameState={gameState}
        onPlayAgain={() => console.log('Play again')}
        onBackToMenu={() => console.log('Back to menu')}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      playerNumber={playerNumber ?? 0}
      sendAction={sendAction}
      onRestart={() => console.log('Restart')}
      onBackToMenu={() => console.log('Back to menu')}
      serverError={error ? { message: error } : null}
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
});
