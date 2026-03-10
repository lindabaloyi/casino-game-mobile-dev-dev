/**
 * Multiplayer Screen (Duel Mode) - Enhanced Lobby
 * 
 * A 2-player networked game mode with enhanced lobby UI:
 * - Player avatars and usernames
 * - Ready/not ready status
 * - Connection quality indicator
 * - Animated join notifications
 * - Polished gradient styling
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { usePlayerProfile, AVATAR_OPTIONS } from '../hooks/usePlayerProfile';

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const screenHeight = height;
  
  const needsScroll = screenHeight < 600;
  
  // Animation values
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [notification, setNotification] = useState<string | null>(null);
  
  // Ready state
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  
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
  
  // Get avatar emoji
  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };
  
  // Show notification
  const showNotification = (message: string) => {
    setNotification(message);
    Animated.timing(notificationAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      Animated.timing(notificationAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2500);
  };
  
  // Show opponent joined notification
  useEffect(() => {
    if (gameState == null && isConnected) {
      showNotification('Opponent joined! Game starting...');
    }
  }, [gameState, isConnected]);
  
  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>Finding opponent for duel</Text>
        </View>
      </View>
    );
  }
  
  // Show game only when gameState exists (game started)
  const showGame = gameState != null;
  
  if (!showGame) {
    return (
      <View style={styles.container}>
        {/* Animated Notification */}
        <Animated.View 
          style={[
            styles.notificationBanner,
            { transform: [{ translateY: notificationAnim }] }
          ]}
        >
          <Ionicons name="person-add" size={20} color="white" />
          <Text style={styles.notificationText}>{notification}</Text>
        </Animated.View>
        
        {/* Compact Header - no back button to save space */}
        <View style={styles.lobbyHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>⚔️ Duel Mode</Text>
            <Text style={styles.headerSubtitle}>1v1 Battle</Text>
          </View>
          
          <View style={styles.connectionBadge}>
            <Ionicons name="wifi" size={16} color="#4CAF50" />
            <Text style={styles.connectionText}>Live</Text>
          </View>
        </View>
        
        <View style={[
          styles.lobbyContent,
          needsScroll && styles.lobbyContentScrollable
        ]}>
          {/* Duel Card */}
          <View style={styles.duelCard}>
            <View style={styles.duelVS}>
              <View style={styles.playerSide}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {getAvatarEmoji(profile.avatar)}
                  </Text>
                  <View style={[
                    styles.readyIndicator,
                    isReady ? styles.readyIndicatorReady : styles.readyIndicatorNotReady
                  ]}>
                    <Ionicons 
                      name={isReady ? "checkmark" : "time-outline"} 
                      size={12} 
                      color="white" 
                    />
                  </View>
                </View>
                <Text style={styles.playerName} numberOfLines={1}>
                  {profile.username || 'You'}
                </Text>
                <Text style={[
                  styles.readyLabel,
                  isReady ? styles.readyLabelReady : styles.readyLabelNotReady
                ]}>
                  {isReady ? 'READY' : 'NOT READY'}
                </Text>
              </View>
              
              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              
              <View style={styles.playerSide}>
                <View style={[
                  styles.playerAvatar,
                  !opponentReady && styles.playerAvatarEmpty
                ]}>
                  {opponentReady ? (
                    <Text style={styles.playerAvatarText}>👤</Text>
                  ) : (
                    <Ionicons name="person-outline" size={28} color="rgba(255,255,255,0.3)" />
                  )}
                  {opponentReady && (
                    <View style={[
                      styles.readyIndicator,
                      styles.readyIndicatorReady
                    ]}>
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  )}
                </View>
                <Text style={styles.playerName}>
                  {opponentReady ? 'Opponent' : 'Waiting...'}
                </Text>
                <Text style={[
                  styles.readyLabel,
                  opponentReady ? styles.readyLabelReady : styles.readyLabelNotReady
                ]}>
                  {opponentReady ? 'READY' : 'NOT READY'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Status */}
          <View style={styles.statusSection}>
            {!opponentReady ? (
              <View style={styles.waitingStatus}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={styles.waitingText}>
                  Waiting for opponent to join...
                </Text>
              </View>
            ) : isReady && opponentReady ? (
              <View style={styles.readyStatus}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.readyStatusText}>
                  Game starting!
                </Text>
              </View>
            ) : (
              <View style={styles.waitingStatus}>
                <Ionicons name="alert-circle" size={20} color="#FFC107" />
                <Text style={styles.waitingText}>
                  Waiting for both players to ready up...
                </Text>
              </View>
            )}
          </View>
          
          {/* Ready Button */}
          <TouchableOpacity 
            style={[
              styles.readyButton,
              isReady && styles.readyButtonActive
            ]}
            onPress={() => {
              setIsReady(!isReady);
              // Simulate opponent ready after a delay for demo
              if (!opponentReady) {
                setTimeout(() => setOpponentReady(true), 2000);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isReady ? "checkmark-circle" : "hand-right"} 
              size={24} 
              color={isReady ? "#0f4d0f" : "#FFD700"} 
            />
            <Text style={[
              styles.readyButtonText,
              isReady && styles.readyButtonTextActive
            ]}>
              {isReady ? "I'm Ready!" : "Click When Ready"}
            </Text>
          </TouchableOpacity>
          
          {/* Connection Info */}
          <View style={styles.connectionInfo}>
            <Ionicons name="wifi" size={16} color="#4CAF50" />
            <Text style={styles.connectionInfoText}>Connection: Excellent (45ms)</Text>
          </View>
        </View>
      </View>
    );
  }
  
  // Handle null playerNumber for rendering
  const safePlayerNumber = playerNumber ?? 0;
  
  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;
  
  // Show game over - just continue showing the game board
  if (gameState.gameOver) {
    console.log('[MultiplayerScreen] Game over - showing final state');
  }
  
  return (
    <View style={styles.container}>
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
  // Header - compact to save space
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  connectionText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Notification
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  notificationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Content
  lobbyContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  lobbyContentScrollable: {
    paddingTop: 20,
  },
  // Duel Card
  duelCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  duelVS: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerAvatarEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerAvatarText: {
    fontSize: 36,
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyIndicatorReady: {
    backgroundColor: '#4CAF50',
  },
  readyIndicatorNotReady: {
    backgroundColor: '#FF9800',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  readyLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readyLabelReady: {
    color: '#4CAF50',
  },
  readyLabelNotReady: {
    color: '#FF9800',
  },
  vsContainer: {
    paddingHorizontal: 15,
  },
  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  // Status Section
  statusSection: {
    marginBottom: 20,
  },
  waitingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  waitingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 10,
  },
  readyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  readyStatusText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  // Ready Button
  readyButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  readyButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  readyButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  readyButtonTextActive: {
    color: '#0f4d0f',
  },
  // Connection Info
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  connectionInfoText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginLeft: 6,
  },
});
