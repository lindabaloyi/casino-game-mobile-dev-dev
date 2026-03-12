/**
 * TutorialViewer Component
 * 
 * Displays a tutorial with animated steps.
 * Auto-plays through each step with descriptions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MiniGameBoard } from './MiniGameBoard';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tableCards: any[];
  hands: Record<number, any[]>;
  captures?: Record<number, any[]>;
  currentPlayer: number;
  highlightZone?: string;
}

interface Tutorial {
  id: string;
  title: string;
  icon: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rules?: string[];
  steps: TutorialStep[];
}

interface TutorialViewerProps {
  tutorial: Tutorial;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIFFICULTY_COLORS = {
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
};

export function TutorialViewer({ tutorial, visible, onClose }: TutorialViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animatedCards, setAnimatedCards] = useState<any[]>([]);

  const step = tutorial.steps[currentStep];
  const totalSteps = tutorial.steps.length;

  // Auto-advance through steps
  useEffect(() => {
    if (!isPlaying || !visible) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < totalSteps - 1) {
          return prev + 1;
        } else {
          // Loop back or stop
          setIsPlaying(false);
          return prev;
        }
      });
    }, 4000); // 4 seconds per step

    return () => clearInterval(interval);
  }, [isPlaying, visible, totalSteps]);

  // Reset when tutorial changes
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setIsPlaying(true);
    }
  }, [tutorial.id, visible]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  if (!step) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{tutorial.title}</Text>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: DIFFICULTY_COLORS[tutorial.difficulty] }
            ]}>
              <Text style={styles.difficultyText}>
                {tutorial.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {tutorial.steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
                index < currentStep && styles.stepDotComplete,
              ]}
            />
          ))}
        </View>

        {/* Game Board */}
        <View style={styles.boardContainer}>
          <MiniGameBoard
            tableCards={step.tableCards}
            hands={step.hands}
            captures={step.captures || {}}
            currentPlayer={step.currentPlayer}
            highlightedZone={step.highlightZone}
          />
        </View>

        {/* Step Content */}
        <View style={styles.content}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
          
          {/* Rules (shown on first step) */}
          {currentStep === 0 && tutorial.rules && (
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>Rules:</Text>
              {tutorial.rules.map((rule, index) => (
                <Text key={index} style={styles.ruleText}>• {rule}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handleRestart} 
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>↺ Restart</Text>
          </TouchableOpacity>

          <View style={styles.playControls}>
            <TouchableOpacity 
              onPress={handlePrev} 
              style={[styles.controlButton, currentStep === 0 && styles.disabled]}
              disabled={currentStep === 0}
            >
              <Text style={styles.controlText}>◀ Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsPlaying(!isPlaying)}
              style={[styles.playButton, !isPlaying && styles.playButtonPaused]}
            >
              <Text style={styles.playText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleNext} 
              style={[styles.controlButton, currentStep === totalSteps - 1 && styles.disabled]}
              disabled={currentStep === totalSteps - 1}
            >
              <Text style={styles.controlText}>Next ▶</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.controlButton, styles.doneButton]}
          >
            <Text style={styles.controlText}>✓ Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
  },
  stepDotActive: {
    backgroundColor: '#1B5E20',
    width: 24,
  },
  stepDotComplete: {
    backgroundColor: '#4CAF50',
  },
  boardContainer: {
    padding: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  rulesContainer: {
    marginTop: 16,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1B5E20',
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 'auto',
  },
  playControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  controlText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPaused: {
    backgroundColor: '#FF9800',
  },
  playText: {
    color: '#FFF',
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});

export default TutorialViewer;
