import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDragHandlers } from "../../hooks/useDragHandlers";
import { useModalManager } from "../../hooks/useModalManager";
import { useServerListeners } from "../../hooks/useServerListeners";
import { useSocket } from "../../hooks/useSocket";
import { useTempStacks } from "../../hooks/useTempStacks";
import { GameState } from "../../multiplayer/server/game-logic/game-state";
import CapturedCards from "../cards/CapturedCards";
import { AcceptValidationModal } from "../modals/AcceptValidationModal";
import ActionModal from "../modals/ActionModal";
import ErrorModal from "../modals/ErrorModal";

import TrailConfirmationModal from "../modals/TrailConfirmationModal";
import BurgerMenu from "../navigation/BurgerMenu";
import PlayerHand from "./playerHand";
import TableCards from "./TableCards";
import { ConnectionStatus } from "./ConnectionStatus";
import { DebugSyncButton } from "./DebugSyncButton";

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

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  onRestart,
  onBackToMenu,
  buildOptions,
  actionChoices,
  serverError,
  onServerErrorClose,
}: GameBoardProps) {
  const [cardToReset, setCardToReset] = useState<{
    rank: string;
    suit: string;
  } | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedTempStack, setSelectedTempStack] = useState<any>(null);
  const [strategicModalOptions, setStrategicModalOptions] = useState<any[]>([]);
  const [showStrategicModal, setShowStrategicModal] = useState(false);

  // Extracted modal management
  const modalManager = useModalManager({
    sendAction,
    onServerErrorClose,
  });

  // Extracted drag/drop logic
  const dragHandlers = useDragHandlers({
    gameState,
    playerNumber,
    sendAction,
    setCardToReset,
    setErrorModal: modalManager.setErrorModal,
    setStrategicModal: (options: any[]) => {
      console.log(
        "🎯 [GameBoard] Strategic modal triggered with options:",
        options,
      );
      setStrategicModalOptions(options);
      setShowStrategicModal(true);
    },
  });

  // Get socket from useSocket hook
  const socketHook = useSocket();
  const socket = socketHook.socket;

  // Extracted server event listeners
  useServerListeners({
    socket,
    serverError: serverError || null,
    buildOptions,
    actionChoices,
    setModalInfo: modalManager.setModalInfo,
    setTrailCard: modalManager.setTrailCard,
    setErrorModal: modalManager.setErrorModal,
    setCardToReset,
  });

  // Extracted temp stack operations
  const tempStacks = useTempStacks({
    gameState,
    sendAction,
  });

  // Build overlay handlers
  const handleAcceptBuildAddition = (buildId?: string) => {
    console.log(
      "[GameBoard] Accepting build addition/extension for build:",
      buildId,
    );

    // If no buildId provided, this is a merge mode call - find the pending extension build for current player
    let build;
    if (!buildId) {
      console.log("[GameBoard] 🔀 No buildId provided - finding pending extension build for merge mode");
      build = gameState.tableCards.find(
        (card: any) => (card as any).type === "build" &&
                       (card as any).isPendingExtension &&
                       (card as any).pendingExtensionPlayer === playerNumber
      ) as any;

      if (build) {
        buildId = (build as any).buildId;
        console.log("[GameBoard] 🔀 Found pending extension build for merge:", buildId);
      }
    } else {
      // Find the build by buildId
      build = gameState.tableCards.find(
        (card: any) => (card as any).type === "build" && (card as any).buildId === buildId,
      ) as any;
    }

    if (!build) {
      console.error("[GameBoard] ❌ Build not found:", { buildId, playerNumber });
      return;
    }

    if (build?.isPendingExtension) {
      // Check if this is merge mode (player already owns a build)
      if (build.mergeMode) {
        // 🔀 MERGE MODE: Find player's existing build and merge extension into it
        const playerBuilds = gameState.tableCards.filter(
          (card: any) => card.type === "build" && card.owner === playerNumber && card.buildId !== buildId
        );

        if (playerBuilds.length > 0) {
          // Use the first (or only) existing player build as target
          const targetPlayerBuildId = playerBuilds[0].buildId;
          console.log("[GameBoard] 🔀 Merging extension into existing build:", {
            sourceBuildId: buildId,
            targetPlayerBuildId,
            mergeMode: build.mergeMode
          });
          sendAction({
            type: "mergeBuildExtension",
            payload: {
              sourceBuildId: buildId,
              targetPlayerBuildId
            },
          });
        } else {
          console.error("[GameBoard] ❌ Merge mode but no existing player build found:", {
            buildId,
            playerNumber,
            mergeMode: build.mergeMode
          });
        }
      } else {
        // 🎯 NORMAL EXTENSION: Accept the extension (creates new build)
        console.log("[GameBoard] Accepting build extension for build:", buildId);
        sendAction({
          type: "acceptBuildExtension",
          payload: { buildId },
        });
      }
    } else {
      // 🎯 PENDING ADDITION: Use existing logic
      console.log("[GameBoard] Accepting build addition for build:", buildId);
      sendAction({
        type: "acceptBuildAddition",
        payload: { buildId },
      });
    }
  };

  const handleRejectBuildAddition = () => {
    console.log("[GameBoard] Rejecting build addition/extension");

    // Find the first pending build addition or extension
    const pendingBuildId = Object.keys(
      gameState.pendingBuildAdditions || {},
    )[0];
    const pendingExtensionBuild = gameState.tableCards.find(
      (card: any) => card.type === "build" && card.isPendingExtension,
    ) as any;

    if (pendingExtensionBuild) {
      // 🎯 CANCEL PENDING EXTENSION: Remove extension card from build
      console.log(
        "[GameBoard] Cancelling build extension for build:",
        pendingExtensionBuild.buildId,
      );
      sendAction({
        type: "cancelBuildExtension",
        payload: { buildId: pendingExtensionBuild.buildId },
      });
    } else if (pendingBuildId) {
      // 🎯 CANCEL PENDING ADDITION: Use existing logic
      console.log(
        "[GameBoard] Rejecting build addition for build:",
        pendingBuildId,
      );
      sendAction({
        type: "rejectBuildAddition",
        payload: { buildId: pendingBuildId },
      });
    }
  };

  // 🎯 NEW: Handle Accept button press - detect stack type and route appropriately
  const handleAcceptClick = (stackId: string) => {
    // Find the temp stack by stackId
    const tempStack = gameState.tableCards.find(
      (card: any) =>
        card.type === "temporary_stack" && card.stackId === stackId,
    );

    if (!tempStack) {
      console.error("🎯 [GameBoard] Temp stack not found:", stackId);
      return;
    }

    // 🎯 DETECT BUILD AUGMENTATION STACKS
    if ((tempStack as any).isBuildAugmentation) {
      // ✅ BUILD AUGMENTATION: Use new two-phase validation
      console.log(
        "🏗️ [GameBoard] Detected BUILD AUGMENTATION stack - calling validateBuildAugmentation",
      );

      // Extract build ID from augmentation stack
      const buildId = (tempStack as any).targetBuildId;
      if (!buildId) {
        console.error(
          "❌ [GameBoard] Build augmentation stack missing targetBuildId:",
          tempStack,
        );
        return;
      }

      // Call the new validation action with both buildId and tempStackId
      sendAction({
        type: "validateBuildAugmentation",
        payload: {
          buildId,
          tempStackId: stackId,
        },
      });

      console.log("✅ [GameBoard] Build augmentation validation action sent", {
        buildId,
        tempStackId: stackId,
      });
    }
    // 🎯 DETECT BUILD EXTENSION STACKS
    else if ((tempStack as any).isBuildExtension) {
      // ✅ BUILD EXTENSION: Use validation action
      console.log(
        "🔄 [GameBoard] Detected BUILD EXTENSION stack - calling validateBuildExtension",
      );

      // Extract target build ID from extension stack
      const targetBuildId = (tempStack as any).targetBuildId;
      if (!targetBuildId) {
        console.error(
          "❌ [GameBoard] Build extension stack missing targetBuildId:",
          tempStack,
        );
        return;
      }

      // Call the build extension validation action
      sendAction({
        type: "validateBuildExtension",
        payload: {
          tempStackId: stackId,
        },
      });

      console.log("✅ [GameBoard] Build extension validation action sent", {
        tempStackId: stackId,
        targetBuildId,
      });
    } else {
      // 🎯 REGULAR STAGING: Use existing modal system
      console.log(
        "🎯 [GameBoard] Regular staging stack - opening validation modal:",
        tempStack,
      );
      setSelectedTempStack(tempStack);
      setShowValidationModal(true);
    }
  };

  // Memoize derived values to prevent unnecessary recalculations
  const isMyTurn = useMemo(() =>
    gameState.currentPlayer === playerNumber,
    [gameState.currentPlayer, playerNumber]
  );

  const playerHand = useMemo(() =>
    gameState.playerHands?.[playerNumber] || [],
    [gameState.playerHands, playerNumber]
  );

  const opponentCaptures = useMemo(() =>
    gameState.playerCaptures?.[(playerNumber + 1) % 2] || [],
    [gameState.playerCaptures, playerNumber]
  );

  const playerCaptures = useMemo(() =>
    gameState.playerCaptures?.[playerNumber] || [],
    [gameState.playerCaptures, playerNumber]
  );



  // Memoize callbacks to prevent child re-renders
  const stableOnRestart = useCallback(onRestart || (() => {}), [onRestart]);
  const stableOnBackToMenu = useCallback(onBackToMenu || (() => {}), [onBackToMenu]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Connection Status Display */}
      <ConnectionStatus status="connected" />

      <BurgerMenu
        onRestart={stableOnRestart}
        onEndGame={stableOnBackToMenu}
      />

      {/* Debug Sync Button */}
      <DebugSyncButton playerNumber={playerNumber} />

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusText}>Round: {gameState.round}</Text>
        <View
          style={[
            styles.playerTurnTag,
            {
              backgroundColor:
                gameState.currentPlayer === 0 ? "#FF5722" : "#2196F3",
            },
          ]}
        >
          <Text style={styles.playerTurnText}>
            P{gameState.currentPlayer + 1}
          </Text>
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
            onTempAccept={handleAcceptClick} // ✅ NEW: Open validation modal
            onTempReject={tempStacks.handleTempReject}
            sendAction={sendAction} // For build augmentation
            gameState={gameState} // For build overlay detection
            onAcceptBuildAddition={handleAcceptBuildAddition} // ✅ NEW: Build overlay handlers
            onRejectBuildAddition={handleRejectBuildAddition} // ✅ NEW: Build overlay handlers
            onAcceptBuildExtension={handleAcceptBuildAddition} // ✅ NEW: Build extension overlay handler
            onCancelBuildExtension={handleRejectBuildAddition} // ✅ NEW: Pass reject handler for cancellation
            onMergeBuildExtension={handleAcceptBuildAddition} // 🔀 NEW: Build merge extension handler (same logic, different UI)
          />
        </View>

        {/* Opponent Captured Section */}
        <View style={styles.opponentCapturedSection}>
          <CapturedCards
            captures={opponentCaptures}
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
            cards={playerHand}
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
            captures={playerCaptures}
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
            console.log("[GameBoard] Trail confirmed - sending trail action");
            sendAction({
              type: "trail",
              payload: {
                card: modalManager.trailCard,
                requestId: `trail_confirm_${Date.now()}`,
              },
            });
            modalManager.setTrailCard(null); // Clear the trail card
          }
        }}
        onCancel={() => {
          console.log("[GameBoard] Trail cancelled");
          modalManager.setTrailCard(null); // Clear the trail card
        }}
      />
      <ErrorModal
        visible={modalManager.errorModal !== null}
        title={modalManager.errorModal?.title || ""}
        message={modalManager.errorModal?.message || ""}
        onClose={modalManager.handleErrorModalClose}
      />

      {/* Accept Validation Modal */}
      <AcceptValidationModal
        visible={showValidationModal}
        onClose={() => {
          console.log("🔒 [GameBoard] Modal closing");
          setShowValidationModal(false);
          setSelectedTempStack(null);
        }}
        tempStack={selectedTempStack}
        playerHand={gameState.playerHands?.[playerNumber] || []}
        sendAction={sendAction} // REQUIRED for auto-capture
        // onCapture prop removed - now optional
      />

      {/* Strategic Capture Modal */}
      <AcceptValidationModal
        visible={showStrategicModal}
        onClose={() => {
          console.log("🔒 [GameBoard] Strategic modal closing");
          setShowStrategicModal(false);
          setStrategicModalOptions([]);
        }}
        availableOptions={strategicModalOptions}
        sendAction={sendAction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B5E20", // Dark green casino table
  },
  statusSection: {
    height: 30, // Reduced from 60 to half size for more compact header
    backgroundColor: "#2E7D32", // Medium green
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  statusText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  playerTurnTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  playerTurnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  mainGameArea: {
    flex: 1,
    flexDirection: "row",
  },
  tableCardsSection: {
    flex: 3,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#4CAF50",
  },
  opponentCapturedSection: {
    flex: 1,
    maxWidth: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  playerHandsSection: {
    height: 120, // Reduced from 140 to make player deck section more compact
    flexDirection: "row",
  },
  playerHandArea: {
    flex: 6, // Increased to ~86% of the width for more space to prevent card wrapping
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#4CAF50",
    paddingHorizontal: 5,
  },
  playerCapturedArea: {
    flex: 0.5, // Reduced to ~14% of the width, just enough for capture cards display
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#4CAF50",
    borderLeftWidth: 1,
    borderLeftColor: "#4CAF50",
    paddingHorizontal: 5,
  },
  placeholderText: {
    color: "white",
    fontSize: 16,
  },
});

// Add React.memo with custom comparison to prevent unnecessary re-renders
const MemoizedGameBoard = React.memo(GameBoard, (prevProps, nextProps) => {
  // Only re-render when these specific props change
  return (
    prevProps.gameState === nextProps.gameState &&
    prevProps.playerNumber === nextProps.playerNumber &&
    prevProps.buildOptions === nextProps.buildOptions &&
    prevProps.actionChoices === nextProps.actionChoices &&
    prevProps.serverError === nextProps.serverError
  );
});

MemoizedGameBoard.displayName = 'GameBoard';

export default MemoizedGameBoard;
