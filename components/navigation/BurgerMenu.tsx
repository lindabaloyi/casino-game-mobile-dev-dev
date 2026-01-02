import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Alert } from 'react-native';

interface BurgerMenuProps {
  onRestart: () => void;
  onEndGame: () => void;
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({ onRestart, onEndGame }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const showMenu = () => setMenuVisible(true);
  const hideMenu = () => setMenuVisible(false);

  const handleRestart = () => {
    Alert.alert(
      'Restart Game',
      'Are you sure you want to restart the game?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', onPress: () => { onRestart(); hideMenu(); } }
      ]
    );
  };

  const handleEndGame = () => {
    Alert.alert(
      'End Game',
      'Are you sure you want to end the game?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Game', onPress: () => { onEndGame(); hideMenu(); } }
      ]
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.burgerButton} onPress={showMenu}>
        <View style={styles.burgerIcon}>
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideMenu}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={hideMenu}>
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Game Menu</Text>

              <TouchableOpacity style={styles.menuItem} onPress={handleRestart}>
                <Text style={styles.menuItemText}>🔄 Restart Game</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleEndGame}>
                <Text style={styles.menuItemText}>🏠 End Game</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={hideMenu}>
                <Text style={styles.menuItemText}>❌ Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  burgerButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1000,
    padding: 10,
  },
  burgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  burgerLine: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: '#2E7D32',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    padding: 20,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  menuItem: {
    backgroundColor: '#1B5E20',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  menuItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default BurgerMenu;
