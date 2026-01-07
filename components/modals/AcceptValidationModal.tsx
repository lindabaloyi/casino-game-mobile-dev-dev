import { useEffect, useRef, useState } from 'react';
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

interface ActionOption {
  type: 'capture' | 'build';
  label: string;
  card: Card | null;  // The hand card used for this action (null for builds)
  value: number; // The value this action targets
}

interface AcceptValidationModalProps {
  visible: boolean;
  onClose: () => void;
  tempStack: any;
  playerHand: Card[];
  onCapture?: (validation: any) => void; // Make optional
  sendAction: (action: any) => void; // Add required sendAction
  // NEW: Receive pre-calculated options from server
  availableOptions?: ActionOption[];
}

export function AcceptValidationModal({
  visible,
  onClose,
  tempStack,
  playerHand,
  onCapture,
  sendAction,
  availableOptions // NEW: Pre-calculated options from server
}: AcceptValidationModalProps) {
  const [validationResult, setValidationResult] = useState<any>(null);
  const isProcessing = useRef(false);

  // 🎯 DETECT SAME-VALUE TEMP STACKS
  const detectSameValueStack = (stack: any): boolean => {
    if (!stack.cards || stack.cards.length < 2) return false;
    const cards = stack.cards;
    const firstValue = cards[0]?.value;
    return cards.every((card: { value: number }) => card.value === firstValue);
  };

  // 🎯 STRATEGIC OPTIONS FOR SAME-VALUE STACKS (corrected casino logic)
  const calculateStrategicOptions = (stack: any, hand: Card[]): ActionOption[] => {
    const options: ActionOption[] = [];
    const cards = stack.cards || [];
    const stackValue = cards[0]?.value; // Rank value (e.g., 3)
    const stackSum = cards.reduce((sum: number, card: { value: number }) => sum + card.value, 0);

    console.log('🔍 [MODAL] Calculating options:', {
      stackValue,  // Should be 3
      stackSum,    // Should be 6
      hand: hand.map(c => `${c.value}${c.suit}`)
    });

    // 1. FIX CAPTURE: Use rank value, not sum!
    options.push({
      type: 'capture',
      label: `Capture ${stackValue}`, // "Capture 3" not "Capture 6"
      card: null,
      value: stackValue  // Store rank value (3), not sum (6)
    });

    // 2. ADD: Build with same rank value (if player has that card)
    const hasSameValueCard = hand.some(card => card.value === stackValue);
    if (hasSameValueCard) {
      options.push({
        type: 'build',
        label: `Build ${stackValue}`, // "Build 3"
        card: null,
        value: stackValue
      });
    }

    // 3. KEEP: Build with sum total (with correct conditions)
    // Only if all cards ≤ 5 AND player has sum card
    const allCardsFiveOrLess = cards.every((card: { value: number }) => card.value <= 5);
    const hasSumCard = hand.some(card => card.value === stackSum);

    if (allCardsFiveOrLess && hasSumCard) {
      options.push({
        type: 'build',
        label: `Build ${stackSum}`, // "Build 6" (if player has 6)
        card: null,
        value: stackSum
      });
    }

    console.log('✅ [MODAL] Generated options:', options.map(o => o.label));
    return options;
  };

  // 🎯 NEW: Get all available capture and build options (enhanced with same-value logic)
  const getAvailableOptions = (stack: any, hand: Card[]): ActionOption[] => {
    const options: ActionOption[] = [];

    // RULE 1: Minimum cards check
    if (!stack.cards || stack.cards.length < 2) {
      return options; // No options available
    }

    // 🎯 SAME-VALUE STACKS: Use strategic options
    if (detectSameValueStack(stack)) {
      console.log('[ACCEPT_MODAL] 🎯 Detected same-value stack, using strategic options');
      return calculateStrategicOptions(stack, hand);
    }

    // 📋 REGULAR STACKS: Use existing basic validation
    const cards = stack.cards;
    const stackValue = cards.reduce((sum: number, card: { value: number }) => sum + card.value, 0);

    // CRITICAL RULE: Check if temp stack contains hand cards
    const hasHandCards = cards.some((card: { source?: string }) => card.source === 'hand');

    if (hasHandCards) {
      // 🏗️ TEMP STACK WITH HAND CARDS → BUILD OPTION
      // The temp stack value IS the build value
      if (stackValue >= 1 && stackValue <= 10) {
        options.push({
          type: 'build',
          label: `Build ${stackValue}`,
          card: null, // No additional card needed
          value: stackValue
        });
      }
    } else {
      // 🎯 TEMP STACK WITH TABLE CARDS ONLY → ONLY CAPTURE OPTIONS
      // Can capture immediately since no hand cards involved
      const captureCards = hand.filter(card => card.value === stackValue);
      captureCards.forEach(card => {
        options.push({
          type: 'capture',
          label: `Capture ${stackValue}`,
          card: card,
          value: stackValue
        });
      });
    }

    return options;
  };

  // 🎯 NEW: Use server-provided options when available, fallback to local calculation
  const getOptionsToDisplay = (): ActionOption[] => {
    // ✅ PRIORITY 1: Use server-provided options (clean architecture)
    if (availableOptions && availableOptions.length > 0) {
      console.log('🎯 [MODAL] Using server-provided options:', availableOptions.map(o => o.label));
      return availableOptions;
    }

    // 🔄 FALLBACK: Local calculation for backward compatibility
    console.log('🔄 [MODAL] Using local calculation (fallback)');
    return getAvailableOptions(tempStack, playerHand);
  };

  // 🎯 LEGACY: Keep for backward compatibility - returns single validation result
  const validateTempStack = (stack: any, hand: Card[]) => {
    const options = getOptionsToDisplay();

    if (options.length === 0) {
      return { valid: false, error: 'No valid capture or build options available' };
    }

    // For backward compatibility, return the first option as the "primary" validation
    const primaryOption = options[0];
    return {
      valid: true,
      options: options, // Include all options
      target: primaryOption.value,
      selectedCard: primaryOption.card,
      message: `Choose your action for this stack`
    };
  };

  // Run validation when modal opens
  useEffect(() => {
    if (visible && tempStack) {
      const result = validateTempStack(tempStack, playerHand);
      setValidationResult(result);
      console.log('🔍 [VALIDATION] Result:', result);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tempStack, playerHand, availableOptions]); // ✅ Add availableOptions dependency

  // Reset processing flag when modal closes
  useEffect(() => {
    if (!visible) {
      isProcessing.current = false;
    }
  }, [visible]);



  // 🎯 NEW: Handle selection of capture or build options
  const handleOptionSelect = (option: ActionOption) => {
    // Prevent double-clicks
    if (isProcessing.current) {
      console.log('⚠️ [MODAL] Already processing, ignoring duplicate click');
      return;
    }

    console.log('🎯 [MODAL] Option selected:', {
      type: option.type,
      label: option.label,
      card: option.card,
      value: option.value,
      tempStack,
      isProcessing: isProcessing.current
    });

    if (!tempStack?.stackId) {
      console.log('❌ [MODAL] Invalid state, cannot proceed');
      Alert.alert('Error', 'Cannot proceed: Invalid state');
      return;
    }

    // Check sendAction exists
    if (!sendAction || typeof sendAction !== 'function') {
      console.error('❌ [MODAL] sendAction is not available!', { sendAction, type: typeof sendAction });
      Alert.alert('Error', 'Cannot send action: Connection issue');
      return;
    }

    isProcessing.current = true;

    try {
      if (option.type === 'capture') {
        // CAPTURE: Use existing capture action (supports temp stacks)
        console.log('✅ [MODAL] Executing CAPTURE action:', {
          tempStackId: tempStack.stackId,
          captureValue: option.value
        });

        sendAction({
          type: 'capture',
          payload: {
            tempStackId: tempStack.stackId,
            captureValue: option.value
          }
        });

        // Show success alert
        Alert.alert(
          'Cards Captured!',
          `Successfully captured ${option.value}`,
          [{ text: 'OK' }]
        );

      } else if (option.type === 'build') {
        // BUILD: Use new createBuildFromTempStack action
        console.log('✅ [MODAL] Executing BUILD action:', {
          tempStackId: tempStack.stackId,
          buildValue: option.value,
          buildCard: option.card
        });

        sendAction({
          type: 'createBuildFromTempStack',
          payload: {
            tempStackId: tempStack.stackId,
            buildValue: option.value,
            buildCard: option.card
          }
        });

        // 🎯 KISS FIX: Clean up old temp stack from contact registry
        console.log('🧹 [BUILD_CONVERSION] Deleting temp stack from contact registry:', tempStack.stackId);
        // Import and call removePosition dynamically to avoid circular imports
        import('../../src/utils/contactDetection').then(({ removePosition }) => {
          removePosition(tempStack.stackId);
          console.log('✅ [BUILD_CONVERSION] Temp stack removed from contact registry');
        }).catch(error => {
          console.error('❌ [BUILD_CONVERSION] Failed to remove temp stack from registry:', error);
        });

        // Show success alert
        Alert.alert(
          'Build Created!',
          `Successfully created build of ${option.value}`,
          [{ text: 'OK' }]
        );
      }

      // Keep backward compatibility
      if (onCapture) {
        onCapture({ ...option, tempStack });
      }

      // Close modal immediately
      onClose();

    } catch (error) {
      console.error('❌ [MODAL] Action failed:', error);
      Alert.alert('Action Failed', 'Please try again');
      // Don't close modal on error
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessing.current = false;
      }, 1000);
    }
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

    // Valid state - show all available options
    const options = validationResult.options || [];

    return (
      <>
        <Text style={styles.title}>Choose Action</Text>
        <Text style={styles.message}>
          What would you like to do with this stack?
        </Text>

        <View style={styles.buttonContainer}>
          {options.map((option: ActionOption, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                option.type === 'build' && styles.buildButton
              ]}
              onPress={() => handleOptionSelect(option)}
            >
              <Text style={styles.actionButtonText}>
                {option.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}

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
  buildButton: {
    backgroundColor: '#FF9800', // Orange for build actions
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
