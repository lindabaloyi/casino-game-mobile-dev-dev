import * as NavigationBar from 'expo-navigation-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameState } from '../multiplayer/server/game-logic/game-state';
import ActionModal from './ActionModal';
import BurgerMenu from './BurgerMenu';
import CapturedCards from './CapturedCards';
import ErrorModal from './ErrorModal';
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
  const [draggedCard, setDraggedCard] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTurnState, setDragTurnState] = useState<any>(null);
  const [modalInfo, setModalInfo] = useState<any>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string } | null>(null);
  const [cardToReset, setCardToReset] = useState<{ rank: string; suit: string } | null>(null);
  const tableSectionRef = useRef<View>(null);

  // Handle server errors
  useEffect(() => {
    if (serverError) {
      console.log('[GameBoard] Received server error:', serverError.message);

      // Trigger instant reset for the card that caused the error
      if (cardToReset) {
        console.log(`[GameBoard] Triggering instant reset for ${cardToReset.rank}${cardToReset.suit} due to server error`);
        // Reset will happen via the triggerReset prop, then clear it after modal shows
      }

      setErrorModal({
        visible: true,
        title: 'Invalid Move',
        message: serverError.message
      });

      // Clear card reset state after animation completes
      setTimeout(() => {
        setCardToReset(null);
      }, 500); // Animation duration
    }
  }, [serverError, cardToReset]);

  // Handle build options when they arrive
  useEffect(() => {
    if (buildOptions && buildOptions.options) {
      console.log('[GameBoard] Build options received:', buildOptions);

      // Handle different types of options (builds, captures, etc.)
      const actions = buildOptions.options.map((option: any) => {
        if (option.type === 'build') {
          return {
            type: 'createBuildWithValue',
            label: option.label,
            payload: {
              stack: buildOptions.stack,
              buildValue: option.payload.value
            }
          };
        } else if (option.type === 'capture') {
          return {
            type: 'executeCaptureFromStack',
            label: option.label,
            payload: {
              stack: buildOptions.stack,
              targetCard: option.payload.targetCard,
              captureValue: option.payload.value
            }
          };
        }
        // Fallback for unknown types
        return {
          type: 'createBuildWithValue',
          label: option.label,
          payload: {
            stack: buildOptions.stack,
            buildValue: option.payload?.value || option
          }
        };
      });

      setModalInfo({
        title: 'Choose Action',
        message: 'What would you like to do with this stack?',
        actions
      });
    }
  }, [buildOptions]);

  // Handle action choices when they arrive (Phase 2: server-centric logic)
  useEffect(() => {
    if (actionChoices && actionChoices.actions) {
      console.log('[GameBoard] Action choices received:', actionChoices);

      setModalInfo({
        title: 'Choose Your Action',
        message: 'What would you like to do?',
        actions: actionChoices.actions,
        requestId: actionChoices.requestId
      });
    }
  }, [actionChoices]);

  // Hide navigation bar when entering game
  useEffect(() => {
    const hideNavBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          console.log('[GAMEBOARD] Navigation bar hidden for gameplay');
        } catch (error) {
          console.warn('[GAMEBOARD] Failed to hide navigation bar:', error);
        }
      }
    };

    hideNavBar();
  }, []);

  const isMyTurn = gameState.currentPlayer === playerNumber;

  const handleDragStart = useCallback((card: any) => {
    console.log(`[GameBoard] handleDragStart: isMyTurn=${isMyTurn}, card=${card?.rank}${card?.suit}`);
    if (!isMyTurn) {
      console.log(`[GameBoard] Not my turn, ignoring drag start`);
      return;
    }
    // Store turn state at drag start to prevent race conditions
    setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn, gameState.currentPlayer]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
    console.log(`🏆 [GameBoard] Card dropped - START:`, {
      draggedCard: draggedItem.card.rank + draggedItem.card.suit,
      source: draggedItem.source,
      targetType: targetInfo.type,
      targetArea: targetInfo.area,
      isMyTurn,
      currentPlayer: gameState.currentPlayer
    });

    if (!isMyTurn) {
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return false;
    }

    // Track this card as the one being dropped (for potential instant reset)
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Send raw drop event to server
    sendAction({
      type: 'card-drop',
      payload: {
        draggedItem,
        targetInfo,
        requestId: Date.now() // For matching responses
      }
    });

    return true;
  }, [isMyTurn, sendAction]);

  const handleModalAction = useCallback((action: any) => {
    console.log(`[GameBoard] Modal action selected:`, action);

    // Check if this is from actionChoices (server-centric modal) or buildOptions (legacy modal)
    if (modalInfo?.requestId) {
      // Phase 2: Action from actionChoices - use execute-action
      sendAction({
        type: 'execute-action',
        payload: action
      });
    } else {
      // Legacy action handling
      sendAction(action);
    }

    setModalInfo(null);
  }, [sendAction, modalInfo?.requestId]);

  const handleModalCancel = useCallback(() => {
    console.log(`[GameBoard] Modal cancelled`);
    setModalInfo(null);
  }, []);

  const handleErrorModalClose = useCallback(() => {
    console.log(`[GameBoard] Error modal closed`);
    setErrorModal(null);
    // Clear server error if it's a server error
    if (onServerErrorClose) {
      onServerErrorClose();
    }
  }, [onServerErrorClose]);

  const handleFinalizeStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Finalizing stack:`, stackId);
    const stack = gameState.tableCards.find(c => 'stackId' in c && c.stackId === stackId);
    if (stack && 'stackId' in stack) {
      sendAction({
        type: 'finalizeStagingStack',
        payload: { stack }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [sendAction, gameState.tableCards]);

  const handleCancelStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Canceling stack:`, stackId);
    const stackToCancel = gameState.tableCards.find(c => 'stackId' in c && c.stackId === stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      sendAction({
        type: 'cancelStagingStack',
        payload: { stackToCancel }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [sendAction, gameState.tableCards]);

  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`🎴 Table drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring table drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleTableCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`🌟 [TableDrag] Table card drag end:`, draggedItem, dropPosition);
    console.log(`🌟 [TableDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit}`);
    console.log(`🌟 [TableDrag] Drop position handled: ${dropPosition.handled}`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle table-to-table drops through Phase 2 system
    if (dropPosition.handled) {
      console.log(`🌟 [TableDrag] Table card drop was handled by a zone`);

      // Check if this drop needs server validation (table zone detected but contact not validated)
      if (dropPosition.needsServerValidation) {
        console.log(`🌟 [TableDrag] Table card drop needs server validation - routing through Phase 2`);

        // Route through Phase 2 card-drop event for server-centric validation
        if (dropPosition.targetType === 'loose') {
          console.log(`🌟 [TableDrag] Table card dropped near loose card - validating with server`);
          console.log(`🌟 [TableDrag] Target card: ${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}`);

          // Find target card index for proper server validation
          const targetIndex = gameState.tableCards.findIndex(card => {
            // Check if it's a loose card (no type property or type === 'loose')
            const isLooseCard = 'rank' in card && 'suit' in card && (!('type' in card) || (card as any).type === 'loose');
            if (isLooseCard) {
              return (card as any).rank === dropPosition.targetCard.rank &&
                     (card as any).suit === dropPosition.targetCard.suit;
            }
            return false;
          });

          // Send through Phase 2 system for validation
          sendAction({
            type: 'card-drop',
            payload: {
              draggedItem: {
                card: draggedItem.card,
                source: 'table',
                player: playerNumber
              },
              targetInfo: {
                type: 'loose',
                card: dropPosition.targetCard,
                index: targetIndex
              },
              requestId: Date.now()
            }
          });

          console.log(`🌟 [TableDrag] Table-to-table validation sent through Phase 2 system`);
          return;
        }
      }

      // For fully validated drops (contactValidated = true), no server routing needed
      console.log(`🌟 [TableDrag] Table card drop was fully validated - no server routing needed`);
      return;
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled by any zone - snapping back`);
  }, [sendAction, gameState.tableCards, playerNumber]);

  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(`🃏 [CapturedDrag] Captured card drag start:`, card);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring captured card drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleCapturedCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`🃏 [CapturedDrag] Captured card drag end:`, draggedItem, dropPosition);
    console.log(`🃏 [CapturedDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit} from opponent's captures`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle captured card drops through same drop system
    if (dropPosition.handled) {
      console.log(`🃏 [CapturedDrag] Captured card drop was handled by a zone`);
      // The drop zone handlers will route this through Phase 2 system
      return;
    }

    // Invalid drop - snap back to opponent's capture pile (no visual source)
    console.log(`🃏 [CapturedDrag] Captured card drop not handled - snapping back`);
  }, []);

  // Register table section as drop zone
  useEffect(() => {
    const registerDropZone = () => {
      if (tableSectionRef.current) {
        tableSectionRef.current.measureInWindow((pageX, pageY, width, height) => {
          const dropZone = {
            stackId: 'table-section',
            bounds: {
              x: pageX,
              y: pageY,
              width: width,
              height: height
            },
            onDrop: (draggedItem: any) => {
              console.log('[GameBoard] Card dropped on table section:', draggedItem);
              // Handle trail action
              return handleDropOnCard(draggedItem, {
                type: 'table',
                area: 'empty'
              });
            }
          };

          // Initialize global registry if needed
          if (!(global as any).dropZones) {
            (global as any).dropZones = [];
          }

          // Remove existing table zone and add new one
          (global as any).dropZones = (global as any).dropZones.filter(
            (zone: any) => zone.stackId !== 'table-section'
          );
          (global as any).dropZones.push(dropZone);

          console.log('[GameBoard] Registered table section drop zone:', dropZone);
        });
      }
    };

    // Register after a short delay to ensure layout is complete
    const timer = setTimeout(registerDropZone, 100);

    return () => {
      clearTimeout(timer);
      // Clean up drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== 'table-section'
        );
      }
    };
  }, [handleDropOnCard]);

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
            onDropOnCard={handleDropOnCard}
            currentPlayer={playerNumber}
            onFinalizeStack={handleFinalizeStack}
            onCancelStack={handleCancelStack}
            onTableCardDragStart={handleTableCardDragStart}
            onTableCardDragEnd={handleTableCardDragEnd}
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
            onCapturedCardDragStart={handleCapturedCardDragStart}
            onCapturedCardDragEnd={handleCapturedCardDragEnd}
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
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
        modalInfo={modalInfo}
        onAction={handleModalAction}
        onCancel={handleModalCancel}
      />
      <ErrorModal
        visible={errorModal !== null}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
        onClose={handleErrorModalClose}
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
