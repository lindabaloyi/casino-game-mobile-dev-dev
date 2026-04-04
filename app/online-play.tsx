/**
 * Online Play Screen - Unified Multiplayer Lobby
 * 
 * A unified networked game mode lobby that supports:
 * - 2 players (two-hands)
 * - 3 players (three-hands)
 * - 4 players (four-hands, party, freeforall, tournament)
 * 
 * Refactored to use separated components:
 * - useOnlinePlayConnection hook for connection abstraction
 * - Lobby component for UI
 * - GameRoomContainer for game rendering with tournament support
 * - ErrorScreen for error states
 */

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  BackHandler,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Lobby } from '../components/lobby/Lobby';
import { GameRoomContainer } from '../components/lobby/GameRoomContainer';
import { ErrorScreen } from '../components/lobby/ErrorScreen';
import { useOnlinePlayConnection } from '../hooks/useOnlinePlayConnection';
import { useLobbyMock } from '../hooks/useLobbyMock';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useSoundContext } from '../hooks/useSoundContext';
import { MODE_CONFIG, GameMode } from '../utils/modeConfig';

export const options = {
  headerShown: false,
};

export default function OnlinePlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; roomCode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  const roomCodeParam = params.roomCode || null;
  const modeConfig = MODE_CONFIG[mode];



  // Set in-game mode for lower background music volume
  const { setInGameMode } = useSoundContext();
  const { profile } = usePlayerProfile();

  // Unified connection hook - handles both private room and matchmaking
  const connection = useOnlinePlayConnection({
    mode,
    roomCode: roomCodeParam,
  });

  // Debug: Track connection state changes
  useEffect(() => {
    console.log('[OnlinePlay] 🔄 Connection state changed:', {
      isConnected: connection.isConnected,
      socket: !!connection.socket,
      socketId: connection.socket?.id,
      socketConnected: connection.socket?.connected,
      gameState: !!connection.gameState,
      isPrivateRoom: connection.isPrivateRoom,
      playersInLobby: connection.playersInLobby
    });
  }, [connection.isConnected, connection.socket, connection.gameState, connection.isPrivateRoom, connection.playersInLobby]);

  // Debug: Add global socket event listeners
  useEffect(() => {
    if (!connection.socket) return;

    console.log('[OnlinePlay] 🔌 Setting up global socket event listeners');

    const handleConnect = () => console.log('[OnlinePlay] 🔌 Socket CONNECT event');
    const handleDisconnect = (reason: any) => console.log('[OnlinePlay] 🔌 Socket DISCONNECT event, reason:', reason);
    const handleConnectError = (error: any) => console.log('[OnlinePlay] 🔌 Socket CONNECT_ERROR event:', error);
    const handleReconnect = () => console.log('[OnlinePlay] 🔌 Socket RECONNECT event');
    const handleReconnectAttempt = (attempt: number) => console.log('[OnlinePlay] 🔌 Socket RECONNECT_ATTEMPT event, attempt:', attempt);

    connection.socket.on('connect', handleConnect);
    connection.socket.on('disconnect', handleDisconnect);
    connection.socket.on('connect_error', handleConnectError);
    connection.socket.on('reconnect', handleReconnect);
    connection.socket.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      console.log('[OnlinePlay] 🔌 Removing global socket event listeners');
      if (connection.socket) {
        connection.socket.off('connect', handleConnect);
        connection.socket.off('disconnect', handleDisconnect);
        connection.socket.off('connect_error', handleConnectError);
        connection.socket.off('reconnect', handleReconnect);
        connection.socket.off('reconnect_attempt', handleReconnectAttempt);
      }
    };
  }, [connection.socket]);

  // Send leave-queue event when navigating away from lobby
  const sendLeaveQueueEvent = React.useCallback((reason: string, forceSend: boolean = false) => {
    console.log(`[OnlinePlay] 🔍 DEBUG: Attempting leave-queue event (${reason}) - forceSend: ${forceSend}`);
    console.log(`[OnlinePlay] 🔍 DEBUG: Connection state - socket:`, !!connection.socket, 'gameState:', !!connection.gameState, 'isPrivateRoom:', connection.isPrivateRoom);

    if (connection.socket) {
      console.log(`[OnlinePlay] 🔍 DEBUG: Socket details - id:`, connection.socket.id, 'connected:', connection.socket.connected, 'disconnected:', connection.socket.disconnected);
    } else {
      console.log(`[OnlinePlay] 🔍 DEBUG: No socket available`);
    }

    // Check if we should send the event (forceSend bypasses connection checks)
    const shouldSend = forceSend || (connection.socket && connection.socket.connected && !connection.gameState && !connection.isPrivateRoom);

    if (shouldSend) {
      try {
        const leaveEvent = `leave-${mode}-queue`;
        console.log(`[OnlinePlay] 🔍 DEBUG: About to emit ${leaveEvent} on socket ${connection.socket?.id || 'unknown'}`);

        // Use synchronous emit if possible
        if (connection.socket && connection.socket.connected) {
          console.log('[OnlinePlay] 📤 CLIENT SENDING: leave-queue event', leaveEvent, 'to server (reason:', reason, ')');
          connection.socket.emit(leaveEvent);
          console.log('[OnlinePlay] ✅ Sent leave-queue event:', leaveEvent, 'reason:', reason, 'socket connected:', connection.socket.connected);
        } else {
          console.log('[OnlinePlay] ⚠️ Socket not connected, skipping emit');
          return false;
        }

        // Verify the event was queued for sending
        console.log(`[OnlinePlay] 🔍 DEBUG: Event emitted, socket still connected:`, connection.socket.connected);

        // Add temporary socket event listeners to track disconnect timing
        if (connection.socket) {
          const disconnectHandler = () => {
            console.log(`[OnlinePlay] 🔌 Socket disconnected AFTER leave-queue event (${reason})`);
          };
          const connectHandler = () => {
            console.log(`[OnlinePlay] 🔌 Socket reconnected AFTER leave-queue event (${reason})`);
          };

          connection.socket.once('disconnect', disconnectHandler);
          connection.socket.once('connect', connectHandler);

          // Clean up listeners after a short delay
          setTimeout(() => {
            if (connection.socket) {
              connection.socket.off('disconnect', disconnectHandler);
              connection.socket.off('connect', connectHandler);
            }
          }, 5000);
        }

        return true;
      } catch (error) {
        console.error('[OnlinePlay] ❌ Error sending leave-queue event:', error);
        return false;
      }
    }

    console.log('[OnlinePlay] ❌ Skip leave-queue event - reason:', reason, 'socket:', !!connection.socket, 'connected:', connection.socket?.connected, 'gameState:', !!connection.gameState, 'isPrivateRoom:', connection.isPrivateRoom);
    return false;
  }, [connection.socket, connection.gameState, connection.isPrivateRoom, mode]);

  // Handle hardware back button (Android)
  useEffect(() => {
    console.log('[OnlinePlay] 🔧 Setting up hardware back button handler');

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[OnlinePlay] 📱 Hardware back button pressed - IMMEDIATE leave-queue send');

      // CRITICAL: Send leave-queue event SYNCHRONOUSLY before any navigation
      sendLeaveQueueEvent('hardware back button', true); // forceSend = true

      console.log('[OnlinePlay] 📱 Hardware back - navigation starting after leave-queue');
      if (router.canGoBack()) {
        router.back();
      } else {
        console.log('[OnlinePlay] No back history - navigating to home');
        router.replace('/(tabs)');
      }
      return true;
    });

    return () => {
      console.log('[OnlinePlay] 🔧 Removing hardware back button handler');
      backHandler.remove();
    };
  }, [router, sendLeaveQueueEvent]);

  // Handle browser/app close or navigation away
  useEffect(() => {
    console.log('[OnlinePlay] 🌐 Setting up browser navigation handlers');

    let navigationEventSent = false;

    const sendNavigationEvent = (reason: string) => {
      if (!navigationEventSent) {
        console.log(`[OnlinePlay] 🚨 CRITICAL: Sending leave-queue on ${reason} - BEFORE any disconnection`);
        const sent = sendLeaveQueueEvent(reason, true); // forceSend = true
        if (sent) {
          navigationEventSent = true;
          console.log(`[OnlinePlay] ✅ Leave-queue sent successfully on ${reason}`);
        } else {
          console.log(`[OnlinePlay] ❌ Failed to send leave-queue on ${reason}`);
        }
      } else {
        console.log(`[OnlinePlay] ℹ️ Leave-queue already sent, skipping ${reason}`);
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('[OnlinePlay] 🚪 Browser beforeunload triggered - USING HTTP BEACON');

      // Use HTTP beacon for guaranteed delivery on page close
      if (connection.socket && connection.socket.id && !connection.gameState && !connection.isPrivateRoom) {
        const leaveEvent = `leave-${mode}-queue`;
        const beaconUrl = `http://localhost:3001/beacon/leave-queue`;

        try {
          const beaconData = JSON.stringify({
            event: leaveEvent,
            socketId: connection.socket.id
          });

          console.log('[OnlinePlay] 📡 Sending HTTP beacon for leave-queue:', leaveEvent);

          // navigator.sendBeacon returns true if successfully queued
          const beaconSent = navigator.sendBeacon(beaconUrl, beaconData);

          if (beaconSent) {
            console.log('[OnlinePlay] ✅ HTTP beacon queued successfully');
          } else {
            console.log('[OnlinePlay] ⚠️ HTTP beacon failed to queue, falling back to socket emit');
            sendLeaveQueueEvent('beforeunload', true);
          }
        } catch (error) {
          console.error('[OnlinePlay] ❌ HTTP beacon error:', error);
          // Fallback to socket emit
          sendLeaveQueueEvent('beforeunload', true);
        }
      }

      // Note: some browsers may not wait for async operations
      // The event.returnValue is set for older browsers
      event.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[OnlinePlay] 👁️ Page becoming hidden - POTENTIAL NAVIGATION');

        // Use HTTP beacon for visibility change to ensure leave-queue is processed
        // even if the page is about to be closed
        if (connection.socket && connection.socket.id && !connection.gameState && !connection.isPrivateRoom) {
          const leaveEvent = `leave-${mode}-queue`;
          const beaconUrl = `http://localhost:3001/beacon/leave-queue`;

          try {
            const beaconData = JSON.stringify({
              event: leaveEvent,
              socketId: connection.socket.id
            });

            console.log('[OnlinePlay] 📡 Sending HTTP beacon for visibility change:', leaveEvent);

            const beaconSent = navigator.sendBeacon(beaconUrl, beaconData);

            if (beaconSent) {
              console.log('[OnlinePlay] ✅ HTTP beacon queued for visibility change');
            } else {
              console.log('[OnlinePlay] ⚠️ HTTP beacon failed for visibility change, using socket emit');
              sendLeaveQueueEvent('visibility hidden', true);
            }
          } catch (error) {
            console.error('[OnlinePlay] ❌ HTTP beacon error for visibility change:', error);
            sendLeaveQueueEvent('visibility hidden', true);
          }
        } else {
          // Fallback to regular navigation event
          sendNavigationEvent('visibility hidden');
        }
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      console.log('[OnlinePlay] 🔄 Browser popstate triggered - BACK BUTTON PRESSED');
      // This is the critical moment for browser back button
      sendNavigationEvent('popstate');
    };

    // CRITICAL: Listen for popstate FIRST and immediately
    window.addEventListener('popstate', handlePopState, { capture: true, passive: true });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true, passive: true });

    // Listen for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true, passive: true });

    console.log('[OnlinePlay] 🌐 Browser navigation handlers set up with capture phase');

    return () => {
      console.log('[OnlinePlay] 🌐 Removing browser navigation handlers');
      window.removeEventListener('popstate', handlePopState, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
    };
  }, [sendLeaveQueueEvent]);

  // Leave queue when component unmounts (user closes lobby screen)
  useEffect(() => {
    return () => {
      console.log('[OnlinePlay] Leaving lobby screen, sending leave-queue event for mode:', mode);
      // Send leave-queue event when user navigates away from lobby
      if (connection.socket && !connection.gameState) {
        // Only send leave-queue if we're still in the lobby (not in a game)
        const leaveEvent = `leave-${mode}-queue`;
        connection.socket.emit(leaveEvent);
        console.log('[OnlinePlay] Sent leave-queue event:', leaveEvent);
      }
    };
  }, [mode, connection.socket, connection.gameState]);

