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
  setCardToReset
}: {
  serverError: { message: string } | null;
  buildOptions?: any;
  actionChoices?: any;
  setModalInfo: (modal: any) => void;
  setTrailCard: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: { visible: boolean; title: string; message: string } | null) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
}) {
  // Handle server errors
  useEffect(() => {
    if (serverError) {
      console.log('[GameBoard] Received server error:', serverError.message);

      // Trigger instant reset for the card that caused the error
      // This is handled by the error modal timeout below

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
  }, [buildOptions, setModalInfo]);

  // Handle action choices when they arrive (Phase 2: server-centric logic)
  useEffect(() => {
    if (actionChoices && actionChoices.actions) {
      console.log('[CLIENT_DEBUG] ===== ACTION CHOICES RECEIVED =====');
      console.log('[CLIENT_DEBUG] Raw actionChoices:', JSON.stringify(actionChoices, null, 2));
      console.log('[CLIENT_DEBUG] Actions count:', actionChoices.actions.length);
      console.log('[CLIENT_DEBUG] Actions types:', actionChoices.actions.map((a: any) => a.type));

      // Check if this is a single trail action that requires confirmation
      if (actionChoices.actions.length === 1 && actionChoices.actions[0].type === 'trail') {
        const trailAction = actionChoices.actions[0];
        console.log('[CLIENT_DEBUG] Single trail action detected');
        console.log('[CLIENT_DEBUG] Trail action structure:', JSON.stringify(trailAction, null, 2));
        console.log('[CLIENT_DEBUG] Checking trailAction.payload:', !!trailAction.payload);
        console.log('[CLIENT_DEBUG] Checking trailAction.payload.card:', !!trailAction.payload?.card);

        if (trailAction.payload && trailAction.payload.card) {
          console.log('[CLIENT_DEBUG] Setting trail card:', trailAction.payload.card);
          setTrailCard(trailAction.payload.card);
          console.log('[CLIENT_DEBUG] Trail card set successfully');
          return;
        } else {
          console.error('[CLIENT_DEBUG] ❌ TRAIL ACTION MALFORMED:', {
            hasPayload: !!trailAction.payload,
            payloadKeys: trailAction.payload ? Object.keys(trailAction.payload) : 'no payload',
            fullAction: trailAction
          });
          return;
        }
      }

      console.log('[CLIENT_DEBUG] Setting modal for multiple actions');
      setModalInfo({
        title: 'Choose Your Action',
        message: 'What would you like to do?',
        actions: actionChoices.actions,
        requestId: actionChoices.requestId
      });
      console.log('[CLIENT_DEBUG] Modal set successfully');
    }
  }, [actionChoices, setModalInfo, setTrailCard]);

  // Handle staging creation from server
  useEffect(() => {
    const socket = (global as any).socket;
    if (!socket) return;

    const handleStagingCreated = (data: any) => {
      console.log(`[GameBoard] Staging created from server:`, data);
      // Client receives staging-created event but doesn't need to do anything special
      // The game state update will show the staging stack
    };

    socket.on('staging-created', handleStagingCreated);

    return () => {
      socket.off('staging-created', handleStagingCreated);
    };
  }, []);

  // Hide navigation bar when entering game (Platform/OS specific)
  useEffect(() => {
    const hideNavBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = require('expo-navigation-bar');
          await NavigationBar.setVisibilityAsync('hidden');
          console.log('[GAMEBOARD] Navigation bar hidden for gameplay');
        } catch (error) {
          console.warn('[GAMEBOARD] Failed to hide navigation bar:', error);
        }
      }
    };

    hideNavBar();
  }, []);
}
