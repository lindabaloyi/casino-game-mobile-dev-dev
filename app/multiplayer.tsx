import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useGameState';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  const router = useRouter();
  
  const { 
    gameState, 
    gameOverData,
    sendAction, 
    playerNumber,
    isConnected,
    error,
    clearError,
    startNextRound,
    requestSync,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
  } = useMultiplayerGame({ mode: 'duel' });

  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Connecting to server...</Text>
      </View>
    );
  }

  // Show game only when gameState exists (game started)
  const showGame = gameState != null;
  
  if (!showGame) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for another player to join...
        </Text>
        <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />
      </View>
    );
  }

  // Handle null playerNumber for rendering
  const safePlayerNumber = playerNumber ?? 0;

  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;

  // Show game over - just continue showing the game board
  // The round end modal will handle displaying final scores
  if (gameState.gameOver) {
    console.log('[MultiplayerScreen] Game over - showing final state');
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.replace('/' as any)}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <GameBoard
        gameState={gameState as any}
        gameOverData={gameOverData}
        playerNumber={safePlayerNumber}
        sendAction={sendAction}
        startNextRound={startNextRound}
        onRestart={() => {
          console.log('[MultiplayerScreen] Restart');
          requestSync();
        }}
        onBackToMenu={() => router.replace('/' as any)}
        serverError={serverErrorObj}
        onServerErrorClose={clearError}
        opponentDrag={opponentDrag}
        emitDragStart={emitDragStart}
        emitDragMove={emitDragMove}
        emitDragEnd={emitDragEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
  waitingText: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
});
