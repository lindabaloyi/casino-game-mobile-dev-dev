import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

<<<<<<< HEAD
type GameModeOption = 'duel' | 'party' | 'three-hands';
=======
type GameModeOption = '2-hands' | 'party';
>>>>>>> sort-building

export const options = {
  headerShown: false,
};

export default function PrivateRoomScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const screenHeight = height;
  
  const needsScroll = screenHeight < 600;
  const scaleFactor = width < 380 ? 0.85 : 1;
  
  const titleSize = Math.round(28 * scaleFactor);
  const subtitleSize = Math.round(14 * scaleFactor);
  const buttonFontSize = Math.round(16 * scaleFactor);
  const inputFontSize = Math.round(20 * scaleFactor);
  
  const [selectedMode, setSelectedMode] = useState<GameModeOption>('2-hands');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const gameModeOptions: { value: GameModeOption; label: string; players: string }[] = [
    { value: '2-hands', label: '2 Hands (2 Players)', players: '2 Players' },
    { value: 'party', label: 'Party (4 Players)', players: '4 Players' },
    { value: 'three-hands', label: 'Three Hands (3 Players)', players: '3 Players' },
  ];

  const currentMode = gameModeOptions.find(m => m.value === selectedMode);

  const handleCreateRoom = () => router.push(`/create-room?mode=${selectedMode}` as any);
  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    router.push(`/join-room?mode=${selectedMode}&code=${joinCode.toUpperCase()}` as any);
    setJoinCode('');
    setShowJoinInput(false);
  };
  const handleBack = () => router.back();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          needsScroll && styles.scrollContentScrollable,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: titleSize }]}>Private Room</Text>
        <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
          Create or join a private game with friends
        </Text>

        {/* Game Mode Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Game Mode</Text>
          
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowModeDropdown(!showModeDropdown)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownText}>{currentMode?.label}</Text>
              <Text style={styles.dropdownPlayers}>{currentMode?.players}</Text>
            </View>
            <Ionicons 
              name={showModeDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#FFD700" 
            />
          </TouchableOpacity>

          {/* Dropdown Options */}
          {showModeDropdown && (
            <View style={styles.dropdownOptions}>
              {gameModeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    selectedMode === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedMode(option.value);
                    setShowModeDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    selectedMode === option.value && styles.dropdownOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.dropdownOptionPlayers}>{option.players}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Create Private Room Button */}
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleCreateRoom}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={24} color="#0f4d0f" />
          <Text style={[styles.primaryButtonText, { fontSize: buttonFontSize }]}>
            Create Private Room
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Join with Code */}
        {!showJoinInput ? (
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setShowJoinInput(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="enter" size={20} color="#FFD700" />
            <Text style={[styles.secondaryButtonText, { fontSize: buttonFontSize - 2 }]}>
              Join with Room Code
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinSection}>
            <TextInput
              style={[styles.codeInput, { fontSize: inputFontSize }]}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase().slice(0, 6))}
              placeholder="Enter code"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.joinButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowJoinInput(false);
                  setJoinCode('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.joinButton,
                  !joinCode.trim() && styles.disabledButton
                ]}
                onPress={handleJoinRoom}
                disabled={!joinCode.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  scrollContentScrollable: {
    paddingVertical: 40,
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
  title: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 25,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownPlayers: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  dropdownOptions: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -2,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  dropdownOptionText: {
    color: 'white',
    fontSize: 14,
  },
  dropdownOptionTextSelected: {
    color: '#FFD700',
    fontWeight: '600',
  },
  dropdownOptionPlayers: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    paddingVertical: 14,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#0f4d0f',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 12,
    fontSize: 12,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 8,
  },
  joinSection: {
    width: '100%',
    maxWidth: 280,
  },
  codeInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  joinButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  joinButtonText: {
    color: '#0f4d0f',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
