/**
 * Multiplayer Screen (Duel Mode) - Refactored
 * 
 * A 2-player networked game mode with enhanced lobby UI.
 * Now uses modular components for better maintainability.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useLobbyState } from '../hooks/useLobbyState';
import { useNotification } from '../hooks/useNotification';
import {
  ConnectingScreen,
  LobbyHeader,
  DuelCard,
  ReadyButton,
  StatusSection,
  NotificationBanner,
} from '../components/lobby';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const screenHeight = height;
  
  const needsScroll = screenHeight < 600;
  
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
  
  const { profile } = usePlayerProfile();
  const { isReady, opponentReady, toggleReady } = useLobbyState();
  const { notification, animValue, showNotification } = useNotification();

  // Show notification when opponent joins
  useEffect(() => {
    if (gameState == null && isConnected) {
      showNotification('Opponent joined! Game starting...');
    }
  }, [gameState, isConnected, showNotification]);

  // Not connected - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <ConnectingScreen 
          title="Connecting..." 
          subtitle="Finding opponent for duel" 
        />
      </View>
    );
  }

  // Show game
  if (gameState) {
    const safePlayerNumber = playerNumber ?? 0;
    const serverErrorObj = error ? { message: error } : null;
    
    return (
      <View style={styles.container}>
        <GameBoard
          gameState={gameState as any}
          gameOverData={gameOverData}
          playerNumber={safePlayerNumber}
          sendAction={sendAction}
          startNextRound={startNextRound}
          onRestart={() => requestSync()}
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

  // Show lobby
  const getStatus = () => {
    if (!opponentReady) return { status: 'waiting' as const, message: 'Waiting for opponent to join...' };
    if (isReady && opponentReady) return { status: 'ready' as const, message: 'Game starting!' };
    return { status: 'error' as const, message: 'Waiting for both players to ready up...' };
  };

  const statusInfo = getStatus();

  return (
    <View style={styles.container}>
      <NotificationBanner message={notification} animValue={animValue} />
      
      <LobbyHeader 
        title="⚔️ Duel Mode"
        subtitle="1v1 Battle"
      />
      
      <View style={[
        styles.lobbyContent,
        needsScroll && styles.lobbyContentScrollable
      ]}>
        <DuelCard
          playerName={profile.username || 'You'}
          playerAvatar={profile.avatar}
          isReady={isReady}
          opponentReady={opponentReady}
        />
        
        <StatusSection 
          status={statusInfo.status}
          message={statusInfo.message}
        />
        
        <ReadyButton 
          isReady={isReady}
          onToggle={toggleReady}
        />
        
        <View style={styles.connectionInfo}>
          <StatusSection 
            status="ready"
            message="Connection: Excellent (45ms)"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  lobbyContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  lobbyContentScrollable: {
    paddingTop: 20,
  },
  connectionInfo: {
    marginTop: 10,
  },
});
