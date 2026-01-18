import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

interface GameState {
  deck: any[];
  playerHands: any[][];
  tableCards: any[];
  playerCaptures: any[][];
  currentPlayer: number;
  round: number;
  scores: number[];
  turnCounter: number;
  turnCompletionFlags: boolean[];
  lastCapturer: number | null;
  turn40Analysis?: {
    turnCounter: number;
    tableCardsCount: number;
    lastCapturer: number | null;
    currentPlayer: number;
    playerCaptures: { player: number; cards: number }[];
    turnCompletionStats?: {
      totalTurnsTracked: number;
      completedTurns: number;
      incompleteTurns: number;
      completionRate: string;
      turnCompletionFlags: boolean[];
    };
  };
  cleanupAction?: {
    type: string;
    cardsAwarded: number;
    awardedToPlayer: number;
    timestamp: number;
  };
}

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const useSocket = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [buildOptions, setBuildOptions] = useState<any>(null);
  const [actionChoices, setActionChoices] = useState<any>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketInstance = useMemo(() => {
    return io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }, []);

  useEffect(() => {
    // ============================================================================
    // WEBSOCKET MESSAGE RECEIPT LOGGING - Track client-side reception
    // ============================================================================

    socketInstance.onAny((eventName, ...args) => {
      // Safe data length calculation (handles circular references)
      let dataLength = "unknown";
      try {
        const serialized = JSON.stringify(args[0]);
        dataLength = serialized ? `${serialized.length} chars` : "circular";
      } catch (e) {
        dataLength = "non-serializable";
      }

      console.log(`📨 [WS-RECEIVE] ${eventName}:`, {
        timestamp: new Date().toISOString(),
        dataLength,
        hasGameState: !!args[0]?.gameState,
        hasMeta: !!args[0]?._meta,
        messageId: args[0]?._meta?.id || "none",
      });
    });

    socketInstance.on("connect", () => {
      console.log("✅ [WS] Connected to server");
      setIsConnected(true);
    });

    socketInstance.on(
      "game-start",
      (data: { gameState: GameState; playerNumber: number }) => {
        setGameState(data.gameState);
        setPlayerNumber(data.playerNumber);

        // Initialize turn tracking for game start
        lastTurnCounter = data.gameState.turnCounter;
        lastTurnCompleted = false;

        // Log initial turn 1 start when game begins
        console.log(
          `🎯 TURN COUNTER: ${data.gameState.turnCounter} - Current Player: P${data.gameState.currentPlayer + 1} (${data.gameState.currentPlayer})`,
        );
        console.log(`TurnCompletion : False - shows start of turn`);
      },
    );

    // ============================================================================
    // GAME UPDATE HANDLING - Support both old and new message formats
    // ============================================================================
    let lastServerUpdate = 0;
    let lastTurnCounter = 0;
    let lastTurnCompleted: boolean | null = null;

    socketInstance.on("game-update", (data: any) => {
      const now = Date.now();
      const serverTime = data._meta?.timestamp || now;

      // Handle both message formats:
      // - Old format: data = gameState directly
      // - New format: data = { ...gameState, _meta: {...} }
      const gameStateUpdate = data._meta ? data : data;

      // Detect stale updates
      if (serverTime < lastServerUpdate) {
        console.warn("⚠️ [WS] Received stale update:", {
          serverTime,
          lastUpdate: lastServerUpdate,
          difference: lastServerUpdate - serverTime,
        });
      }

      lastServerUpdate = serverTime;

      // Check if this update makes sense
      const isConsistent = checkStateConsistency(gameStateUpdate, gameState);
      if (!isConsistent) {
        console.error(
          "🚨 [WS] Inconsistent state detected! Requesting sync...",
        );
        socketInstance.emit("request-sync", {
          playerNumber,
          reason: "state_inconsistency",
          clientState: gameState,
        });
      } else {
        setGameState(gameStateUpdate);

        // Check for cleanup action and provide visual feedback
        if (gameStateUpdate.cleanupAction) {
          const cleanup = gameStateUpdate.cleanupAction;
          console.log(`🧹 CLEANUP ACTION DETECTED:`, {
            type: cleanup.type,
            cardsAwarded: cleanup.cardsAwarded,
            awardedToPlayer: cleanup.awardedToPlayer,
            timestamp: new Date(cleanup.timestamp).toISOString(),
          });

          // Trigger visual feedback for cleanup (custom event for UI)
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("cleanupAction", {
                detail: {
                  type: cleanup.type,
                  cardsAwarded: cleanup.cardsAwarded,
                  awardedToPlayer: cleanup.awardedToPlayer,
                  timestamp: cleanup.timestamp,
                },
              }),
            );
          }
        }

        // Log turn counter and completion status
        const turnCompletionFlags = gameStateUpdate.turnCompletionFlags || [];
        const currentTurnIndex = gameStateUpdate.turnCounter - 1; // turnCounter starts at 1
        const currentTurnCompleted = turnCompletionFlags[currentTurnIndex];

        // Check if turn counter changed (new turn started)
        if (gameStateUpdate.turnCounter !== lastTurnCounter) {
          // First, check if the previous turn was completed
          const previousTurnIndex = lastTurnCounter - 1; // turnCounter starts at 1
          const previousTurnCompleted = turnCompletionFlags[previousTurnIndex];

          if (previousTurnCompleted === true) {
            console.log(
              `🎯 TURN COUNTER: ${lastTurnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
            );
            console.log(`TurnCompletion : True - shows end of turn`);
          }

          // Then log the new turn start
          console.log(
            `🎯 TURN COUNTER: ${gameStateUpdate.turnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
          );
          console.log(`TurnCompletion : False - shows start of turn`);
          lastTurnCounter = gameStateUpdate.turnCounter;
          lastTurnCompleted = false;
        }
        // Check if turn completion status changed within the same turn
        else if (
          currentTurnCompleted !== lastTurnCompleted &&
          currentTurnCompleted === true
        ) {
          console.log(
            `🎯 TURN COUNTER: ${gameStateUpdate.turnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
          );
          console.log(`TurnCompletion : True - shows end of turn`);
          lastTurnCompleted = currentTurnCompleted;
        }

        // 🧹 CLIENT-SIDE CLEANUP TRIGGER: Check if turn 40 is reached
        if (gameStateUpdate.turnCounter === 40) {
          console.log(
            "🎯 TURN 40 DETECTED - Checking for cleanup conditions...",
          );

          // Check cleanup conditions on client-side
          const hasTableCards = gameStateUpdate.tableCards.length > 0;
          const bothPlayersFinished =
            gameStateUpdate.playerHands[0].length === 0 &&
            gameStateUpdate.playerHands[1].length === 0;

          console.log("🧹 Cleanup conditions:", {
            hasTableCards,
            bothPlayersFinished,
            tableCardCount: gameStateUpdate.tableCards.length,
            player0Cards: gameStateUpdate.playerHands[0].length,
            player1Cards: gameStateUpdate.playerHands[1].length,
          });

          if (hasTableCards && bothPlayersFinished) {
            console.log(
              "🧹 Cleanup conditions met - Triggering cleanup action",
            );

            // Send cleanup action to server
            setTimeout(() => {
              socketInstance.emit("game-action", {
                type: "cleanup",
                payload: {},
              });
            }, 100); // Small delay to ensure UI updates first
          } else if (!bothPlayersFinished) {
            console.log(
              "🧹 Cleanup conditions not met - players still have cards",
            );
          } else {
            console.log("🧹 Cleanup not needed - no cards on table");
          }
        }
      }
    });

    // Handle sync responses
    socketInstance.on("game-state-sync", (data: any) => {
      console.log("🔄 [SYNC] Received full state sync:", {
        reason: data.reason,
        differences: data.differences,
        serverTime: data.serverTime,
      });

      // Always update to server state on sync
      setGameState(data.gameState);
    });

    socketInstance.on("sync-error", (error: any) => {
      console.error("❌ [SYNC] Sync error:", error);
    });

    function checkStateConsistency(
      newState: GameState,
      currentState: GameState | null,
    ) {
      if (!currentState) return true;

      // Basic sanity checks
      const issues = [];

      // Shouldn't lose cards magically
      currentState.playerHands?.forEach((hand, idx) => {
        const newHand = newState.playerHands?.[idx];
        if (
          hand.length > 0 &&
          newHand?.length === 0 &&
          currentState.currentPlayer === idx
        ) {
          // Player had cards, now has none - could be valid (they played them)
          // But log it for debugging
          console.log(`📝 Player ${idx} emptied hand`);
        }
      });

      // Turn should only advance by 1 or stay same
      const turnDiff = Math.abs(
        newState.currentPlayer - currentState.currentPlayer,
      );
      if (turnDiff > 1 && turnDiff !== 1) {
        // Allow 0 (same) or 1 (next)
        issues.push(
          `Turn jumped from ${currentState.currentPlayer} to ${newState.currentPlayer}`,
        );
      }

      return issues.length === 0;
    }

    socketInstance.on("error", (error: { message: string }) => {
      setError(error);
    });

    socketInstance.on("disconnect", (reason) => {
      // Disconnect handler - optimized for production
    });

    socketInstance.on("connect_error", (error) => {
      console.error(`Connection error:`, error.message || error);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      // Reconnect handler - optimized for production
    });

    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      // Reconnect attempt handler - optimized for production
    });

    socketInstance.on("reconnect_error", (error) => {
      console.error(`Reconnect error:`, error.message || error);
    });

    socketInstance.on("build-options", (options: any) => {
      setBuildOptions(options);
    });

    socketInstance.on("action-choices", (data: any) => {
      setActionChoices({
        requestId: data.requestId,
        actions: data.actions.map((action: any) => ({
          type: action.type,
          label: action.label,
          payload: action.payload,
        })),
      });
    });

    socketInstance.on("action-failed", (data: any) => {
      if (data.resetCard && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cardDragFailed", {
            detail: {
              card: data.resetCard,
              reason: data.error,
            },
          }),
        );
      }
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance]);

  const sendAction = (action: any) => {
    if (!socketInstance) {
      return;
    }

    if (action.type === "card-drop") {
      socketInstance.emit("card-drop", action.payload);
    } else if (action.type === "execute-action") {
      socketInstance.emit("execute-action", { action: action.payload });
    } else {
      socketInstance.emit("game-action", action);
    }
  };

  const clearBuildOptions = () => {
    setBuildOptions(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    gameState,
    playerNumber,
    sendAction,
    buildOptions,
    clearBuildOptions,
    actionChoices,
    error,
    clearError,
    socket: socketInstance,
  };
};
