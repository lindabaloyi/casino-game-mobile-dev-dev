/**
 * Temp Stack Actions
 * Handles sending build/capture actions to the server.
 * Uses centralized targetValue for both build and capture.
 */

export async function handleTempStackAction(
  actionType: 'build' | 'capture',
  payload: {
    tempStackId: string;
    buildValue?: number;
    captureValue?: number;
    buildType?: string;
    hasBase?: boolean;
    buildCard?: any;
  },
  sendAction: (action: any) => void
): Promise<void> {
  // Centralize: use targetValue for both build and capture
  const targetValue = payload.buildValue ?? payload.captureValue;
  
  sendAction({
    type: 'acceptTemp',
    payload: {
      stackId: payload.tempStackId,
      targetValue: targetValue,
    },
  });
}
