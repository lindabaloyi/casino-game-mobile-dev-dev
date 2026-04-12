/**
 * Profile Screen
 * User profile with avatar, username, and statistics
 * Uses in-game color scheme matching leaderboards/friends/stats
 */

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Modal,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MusicToggleButton } from '../components/ui/MusicToggleButton';
import { usePlayerProfile, AVATAR_OPTIONS, AvatarId } from '../hooks/usePlayerProfile';
import { useServerProfile } from '../hooks/useServerProfile';
import { useAuth } from '../hooks/useAuth';

// In-game color scheme - matching leaderboards/stats/friends
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',  // Gold
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(255, 215, 0, 0.3)',
};

export const options = {
  headerShown: false,
};

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const screenHeight = height;
  
  const needsScroll = screenHeight < 650;
  const scaleFactor = width < 380 ? 0.85 : 1;
  
  const titleSize = Math.round(26 * scaleFactor);
  const avatarSize = Math.round(60 * scaleFactor);
  const nameSize = Math.round(22 * scaleFactor);
  const statValueSize = Math.round(22 * scaleFactor);
  
  const router = useRouter();
  const { profile, updateUsername, updateAvatar, resetStats, isLoading: localLoading, error: localError, forceRefresh } = usePlayerProfile();
  const { profileData, isLoading: serverLoading, isRefreshing, error: serverError, refresh, forceRefresh: serverForceRefresh, hasData: serverHasData } = useServerProfile();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Force refresh on mount to get latest data from database
  useEffect(() => {
    // Call both refresh functions - they handle auth checks internally
    forceRefresh().catch(() => {});
    serverForceRefresh().catch(() => {});
  }, [forceRefresh, serverForceRefresh]);

  // Combined loading state - show loading if either source is loading
  const isLoading = localLoading || serverLoading;
  
  // Combined error - prefer server error over local error
  // Show "not logged in" message if no auth and no server data
  const error = serverError || localError || (!isAuthenticated && !serverHasData ? 'Please log in to see your profile data' : null);

  // Use server data if available, otherwise fall back to local
  const serverData = serverHasData && profileData ? {
    username: profileData.user?.username,
    avatar: profileData.profile?.avatar || profileData.user?.avatar,
    wins: profileData.stats?.wins,
    losses: profileData.stats?.losses,
    totalGames: profileData.stats?.totalGames,
  } : null;
  
  // Prefer server data when available
  const displayProfile = serverData ? serverData : profile;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === displayProfile.avatar) || AVATAR_OPTIONS[0];

  const handleSaveUsername = async () => {
    if (newUsername.trim()) {
      setIsSavingUsername(true);
      setSaveError(null);
      try {
        const success = await updateUsername(newUsername.trim());
        if (success) {
          // Refresh both caches after successful update
          await forceRefresh();
          await serverForceRefresh();
        } else {
          setSaveError('Failed to save username. Please try again.');
        }
      } catch (error) {
        setSaveError('Error saving username: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsSavingUsername(false);
      }
    }
    setIsEditingName(false);
  };

  const handleSelectAvatar = async (avatarId: AvatarId) => {
    setIsSavingAvatar(true);
    setSaveError(null);
    try {
      const success = await updateAvatar(avatarId);
      if (success) {
        // Refresh both caches after successful update
        await forceRefresh();
        await serverForceRefresh();
      } else {
        setSaveError('Failed to save avatar. Please try again.');
      }
    } catch (error) {
      setSaveError('Error saving avatar: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingAvatar(false);
    }
    setShowAvatarPicker(false);
  };

  const handleResetStats = async () => {
    const success = await resetStats();
    if (success) {
      refresh();
    }
    setShowResetConfirm(false);
  };

  const winRate = displayProfile.totalGames > 0 
    ? Math.round((displayProfile.wins / displayProfile.totalGames) * 100) 
    : 0;

  // Show loading indicator when initially loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.brandName}>PROFILE</Text>
            <Text style={styles.brandSub}>Your Account</Text>
          </View>
          
          <View style={styles.musicButtonContainer}>
            <MusicToggleButton />
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.brandName}>PROFILE</Text>
          <Text style={styles.brandSub}>Your Account</Text>
        </View>
        
        <View style={styles.musicButtonContainer}>
          <MusicToggleButton />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          needsScroll && styles.scrollContentScrollable,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Error Display */}
        {(error || saveError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || saveError}</Text>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity 
            style={[
              styles.avatarContainer,
              { width: avatarSize, height: avatarSize, opacity: isSavingAvatar ? 0.5 : 1 },
            ]}
            onPress={() => !isSavingAvatar && setShowAvatarPicker(true)}
            disabled={isSavingAvatar}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: avatarSize * 0.9 }}>{currentAvatar.emoji}</Text>
            <View style={[
              styles.editBadge,
              { width: Math.round(20 * scaleFactor), height: Math.round(20 * scaleFactor) },
            ]}>
              <Ionicons name="pencil" size={10} color={COLORS.background} />
            </View>
            {isSavingAvatar && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>

          {/* Username */}
          {isEditingName ? (
            <View style={styles.usernameEditContainer}>
              <TextInput
                style={[
                  styles.usernameInput,
                  { fontSize: nameSize },
                ]}
                value={newUsername}
                onChangeText={setNewUsername}
                maxLength={15}
                autoFocus
                onBlur={handleSaveUsername}
                onSubmitEditing={handleSaveUsername}
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.usernameContainer}
              onPress={() => {
                setNewUsername(displayProfile.username);
                setIsEditingName(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.username, { fontSize: nameSize }]}>{displayProfile.username}</Text>
              <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>🎮</Text>
              <Text style={[styles.statBoxValue, { fontSize: statValueSize }]}>
                {displayProfile.totalGames}
              </Text>
              <Text style={styles.statBoxLabel}>Games</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>🏆</Text>
              <Text style={[styles.statBoxValue, { fontSize: statValueSize, color: '#4CAF50' }]}>
                {displayProfile.wins}
              </Text>
              <Text style={styles.statBoxLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>📊</Text>
              <Text style={[styles.statBoxValueGold, { fontSize: statValueSize }]}>
                {winRate}%
              </Text>
              <Text style={styles.statBoxLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Win/Loss Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Win/Loss Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{displayProfile.wins}</Text>
                <Text style={styles.breakdownLabel}>Wins</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{displayProfile.losses}</Text>
                <Text style={styles.breakdownLabel}>Losses</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${displayProfile.totalGames > 0 ? (displayProfile.wins / displayProfile.totalGames * 100) : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.breakdownNote}>Win/Loss ratio</Text>
          </View>
        </View>

        {/* Reset Stats Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => setShowResetConfirm(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={COLORS.textMuted} />
          <Text style={styles.resetButtonText}>Reset Statistics</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map(avatar => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    displayProfile.avatar === avatar.id && styles.avatarOptionSelected
                  ]}
                  onPress={() => handleSelectAvatar(avatar.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 32 }}>{avatar.emoji}</Text>
                  <Text style={styles.avatarOptionLabel}>{avatar.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowAvatarPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Confirm Modal */}
      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Statistics?</Text>
            <Text style={styles.modalSubtitle}>
              This will clear all your wins and losses. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowResetConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmButton, { backgroundColor: '#F44336' }]}
                onPress={handleResetStats}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  musicButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  scrollContentScrollable: {
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -3,
    backgroundColor: COLORS.primary,
    borderRadius: 100,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 6,
  },
  usernameEditContainer: {
    width: '100%',
    alignItems: 'center',
  },
  usernameInput: {
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    minWidth: 120,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    textAlign: 'center',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  statBoxIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statBoxValue: {
    fontWeight: 'bold',
    color: COLORS.text,
    fontSize: 22,
  },
  statBoxValueGold: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontSize: 22,
  },
  statBoxLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  breakdownSection: {
    marginBottom: 16,
  },
  breakdownCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  breakdownLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  breakdownNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  resetButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.headerBg,
    borderRadius: 18,
    padding: 20,
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSubtitle: {
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 15,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 15,
  },
  avatarOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
  },
  avatarOptionLabel: {
    color: COLORS.text,
    fontSize: 10,
    marginTop: 3,
  },
  modalCloseButton: {
    padding: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.text,
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
