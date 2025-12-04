import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

interface Action {
  type: string;
  label: string;
  payload?: any;
}

interface ActionModalProps {
  modalInfo: {
    title: string;
    message: string;
    actions: Action[];
  } | null;
  onAction: (action: Action) => void;
  onCancel: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ modalInfo, onAction, onCancel }) => {
  if (!modalInfo) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{modalInfo.title}</Text>
          <Text style={styles.message}>{modalInfo.message}</Text>

          <View style={styles.buttonContainer}>
            {modalInfo.actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => onAction(action)}
              >
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    borderColor: '#4CAF50',
    padding: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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

export default ActionModal;
