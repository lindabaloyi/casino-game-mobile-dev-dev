/**
 * Online Play Screen - Unified Multiplayer Lobby
 * 
 * A unified networked game mode lobby that supports:
 * - 2 players (two-hands)
 * - 3 players (three-hands)
 * - 4 players (four-hands, party, freeforall, tournament)
 * 
 * Features enhanced lobby UI with:
 * - Player avatars and usernames in a dynamic grid
 * - Ready/not ready status indicators
 * - Connection quality indicators
 * - Animated join/leave notifications
 * - Tournament support (status bar, spectator view)
 * - Polished gradient styling
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  ScrollView,
  Vibration,
  BackHandler,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { usePlayerProfile, AVATAR_OPTIONS } from '../hooks/usePlayerProfile';
import { useTournamentStatus } from '../hooks/useTournamentStatus';
import { SpectatorView, QualificationReviewModal } from '../components/tournament';

export const options = {
  headerShown: false,
};

// Mode type definition
export type GameMode = 'two-hands' | 'three-hands' | 'four-hands' | 'party' | 'freeforall' | 'tournament';

// Mode configuration
const MODE_CONFIG: Record<GameMode, {
  title: string;
  subtitle: string;
  connectingSubtitle: string;
  playerCount: number;
  isTeamMode: boolean;
}> = {
  'two-hands': {
    title: '⚔️ 2 Hands',
    subtitle: '1v1 Battle',
    connectingSubtitle: 'Finding opponent for 2 hands',
    playerCount: 2,
    isTeamMode: false,
  },
  'three-hands': {
    title: '🎴 3 Hands',
    subtitle: '3 Player Battle',
    connectingSubtitle: 'Finding opponents for three hands',
    playerCount: 3,
    isTeamMode: false,
  },
  'four-hands': {
    title: '🎯 4 Hands',
    subtitle: '4 Player Free-For-All',
    connectingSubtitle: 'Finding opponents for four hands',
    playerCount: 4,
    isTeamMode: false,
  },
  'party': {
    title: '🎉 Party Mode',
    subtitle: '2v2 Battle',
    connectingSubtitle: 'Finding players for party mode',
    playerCount: 4,
    isTeamMode: true,
  },
  'freeforall': {
    title: '🎴 Free For All',
    subtitle: '4 Player Battle',
    connectingSubtitle: 'Finding opponents for free for all',
    playerCount: 4,
    isTeamMode: false,
  },
  'tournament': {
    title: '🏆 Tournament',
    subtitle: '4 Player Knockout',
    connectingSubtitle: 'Finding players for tournament',
    playerCount: 4,
    isTeamMode: false,
  },
};

// Mock player data for demo - in production this comes from server
interface LobbyPlayer {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

export default function OnlinePlayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  
  // Handle hardware back button (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Go back in navigation stack
      if (router.canGoBack()) {
        router.back();
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [router]);

  // Handle web/browser back button via navigation state change
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Allow normal navigation to happen
      // This ensures browser back button works properly
    });

    return unsubscribe;
  }, [navigation]);
  const modeConfig = MODE_CONFIG[mode];
  const { width, height } = useWindowDimensions();
  const screenHeight = height;
  const screenWidth = width;
  
  const needsScroll = screenHeight < 600;
  const scaleFactor = screenWidth < 380 ? 0.85 : 1;
  
  // Animation values
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [notification, setNotification] = useState<string | null>(null);
  
  // Ready state
  const [isReady, setIsReady] = useState(false);
  
  // Mock players for demo (replace with server data)
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  
  const { 
    gameState, 
    gameOverData,
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
  } = useMultiplayerGame({ mode });
  
  const { profile } = usePlayerProfile();
  
  // Tournament status - pass gameState to avoid creating duplicate socket connections
  // Use playerNumber ?? 0 to ensure we always have a valid number
  const safePlayerNum = playerNumber ?? 0;
  const tournamentStatus = useTournamentStatus(gameState, safePlayerNum);
  
  // Get avatar emoji
  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };
  
  // Get connection quality color
  const getPingColor = (ping: number) => {
    if (ping < 100) return '#4CAF50'; // Green
    if (ping < 200) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };
  
  // Get ping icon
  const getPingIcon = (ping: number) => {
    if (ping < 100) return 'wifi';
    if (ping < 200) return 'wifi';
    return 'wifi-outline';
  };
  
  // Show notification
  const showNotification = (message: string) => {
    setNotification(message);
    Vibration.vibrate(100);
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
  
  // Mock player join for demo
  useEffect(() => {
    // Simulate players joining for demo
    const mockPlayers: LobbyPlayer[] = [
      { id: '1', username: profile.username || 'You', avatar: profile.avatar, isReady: isReady, isConnected: true, ping: 45 },
    ];
    setLobbyPlayers(mockPlayers);
  }, [profile, isReady]);
  
  // Add mock players as players join
  useEffect(() => {
    const maxPlayers = modeConfig.playerCount;
    if (playersInLobby > 1 && lobbyPlayers.length < Math.min(playersInLobby, maxPlayers)) {
      const newPlayer: LobbyPlayer = {
        id: String(lobbyPlayers.length + 1),
        username: `Player ${lobbyPlayers.length + 1}`,
        avatar: AVATAR_OPTIONS[lobbyPlayers.length % AVATAR_OPTIONS.length].id,
        isReady: true,
        isConnected: true,
        ping: Math.floor(Math.random() * 150) + 30,
      };
      setLobbyPlayers(prev => [...prev, newPlayer]);
      showNotification(`${newPlayer.username} joined!`);
    }
  }, [playersInLobby, modeConfig.playerCount]);
  
  // Update own ready status
  useEffect(() => {
    setLobbyPlayers(prev => prev.map((p, i) => 
      i === 0 ? { ...p, isReady } : p
    ));
  }, [isReady]);
  
  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>{modeConfig.connectingSubtitle}</Text>
        </View>
      </View>
    );
  }
  
  // Show game only when gameState exists (game started)
  const showGame = gameState != null;
  
  if (!showGame) {
    const playersNeeded = modeConfig.playerCount - playersInLobby;
    const allReady = lobbyPlayers.length >= 2 && lobbyPlayers.every(p => p.isReady);
    
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
            <Text style={styles.headerTitle}>{modeConfig.title}</Text>
            <Text style={styles.headerSubtitle}>{modeConfig.subtitle}</Text>
          </View>
          
          <View style={styles.connectionBadge}>
            <Ionicons name="wifi" size={16} color="#4CAF50" />
            <Text style={styles.connectionText}>Live</Text>
          </View>
        </View>
        
        <ScrollView 
          style={styles.lobbyScroll}
          contentContainerStyle={[
            styles.lobbyContent,
            needsScroll && styles.lobbyContentScrollable,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Room Code Card */}
          <View style={styles.roomCodeCard}>
            <View style={styles.roomCodeContent}>
              <Text style={styles.roomCodeLabel}>Room Code</Text>
              <Text style={styles.roomCodeValue}>
                {mode === 'party' ? 'PARTY' : mode === 'tournament' ? 'TOURN' : mode.toUpperCase().slice(0, 4)}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          {/* Player Slots - Dynamic based on player count */}
          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>
              Players ({playersInLobby}/{modeConfig.playerCount})
            </Text>
            
            <View style={styles.playersGrid}>
              {/* Your Player (First) */}
              <View style={styles.playerCard}>
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
                <View style={styles.playerStatus}>
                  <View style={styles.pingBadge}>
                    <Ionicons name="wifi" size={12} color="#4CAF50" />
                    <Text style={styles.pingText}>45ms</Text>
                  </View>
                </View>
                <Text style={[
                  styles.readyText,
                  isReady ? styles.readyTextReady : styles.readyTextNotReady
                ]}>
                  {isReady ? 'READY' : 'NOT READY'}
                </Text>
              </View>
              
              {/* Dynamic Other Player Slots */}
              {[...Array(modeConfig.playerCount - 1)].map((_, slotIndex) => {
                const slot = slotIndex + 1;
                const player = lobbyPlayers[slot];
                const isFilled = player != null;
                
                return (
                  <View 
                    key={slot} 
                    style={[
                      styles.playerCard,
                      !isFilled && styles.playerCardEmpty
                    ]}
                  >
                    {isFilled ? (
                      <>
                        <View style={styles.playerAvatar}>
                          <Text style={styles.playerAvatarText}>
                            {getAvatarEmoji(player.avatar)}
                          </Text>
                          <View style={[
                            styles.readyIndicator,
                            player.isReady ? styles.readyIndicatorReady : styles.readyIndicatorNotReady
                          ]}>
                            <Ionicons 
                              name={player.isReady ? "checkmark" : "time-outline"} 
                              size={12} 
                              color="white" 
                            />
                          </View>
                        </View>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.username}
                        </Text>
                        <View style={styles.playerStatus}>
                          <View style={styles.pingBadge}>
                            <Ionicons 
                              name={getPingIcon(player.ping)} 
                              size={12} 
                              color={getPingColor(player.ping)} 
                            />
                            <Text style={styles.pingText}>{player.ping}ms</Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.readyText,
                          player.isReady ? styles.readyTextReady : styles.readyTextNotReady
                        ]}>
                          {player.isReady ? 'READY' : 'NOT READY'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={[styles.playerAvatar, styles.playerAvatarEmpty]}>
                          <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.3)" />
                        </View>
                        <Text style={styles.playerNameEmpty}>Waiting...</Text>
                        <Text style={styles.slotText}>Player {slot + 1}</Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Status Message */}
          <View style={styles.statusSection}>
            {playersNeeded > 0 ? (
              <View style={styles.waitingStatus}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={styles.waitingText}>
                  Waiting for {playersNeeded} more player{playersNeeded > 1 ? 's' : ''}...
                </Text>
              </View>
            ) : allReady ? (
              <View style={styles.readyStatus}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.readyStatusText}>
                  All players ready! Starting soon...
                </Text>
              </View>
            ) : (
              <View style={styles.waitingStatus}>
                <Ionicons name="alert-circle" size={20} color="#FFC107" />
                <Text style={styles.waitingText}>
                  Waiting for players to ready up...
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
            onPress={() => setIsReady(!isReady)}
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
          
          {/* Hint */}
          <Text style={styles.lobbyHint}>
            Share the room code with friends to join!
          </Text>
        </ScrollView>
      </View>
    );
  }
  
  // Player disconnected - show reconnection prompt
  if (playerDisconnected) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="person-remove" size={48} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Player Disconnected</Text>
          <Text style={styles.errorText}>
            A player has disconnected from the game.
          </Text>
          <Text style={styles.errorHint}>
            Waiting for reconnection or refresh to continue...
          </Text>
        </View>
      </View>
    );
  }
  
  // Handle null playerNumber for rendering
  const safePlayerNumber = playerNumber ?? 0;
  
  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;
  
  // Show game
  return (
    <View style={styles.container}>
      {/* Tournament Status Bar - Removed to keep game board clear */}
      
      {/* Qualification Review Modal - shows qualified players before next round */}
      {tournamentStatus.isInQualificationReview && (
        <QualificationReviewModal
          visible={true}
          qualifiedPlayers={tournamentStatus.qualifiedPlayers.map((playerIndex, idx) => ({
            playerIndex,
            score: {
              ...tournamentStatus.qualificationScores[playerIndex],
              rank: idx + 1
            }
          }))}
          countdownSeconds={tournamentStatus.qualificationCountdown}
          onCountdownComplete={() => {
            // Send action to advance from qualification review to next phase
            console.log('[OnlinePlay] Qualification countdown complete, advancing to next phase');
            sendAction({ type: 'advanceFromQualificationReview', payload: {} });
          }}
        />
      )}

      {/* Spectator View for eliminated players */}
      {tournamentStatus.isSpectator && !tournamentStatus.isInQualificationReview ? (
        <SpectatorView
          tournamentPhase={tournamentStatus.tournamentPhase}
          tournamentRound={tournamentStatus.tournamentRound}
          finalShowdownHandsPlayed={tournamentStatus.finalShowdownHandsPlayed}
          eliminationOrder={tournamentStatus.eliminationOrder}
          playerStatuses={tournamentStatus.playerStatuses}
          tournamentScores={tournamentStatus.tournamentScores}
          playerCount={modeConfig.playerCount}
        />
      ) : !tournamentStatus.isInQualificationReview ? (
      <GameBoard
        gameState={gameState as any}
        gameOverData={gameOverData}
        playerNumber={safePlayerNumber}
        sendAction={sendAction}
        startNextRound={startNextRound}
        onRestart={() => {
          requestSync();
        }}
        onBackToMenu={() => router.back()}
        serverError={serverErrorObj}
        onServerErrorClose={clearError}
        opponentDrag={opponentDrag}
        emitDragStart={emitDragStart}
        emitDragMove={emitDragMove}
        emitDragEnd={emitDragEnd}
      />
      ) : null}
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
  // Scroll Content
  lobbyScroll: {
    flex: 1,
  },
  lobbyContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  lobbyContentScrollable: {
    paddingBottom: 50,
  },
  // Room Code Card
  roomCodeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  roomCodeContent: {
    flex: 1,
  },
  roomCodeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  roomCodeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 4,
  },
  copyButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 10,
    borderRadius: 8,
  },
  // Players Section
  playersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  playerCardEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerAvatarEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  playerAvatarText: {
    fontSize: 28,
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  playerNameEmpty: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
    textAlign: 'center',
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 3,
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readyTextReady: {
    color: '#4CAF50',
  },
  readyTextNotReady: {
    color: '#FF9800',
  },
  slotText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
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
  // Hint
  lobbyHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  // Error Screen
  errorCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
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
