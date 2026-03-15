/**
 * HomeMenuModal Component
 * Slide-in menu drawer for HomeScreen
 */

import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TouchableOpacity, 
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuItem {
  label: string;
  icon: any; // Ionicons icon name
  onPress: () => void;
}

interface HomeMenuModalProps {
  visible: boolean;
  onClose: () => void;
  profile: {
    username: string;
    wins: number;
    losses: number;
  };
  currentAvatar: {
    id: string;
    emoji: string;
  };
  isAuthenticated: boolean;
  onLogout: () => Promise<void>;
  menuItems: MenuItem[];
}

export function HomeMenuModal({ 
  visible, 
  onClose, 
  profile, 
  currentAvatar,
  isAuthenticated,
  onLogout,
  menuItems,
}: HomeMenuModalProps) {
  const { width } = useWindowDimensions();
  const menuDrawerWidth = width < 380 ? 208 : 260;
  const avatarSize = 40;

  const authMenuItem = isAuthenticated 
    ? { label: 'Sign Out', icon: 'log-out' as const, onPress: onLogout }
    : { label: 'Sign In', icon: 'log-in' as const, onPress: () => {} };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={onClose}
      >
        <Pressable 
          style={[
            styles.drawer,
            { width: menuDrawerWidth }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Menu</Text>
            <TouchableOpacity 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Profile */}
          <TouchableOpacity 
            style={styles.profile} 
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={[
              styles.avatar,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
            ]}>
              <Text style={styles.avatarText}>{currentAvatar.emoji}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.username}</Text>
              <Text style={styles.profileStats}>
                {profile.wins}W - {profile.losses}L
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.5)" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.itemsContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={16} color="white" />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Auth Item */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={authMenuItem.onPress}
              activeOpacity={0.7}
            >
              <Ionicons name={authMenuItem.icon} size={16} color="white" />
              <Text style={styles.menuItemText}>{authMenuItem.label}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  drawer: {
    backgroundColor: '#1a5c1a',
    paddingTop: 45,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileStats: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 14,
  },
  itemsContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 3,
    minHeight: 40,
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
  },
});

export default HomeMenuModal;
