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

  // 🎯 VALIDATION LOGIC - FIXED FOR SEQUENTIAL GROUPING
  const validateTempStack = (stack: any, hand: Card[]) => {
    console.log('🚀 [VALIDATION START]', {
      stackCards: stack.cards?.map((c: Card) => c.value),
      handCards: hand.map((c: Card) => c.value),
      stackSize: stack.cards?.length
    });

    // RULE 1: Minimum cards
    if (!stack.cards || stack.cards.length < 2) {
      console.log('❌ [VALIDATION] Failed: Need at least 2 cards');
      return {valid: false, error: 'Need at least 2 cards to capture'};
    }

    const cards = stack.cards;

    // RULE 2: Same value check
    const allSameValue = cards.every((card: Card) => card.value === cards[0].value);
    if (allSameValue) {
      console.log('🔍 [VALIDATION] Checking SAME VALUE rule');
      const targetValue = cards[0].value;
      const hasMatchingCard = hand.some(card => card.value === targetValue);

      if (hasMatchingCard) {
        console.log(`✅ [VALIDATION] Same value PASS: Capture ${cards.length} ${targetValue}s`);
        return {
          valid: true,
          type: 'SAME_VALUE',
          target: targetValue,
          cards: cards,
          message: `Capture ${cards.length} ${targetValue}s`
        };
      } else {
        console.log(`❌ [VALIDATION] Same value FAIL: Need ${targetValue} in hand`);
        return {
          valid: false,
          error: `Need ${targetValue} in hand to capture same values`
        };
      }
    }

    // RULE 3: Check sequential builds
    console.log('🔍 [VALIDATION] Checking SEQUENTIAL BUILD rule');
    console.log(`   Cards in stack order: ${cards.map((c: Card) => c.value).join(' → ')}`);

    // Find all valid sequential builds
    const validSequentialBuilds = [];

    // Try each possible build value (1-10)
    for (let buildValue = 1; buildValue <= 10; buildValue++) {
      // Skip if player doesn't have this card
      if (!hand.some(card => card.value === buildValue)) {
        continue;
      }

      console.log(`   ↳ Testing build value ${buildValue}...`);

      // Try to group all cards sequentially into this build value
      const result = trySequentialGrouping(cards, buildValue);

      if (result.valid) {
        validSequentialBuilds.push({
          buildValue,
          groups: result.groups,
          totalCards: cards.length
        });
        console.log(`     ✓ Valid: ${result.groups.map(g => `(${g.cards.map(c => c.value).join('+')})`).join(', ')}`);
      }
    }

    console.log(`🔍 [VALIDATION] Found ${validSequentialBuilds.length} valid sequential builds`);

    if (validSequentialBuilds.length > 0) {
      // Pick the first valid build (all should be equivalent)
      const bestBuild = validSequentialBuilds[0];
      console.log(`✅ [VALIDATION] Sequential build PASS: Build value ${bestBuild.buildValue}`);
      console.log(`   Groups: ${bestBuild.groups.map(g => `(${g.cards.map(c => c.value).join('+')}=${g.sum})`).join(', ')}`);

      return {
        valid: true,
        type: 'SEQUENTIAL_BUILD',
        target: bestBuild.buildValue,
        cards: cards,
        groups: bestBuild.groups,
        message: `Capture ${bestBuild.totalCards} cards building to ${bestBuild.buildValue}`
      };
    }

    // RULE 4: Check total sum
    console.log('🔍 [VALIDATION] Checking TOTAL SUM rule');
    const totalValue = cards.reduce((sum: number, card: Card) => sum + card.value, 0);
    console.log(`   ↳ Total sum: ${totalValue} (cards: ${cards.map((c: Card) => c.value).join('+')})`);

    if (totalValue <= 10) {
      const hasSumCard = hand.some(card => card.value === totalValue);

      if (hasSumCard) {
        console.log(`✅ [VALIDATION] Total sum PASS: Capture all ${cards.length} cards`);
        return {
          valid: true,
          type: 'TOTAL_SUM',
          target: totalValue,
          cards: cards,
          message: `Capture all ${cards.length} cards (total ${totalValue})`
        };
      } else {
        console.log(`❌ [VALIDATION] Total sum FAIL: Need ${totalValue} in hand`);
        return {
          valid: false,
          error: `Need ${totalValue} in hand to capture this sum`
        };
      }
    } else {
      console.log(`❌ [VALIDATION] Total sum FAIL: ${totalValue} > 10`);
    }

    // RULE 5: No valid builds
    console.log('❌ [VALIDATION] FAIL: No valid sequential build found');
    return {
      valid: false,
      error: 'No valid sequential build found'
    };
  };

  // Helper: Try to group cards sequentially into groups that sum to targetValue
  const trySequentialGrouping = (cards: Card[], targetValue: number) => {
    const groups = [];
    const n = cards.length;
    let i = 0;

    while (i < n) {
      // Try groups of 3 cards first (largest group)
      if (i + 2 < n) {
        const tripleSum = cards[i].value + cards[i + 1].value + cards[i + 2].value;
        if (tripleSum === targetValue) {
          groups.push({
            cards: [cards[i], cards[i + 1], cards[i + 2]],
            sum: tripleSum,
            size: 3
          });
          i += 3;
          continue;
        }
      }

      // Try groups of 2 cards
      if (i + 1 < n) {
        const pairSum = cards[i].value + cards[i + 1].value;
        if (pairSum === targetValue) {
          groups.push({
            cards: [cards[i], cards[i + 1]],
            sum: pairSum,
            size: 2
          });
          i += 2;
          continue;
        }
      }

      // Try single card
      if (cards[i].value === targetValue) {
        groups.push({
          cards: [cards[i]],
          sum: cards[i].value,
          size: 1
        });
        i += 1;
        continue;
      }

      // Can't group this card
      return { valid: false, groups: [] };
    }

    return { valid: true, groups };
  };

  const handleCapture = () => {
    console.log('🎯 [MODAL] handleCapture called', { validationResult });
    if (!validationResult?.valid) {
      console.log('❌ [MODAL] Validation not valid, returning');
      return;
    }

    console.log('✅ [MODAL] Showing confirmation alert');
    // Show confirmation alert - clean message showing build value only
    Alert.alert(
      'Confirm Capture',
      `Capture ${validationResult.target}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Capture',
          onPress: () => {
            console.log('✅ [MODAL] User confirmed capture, calling onCapture');
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

    // Valid capture state - clean message showing build value only
    return (
      <>
        <Text style={styles.title}>Capture Cards</Text>
        <Text style={styles.message}>
          Capture {validationResult.target}?
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
