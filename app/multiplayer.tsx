import { StyleSheet, Text, View } from 'react-native';
import { GameBoard } from '../components/GameBoard';
import { useSocket } from '../hooks/useSocket';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  console.log('[SCREEN] MultiplayerScreen rendered');
  const { gameState, playerNumber, sendAction, buildOptions, actionChoices, error, clearError } = useSocket();

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

  // Render the game board when game starts
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
