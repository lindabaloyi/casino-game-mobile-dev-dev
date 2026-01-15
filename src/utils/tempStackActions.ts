/**
 * Temp Stack Actions Service
 * Handles processing of temp stack actions and game logic
 */

import { Card } from './buildValidators';

export interface TempStackActionPayload {
  tempStackId: string;
  buildValue?: number;
  buildType?: 'same-value' | 'base' | 'normal';
  buildCard?: Card | null;
  captureValue?: number;
}

/**
 * Process temp stack build creation
 */
export const createBuildFromTempStack = async (
  payload: TempStackActionPayload,
  sendAction: (action: any) => void
): Promise<void> => {
  // Send the build creation action
  sendAction({
    type: 'createBuildFromTempStack',
    payload: {
      tempStackId: payload.tempStackId,
      buildValue: payload.buildValue,
      buildType: payload.buildType,
      buildCard: payload.buildCard
    }
  });

  // Clean up temp stack from contact registry
  try {
    const { removePosition } = await import('./contactDetection');
    removePosition(payload.tempStackId);
  } catch (error) {
    console.error('❌ [ACTIONS] Failed to remove temp stack from registry:', error);
  }
};

/**
 * Process temp stack capture
 */
export const captureTempStack = (
  payload: TempStackActionPayload,
  sendAction: (action: any) => void
): void => {
  sendAction({
    type: 'capture',
    payload: {
      tempStackId: payload.tempStackId,
      captureValue: payload.captureValue
    }
  });
};

/**
 * Process build extension validation
 */
export const validateBuildExtension = (
  payload: { tempStackId: string },
  sendAction: (action: any) => void
): void => {
  sendAction({
    type: 'validateBuildExtension',
    payload: {
      tempStackId: payload.tempStackId
    }
  });
};

/**
 * Main action processor for temp stack operations
 */
export const handleTempStackAction = async (
  actionType: 'build' | 'capture',
  payload: TempStackActionPayload,
  sendAction: (action: any) => void
): Promise<void> => {
  if (actionType === 'build') {
    await createBuildFromTempStack(payload, sendAction);
  } else if (actionType === 'capture') {
    captureTempStack(payload, sendAction);
  } else {
    throw new Error(`Unknown action type: ${actionType}`);
  }
};