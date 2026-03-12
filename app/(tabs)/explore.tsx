/**
 * Learn / Tutorial Hub
 * 
 * Interactive tutorials for learning game mechanics.
 * Features animated demonstrations of gameplay actions.
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/themed/themed-text';
import { TutorialViewer } from '@/components/tutorials';
import tutorials from '../../shared/game/tutorials';


// Group tutorials by difficulty
const TUTORIAL_GROUPS = {
  beginner: ['trail', 'captureLoose', 'buildTemp'],
  intermediate: ['captureBuild', 'stealBuild', 'mergeBuilds'],
  advanced: ['dropToCapture', 'extendBuild', 'acceptTemp'],
};

const DIFFICULTY_CONFIG = {
  beginner: { 
    label: 'Beginner', 
    color: '#4CAF50',
    description: 'Start here! Learn the basics.',
  },
  intermediate: { 
    label: 'Intermediate', 
    color: '#FF9800',
    description: 'Ready for more?',
  },
  advanced: { 
    label: 'Advanced', 
    color: '#F44336',
    description: 'Master the game!',
  },
};

interface Tutorial {
  id: string;
  title: string;
  icon: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rules?: string[];
  steps: any[];
}

export default function TabTwoScreen() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  const tutorialList = Object.values(tutorials) as Tutorial[];

  const renderTutorialCard = (tutorial: Tutorial) => (
    <TouchableOpacity
      key={tutorial.id}
      style={styles.tutorialCard}
      onPress={() => setSelectedTutorial(tutorial)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: DIFFICULTY_CONFIG[tutorial.difficulty].color + '20' }
      ]}>
        <Text style={styles.iconText}>
          {getIconForTutorial(tutorial.id)}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{tutorial.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {tutorial.description}
        </Text>
        <View style={[
          styles.difficultyBadge,
          { backgroundColor: DIFFICULTY_CONFIG[tutorial.difficulty].color }
        ]}>
          <Text style={styles.difficultyText}>
            {tutorial.difficulty}
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const renderTutorialGroup = (difficulty: keyof typeof TUTORIAL_GROUPS) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const groupTutorials = TUTORIAL_GROUPS[difficulty]
      .map(id => tutorialList.find(t => t.id === id))
      .filter(Boolean) as Tutorial[];

    if (groupTutorials.length === 0) return null;

    return (
      <View key={difficulty} style={styles.group}>
        <View style={styles.groupHeader}>
          <View style={[styles.groupIndicator, { backgroundColor: config.color }]} />
          <View>
            <Text style={styles.groupTitle}>{config.label}</Text>
            <Text style={styles.groupDescription}>{config.description}</Text>
          </View>
        </View>
        <View style={styles.groupCards}>
          {groupTutorials.map(renderTutorialCard)}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎓</Text>
        <ThemedText type="title" style={styles.headerTitle}>
          Learn the Game
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Animated tutorials to help you master MadGames
        </ThemedText>
      </View>

      {/* Tutorial Groups */}
      {renderTutorialGroup('beginner')}
      {renderTutorialGroup('intermediate')}
      {renderTutorialGroup('advanced')}

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>💡</Text>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>
            Tap on any tutorial to watch an animated demonstration. 
            Use the play/pause button to control the playback!
          </Text>
        </View>
      </View>

      {/* Tutorial Viewer Modal */}
      {selectedTutorial && (
        <TutorialViewer
          tutorial={selectedTutorial}
          visible={true}
          onClose={() => setSelectedTutorial(null)}
        />
      )}
    </ScrollView>
  );
}

function getIconForTutorial(id: string): string {
  const icons: Record<string, string> = {
    trail: '🃏',
    captureLoose: '✋',
    buildTemp: '📚',
    captureBuild: '🏆',
    stealBuild: '💝',
    mergeBuilds: '🔀',
    dropToCapture: '📥',
    extendBuild: '➕',
    acceptTemp: '✅',
  };
  return icons[id] || '🎮';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    maxWidth: 280,
  },
  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  groupIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  groupDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  groupCards: {
    gap: 12,
  },
  tutorialCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 24,
    color: '#CCC',
    marginLeft: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
