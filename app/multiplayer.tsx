/**
 * Multiplayer Screen (Duel Mode) - Refactored
 * 
 * A 2-player networked game mode with enhanced lobby UI.
 * Now uses modular components for better maintainability.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
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
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as 'two-hands' | 'party' | 'three-hands') || 'two-hands';
  
  const { height } = useWindowDimensions();
  const screenHeight = height;
  
  const needsScroll = screenHeight < 600;
  
  const { 
    gameState, 
    gameOverData,
    sendAction, 
    playerNumber,
    isConnected,
    isInLobby,
    playersInLobby,
    requiredPlayers,
    isReady,
    allPlayersReady,
    toggleReady,
    error,
    clearError,
    startNextRound,
    requestSync,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
  } = useMultiplayerGame({ mode });
  
  const { profile } = usePlayerProfile();
  const { notification, animValue, showNotification } = useNotification();

  // Get mode-specific titles and messages
  const getModeInfo = () => {
    switch (mode) {
      case 'three-hands':
        return {
          title: '🎴 Three Hands',
          subtitle: '3 Player Battle',
          connectingSubtitle: 'Finding opponents for three hands',
          waitingMessage: 'Waiting for opponents to join...',
          readyMessage: 'Waiting for opponents to ready up...',
        };
      case 'party':
        return {
          title: '🎉 Party Mode',
          subtitle: '2v2 Battle',
          connectingSubtitle: 'Finding players for party mode',
          waitingMessage: 'Waiting for players to join...',
          readyMessage: 'Waiting for players to ready up...',
        };
      default:
        return {
          title: '⚔️ 2 Hands',
          subtitle: '1v1 Battle',
          connectingSubtitle: 'Finding opponent for 2 hands',
          waitingMessage: 'Waiting for opponent to join...',
          readyMessage: 'Waiting for both players to ready up...',
        };
    }
  };

  const modeInfo = getModeInfo();

  // Show notification when opponent joins
  useEffect(() => {
    if (gameState == null && isConnected) {
      const joinMessage = mode === 'three-hands' 
        ? 'Opponents joined! Game starting...'
        : mode === 'party'
        ? 'Players joined! Game starting...'
        : mode === 'two-hands'
        ? 'Opponent joined! Game starting...'
        : 'Opponent joined! Game starting...';
      showNotification(joinMessage);
    }
  }, [gameState, isConnected, showNotification, mode]);

  // Not connected - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <ConnectingScreen 
          title="Connecting..." 
          subtitle={modeInfo.connectingSubtitle} 
        />
      </View>
    );
  }

  // Show game
  if (gameState) {
    console.log(`[MultiplayerScreen] Game started! gameState is now available, playerNumber=${playerNumber}`);
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
    console.log(`[MultiplayerScreen] getStatus: allPlayersReady=${allPlayersReady}, isReady=${isReady}, playersInLobby=${playersInLobby}, requiredPlayers=${requiredPlayers}`);
    
    if (!allPlayersReady) {
      const msg = `${playersInLobby}/${requiredPlayers} players joined - waiting for more...`;
      console.log(`[MultiplayerScreen] Status: WAITING - ${msg}`);
      return { 
        status: 'waiting' as const, 
        message: msg
      };
    }
    if (isReady && allPlayersReady) {
      console.log(`[MultiplayerScreen] Status: READY - Game starting!`);
      return { status: 'ready' as const, message: 'Game starting!' };
    }
    console.log(`[MultiplayerScreen] Status: WAITING - ${modeInfo.readyMessage}`);
    return { status: 'waiting' as const, message: modeInfo.readyMessage };
  };

  const statusInfo = getStatus();

  return (
    <View style={styles.container}>
      <NotificationBanner message={notification} animValue={animValue} />
      
      <LobbyHeader 
        title={modeInfo.title}
        subtitle={modeInfo.subtitle}
      />
      
      <View style={[
        styles.lobbyContent,
        needsScroll && styles.lobbyContentScrollable
      ]}>
        <DuelCard
          playerName={profile.username || 'You'}
          playerAvatar={profile.avatar}
          isReady={isReady}
          opponentReady={allPlayersReady}
          playersInLobby={playersInLobby}
          requiredPlayers={requiredPlayers}
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
