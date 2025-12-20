import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface AcceptValidationModalProps {
  visible: boolean;
  onClose: () => void;
  tempStack: any;
  playerHand: Card[];
  onCapture: (validation: any) => void;
}

export function AcceptValidationModal({
  visible,
  onClose,
  tempStack,
  playerHand,
  onCapture
}: AcceptValidationModalProps) {
  const [validationResult, setValidationResult] = useState<any>(null);

  // Run validation when modal opens
  useEffect(() => {
    if (visible && tempStack) {
      const result = validateTempStack(tempStack, playerHand);
      setValidationResult(result);
      console.log('🔍 [VALIDATION] Result:', result);
    }
  }, [visible, tempStack, playerHand]);

  // 🎯 VALIDATION LOGIC
  const validateTempStack = (stack: any, hand: Card[]) => {
    console.log('🔍 [VALIDATION] Starting...', {
      stackCards: stack.cards,
      handCards: hand
    });

    // RULE 1: Minimum 2 cards required
    if (!stack.cards || stack.cards.length < 2) {
      return {
        valid: false,
        error: 'Need at least 2 cards to capture'
      };
    }

    const cards = stack.cards;
    const totalValue = cards.reduce((sum: number, card: Card) => sum + card.value, 0);

    // RULE 2: Check if all cards same value
    const allSameValue = cards.every((card: Card) => card.value === cards[0].value);

    if (allSameValue) {
      const targetValue = cards[0].value;
      const hasMatchingCard = hand.some(card => card.value === targetValue);

      if (hasMatchingCard) {
        return {
          valid: true,
          type: 'SAME_VALUE',
          target: targetValue,
          cards: cards,
          message: `Capture ${cards.length} ${targetValue}s`
        };
      } else {
        return {
          valid: false,
          error: `Need ${targetValue} in hand to capture same values`
        };
      }
    }

    // RULE 3: Check sum ≤ 10
    if (totalValue <= 10) {
      const hasSumCard = hand.some(card => card.value === totalValue);

      if (hasSumCard) {
        return {
          valid: true,
          type: 'SUM',
          target: totalValue,
          cards: cards,
          message: `Capture sum ${totalValue}`
        };
      } else {
        return {
          valid: false,
          error: `Need ${totalValue} in hand to capture this sum`
        };
      }
    }

    // RULE 4: Total > 10 (invalid)
    return {
      valid: false,
      error: `Total ${totalValue} > 10 (cannot capture)`
    };
  };

  const handleCapture = () => {
    if (!validationResult?.valid) return;

    // Show confirmation alert
    Alert.alert(
      'Confirm Capture',
      `Capture ${validationResult.cards.length} cards for ${validationResult.target} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Capture',
          onPress: () => {
            console.log('✅ [MODAL] User confirmed capture');
            onCapture(validationResult);
            onClose();

            // Show success alert
            Alert.alert(
              'Capture Successful!',
              `You captured ${validationResult.cards.length} cards`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const renderContent = () => {
    if (!validationResult) {
      return (
        <View style={styles.centered}>
          <Text style={styles.title}>Validating...</Text>
        </View>
      );
    }

    if (!validationResult.valid) {
      // Invalid - show error modal
      return (
        <>
          <Text style={styles.title}>Cannot Capture</Text>
          <Text style={styles.message}>{validationResult.error}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Valid capture state - simplified to match ActionModal
    return (
      <>
        <Text style={styles.title}>Capture Cards</Text>
        <Text style={styles.message}>
          Capture {validationResult.cards.length} cards for {validationResult.target} points?
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCapture}
          >
            <Text style={styles.actionButtonText}>CAPTURE {validationResult.target}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2E7D32',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    padding: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  centered: {
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#666',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
