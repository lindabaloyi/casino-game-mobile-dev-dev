/**
 * HomeScreen
 * Main entry screen for the casino game app
 * Now refactored to use separate components for better separation of concerns
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { 
  useHomeScreen,
  HeaderButtons,
  ProfileCard,
  GameButtons,
  SearchPlayersModal,
  HomeMenuModal,
} from '../../components/home';
import { NotificationPanel } from '../../components/friends/NotificationPanel';

export const options = {
  headerShown: false,
};

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  
  // Use custom hook for state and handlers
  const {
    // Modal state
    notificationPanelVisible,
    setNotificationPanelVisible,
    searchModalVisible,
    setSearchModalVisible,
    menuVisible,
    setMenuVisible,
    
    // Logout confirmation
    showLogoutConfirm,
    setShowLogoutConfirm,
    
    // Data
    unreadCount,
    
    // Computed
    currentAvatar,
    winRate,
    
    // Profile data
    profile,
    isAuthenticated,
    
    // Handlers
    handleCpuGame,
    handleMultiplayer,
    handlePrivateRoom,
    handlePartyMode,
    handleProfile,
    handleFriends,
    handleSearchPlayers,
    handleLogout,
    handleLogoutConfirm,
    handleLogoutCancel,
    handleSignIn,
  } = useHomeScreen();

  // Responsive calculations
  const screenHeight = height;
  const needsScroll = screenHeight < 600;
  const scaleFactor = width < 380 ? 0.8 : width < 480 ? 0.95 : 1.05;
  const titleSize = Math.round(42 * scaleFactor);
  const subtitleSize = Math.round(24 * scaleFactor);

  // Build menu items for the drawer
  const menuItems = [
    { label: 'Search Players', icon: 'search', onPress: handleSearchPlayers },
    { label: 'Friends', icon: 'people', onPress: handleFriends },
    { label: 'Vs AI', icon: 'person', onPress: handleCpuGame },
    { label: 'Multiplayer', icon: 'globe', onPress: handleMultiplayer },
    { label: 'Private Room', icon: 'key', onPress: handlePrivateRoom },
    { label: 'Party Mode', icon: 'people', onPress: handlePartyMode },
  ];

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Buttons */}
      <HeaderButtons
        onMenuPress={() => setMenuVisible(true)}
        onNotificationPress={() => setNotificationPanelVisible(true)}
        unreadCount={unreadCount}
      />

      {/* Profile Card */}
      <ProfileCard
        profile={profile}
        currentAvatar={currentAvatar}
        winRate={winRate}
        onPress={handleProfile}
      />

      {/* Notification Panel */}
      <NotificationPanel
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
      />

      {/* Search Modal */}
      <SearchPlayersModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />

      {/* Menu Modal */}
      <HomeMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        profile={profile}
        currentAvatar={currentAvatar}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onSignIn={handleSignIn}
        menuItems={menuItems}
        showLogoutConfirm={showLogoutConfirm}
        onLogoutConfirm={handleLogoutConfirm}
        onLogoutCancel={handleLogoutCancel}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          needsScroll && styles.scrollContentScrollable,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Casino</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Card Game</Text>
        </View>

        {/* Game Buttons */}
        <GameButtons
          onCpuGame={handleCpuGame}
          onMultiplayer={handleMultiplayer}
          onPrivateRoom={handlePrivateRoom}
          onPartyMode={handlePartyMode}
        />
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
});
