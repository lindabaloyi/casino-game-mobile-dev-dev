import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerProfile, AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';
import { useAuth } from '../../hooks/useAuth';

export const options = {
  headerShown: false,
};

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  action?: string;
}

const menuItems: MenuItem[] = [
  { label: 'Play', icon: 'play', route: '/multiplayer' },
  { label: 'Learn', icon: 'book', route: '/explore' },
  { label: 'Search', icon: 'search', route: '/explore' },
  { label: 'Settings', icon: 'settings', route: '/explore' },
];

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const screenHeight = height;
  const screenWidth = width;
  
  // Responsive scaling factors for smaller devices
  const isSmallScreen = screenHeight < 600 || screenWidth < 360;
  const isMediumScreen = screenHeight >= 600 && screenHeight < 700;
  
  const menuScale = isSmallScreen ? 0.75 : isMediumScreen ? 0.85 : 1;
  const iconScale = isSmallScreen ? 0.8 : isMediumScreen ? 0.9 : 1;
  
  const [menuVisible, setMenuVisible] = useState(false);
  
  const needsScroll = screenHeight < 600;
  const scaleFactor = width < 380 ? 0.8 : width < 480 ? 0.95 : 1.05;
  
  const titleSize = Math.round(42 * scaleFactor);
  const subtitleSize = Math.round(24 * scaleFactor);
  const buttonFontSize = Math.round(16 * scaleFactor);
  const avatarSize = Math.round(38 * scaleFactor);
  const iconSize = Math.round(20 * scaleFactor);
  
  // Menu-specific responsive values
  const menuIconSize = Math.round(16 * iconScale);
  const menuTextSize = Math.round(13 * iconScale);
  const menuAvatarSize = Math.round(40 * menuScale);
  const menuItemMinHeight = Math.max(36, Math.round(40 * menuScale));
  const menuDrawerWidth = Math.round(260 * menuScale);
  
  const router = useRouter();
  const { profile, isLoading } = usePlayerProfile();
  const { user, isAuthenticated, logout } = useAuth();
  
  // Use auth user if logged in, otherwise use local profile
  const displayName = isAuthenticated && user ? user.username : profile.username;
  const displayAvatarId = isAuthenticated && user ? user.avatar : profile.avatar;
  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === displayAvatarId) || AVATAR_OPTIONS[0];
  const winRate = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;

  // Auth menu item based on authentication status
  const authMenuItem: MenuItem | null = isAuthenticated 
    ? { label: 'Sign Out', icon: 'log-out', route: '', action: 'logout' }
    : { label: 'Sign In', icon: 'log-in', route: '/auth/login', action: 'login' };

  const handleCpuGame = () => {
    setMenuVisible(false);
    router.push('/cpu-game' as any);
  };
  
  const handleMultiplayer = () => {
    setMenuVisible(false);
    router.push('/multiplayer' as any);
  };

  const handlePrivateRoom = () => {
    setMenuVisible(false);
    router.push('/private-room' as any);
  };

  const handlePartyMode = () => {
    setMenuVisible(false);
    router.push('/party-game' as any);
  };

  const handleProfile = () => {
    setMenuVisible(false);
    router.push('/profile' as any);
  };

  const handleMenuItem = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
  };

  // Dynamic styles based on screen size - simplified
  const menuStyles = {
    menuDrawer: {
      width: menuDrawerWidth,
      backgroundColor: '#1a5c1a',
      paddingTop: 45,
      paddingHorizontal: 16,
    } as const,
    menuTitle: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: '#FFD700',
    } as const,
    menuProfile: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 10,
      marginBottom: 12,
    } as const,
    menuAvatar: {
      backgroundColor: 'rgba(255, 215, 0, 0.2)',
      borderRadius: menuAvatarSize / 2,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 8,
      width: menuAvatarSize,
      height: menuAvatarSize,
    } as const,
    menuAvatarText: {
      fontSize: menuAvatarSize * 0.5,
    } as const,
    menuProfileName: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold' as const,
    } as const,
    menuProfileStats: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 11,
    } as const,
    menuDivider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      marginBottom: 14,
    } as const,
    menuItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginBottom: 3,
      minHeight: 40,
    } as const,
    menuItemText: {
      color: 'white',
      fontSize: 14,
      marginLeft: 10,
    } as const,
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Burger Menu Button */}
      <TouchableOpacity 
        style={styles.menuButton} 
        onPress={() => setMenuVisible(true)}
      >
        <Ionicons name="menu" size={26} color="white" />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          needsScroll && styles.scrollContentScrollable,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard} 
          onPress={handleProfile}
          activeOpacity={0.7}
        >
          <View style={styles.profileLeft}>
            <View style={[
              styles.avatarContainer,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            ]}>
              <Text style={{ fontSize: avatarSize * 0.55 }}>{currentAvatar.emoji}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile.username}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>W: {profile.wins}</Text>
                </View>
                <View style={[styles.statBadge, styles.lossBadge]}>
                  <Text style={styles.statBadgeText}>L: {profile.losses}</Text>
                </View>
                <View style={[styles.statBadge, styles.winRateBadge]}>
                  <Text style={styles.statBadgeText}>{winRate}%</Text>
                </View>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
        </TouchableOpacity>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Casino</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Card Game</Text>
        </View>

        {/* Button Container */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCpuGame}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={iconSize} color="white" />
            <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Vs AI</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleMultiplayer}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={iconSize} color="white" />
            <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Multiplayer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.privateRoomButton} 
            onPress={handlePrivateRoom}
            activeOpacity={0.7}
          >
            <Ionicons name="key" size={iconSize + 2} color="#0f4d0f" />
            <Text style={[styles.privateRoomButtonText, { fontSize: buttonFontSize + 2 }]}>
              Private Room
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handlePartyMode}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={iconSize} color="white" />
            <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Party Mode</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Side Menu Modal */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable 
          style={styles.menuOverlay} 
          onPress={() => setMenuVisible(false)}
        >
          <Pressable 
            style={[styles.menuDrawer, menuStyles.menuDrawer]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <View style={styles.menuHeader}>
              <Text style={menuStyles.menuTitle}>Menu</Text>
              <TouchableOpacity 
                onPress={() => setMenuVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Profile in Menu */}
            <TouchableOpacity 
              style={menuStyles.menuProfile} 
              onPress={handleProfile}
              activeOpacity={0.7}
            >
              <View style={menuStyles.menuAvatar}>
                <Text style={menuStyles.menuAvatarText}>{currentAvatar.emoji}</Text>
              </View>
              <View style={styles.menuProfileInfo}>
                <Text style={menuStyles.menuProfileName}>{profile.username}</Text>
                <Text style={menuStyles.menuProfileStats}>
                  {profile.wins}W - {profile.losses}L
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>

            <View style={menuStyles.menuDivider} />

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={menuStyles.menuItem}
                  onPress={() => item.action === 'logout' ? handleLogout() : handleMenuItem(item.route)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={menuIconSize} color="white" />
                  <Text style={menuStyles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              {/* Auth Sign In/Out Item */}
              {authMenuItem && (
                <TouchableOpacity
                  style={menuStyles.menuItem}
                  onPress={() => authMenuItem.action === 'logout' ? handleLogout() : handleMenuItem(authMenuItem.route)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={authMenuItem.icon as any} size={menuIconSize} color="white" />
                  <Text style={menuStyles.menuItemText}>{authMenuItem.label}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom removed - Profile accessible via menu item */}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 70,
    paddingHorizontal: 16,
    minHeight: '100%',
  },
  scrollContentScrollable: {
    paddingVertical: 50,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  profileCard: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 10,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  statBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  lossBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  winRateBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  statBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  subtitle: {
    fontWeight: '300',
    color: 'white',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  privateRoomButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  privateRoomButtonText: {
    color: '#0f4d0f',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  menuDrawer: {
    backgroundColor: '#1a5c1a',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuProfileInfo: {
    flex: 1,
  },
  menuItems: {
    flex: 1,
  },
});
