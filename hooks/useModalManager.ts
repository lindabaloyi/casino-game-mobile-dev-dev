import { useCallback, useState } from 'react';

/**
 * Custom hook to manage all modal states and interactions in GameBoard
 * Consolidates modal logic for cleaner component separation
 */
export function useModalManager({
  sendAction,
  onServerErrorClose
}: {
  sendAction: (action: any) => void;
  onServerErrorClose?: () => void;
}) {
  const [modalInfo, setModalInfo] = useState<any>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string } | null>(null);
  const [trailCard, setTrailCard] = useState<{ rank: string; suit: string } | null>(null);

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

  const handleTrailConfirm = useCallback(() => {
    console.log(`[GameBoard] Trail confirmed for card:`, trailCard);

    // Send the confirm-trail action with the card
    sendAction({
      type: 'execute-action',
      payload: {
        type: 'confirm-trail',
        payload: {
          card: trailCard
        }
      }
    });

    setTrailCard(null);
  }, [sendAction, trailCard]);

  const handleTrailCancel = useCallback(() => {
    console.log(`[GameBoard] Trail cancelled for card:`, trailCard);

    // Send the cancel-trail action with the card
    sendAction({
      type: 'execute-action',
      payload: {
        type: 'cancel-trail',
        payload: {
          card: trailCard
        }
      }
    });

    setTrailCard(null);
  }, [sendAction, trailCard]);

  return {
    modalInfo,
    errorModal,
    trailCard,
    setModalInfo,
    setErrorModal,
    setTrailCard,
    handleModalAction,
    handleModalCancel,
    handleErrorModalClose,
    handleTrailConfirm,
    handleTrailCancel
  };
}
