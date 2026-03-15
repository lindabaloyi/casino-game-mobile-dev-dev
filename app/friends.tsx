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
          >
            {/* Pending Requests (received) */}
            {pendingRequests.length > 0 && (
              <View style={styles.requestSection}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {pendingRequests.map((request) => (
                  <View key={request._id} style={styles.requestItem}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestEmoji}>
                        {request.fromUser?.avatar ? 
                          request.fromUser.avatar : '👤'}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.fromUser?.username}</Text>
                      <Text style={styles.requestTime}>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.acceptButton]}
                        onPress={() => acceptRequest(request._id)}
                      >
                        <Ionicons name="checkmark" size={18} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.declineButton]}
                        onPress={() => declineRequest(request._id)}
                      >
                        <Ionicons name="close" size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <View style={styles.requestSection}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {sentRequests.map((request) => (
                  <View key={request._id} style={styles.requestItem}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestEmoji}>
                        {request.toUser?.avatar ? 
                          request.toUser.avatar : '👤'}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.toUser?.username}</Text>
                      <Text style={styles.requestTime}>Pending</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.cancelButton]}
                      onPress={() => cancelRequest(request._id)}
                    >
                      <Ionicons name="time" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-open-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>No pending requests</Text>
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
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Find Players
          </Text>
        </TouchableOpacity>
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
    backgroundColor: '#0f4d0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1a5c1a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a5c1a',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFD700',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFD700',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  requestsContainer: {
    flex: 1,
  },
  requestSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestEmoji: {
    fontSize: 22,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  requestTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
