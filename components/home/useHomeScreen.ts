/**
 * useHomeScreen Hook
 * Custom hook for HomeScreen state management and handlers
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { usePlayerProfile, AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

export interface HomeScreenHandlers {
  handleCpuGame: () => void;
  handleMultiplayer: () => void;
  handlePrivateRoom: () => void;
  handlePartyMode: () => void;
  handleProfile: () => void;
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
  
  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Computed values
  const displayAvatarId = isAuthenticated && user ? user.avatar : profile.avatar;
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
    handleMenuItem,
  };
}

export default useHomeScreen;
