/**
 * Lobby
 * 
 * Main lobby component that displays the game room.
 * Composed from smaller components: PlayerCard, NotificationBanner, etc.
 * 
 * Extracted from OnlinePlayScreen for better separation of concerns.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerCard } from './PlayerCard';
import { NotificationBanner } from './NotificationBanner';
import { GameMode, ModeConfig } from '../../utils/modeConfig';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';
import { LobbyPlayer } from '../../hooks/useLobbyMock';

interface LobbyProps {
  mode: GameMode;
  modeConfig: ModeConfig;
  playersInLobby: number;
  lobbyPlayers: LobbyPlayer[];
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
  notification: string | null;
  notificationAnim: Animated.Value;
  onCopyRoomCode?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  mode,
  modeConfig,
  playersInLobby,
  lobbyPlayers,
  isReady,
  setIsReady,
  notification,
  notificationAnim,
  onCopyRoomCode,
}) => {
  const { height, width } = useWindowDimensions();
  const needsScroll = height < 600;
  const playersNeeded = modeConfig.playerCount - playersInLobby;
  const allReady = lobbyPlayers.length >= 2 && lobbyPlayers.every(p => p.isReady);

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };

  const getPingColor = (ping: number) => {
    if (ping < 100) return '#4CAF50';
    if (ping < 200) return '#FFC107';
    return '#F44336';
  };

  const getPingIcon = (ping: number) => {
    if (ping < 100) return 'wifi';
    if (ping < 200) return 'wifi';
    return 'wifi-outline';
  };

  // Get room code display
  const getRoomCodeDisplay = () => {
    if (mode === 'party') return 'PARTY';
    if (mode === 'tournament') return 'TOURN';
    return mode.toUpperCase().slice(0, 4);
  };

  return (
    <View style={styles.container}>
      <NotificationBanner
        message={notification}
        animValue={notificationAnim}
      />

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
        contentContainerStyle={[styles.lobbyContent, needsScroll && styles.lobbyContentScrollable]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomCodeCard}>
          <View style={styles.roomCodeContent}>
            <Text style={styles.roomCodeLabel}>Room Code</Text>
            <Text style={styles.roomCodeValue}>
              {getRoomCodeDisplay()}
            </Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={onCopyRoomCode}>
            <Ionicons name="copy-outline" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>
            Players ({playersInLobby}/{modeConfig.playerCount})
          </Text>
          <View style={styles.playersGrid}>
            {/* Player 0 (self) */}
            {lobbyPlayers[0] && (
              <PlayerCard
                player={lobbyPlayers[0]}
                isOwn={true}
                avatarEmoji={getAvatarEmoji(lobbyPlayers[0].avatar)}
                pingColor={getPingColor}
                pingIcon={getPingIcon}
              />
            )}
            
            {/* Other slots */}
            {[...Array(modeConfig.playerCount - 1)].map((_, idx) => {
              const slotIndex = idx + 1;
              const player = lobbyPlayers[slotIndex];
              
              if (player) {
                return (
                  <PlayerCard
                    key={slotIndex}
                    player={player}
                    avatarEmoji={getAvatarEmoji(player.avatar)}
                    pingColor={getPingColor}
                    pingIcon={getPingIcon}
                  />
                );
              }
              
              // Empty slot
              return (
                <PlayerCard
                  key={`empty-${slotIndex}`}
                  slotIndex={slotIndex}
                />
              );
            })}
          </View>
        </View>

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
              <Text style={styles.readyStatusText}>All players ready! Starting soon...</Text>
            </View>
          ) : (
            <View style={styles.waitingStatus}>
              <Ionicons name="alert-circle" size={20} color="#FFC107" />
              <Text style={styles.waitingText}>Waiting for players to ready up...</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.readyButton, isReady && styles.readyButtonActive]}
          onPress={() => setIsReady(!isReady)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isReady ? 'checkmark-circle' : 'hand-right'}
            size={24}
            color={isReady ? '#0f4d0f' : '#FFD700'}
          />
          <Text style={[styles.readyButtonText, isReady && styles.readyButtonTextActive]}>
            {isReady ? "I'm Ready!" : 'Click When Ready'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.lobbyHint}>Share the room code with friends to join!</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f4d0f' },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerInfo: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  connectionText: { color: '#4CAF50', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  lobbyScroll: { flex: 1 },
  lobbyContent: { paddingHorizontal: 16, paddingBottom: 30 },
  lobbyContentScrollable: { paddingBottom: 50 },
  roomCodeCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  roomCodeContent: { flex: 1 },
  roomCodeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  roomCodeValue: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', letterSpacing: 4 },
  copyButton: { backgroundColor: 'rgba(255,215,0,0.2)', padding: 10, borderRadius: 8 },
  playersSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: 'white', marginBottom: 12 },
  playersGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statusSection: { marginBottom: 20 },
  waitingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  waitingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 10 },
  readyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  readyStatusText: { color: '#4CAF50', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  readyButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  readyButtonActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  readyButtonText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  readyButtonTextActive: { color: '#0f4d0f' },
  lobbyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 10 },
});

export default Lobby;
