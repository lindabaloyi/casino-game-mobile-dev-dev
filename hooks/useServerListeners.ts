import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Custom hook to manage all server event listeners and socket interactions
 * Consolidates server-side event handling for cleaner component separation
 */
export function useServerListeners({
  serverError,
  buildOptions,
  actionChoices,
  setModalInfo,
  setTrailCard,
  setErrorModal,
  setCardToReset,
  setGameOverData
}: {
  serverError: { message: string } | null;
  buildOptions?: any;
  actionChoices?: any;
  setModalInfo: (modal: any) => void;
  setTrailCard: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: { visible: boolean; title: string; message: string } | null) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
  setGameOverData?: (data: any) => void;
}) {
  // Handle server errors (Game-Appropriate Version)
  useEffect(() => {
    if (serverError) {
      // 🎯 FIX 7: GRACEFUL ERROR HANDLING - Don't interrupt temp stack building
      const isTempStackError = serverError.message?.includes('staging') ||
                              serverError.message?.includes('temp') ||
                              serverError.message?.includes('stack');

      if (isTempStackError) {
        // For temp stack errors, show brief warning but don't reset cards or interrupt flow
        setErrorModal({
          visible: true,
          title: 'Stack Building Note',
          message: serverError.message + ' (Continuing with flexible stacking)'
        });

        // Auto-hide after 2 seconds (don't wait for user interaction)
        setTimeout(() => {
          setErrorModal(null);
        }, 2000);

        // DON'T reset card position for temp stack operations
        return;
      }

      // For critical errors (not temp stack related), use original behavior
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
  }, [serverError, setErrorModal, setCardToReset]);

  // Handle build options when they arrive
  useEffect(() => {
    if (buildOptions && buildOptions.options) {
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
  }, [buildOptions, setModalInfo]);

  // Handle action choices when they arrive (Phase 2: server-centric logic)
  useEffect(() => {
    if (actionChoices && actionChoices.actions) {
      setModalInfo({
        title: 'Choose Your Action',
        message: 'What would you like to do?',
        actions: actionChoices.actions,
        requestId: actionChoices.requestId
      });
    }
  }, [actionChoices, setModalInfo]);

  // Handle staging creation from server
  useEffect(() => {
    const socket = (global as any).socket;
    if (!socket) return;

    const handleStagingCreated = (data: any) => {
      // Client receives staging-created event but doesn't need to do anything special
      // The game state update will show the staging stack
    };

    socket.on('staging-created', handleStagingCreated);

    return () => {
      socket.off('staging-created', handleStagingCreated);
    };
  }, []);

  // Handle game over events
  useEffect(() => {
    const socket = (global as any).socket;
    if (!socket || !setGameOverData) return;

    const handleGameOver = (data: any) => {
      setGameOverData(data);
    };

    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [setGameOverData]);

  // Hide navigation bar when entering game (Platform/OS specific)
  useEffect(() => {
    const hideNavBar = async () => {
      if (Platform.OS === 'android') {
        try {
          // Import removed due to require() style import being forbidden
        } catch {
        }
      }
    };

    hideNavBar();
  }, []);
}
