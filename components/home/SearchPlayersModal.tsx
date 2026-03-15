/**
 * SearchPlayersModal Component
 * Modal for searching and finding players
 */

import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserSearch } from '../../hooks/useUserSearch';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

interface SearchPlayersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SearchPlayersModal({ visible, onClose }: SearchPlayersModalProps) {
  const router = useRouter();
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    isSearching, 
    search, 
    clearResults,
    sendFriendRequest 
  } = useUserSearch();

  // Clear search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      clearResults();
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        search(searchQuery);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserPress = (userId: string) => {
    onClose();
    router.push(`/user/${userId}` as any);
  };

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
          style={styles.content}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Search Players</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Search Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
            <TextInput
              style={styles.input}
              placeholder="Search by username..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Loading */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <ScrollView style={styles.resultsList}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={result._id}
                  style={styles.resultItem}
                  onPress={() => handleUserPress(result._id)}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultEmoji}>
                      {AVATAR_OPTIONS.find(a => a.id === result.avatar)?.emoji || '👤'}
                    </Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{result.username}</Text>
                    <Text style={styles.resultStats}>
                      {result.stats?.totalGames || 0} games • {result.stats?.wins || 0} wins
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => sendFriendRequest(result._id)}
                  >
                    <Ionicons name="person-add" size={20} color="#FFD700" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* No Results */}
          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No players found</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1a5c1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultEmoji: {
    fontSize: 22,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultStats: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  addFriendButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});

export default SearchPlayersModal;
