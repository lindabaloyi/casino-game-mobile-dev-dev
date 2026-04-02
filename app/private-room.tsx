/**
 * Private Room Screen
 * Create or join a private game with friends
 * Redesigned to match the game modes page layout and styling
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type GameModeOption = 'two-hands' | 'party' | 'three-hands' | 'four-hands';

interface ModeInfo {
  id: GameModeOption;
  title: string;
  subtitle: string;
  players: string;
}

const GAME_MODES: ModeInfo[] = [
  {
    id: 'two-hands',
    title: '2 Hands',
    subtitle: '1v1 Battle',
    players: '2 Players',
  },
  {
    id: 'three-hands',
    title: '3 Hands',
    subtitle: '3 Player battle',
    players: '3 Players',
  },
  {
    id: 'four-hands',
    title: '4 Hands',
    subtitle: '4 Player battle',
    players: '4 Players',
  },
  {
    id: 'party',
    title: '4 Hands Party',
    subtitle: '2v2 Team battle',
    players: '4 Players',
  },
];

export const options = {
  headerShown: false,
};

export default function PrivateRoomScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<GameModeOption>('two-hands');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const isPortrait = height > width;
  const isSmallScreen = width < 400;
  const horizontalPadding = isSmallScreen ? 16 : isPortrait ? 20 : 40;
  const maxContentWidth = Math.min(width - horizontalPadding * 2, 480);

  const handleCreateRoom = () => router.push(`/create-room?mode=${selectedMode}` as any);
  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    router.push(`/join-room?mode=${selectedMode}&code=${joinCode.toUpperCase()}` as any);
    setJoinCode('');
    setShowJoinInput(false);
  };
  const handleBack = () => router.back();

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={22} color="#f5c842" />
      </Pressable>

      {/* Title */}
      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Private Room</Text>
      <Text style={styles.subtitle}>Create or join a private game with friends</Text>
      
      {/* Mode Selection - Scrollable */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.modesContainer, { maxWidth: maxContentWidth }]}>
          {GAME_MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            
            return (
              <Pressable
                key={mode.id}
                style={({ pressed }) => [
                  styles.modeCard,
                  isSelected && styles.modeCardSelected,
                  pressed && styles.modeCardPressed,
                ]}
                onPress={() => setSelectedMode(mode.id)}
              >
                {isSelected && <View style={styles.selectedIndicator} />}
                
                <View style={styles.iconWrap}>
                  <Ionicons 
                    name={mode.id === 'party' ? 'star' : 'people'} 
                    size={28} 
                    color={isSelected ? '#f5c842' : '#8fba6a'} 
                  />
                </View>
                
                <View style={styles.textCol}>
                  <Text style={styles.modeName}>{mode.title}</Text>
                  <Text style={styles.modeSub}>{mode.subtitle}</Text>
                </View>
                
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{mode.players}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Join Code Input (inline) */}
        {showJoinInput && (
          <View style={[styles.joinSection, { maxWidth: maxContentWidth }]}>
            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase().slice(0, 6))}
              placeholder="Enter room code"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.codeActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => {
                  setShowJoinInput(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.confirmButton, !joinCode.trim() && styles.disabledButton]}
                onPress={handleJoinRoom}
                disabled={!joinCode.trim()}
              >
                <Text style={styles.confirmButtonText}>Join</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Horizontal Row */}
      <View style={[styles.actionRow, { maxWidth: maxContentWidth }]}>
        {!showJoinInput ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleCreateRoom}
            >
              <Ionicons name="add-circle" size={20} color="#0f3318" />
              <Text style={styles.actionButtonText}>Create Room</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonOutline,
                pressed && styles.actionButtonOutlinePressed,
              ]}
              onPress={() => setShowJoinInput(true)}
            >
              <Ionicons name="enter" size={18} color="#f5c842" />
              <Text style={styles.actionButtonOutlineText}>Join Room</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4a1a',
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    zIndex: 100,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#f5c842',
    letterSpacing: 0.02,
    marginBottom: 4,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    color: '#8fba6a',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modesContainer: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  modeCard: {
    backgroundColor: '#0f3318',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a6632',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  modeCardSelected: {
    borderColor: '#f5c842',
    backgroundColor: '#143d1e',
  },
  modeCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#f5c842',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    marginLeft: 18,
  },
  modeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f5c842',
    lineHeight: 24,
  },
  modeSub: {
    fontSize: 13,
    color: '#8fba6a',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#2a5c20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#3a7a2a',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a8d87a',
  },
  joinSection: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 20,
  },
  codeInput: {
    backgroundColor: '#0f3318',
    borderWidth: 1.5,
    borderColor: '#2a6632',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontWeight: '600',
    color: '#f5c842',
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 12,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2a6632',
    alignItems: 'center',
    backgroundColor: '#0f3318',
  },
  cancelButtonText: {
    color: '#8fba6a',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#f5c842',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(245, 200, 66, 0.5)',
  },
  confirmButtonText: {
    color: '#0f3318',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.02,
  },
  actionRow: {
    marginTop: 20,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#f5c842',
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPressed: {
    backgroundColor: '#fad84a',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f3318',
    letterSpacing: 0.02,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#0f3318',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f5c842',
    gap: 8,
  },
  actionButtonOutlinePressed: {
    backgroundColor: '#143d1e',
  },
  actionButtonOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f5c842',
    letterSpacing: 0.02,
  },
});