// Mock lobby data (for display while waiting)
  const {
    lobbyPlayers,
    notification,
    notificationAnim,
    isReady,
    setIsReady,
  } = useLobbyMock({
    modeConfig,
    playersInLobby: connection.playersInLobby,
    profile,
    serverLobbyPlayers: connection.lobbyPlayers,
    initialReady: false,
    roomPlayers: connection.isPrivateRoom ? undefined : undefined,
    roomPlayerCount: connection.isPrivateRoom ? undefined : undefined,
  });

  // DEBUG: Log connection state and lobby data
  console.log('[OnlinePlay] ========== DEBUG LOBBY DATA ==========');
  console.log('[OnlinePlay] Connection state:', JSON.stringify({
    mode,
    roomCode: connection.roomCode,
    isPrivateRoom: connection.isPrivateRoom,
    isConnected: connection.isConnected,
    playersInLobby: connection.playersInLobby,
    gameState: connection.gameState,
    playerDisconnected: connection.playerDisconnected,
    error: connection.error,
  }, null, 2));
  console.log('[OnlinePlay] Lobby data from useLobbyMock:', JSON.stringify({
    lobbyPlayers: lobbyPlayers.map(p => ({ id: p.id, username: p.username, avatar: p.avatar, isReady: p.isReady })),
    playersInLobby: lobbyPlayers.length,
  }, null, 2));
  console.log('[OnlinePlay] Lobby props passed to Lobby component:', JSON.stringify({
    mode,
    modeConfig: modeConfig.title,
    playersInLobby: connection.playersInLobby,
    lobbyPlayers: lobbyPlayers.length,
    isReady,
    roomCode: connection.roomCode,
  }, null, 2));

  // Copy room code to clipboard
  const handleCopyRoomCode = () => {
    const code = connection.roomCode;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  // Not connected yet - show connecting screen
  if (!connection.isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>
            {connection.isPrivateRoom ? 'Joining private room...' : modeConfig.connectingSubtitle}
          </Text>
        </View>
      </View>
    );
  }

  // Player disconnected - show reconnection prompt
  if (connection.playerDisconnected) {
    return <ErrorScreen type="disconnected" />;
  }

  // Show lobby if game hasn't started OR if game isn't fully ready
  // This ensures all players' games are initialized before navigation
  if (connection.gameState == null || !connection.gameReady || !connection.allClientsReady) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        playersInLobby={connection.playersInLobby}
        lobbyPlayers={lobbyPlayers}
        isReady={isReady}
        setIsReady={setIsReady}
        notification={notification}
        notificationAnim={notificationAnim}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={connection.roomCode}
        // Show loading state when game is initializing
        isGameStarting={connection.gameState != null && (!connection.gameReady || !connection.allClientsReady)}
      />
    );
  }

  // Show game with tournament support
  return (
    <GameRoomContainer
      gameState={connection.gameState as any}
      gameOverData={connection.gameOverData}
      playerNumber={connection.playerNumber}
      sendAction={connection.sendAction}
      startNextRound={connection.startNextRound}
      onRestart={() => {
        connection.requestSync();
      }}
      onBackToMenu={() => {
        console.log('[OnlinePlay] onBackToMenu called - navigating to /(tabs)');
        router.replace('/(tabs)');
      }}
      error={connection.error}
      clearError={connection.clearError}
      opponentDrag={connection.opponentDrag as any}
      emitDragStart={connection.emitDragStart as any}
      emitDragMove={connection.emitDragMove as any}
      emitDragEnd={connection.emitDragEnd as any}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  // Connecting Screen
  connectingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  connectingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 20,
  },
  connectingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
});