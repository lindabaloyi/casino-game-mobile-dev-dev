/**
 * Lobby
 * 
 * Main lobby component that displays the game room.
 * Calls useLobby directly inside - single source of truth for lobby state.
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Socket } from 'socket.io-client';
import { PlayerCard } from './PlayerCard';
import { GameMode, ModeConfig } from '../../utils/modeConfig';
import { useLobby } from '../../hooks/useLobby';
import { getAvatarEmoji, getPingColor, getPingIcon } from '../../hooks/useLobbyHelpers';

interface LobbyProps {
  mode: GameMode;
  modeConfig: ModeConfig;
  socket?: Socket | null;
  playersInLobby?: number;
  isConnected?: boolean;
  onCopyRoomCode?: () => void;
  roomCode?: string | null;
  isReady?: boolean;
  setIsReady?: (ready: boolean) => void;
  isGameStarting?: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  mode,
  modeConfig,
  socket,
  playersInLobby: externalPlayersCount,
  isConnected = true,
  onCopyRoomCode,
  roomCode: externalRoomCode,
  isReady: externalIsReady,
  setIsReady: externalSetIsReady,
  isGameStarting = false,
}) => {
  const { height } = useWindowDimensions();
  const needsScroll = height < 600;

  const { displayPlayers, isInLobby, roomCode, isReady, toggleReady, players } = useLobby(socket ?? null, mode);

  const effectiveRoomCode = externalRoomCode ?? roomCode;
  const effectiveIsReady = externalIsReady ?? isReady;
  const effectiveToggleReady = externalSetIsReady ?? toggleReady;
  const effectivePlayersCount = externalPlayersCount ?? players.length;

  const playersNeeded = modeConfig.playerCount - effectivePlayersCount;
  const allReady = effectivePlayersCount >= 2 && effectivePlayersCount >= modeConfig.playerCount;

  return (
    <View style={styles.container}>
      <View style={styles.lobbyHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{modeConfig.title}</Text>
          <Text style={styles.headerSubtitle}>{modeConfig.subtitle}</Text>
        </View>
        <View style={[styles.connectionBadge, !isConnected && styles.connectionBadgeDisconnected]}>
          <Ionicons 
            name={isConnected ? "wifi" : "wifi-outline"} 
            size={16} 
            color={isConnected ? "#4CAF50" : "#FFC107"} 
          />
          <Text style={[styles.connectionText, !isConnected && styles.connectionTextDisconnected]}>
            {isConnected ? "Live" : "Connecting..."}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.lobbyScroll}
        contentContainerStyle={[styles.lobbyContent, needsScroll && styles.lobbyContentScrollable]}
        showsVerticalScrollIndicator={false}
      >
        {effectiveRoomCode && (
          <View style={styles.roomCodeCard}>
            <View style={styles.roomCodeContent}>
              <Text style={styles.roomCodeLabel}>Room Code</Text>
              <Text style={styles.roomCodeValue}>{effectiveRoomCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={onCopyRoomCode}>
              <Ionicons name="copy-outline" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>
            Players ({effectivePlayersCount}/{modeConfig.playerCount})
          </Text>
          <View style={styles.playersGrid}>
            {displayPlayers && displayPlayers.length > 0 ? (
              <>
                <PlayerCard
                  player={displayPlayers[0]}
                  isOwn={true}
                  avatarEmoji={displayPlayers[0] ? getAvatarEmoji(displayPlayers[0].avatar) : undefined}
                  pingColor={getPingColor}
                  pingIcon={getPingIcon}
                />
                
                {[...Array(modeConfig.playerCount - 1)].map((_, idx) => {
                  const slotIndex = idx + 1;
                  const player = displayPlayers[slotIndex];
                  
                  if (player) {
                    return (
                      <PlayerCard
                        key={`player-${slotIndex}`}
                        player={player}
                        avatarEmoji={getAvatarEmoji(player.avatar)}
                        pingColor={getPingColor}
                        pingIcon={getPingIcon}
                      />
                    );
                  }
                  
                  return (
                    <PlayerCard
                      key={`empty-${slotIndex}`}
                      slotIndex={slotIndex}
                    />
                  );
                })}
              </>
            ) : (
              <>
                <PlayerCard
                  isOwn={true}
                  slotIndex={0}
                />
                {[...Array(modeConfig.playerCount - 1)].map((_, idx) => (
                  <PlayerCard
                    key={`empty-${idx + 1}`}
                    slotIndex={idx + 1}
                  />
                ))}
              </>
            )}
          </View>
        </View>

        <View style={styles.statusSection}>
          {isGameStarting ? (
            <View style={styles.readyStatus}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.readyStatusText}>Initializing game...</Text>
            </View>
          ) : playersNeeded > 0 ? (
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

        {effectiveToggleReady && (
          <TouchableOpacity
            style={[styles.readyButton, effectiveIsReady && styles.readyButtonActive]}
            onPress={() => effectiveToggleReady(!effectiveIsReady)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={effectiveIsReady ? 'checkmark-circle' : 'hand-right'}
              size={24}
              color={effectiveIsReady ? '#0f4d0f' : '#FFD700'}
            />
            <Text style={[styles.readyButtonText, effectiveIsReady && styles.readyButtonTextActive]}>
              {effectiveIsReady ? "I'm Ready!" : 'Click When Ready'}
            </Text>
          </TouchableOpacity>
        )}

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
  connectionBadgeDisconnected: {
    backgroundColor: 'rgba(255,193,7,0.2)',
  },
  connectionText: { color: '#4CAF50', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  connectionTextDisconnected: { color: '#FFC107' },
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