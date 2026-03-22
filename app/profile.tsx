import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MusicToggleButton } from '../components/ui/MusicToggleButton';
import { usePlayerProfile, AVATAR_OPTIONS, AvatarId } from '../hooks/usePlayerProfile';

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
  const { profile, updateUsername, updateAvatar, resetStats } = usePlayerProfile();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === profile.avatar) || AVATAR_OPTIONS[0];

  const handleSaveUsername = async () => {
    if (newUsername.trim()) {
      await updateUsername(newUsername.trim());
    }
    setIsEditingName(false);
  };

  const handleSelectAvatar = async (avatarId: AvatarId) => {
    await updateAvatar(avatarId);
    setShowAvatarPicker(false);
  };

  const handleResetStats = async () => {
    await resetStats();
    setShowResetConfirm(false);
  };

  const winRate = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.musicButtonContainer}>
        <MusicToggleButton />
      </View>

      <Text style={[styles.title, { fontSize: titleSize }]}>Profile</Text>

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
        <View style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity 
            style={[
              styles.avatarContainer,
              { width: avatarSize, height: avatarSize },
            ]}
            onPress={() => setShowAvatarPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: avatarSize * 0.9 }}>{currentAvatar.emoji}</Text>
            <View style={[
              styles.editBadge,
              { width: Math.round(20 * scaleFactor), height: Math.round(20 * scaleFactor) },
            ]}>
              <Ionicons name="pencil" size={10} color="white" />
            </View>
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
                setNewUsername(profile.username);
                setIsEditingName(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.username, { fontSize: nameSize }]}>{profile.username}</Text>
              <Ionicons name="pencil" size={14} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: statValueSize }]}>
                {profile.totalGames}
              </Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: statValueSize, color: '#4CAF50' }]}>
                {profile.wins}
              </Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: statValueSize, color: '#F44336' }]}>
                {profile.losses}
              </Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: statValueSize, color: '#FFD700' }]}>
                {winRate}%
              </Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Reset Stats Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => setShowResetConfirm(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="rgba(255, 255, 255, 0.6)" />
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
                    profile.avatar === avatar.id && styles.avatarOptionSelected
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
    backgroundColor: '#0f4d0f',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  scrollContentScrollable: {
    paddingVertical: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  musicButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 100,
  },
  title: {
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    marginBottom: 20,
    width: '100%',
    maxWidth: 320,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -3,
    backgroundColor: '#FFD700',
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
    color: 'white',
    marginRight: 6,
  },
  usernameEditContainer: {
    width: '100%',
    alignItems: 'center',
  },
  usernameInput: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
    paddingVertical: 4,
    minWidth: 120,
  },
  statsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    width: '100%',
    maxWidth: 320,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 3,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 10,
  },
  resetButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: '#1a5c1a',
    borderRadius: 18,
    padding: 20,
    width: '85%',
    maxWidth: 320,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
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
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  avatarOptionLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 3,
  },
  modalCloseButton: {
    padding: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: 'white',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
