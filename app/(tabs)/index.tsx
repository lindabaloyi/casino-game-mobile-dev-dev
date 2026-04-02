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
  PlayOnlineMenu,
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

    // Play Online menu
    playOnlineMenuVisible,
    setPlayOnlineMenuVisible,

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
    isLoading,
    isAuthenticated,
    
    // Handlers
    handleCpuGame,
    handlePlayOnline,
    navigateToGameMode,
    handlePrivateRoom,
    handleTournament,
    handleProfile,
    handleEditProfile,
    handleFriends,
    handleSearchPlayers,
    handleLogout,
    handleLogoutConfirm,
    handleLogoutCancel,
    handleSignIn,
    handleMenuItem,
  } = useHomeScreen();

  // Build menu items for the drawer
  const menuItems = [
    { label: 'Profile', icon: 'person', onPress: handleEditProfile },
    { label: 'Stats', icon: 'stats-chart', onPress: () => handleMenuItem('/stats') },
    { label: 'Tournaments', icon: 'trophy', onPress: handleTournament },
    { label: 'Friends', icon: 'people', onPress: handleFriends },
    { label: 'Leaderboards', icon: 'medal', onPress: () => handleMenuItem('/leaderboards') },
    { label: 'Learn', icon: 'school', onPress: () => handleMenuItem('/learn') },
    { label: 'Rules', icon: 'book', onPress: () => handleMenuItem('/rules') },
    { label: 'Search', icon: 'search', onPress: handleSearchPlayers },
  ];

  // Responsive calculations
  const screenHeight = height;
  const needsScroll = screenHeight < 600;
  
  // Responsive title sizing
  const isSmallScreen = width < 380;
  const titleSize = isSmallScreen ? 42 : 52;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
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

      {/* Play Online Menu */}
      <PlayOnlineMenu
        visible={playOnlineMenuVisible}
        onClose={() => setPlayOnlineMenuVisible(false)}
        onSelectMode={navigateToGameMode}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Casino</Text>
          <Text style={styles.subtitle}>Card Game</Text>
        </View>

        {/* Game Buttons */}
        <GameButtons
          onCpuGame={handleCpuGame}
          onPlayOnline={handlePlayOnline}
          onPrivateRoom={handlePrivateRoom}
          onTournament={handleTournament}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4a1a',
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
    color: '#f5c842',
    fontSize: 52,
    letterSpacing: -0.01,
  },
  subtitle: {
    fontWeight: '400',
    color: '#8fba6a',
    fontSize: 18,
    marginTop: 6,
  },
});
