/**
 * NotificationPanel Component
 * Slide-in panel showing friend requests and notifications
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFriends, FriendRequest } from '../../hooks/useFriends';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { 
    pendingRequests,
    sentRequests,
    acceptRequest, 
    declineRequest,
    refresh
  } = useFriends();
  
  const {
    notifications,
    markAsRead,
    markAllAsRead
  } = useNotifications(refresh);

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '👤';
  };

  const handleAccept = async (requestId: string) => {
    await acceptRequest(requestId);
  };

  const handleDecline = async (requestId: string) => {
    await declineRequest(requestId);
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.fromUser?._id) {
      router.push(`/user/${notification.fromUser._id}` as any);
      onClose();
    }
  };

  const renderFriendRequest = (request: FriendRequest) => {
    const user = request.isIncoming ? request.fromUser : request.toUser;
    if (!user) return null;

    return (
      <View key={request._id} style={styles.requestItem}>
        <TouchableOpacity
          style={styles.requestUserInfo}
          onPress={() => {
            router.push(`/user/${user._id}` as any);
            onClose();
          }}
        >
          <View style={styles.requestAvatar}>
            <Text style={styles.requestAvatarText}>{getAvatarEmoji(user.avatar)}</Text>
          </View>
          <View style={styles.requestTextContainer}>
            <Text style={styles.requestUsername}>{user.username}</Text>
            <Text style={styles.requestAction}>
              {request.isIncoming ? 'wants to be friends' : 'pending'}
            </Text>
          </View>
        </TouchableOpacity>

        {request.isIncoming && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(request._id)}
            >
              <Ionicons name="checkmark" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDecline(request._id)}
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderNotification = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={
            notification.type === 'friend_accepted'
              ? 'person-add'
              : notification.type === 'friend_removed'
              ? 'person-remove'
              : 'person'
          }
          size={20}
          color={notification.type === 'friend_accepted' ? '#4CAF50' : 'white'}
        />
      </View>
      <Text style={styles.notificationText}>{notification.message}</Text>
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const hasContent = pendingRequests.length > 0 || notifications.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Mark all as read */}
          {notifications.some(n => !n.read) && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Friend Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                {pendingRequests.map(renderFriendRequest)}
              </View>
            )}

            {/* Sent Requests */}
            {sentRequests && sentRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {sentRequests.map(renderFriendRequest)}
              </View>
            )}

            {/* Notifications Section */}
            {notifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {notifications.map(renderNotification)}
              </View>
            )}

            {/* Empty State */}
            {!hasContent && (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    width: 320,
    backgroundColor: '#1a5c1a',
    height: '100%',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  markAllText: {
    color: '#FFD700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 20,
  },
  requestTextContainer: {
    flex: 1,
  },
  requestUsername: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  requestAction: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadNotification: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    color: 'white',
    fontSize: 13,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 12,
  },
});

export default NotificationPanel;
