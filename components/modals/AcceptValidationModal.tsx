import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import separated concerns
import {
  ActionOption,
  calculateConsolidatedOptions,
  Card,
  validateTempStackDetailed
} from '../../src/utils/buildValidators';
import { handleTempStackAction } from '../../src/utils/tempStackActions';

interface ModalState {
  type: 'valid' | 'invalid';
  options?: ActionOption[];
  error?: string;
  validation?: any;
}

interface AcceptValidationModalProps {
  visible: boolean;
  onClose: () => void;
  tempStack: any;
  playerHand: Card[];
  onCapture?: (validation: any) => void;
  sendAction: (action: any) => void;
  availableOptions?: ActionOption[];
}

export function AcceptValidationModal({
  visible,
  onClose,
  tempStack,
  playerHand,
  onCapture,
  sendAction,
  availableOptions
}: AcceptValidationModalProps) {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const isProcessing = useRef(false);

  // Validate immediately when modal opens
  useEffect(() => {
    if (visible && tempStack) {
      // First check if temp stack is valid for building
      const validation = validateTempStackDetailed(tempStack, playerHand);

      if (!validation.valid) {
        // Invalid - show error message
        setModalState({
          type: 'invalid',
          error: validation.error
        });
      } else {
        // Valid - show available action options
        const options = calculateConsolidatedOptions(tempStack, playerHand);
        setModalState({
          type: 'valid',
          options,
          validation
        });
      }
    }
  }, [visible, tempStack, playerHand]);

  // Reset processing flag when modal closes
  useEffect(() => {
    if (!visible) {
      isProcessing.current = false;
      setModalState(null);
    }
  }, [visible]);

  // Handle action button clicks
  const handleAction = async (action: ActionOption) => {
    // Prevent double-clicks
    if (isProcessing.current) {
      return;
    }

    if (!modalState) {
      return;
    }
    if (!tempStack?.stackId) {
      Alert.alert('Error', 'Cannot proceed: Invalid state');
      return;
    }

    isProcessing.current = true;

    // Close modal immediately for instant feedback
    onClose();

    try {
      // Use the action service to handle the action
      if (action.type === 'build') {
        await handleTempStackAction('build', {
          tempStackId: tempStack.stackId,
          buildValue: modalState.validation.buildValue,
          buildType: modalState.validation.buildType,
          buildCard: action.card
        }, sendAction);

        // Show success alert
        Alert.alert(
          'Build Created!',
          `Successfully created ${modalState.validation.buildType} build of ${modalState.validation.buildValue}`,
          [{ text: 'OK' }]
        );

      } else if (action.type === 'capture') {
        await handleTempStackAction('capture', {
          tempStackId: tempStack.stackId,
          captureValue: action.value
        }, sendAction);

        // Show success alert
        Alert.alert(
          'Cards Captured!',
          `Successfully captured ${action.value}`,
          [{ text: 'OK' }]
        );
      }

      // Keep backward compatibility
      if (onCapture) {
        onCapture({ tempStack, validation: modalState.validation, action });
      }

    } catch (error) {
      console.error('❌ [MODAL] Action failed:', error);
      Alert.alert('Action Failed', 'Please try again');
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessing.current = false;
      }, 1000);
    }
  };

  const renderContent = () => {
    if (!modalState) {
      return (
        <View style={styles.centered}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      );
    }

    // Invalid temp stack - show error message
    if (modalState.type === 'invalid') {
      return (
        <>
          <Text style={styles.title}>Cannot Create Build</Text>
          <Text style={styles.message}>{modalState.error}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Valid temp stack - show available action options
    if (modalState.type === 'valid' && modalState.options) {
      return (
        <>
          <Text style={styles.title}>Build Options</Text>
          <Text style={styles.message}>
            Choose what to do with this temp stack:
          </Text>

          <View style={styles.buttonContainer}>
            {modalState.options.map((option: ActionOption, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  option.type === 'build' && styles.buildButton
                ]}
                onPress={() => handleAction(option)}
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
    }

    // Fallback
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Error</Text>
        <Text style={styles.message}>Something went wrong</Text>
      </View>
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
