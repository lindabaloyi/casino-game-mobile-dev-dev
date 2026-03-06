/**
 * CPU Game Screen
 * 
 * A single-player game mode where the player competes against the CPU.
 * This is independent from multiplayer - no socket connection needed.
 * 
 * The game uses:
 * - useLocalGame: Client-side game state management
 * - useCpuEngine: CPU AI decision making
 * - GameBoard: Reusable game UI component
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { GameBoard } from '../components/game/GameBoard';
import { useLocalGame, GameState } from '../hooks/game/useLocalGame';
import { useCpuEngine } from '../hooks/game/useCpuEngine';
import { useRouter } from 'expo-router';

export const options = {
  headerShown: false,
};

export default function CpuGameScreen() {
  const router = useRouter();
  
  const { 
    gameState, 
    sendAction, 
    playerNumber,
    isCpuTurn,
    resetGame,
    startNextRound 
  } = useLocalGame(2); // 2 players: human vs CPU
  
  // Hook up CPU AI
  useCpuEngine({
    gameState,
    executeAction: sendAction,
    enabled: true,
  });

  // Wait for game to initialize
  if (!gameState) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  // Show game over - redirect to menu
  if (gameState.gameOver) {
    // For now, just show the game board with a message
    // The round end modal will handle displaying the final scores
    console.log('[CpuGameScreen] Game over - showing final state');
  }

  return (
    <View style={styles.container}>
      {/* CPU Turn Indicator */}
      {isCpuTurn && (
        <View style={styles.cpuIndicator}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.cpuIndicatorText}>CPU is thinking...</Text>
        </View>
      )}
      
      <GameBoard
        gameState={gameState as any}
        playerNumber={playerNumber}
        sendAction={sendAction}
        startNextRound={startNextRound}
        onRestart={() => {
          console.log('[CpuGameScreen] Restart');
          resetGame();
        }}
        onBackToMenu={() => console.log('[CpuGameScreen] Back to menu')}
        serverError={null}
        onServerErrorClose={() => {}}
        opponentDrag={null}
        emitDragStart={() => {}}
        emitDragMove={() => {}}
        emitDragEnd={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
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
  cpuIndicator: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  cpuIndicatorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
