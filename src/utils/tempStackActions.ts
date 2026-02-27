/**
 * Temp Stack Actions
 * Handles sending build/capture actions to the server.
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
  if (actionType === 'build') {
    sendAction({
      type: 'acceptTemp',
      payload: {
        stackId: payload.tempStackId,
        buildValue: payload.buildValue,
        buildType: payload.buildType,
        hasBase: payload.hasBase,
      },
    });
  } else if (actionType === 'capture') {
    sendAction({
      type: 'acceptTemp',
      payload: {
        stackId: payload.tempStackId,
        captureValue: payload.captureValue,
      },
    });
  }
}
