
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDragHandlers } from '../../hooks/useDragHandlers';
import { useModalManager } from '../../hooks/useModalManager';
import { useServerListeners } from '../../hooks/useServerListeners';
import { useTempStacks } from '../../hooks/useTempStacks';
import { GameState } from '../../multiplayer/server/game-logic/game-state';
import CapturedCards from '../cards/CapturedCards';
import { AcceptValidationModal } from '../modals/AcceptValidationModal';
import ActionModal from '../modals/ActionModal';
import ErrorModal from '../modals/ErrorModal';
import { GameOverModal } from '../modals/GameOverModal';
import TrailConfirmationModal from '../modals/TrailConfirmationModal';
import BurgerMenu from '../navigation/BurgerMenu';
import PlayerHand from './playerHand';
import TableCards from './TableCards';

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

  // Game over state
  const [gameOverData, setGameOverData] = useState<{
    winner: number;
    scores: [number, number];
    winnerScore: number;
    loserScore: number;
    lastCapturer: number;
    finalCaptures: {
      player0: string[];
      player1: string[];
    };
  } | null>(null);

  // Extracted server event listeners
  useServerListeners({
    serverError: serverError || null,
    buildOptions,
    actionChoices,
    setModalInfo: modalManager.setModalInfo,
    setTrailCard: modalManager.setTrailCard,
    setErrorModal: modalManager.setErrorModal,
    setCardToReset,
    setGameOverData
  });

  // Extracted temp stack operations
  const tempStacks = useTempStacks({
    gameState,
    sendAction
  });

  // Build overlay handlers
  const handleAcceptBuildAddition = (buildId: string) => {
    // Find the build to check if it's a pending extension
    const build = gameState.tableCards.find((card: any) =>
      card.type === 'build' && card.buildId === buildId
    ) as any;

    if (build?.isPendingExtension) {
      // 🎯 PENDING EXTENSION: Accept the extension
      sendAction({
        type: 'acceptBuildExtension',
        payload: { buildId }
      });
    } else {
      // 🎯 PENDING ADDITION: Use existing logic
      sendAction({
        type: 'acceptBuildAddition',
        payload: { buildId }
      });
    }
  };

  const handleRejectBuildAddition = () => {
    // Find the first pending build addition or extension
    const pendingBuildId = Object.keys(gameState.pendingBuildAdditions || {})[0];
    const pendingExtensionBuild = gameState.tableCards.find((card: any) =>
      card.type === 'build' && card.isPendingExtension
    ) as any;

    if (pendingExtensionBuild) {
      // 🎯 CANCEL PENDING EXTENSION: Remove extension card from build
      sendAction({
        type: 'cancelBuildExtension',
        payload: { buildId: pendingExtensionBuild.buildId }
      });
    } else if (pendingBuildId) {
      // 🎯 CANCEL PENDING ADDITION: Use existing logic
      sendAction({
        type: 'rejectBuildAddition',
        payload: { buildId: pendingBuildId }
      });
    }
  };

  // DEPRECATED: Trail drop handlers removed - trails now use contact detection

  // DEPRECATED: Trail drop zone registration removed - trails now use contact detection
  // Table section ref removed - no longer needed for drop zones

  // 🎯 NEW: Handle Accept button press - detect stack type and route appropriately
  const handleAcceptClick = (stackId: string) => {
    // Find the temp stack by stackId
    const tempStack = gameState.tableCards.find((card: any) =>
      card.type === 'temporary_stack' && card.stackId === stackId
    );

    if (!tempStack) {
      console.error('🎯 [GameBoard] Temp stack not found:', stackId);
      return;
    }

    // 🎯 DETECT BUILD AUGMENTATION STACKS
    if ((tempStack as any).isBuildAugmentation) {
      // ✅ BUILD AUGMENTATION: Use new two-phase validation
      // Extract build ID from augmentation stack
      const buildId = (tempStack as any).targetBuildId;
      if (!buildId) {
        console.error('❌ [GameBoard] Build augmentation stack missing targetBuildId:', tempStack);
        return;
      }

      // Call the new validation action with both buildId and tempStackId
      sendAction({
        type: 'validateBuildAugmentation',
        payload: {
          buildId,
          tempStackId: stackId
        }
      });
    }
    // 🎯 DETECT BUILD EXTENSION STACKS
    else if ((tempStack as any).isBuildExtension) {
      // ✅ BUILD EXTENSION: Use validation action
      // Extract target build ID from extension stack
      const targetBuildId = (tempStack as any).targetBuildId;
      if (!targetBuildId) {
        console.error('❌ [GameBoard] Build extension stack missing targetBuildId:', tempStack);
        return;
      }

      // Call the build extension validation action
      sendAction({
        type: 'validateBuildExtension',
        payload: {
          tempStackId: stackId
        }
      });
    } else {
      // 🎯 REGULAR STAGING: Use existing modal system
      setSelectedTempStack(tempStack);
      setShowValidationModal(true);
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
        <View style={styles.tableCardsSection}>
          <TableCards
            tableCards={gameState.tableCards}
            currentPlayer={playerNumber}
            onFinalizeStack={tempStacks.handleFinalizeStack}
            onCancelStack={tempStacks.handleCancelStack}
            onTableCardDragStart={dragHandlers.handleTableCardDragStart}
            onTableCardDragEnd={dragHandlers.handleTableCardDragEnd}
            onTempAccept={handleAcceptClick}  // ✅ NEW: Open validation modal
            onTempReject={tempStacks.handleTempReject}
            sendAction={sendAction}  // For build augmentation
            gameState={gameState}  // For build overlay detection
            onAcceptBuildAddition={handleAcceptBuildAddition}  // ✅ NEW: Build overlay handlers
            onRejectBuildAddition={handleRejectBuildAddition}  // ✅ NEW: Build overlay handlers
            onAcceptBuildExtension={handleAcceptBuildAddition} // ✅ NEW: Build extension overlay handler
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
            onOppTopCardDragStart={dragHandlers.handleOppTopCardDragStart}
            onOppTopCardDragEnd={dragHandlers.handleOppTopCardDragEnd}
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
        onConfirm={() => {
          if (modalManager.trailCard) {
            sendAction({
              type: 'trail',
              payload: {
                card: modalManager.trailCard,
                requestId: `trail_confirm_${Date.now()}`
              }
            });
            modalManager.setTrailCard(null); // Clear the trail card
          }
        }}
        onCancel={() => {
          modalManager.setTrailCard(null); // Clear the trail card
        }}
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
          setShowValidationModal(false);
          setSelectedTempStack(null);
        }}
        tempStack={selectedTempStack}
        playerHand={gameState.playerHands?.[playerNumber] || []}
        sendAction={sendAction} // REQUIRED for auto-capture
        // onCapture prop removed - now optional
      />

      {/* Game Over Modal */}
      {gameOverData && (
        <GameOverModal
          visible={true}
          winner={gameOverData.winner}
          scores={gameOverData.scores}
          winnerScore={gameOverData.winnerScore}
          loserScore={gameOverData.loserScore}
          lastCapturer={gameOverData.lastCapturer}
          finalCaptures={gameOverData.finalCaptures}
          onPlayAgain={() => {
            // TODO: Implement play again logic
          }}
          onReturnToMenu={() => {
            // TODO: Implement return to menu logic
          }}
        />
      )}
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
