/**
 * FriendsList Component
 * Displays the user's friends list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFriends, Friend } from '../../hooks/useFriends';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

// In-game color scheme - matching leaderboards.tsx
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(255, 215, 0, 0.3)',
};

interface FriendsListProps {
  onFriendPress?: (friendId: string) => void;
}

export function FriendsList({ onFriendPress }: FriendsListProps) {
  const router = useRouter();
  const { friends, removeFriend, isLoading } = useFriends();

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '👤';
  };

  const handleFriendPress = (friend: Friend) => {
    if (onFriendPress) {
      onFriendPress(friend._id);
    } else {
      router.push(`/user/${friend._id}` as any);
    }
  };

  const handleRemoveFriend = async (friendId: string, e: any) => {
    e.stopPropagation();
    await removeFriend(friendId);
  };

  const renderFriend = ({ item, index }: { item: Friend; index: number }) => {
    const winRate = item.stats?.totalGames > 0
      ? Math.round((item.stats.wins / item.stats.totalGames) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleFriendPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(item.avatar)}</Text>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>{item.username}</Text>
          <View style={styles.friendStats}>
            <Text style={styles.friendStatText}>
              {item.stats?.totalGames || 0} games · {winRate}% wins
            </Text>
            {item.stats?.rank && (
              <Text style={styles.friendRank}>#{item.stats.rank}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={(e) => handleRemoveFriend(item._id, e)}
        >
          <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (friends.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyText}>No friends yet</Text>
        <Text style={styles.emptySubtext}>
          Search for players to add friends!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friends}
      renderItem={renderFriend}
      keyExtractor={(item) => item._id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendStatText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  friendRank: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});

export default FriendsList;
