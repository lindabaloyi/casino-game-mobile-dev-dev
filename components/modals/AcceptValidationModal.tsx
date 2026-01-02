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
}

export function AcceptValidationModal({
  visible,
  onClose,
  tempStack,
  playerHand,
  onCapture,
  sendAction
}: AcceptValidationModalProps) {
  const [validationResult, setValidationResult] = useState<any>(null);
  const isProcessing = useRef(false);

  // 🎯 NEW: Get all available capture and build options
  const getAvailableOptions = (stack: any, hand: Card[]): ActionOption[] => {
    const options: ActionOption[] = [];

    // RULE 1: Minimum cards check
    if (!stack.cards || stack.cards.length < 2) {
      return options; // No options available
    }

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

  // 🎯 LEGACY: Keep for backward compatibility - returns single validation result
  const validateTempStack = (stack: any, hand: Card[]) => {
    const options = getAvailableOptions(stack, hand);

    if (options.length === 0) {
      return { valid: false, error: 'No valid capture or build options available' };
    }

    // For backward compatibility, return the first option as the "primary" validation
    const primaryOption = options[0];
    return {
      valid: true,
      options: options, // NEW: Include all options
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
  }, [visible, tempStack, playerHand]);

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
        // CAPTURE: Use existing captureTempStack action
        console.log('✅ [MODAL] Executing CAPTURE action:', {
          tempStackId: tempStack.stackId,
          captureValue: option.value
        });

        sendAction({
          type: 'captureTempStack',
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
