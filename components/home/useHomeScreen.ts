/**
 * useHomeScreen Hook
 * Custom hook for HomeScreen state management and handlers
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { usePlayerProfile, AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { GameModeOption } from './PlayOnlineMenu';

export interface HomeScreenHandlers {
  handleCpuGame: () => void;
  handlePlayOnline: () => void;
  navigateToGameMode: (mode: GameModeOption) => void;
  handlePrivateRoom: () => void;
  handleTournament: () => void;
  handleProfile: () => void;
  handleEditProfile: () => void;
  handleFriends: () => void;
  handleSearchPlayers: () => void;
  handleLogout: () => Promise<void>;
  handleLogoutConfirm: () => Promise<void>;
  handleLogoutCancel: () => void;
  handleSignIn: () => void;
  handleMenuItem: (route: string) => void;
}

export interface HomeScreenState {
  // Modal visibility
  notificationPanelVisible: boolean;
  setNotificationPanelVisible: (visible: boolean) => void;
  searchModalVisible: boolean;
  setSearchModalVisible: (visible: boolean) => void;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;

  // Play Online menu
  playOnlineMenuVisible: boolean;
  setPlayOnlineMenuVisible: (visible: boolean) => void;

  // Logout confirmation
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;

  // Data
  unreadCount: number;

  // Computed
  currentAvatar: { id: string; emoji: string };
  winRate: number;

  // Profile data
  profile: any;
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useHomeScreen(): HomeScreenState & HomeScreenHandlers {
  const router = useRouter();
  
  // Profile & Auth
  const { profile, isLoading } = usePlayerProfile();
  const { user, isAuthenticated, logout } = useAuth();
  
  // Notification state
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const { unreadCount } = useNotifications();
  
  // Search modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  
  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Play Online menu state
  const [playOnlineMenuVisible, setPlayOnlineMenuVisible] = useState(false);
  
  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Computed values
  const displayAvatarId = profile.avatar;
  const currentAvatar = useMemo(() =>
    AVATAR_OPTIONS.find(a => a.id === displayAvatarId) || AVATAR_OPTIONS[0],
    [displayAvatarId]
  );
  
  const winRate = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;
  
  // Handlers
  const handleCpuGame = () => {
    setMenuVisible(false);
    router.push('/cpu-game' as any);
  };
  
  // Unified Play Online handler - opens the game mode selection page
  const handlePlayOnline = () => {
    setMenuVisible(false);
    router.push('/game-modes' as any);
  };
  
  // Navigate to specific game mode from Play Online menu
  // Route ALL modes to /online-play (the unified lobby)
  // Use replace() to prevent back navigation which blocks game UI
  const navigateToGameMode = (mode: GameModeOption) => {
    setPlayOnlineMenuVisible(false);
    // Use replace instead of push to prevent back button from blocking game UI
    router.replace(`/online-play?mode=${mode}` as any);
  };
  
  const handlePrivateRoom = () => {
    setMenuVisible(false);
    router.push('/private-room' as any);
  };
  
  const handleTournament = () => {
    setMenuVisible(false);
    // Navigate to tournament mode using unified online-play screen
    // Use replace to prevent back button from blocking game UI
    router.replace('/online-play?mode=tournament' as any);
  };
  
  const handleProfile = () => {
    setMenuVisible(false);
    // Navigate to the current user's public profile page
    const userId = user?._id;
    if (userId) {
      router.push(`/user/${userId}` as any);
    } else {
      // Fallback to old profile page if no user ID
      router.push('/profile' as any);
    }
  };

  // Navigate to editable profile page (for settings)
  const handleEditProfile = () => {
    setMenuVisible(false);
    router.push('/profile' as any);
  };
  
  const handleFriends = () => {
    setMenuVisible(false);
    router.push('/friends' as any);
  };
  
  const handleSearchPlayers = () => {
    setMenuVisible(false);
    setSearchModalVisible(true);
  };
  
  const handleLogoutConfirm = async () => {
    // Show the logout confirmation modal
    setShowLogoutConfirm(true);
  };
  
  const handleLogout = async () => {
    // Close both the menu and confirmation modal
    setMenuVisible(false);
    setShowLogoutConfirm(false);
    await logout();
  };
  
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };
  
  const handleSignIn = () => {
    setMenuVisible(false);
    router.push('/auth/login' as any);
  };
  
  const handleMenuItem = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };
  
  return {
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
    user,
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
  };
}

export default useHomeScreen;
