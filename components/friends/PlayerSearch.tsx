/**
 * PlayerSearch Component
 * Search for players by username with dropdown results
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserSearch, SearchResult } from '../../hooks/useUserSearch';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

// In-game color scheme - matching leaderboards.tsx
const COLORS = {
  primary: '#FFD700',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  headerBg: '#1a5c1a',
  border: 'rgba(255, 215, 0, 0.3)',
};

interface PlayerSearchProps {
  placeholder?: string;
  onResultPress?: (userId: string) => void;
  onUserPress?: (userId: string) => void;
}

export function PlayerSearch({ placeholder = 'Search players...', onResultPress, onUserPress }: PlayerSearchProps) {
  const router = useRouter();
  const { searchResults, isSearching, search, clearResults } = useUserSearch();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setShowDropdown(text.length > 0);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (text.trim().length >= 2) {
        search(text);
      } else {
        clearResults();
      }
    }, 300);
  }, [search, clearResults]);

  const handleResultPress = useCallback((result: SearchResult) => {
    setQuery('');
    setShowDropdown(false);
    clearResults();
    
    if (onResultPress) {
      onResultPress(result._id);
    } else if (onUserPress) {
      onUserPress(result._id);
    } else {
      router.push(`/user/${result._id}` as any);
    }
  }, [onResultPress, onUserPress, router, clearResults]);

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji;
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultAvatar}>
        <Text style={styles.resultAvatarText}>{getAvatarEmoji(item.avatar)}</Text>
      </View>
      <Text style={styles.resultUsername}>{item.username}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.6)" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#FFD700" />
        )}
        {query.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => { setQuery(''); setShowDropdown(false); clearResults(); }}>
            <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && searchResults.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={searchResults}
            renderItem={renderResult}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {showDropdown && query.length >= 2 && searchResults.length === 0 && !isSearching && (
        <View style={styles.dropdown}>
          <Text style={styles.noResults}>No players found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.headerBg,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  resultAvatarText: {
    fontSize: 16,
  },
  resultUsername: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  noResults: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
});

export default PlayerSearch;
