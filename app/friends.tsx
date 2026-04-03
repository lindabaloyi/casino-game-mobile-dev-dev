/**
 * Friends Screen
 * Displays friends list, pending requests, and allows sending friend requests
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../hooks/useFriends';
import { useUserSearch } from '../hooks/useUserSearch';
import { FriendsList } from '../components/friends/FriendsList';
import { PlayerSearch } from '../components/friends/PlayerSearch';
import { AVATAR_OPTIONS } from '../hooks/usePlayerProfile';

// Helper to get avatar emoji from local avatar ID
const getAvatarEmoji = (avatarId: string | undefined) => {
  if (!avatarId) return null;
  const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
  return avatar?.emoji || null;
};

// In-game color scheme - matching leaderboards.tsx
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 215, 0, 0.3)',
};

type TabType = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const { 
    friends, 
    pendingRequests, 
    sentRequests,
    acceptRequest, 
    declineRequest, 
    cancelRequest,
    removeFriend,
    isLoading,
    refresh 
  } = useFriends();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <FriendsList 
            onFriendPress={(friendId) => router.push(`/user/${friendId}` as any)} 
          />
        );
      case 'requests':
        return (
          <ScrollView 
            style={styles.requestsContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Incoming Requests Section */}
            <View style={styles.requestSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="arrow-down-circle" size={18} color="#4CAF50" />
                  <Text style={styles.sectionTitle}>Incoming Requests</Text>
                </View>
                {pendingRequests.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </View>
              
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request, index) => (
                  <View key={request._id} style={[styles.requestItem, index === 0 && styles.requestItemFirst]}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestEmoji}>
                        {getAvatarEmoji(request.fromUser?.avatar)}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.fromUser?.username}</Text>
                      <View style={styles.requestMeta}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.requestTime}>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.acceptButton]}
                        onPress={() => acceptRequest(request._id)}
                      >
                        <Ionicons name="checkmark" size={20} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.declineButton]}
                        onPress={() => declineRequest(request._id)}
                      >
                        <Ionicons name="close" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptySection}>
                  <Ionicons name="people-outline" size={36} color="rgba(255, 255, 255, 0.2)" />
                  <Text style={styles.emptySectionText}>No incoming requests</Text>
                  <Text style={styles.emptySectionSubtext}>When someone sends you a friend request, it will appear here</Text>
                </View>
              )}
            </View>

            {/* Outgoing Requests Section */}
            <View style={styles.requestSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="arrow-up-circle" size={18} color="#FFD700" />
                  <Text style={styles.sectionTitle}>Sent Requests</Text>
                </View>
                {sentRequests.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{sentRequests.length}</Text>
                  </View>
                )}
              </View>
              
              {sentRequests.length > 0 ? (
                sentRequests.map((request, index) => (
                  <View key={request._id} style={[styles.requestItem, index === 0 && styles.requestItemFirst]}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestEmoji}>
                        {getAvatarEmoji(request.toUser?.avatar)}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.toUser?.username}</Text>
                      <View style={styles.requestMeta}>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                        <Text style={styles.requestTime}>
                          • {new Date(request.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.cancelButton]}
                      onPress={() => cancelRequest(request._id)}
                    >
                      <Ionicons name="close-circle" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptySection}>
                  <Ionicons name="paper-plane-outline" size={36} color="rgba(255, 255, 255, 0.2)" />
                  <Text style={styles.emptySectionText}>No sent requests</Text>
                  <Text style={styles.emptySectionSubtext}>Friend requests you send will appear here</Text>
                </View>
              )}
            </View>

            {/* Summary Footer */}
            {(pendingRequests.length > 0 || sentRequests.length > 0) && (
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryText}>
                  {pendingRequests.length + sentRequests.length} total request{pendingRequests.length + sentRequests.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </ScrollView>
        );
      case 'search':
        return (
          <PlayerSearch 
            onUserPress={(userId) => router.push(`/user/${userId}` as any)} 
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>FRIENDS</Text>
          <Text style={styles.headerSub}>Card Game Connections</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsContent}>
          {(['friends', 'requests', 'search'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'friends' ? `Friends (${friends.length})` : 
                 tab === 'requests' ? `Requests (${pendingRequests.length})` : 
                 'Find Players'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}15`,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tabsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
    backgroundColor: `${COLORS.background}66`,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  requestsContainer: {
    flex: 1,
  },
  requestSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  requestEmoji: {
    fontSize: 20,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  requestTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  requestItemFirst: {
    marginTop: 0,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySectionSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryFooter: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
});
