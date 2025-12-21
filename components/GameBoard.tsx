
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDragHandlers } from '../hooks/useDragHandlers';
import { useModalManager } from '../hooks/useModalManager';
import { useServerListeners } from '../hooks/useServerListeners';
import { useStagingStacks } from '../hooks/useStagingStacks';
import { useTableDropZone } from '../hooks/useTableDropZone';
import { GameState } from '../multiplayer/server/game-logic/game-state';
import { AcceptValidationModal } from './AcceptValidationModal';
import ActionModal from './ActionModal';
import BurgerMenu from './BurgerMenu';
import CapturedCards from './CapturedCards';
import ErrorModal from './ErrorModal';
import PlayerHand from './playerHand';
import TableCards from './TableCards';
import TrailConfirmationModal from './TrailConfirmationModal';

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  buildOptions?: any;
  onBuildOptionSelected?: (option: any) => void;
  actionChoices?: any;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
}

export function GameBoard({ gameState, playerNumber, sendAction, onRestart, onBackToMenu, buildOptions, actionChoices, serverError, onServerErrorClose }: GameBoardProps) {
  const [cardToReset, setCardToReset] = useState<{ rank: string; suit: string } | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedTempStack, setSelectedTempStack] = useState<any>(null);

  // Extracted modal management
  const modalManager = useModalManager({
    sendAction,
    onServerErrorClose
  });

  // Extracted drag/drop logic
  const dragHandlers = useDragHandlers({
    gameState,
    playerNumber,
    sendAction,
    setCardToReset,
    setErrorModal: modalManager.setErrorModal
  });

  // Extracted server event listeners
  useServerListeners({
    serverError: serverError || null,
    buildOptions,
    actionChoices,
    setModalInfo: modalManager.setModalInfo,
    setTrailCard: modalManager.setTrailCard,
    setErrorModal: modalManager.setErrorModal,
    setCardToReset
  });

  // Extracted staging stack operations
  const stagingStacks = useStagingStacks({
    gameState,
    sendAction
  });

  // Extracted table drop zone registration
  const tableSectionRef = useTableDropZone(dragHandlers.handleDropOnCard);

  // 🎯 NEW: Handle Accept button press - open validation modal
  const handleAcceptClick = (stackId: string) => {
    console.log('🎯 [GameBoard] Accept button clicked for stack:', stackId);

    // Find the temp stack by stackId
    const tempStack = gameState.tableCards.find((card: any) =>
      card.type === 'temporary_stack' && card.stackId === stackId
    );

    if (tempStack) {
      console.log('🎯 [GameBoard] Found temp stack, opening validation modal:', tempStack);
      setSelectedTempStack(tempStack);
      setShowValidationModal(true);
    } else {
      console.error('🎯 [GameBoard] Temp stack not found:', stackId);
    }
  };

  const isMyTurn = gameState.currentPlayer === playerNumber;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BurgerMenu onRestart={onRestart || (() => {})} onEndGame={onBackToMenu || (() => {})} />

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusText}>Round: {gameState.round}</Text>
        <View style={[styles.playerTurnTag, {
          backgroundColor: gameState.currentPlayer === 0 ? '#FF5722' : '#2196F3'
        }]}>
          <Text style={styles.playerTurnText}>P{gameState.currentPlayer + 1}</Text>
        </View>
      </View>

      {/* Main Game Area */}
      <View style={styles.mainGameArea}>
        {/* Table Cards Section */}
        <View ref={tableSectionRef} style={styles.tableCardsSection}>
          <TableCards
            tableCards={gameState.tableCards}
            onDropOnCard={dragHandlers.handleDropOnCard}
            currentPlayer={playerNumber}
            onFinalizeStack={stagingStacks.handleFinalizeStack}
            onCancelStack={stagingStacks.handleCancelStack}
            onTableCardDragStart={dragHandlers.handleTableCardDragStart}
            onTableCardDragEnd={dragHandlers.handleTableCardDragEnd}
            onStagingAccept={handleAcceptClick}  // ✅ NEW: Open validation modal
            onStagingReject={stagingStacks.handleStagingReject}
          />
        </View>

        {/* Opponent Captured Section */}
        <View style={styles.opponentCapturedSection}>
          <CapturedCards
            captures={gameState.playerCaptures?.[(playerNumber + 1) % 2] || []}
            playerIndex={(playerNumber + 1) % 2}
            isOpponent={true}
            isMinimal={true}
            isActivePlayerTurn={isMyTurn}
            onCapturedCardDragStart={dragHandlers.handleCapturedCardDragStart}
            onCapturedCardDragEnd={dragHandlers.handleCapturedCardDragEnd}
          />
        </View>
      </View>

      {/* Player Hands Section */}
      <View style={styles.playerHandsSection}>
        <View style={styles.playerHandArea}>
          <PlayerHand
            player={playerNumber}
            cards={gameState.playerHands?.[playerNumber] || []}
            isCurrent={isMyTurn}
            onDragStart={dragHandlers.handleDragStart}
            onDragEnd={dragHandlers.handleHandCardDragEnd}
            currentPlayer={playerNumber}
            tableCards={gameState.tableCards || []}
            cardToReset={cardToReset}
          />
        </View>
        <View style={styles.playerCapturedArea}>
          <CapturedCards
            captures={gameState.playerCaptures?.[playerNumber] || []}
            playerIndex={playerNumber}
            isOpponent={false}
            isMinimal={true}
          />
        </View>
      </View>

      {/* Modals */}
      <ActionModal
        modalInfo={modalManager.modalInfo}
        onAction={modalManager.handleModalAction}
        onCancel={modalManager.handleModalCancel}
      />
      <TrailConfirmationModal
        trailCard={modalManager.trailCard}
        onConfirm={modalManager.handleTrailConfirm}
        onCancel={modalManager.handleTrailCancel}
      />
      <ErrorModal
        visible={modalManager.errorModal !== null}
        title={modalManager.errorModal?.title || ''}
        message={modalManager.errorModal?.message || ''}
        onClose={modalManager.handleErrorModalClose}
      />

      {/* Accept Validation Modal */}
      <AcceptValidationModal
        visible={showValidationModal}
        onClose={() => {
          console.log('🔒 [GameBoard] Modal closing');
          setShowValidationModal(false);
          setSelectedTempStack(null);
        }}
        tempStack={selectedTempStack}
        playerHand={gameState.playerHands?.[playerNumber] || []}
        sendAction={sendAction} // REQUIRED for auto-capture
        // onCapture prop removed - now optional
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20', // Dark green casino table
  },
  statusSection: {
    height: 30, // Reduced from 60 to half size for more compact header
    backgroundColor: '#2E7D32', // Medium green
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerTurnTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  playerTurnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainGameArea: {
    flex: 1,
    flexDirection: 'row',
  },
  tableCardsSection: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#4CAF50',
  },
  opponentCapturedSection: {
    flex: 1,
    maxWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerHandsSection: {
    height: 120, // Reduced from 140 to make player deck section more compact
    flexDirection: 'row',
  },
  playerHandArea: {
    flex: 6, // Increased to ~86% of the width for more space to prevent card wrapping
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
    paddingHorizontal: 5,
  },
  playerCapturedArea: {
    flex: 0.5, // Reduced to ~14% of the width, just enough for capture cards display
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
    borderLeftWidth: 1,
    borderLeftColor: '#4CAF50',
    paddingHorizontal: 5,
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
  },
});

export default GameBoard;
