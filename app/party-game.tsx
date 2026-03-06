/**
 * Party Game Screen (2v2 Mode) - Networked Multiplayer
 * 
 * A 4-player networked game mode where players connect via matchmaking.
 * Similar to Multiplayer, but with 4 players instead of 2.
 * 
 * Teams: 
 * - Team A: Players 0 and 1
 * - Team B: Players 2 and 3
 * 
 * Each player sees only their own hand when it's their turn.
 * The game only starts when exactly 4 players have joined the lobby.
 */

import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/game/GameBoard';
import { usePartyGameState } from '../hooks/usePartyGameState';

export const options = {
  headerShown: false,
};

export default function PartyGameScreen() {
  const router = useRouter();
  
  const { 
    gameState, 
    sendAction, 
    playerNumber,
    isConnected,
    isInLobby,
    playersInLobby,
    playerDisconnected,
    error,
    clearError,
    startNextRound,
    requestSync,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
  } = usePartyGameState();

  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Connecting to server...</Text>
      </View>
    );
  }

  // In lobby waiting for players
  if (isInLobby || !gameState) {
    const playersNeeded = 4 - playersInLobby;
    return (
      <View style={styles.lobbyContainer}>
        <TouchableOpacity 
          style={styles.backButtonLobby}
          onPress={() => router.replace('/' as any)}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.lobbyCard}>
          <Text style={styles.lobbyTitle}>🎉 Party Mode (2v2)</Text>
          <Text style={styles.lobbySubtitle}>Waiting for players...</Text>
          
          <View style={styles.playersContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.playerSlot,
                  i < playersInLobby && styles.playerSlotFilled
                ]}
              >
                <Text style={styles.playerSlotText}>
                  {i < playersInLobby ? '✅' : '⏳'} Player {i + 1}
                </Text>
                {i < 2 && <Text style={styles.teamLabel}>(Team A)</Text>}
                {i >= 2 && <Text style={styles.teamLabel}>(Team B)</Text>}
              </View>
            ))}
          </View>
          
          <Text style={styles.lobbyStatus}>
            {playersInLobby} / 4 players connected
          </Text>
          
          {playersNeeded > 0 && (
            <Text style={styles.lobbyWaiting}>
              Waiting for {playersNeeded} more player{playersNeeded > 1 ? 's' : ''}...
            </Text>
          )}
          
          <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />
        </View>
        
        <Text style={styles.lobbyHint}>
          Share this game with friends to play together!
        </Text>
      </View>
    );
  }

  // Player disconnected - show reconnection prompt
  if (playerDisconnected) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Player Disconnected</Text>
        <Text style={styles.errorText}>
          A player has disconnected from the game.
        </Text>
        <Text style={styles.errorHint}>
          Waiting for reconnection or refresh to continue...
        </Text>
      </View>
    );
  }

  // Show game over - just continue showing the game board
  // The round end modal will handle displaying final scores
  if (gameState.gameOver) {
    console.log('[PartyGame] Game over - showing final state');
  }

  // Handle null playerNumber for rendering
  const safePlayerNumber = playerNumber ?? 0;

  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;

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
        playerNumber={safePlayerNumber}
        sendAction={sendAction}
        startNextRound={startNextRound}
        onRestart={() => {
          console.log('[PartyGame] Restart');
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
  backButtonLobby: {
    position: 'absolute',
    top: 30,
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
  lobbyContainer: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lobbyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  lobbyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a5c1a',
    marginBottom: 8,
  },
  lobbySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  playersContainer: {
    width: '100%',
    marginBottom: 20,
  },
  playerSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  playerSlotFilled: {
    backgroundColor: '#e8f5e9',
  },
  playerSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  teamLabel: {
    fontSize: 12,
    color: '#666',
  },
  lobbyStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a5c1a',
    marginBottom: 8,
  },
  lobbyWaiting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loader: {
    marginTop: 8,
  },
  lobbyHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
