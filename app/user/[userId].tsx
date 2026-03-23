/**
 * UserProfilePage
 * Displays another user's public profile with friend actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../hooks/useFriends';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

interface UserProfileData {
  user: {
    _id: string;
    username: string;
    avatar: string;
    createdAt: string;
  };
  profile: {
    bio: string;
    favoriteGameMode: string;
  };
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
  };
  rank: number | null;
}

export const options = {
  headerShown: false,
};

export default function UserProfilePage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { user: currentUser } = useAuth();
  const { friends, sendRequest, pendingRequests, sentRequests } = useFriends();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'pending' | 'sent'>('none');
  const [actionLoading, setActionLoading] = useState(false);

  const screenHeight = height;
  const needsScroll = screenHeight < 650;
  const scaleFactor = width < 380 ? 0.85 : 1;
  const avatarSize = Math.round(70 * scaleFactor);
  const titleSize = Math.round(28 * scaleFactor);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    checkFriendStatus();
  }, [userId, friends, pendingRequests]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/profile/${userId}`);
      
      if (!response.ok) {
        throw new Error('User not found');
      }

      const data = await response.json();
      console.log('[UserProfilePage] Fetched profile data:', JSON.stringify(data));
      if (!data.success) {
        throw new Error(data.error || 'Failed to load profile');
      }
      setProfileData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const checkFriendStatus = async () => {
    if (!userId || !currentUser?._id) {
      setFriendStatus('none');
      return;
    }

    // Check if already friends
    const isFriend = friends.some(f => f._id === userId);
    if (isFriend) {
      setFriendStatus('friends');
      return;
    }

    // Check pending requests
    const isPendingIncoming = pendingRequests.some((r: any) => r.fromUser?._id === userId);
    const isPendingOutgoing = sentRequests.some((r: any) => r.toUser?._id === userId);

    if (isPendingIncoming || isPendingOutgoing) {
      setFriendStatus('pending');
    } else {
      setFriendStatus('none');
    }
  };

  const handleAddFriend = async () => {
    if (!userId) return;

    setActionLoading(true);
    const result = await sendRequest(userId);
    setActionLoading(false);

    if (result.success) {
      setFriendStatus('pending');
    }
  };

  // Debug: log avatar options
  console.log('[UserProfilePage] AVATAR_OPTIONS:', JSON.stringify(AVATAR_OPTIONS));
  
  const getAvatarEmoji = (avatarId: string) => {
    console.log('[UserProfilePage] getAvatarEmoji called with avatarId:', avatarId);
    // Handle external avatar URLs (e.g., from ui-avatars.com)
    if (avatarId && avatarId.startsWith('http')) {
      console.log('[UserProfilePage] External avatar URL detected, using default');
      return '👤';
    }
    // Handle local avatar IDs
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    console.log('[UserProfilePage] Found avatar:', avatar);
    return avatar?.emoji || '👤';
  };

  const getLevel = (totalGames: number): { level: number; title: string } => {
    if (totalGames < 10) return { level: 1, title: 'Newcomer' };
    if (totalGames < 50) return { level: 2, title: 'Regular' };
    if (totalGames < 100) return { level: 3, title: 'Veteran' };
    if (totalGames < 250) return { level: 4, title: 'Expert' };
    if (totalGames < 500) return { level: 5, title: 'Master' };
    return { level: 6, title: 'Legend' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (error || !profileData) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || 'User not found'}</Text>
      </View>
    );
  }

  const winRate = profileData.stats.totalGames > 0
    ? Math.round((profileData.stats.wins / profileData.stats.totalGames) * 100)
    : 0;

  const levelInfo = getLevel(profileData.stats.totalGames);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          needsScroll && styles.scrollContentScrollable,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
            <Text style={{ fontSize: avatarSize * 0.8 }}>{getAvatarEmoji(profileData.user.avatar)}</Text>
          </View>
        </View>

        {/* Username */}
        <Text style={[styles.username, { fontSize: titleSize }]}>{profileData.user.username}</Text>

        {/* Level Badge */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv.{levelInfo.level} {levelInfo.title}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: 22 }]}>{profileData.stats.totalGames}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: 22, color: '#4CAF50' }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: 22, color: '#FFD700' }]}>#{profileData.rank || '-'}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>
        </View>

        {/* Win/Loss Stats */}
        <View style={styles.winLossSection}>
          <View style={styles.winItem}>
            <Text style={styles.winValue}>{profileData.stats.wins}</Text>
            <Text style={styles.winLabel}>Wins</Text>
          </View>
          <View style={styles.lossItem}>
            <Text style={styles.lossValue}>{profileData.stats.losses}</Text>
            <Text style={styles.lossLabel}>Losses</Text>
          </View>
        </View>

        {/* Member Since */}
        <Text style={styles.memberSince}>Member since {formatDate(profileData.user.createdAt)}</Text>

        {/* Debug info - remove in production */}
        {(!currentUser?._id || currentUser._id === userId) && (
          <View style={{padding: 10, backgroundColor: 'rgba(255,0,0,0.3)', marginBottom: 10}}>
            <Text style={{color: 'white', fontSize: 12}}>
              Debug: currentUser={currentUser?._id || 'null'}, userId={userId}
            </Text>
            <Text style={{color: 'white', fontSize: 12}}>
              Status: {friendStatus}
            </Text>
          </View>
        )}

        {/* Friend Action Button */}
        {currentUser?._id && currentUser._id !== userId && (
          <View style={styles.actionContainer}>
            {friendStatus === 'none' && (
              <TouchableOpacity
                style={styles.addFriendButton}
                onPress={handleAddFriend}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#0f4d0f" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#0f4d0f" />
                    <Text style={styles.addFriendText}>Add Friend</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {friendStatus === 'pending' && (
              <View style={styles.pendingContainer}>
                <Ionicons name="time" size={20} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.pendingText}>Request Pending</Text>
              </View>
            )}

            {friendStatus === 'friends' && (
              <View style={styles.friendsContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.friendsText}>Friends</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  scrollContentScrollable: {
    paddingVertical: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  username: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  levelText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  winLossSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },
  winItem: {
    alignItems: 'center',
  },
  winValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  winLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  lossItem: {
    alignItems: 'center',
  },
  lossValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
  },
  lossLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  memberSince: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 200,
  },
  addFriendButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendText: {
    color: '#0f4d0f',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  pendingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginLeft: 8,
  },
  friendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  friendsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
