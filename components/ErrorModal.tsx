import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoDismissMs?: number;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  onClose,
  autoDismissMs = 3000
}) => {
  useEffect(() => {
    if (visible && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [visible, autoDismissMs, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    borderColor: '#FFD700',
    padding: 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 20,
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
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorModal;
