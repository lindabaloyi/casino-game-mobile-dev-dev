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

  const renderFriend = ({ item }: { item: Friend }) => {
    const winRate = item.stats?.totalGames > 0
      ? Math.round((item.stats.wins / item.stats.totalGames) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleFriendPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(item.avatar)}</Text>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>{item.username}</Text>
          <View style={styles.friendStats}>
            <Text style={styles.friendStatText}>
              {item.stats?.totalGames || 0} games • {winRate}% wins
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
          <Ionicons name="close-circle" size={24} color="rgba(255, 255, 255, 0.4)" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (friends.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendStatText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  friendRank: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 4,
  },
});

export default FriendsList;
