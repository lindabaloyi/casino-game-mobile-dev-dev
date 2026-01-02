/**
 * Capture Action Rules
 * Rules for determining capture actions
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../../GameState');

const captureRules = [
  {
    id: 'single-card-capture',
    condition: (context) => {
      console.log('[CAPTURE_RULE] Evaluating single card capture:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        isCard: isCard(context.targetInfo?.card)
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        console.log('[CAPTURE_RULE] ❌ Not hand card, rejecting capture');
        return false;
      }

      // Target must be a loose card
      if (targetInfo?.type !== 'loose' || !isCard(targetInfo.card)) {
        console.log('[CAPTURE_RULE] ❌ Not loose card, rejecting capture');
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      const targetValue = rankValue(targetInfo.card.rank);
      const matches = draggedValue === targetValue;

      console.log('[CAPTURE_RULE] Value check:', { draggedValue, targetValue, matches });
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[CAPTURE_RULE] Creating single card capture via temp stack');
      const action = {
        type: 'captureTempStack',
        payload: {
          tempStackId: null, // Single card capture - create temp stack on the fly
          captureValue: rankValue(context.draggedItem.card.rank),
          targetCards: [context.targetInfo.card]
        }
      };
      console.log('[CAPTURE_RULE] Single capture action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 50,
    description: 'Capture single matching card'
  },
  {
    id: 'build-capture',
    condition: (context) => {
      console.log('[CAPTURE_RULE] Evaluating build capture:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        isBuild: isBuild(context.targetInfo?.card)
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        console.log('[CAPTURE_RULE] ❌ Not hand card, rejecting build capture');
        return false;
      }

      // Target must be a build
      if (!isBuild(targetInfo?.card)) {
        console.log('[CAPTURE_RULE] ❌ Not a build, rejecting build capture');
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      const buildValue = targetInfo.card.value;
      const matches = draggedValue === buildValue;

      console.log('[CAPTURE_RULE] Build value check:', { draggedValue, buildValue, matches });
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[CAPTURE_RULE] Creating build capture via temp stack');
      const action = {
        type: 'captureTempStack',
        payload: {
          tempStackId: null, // Build capture - create temp stack on the fly
          captureValue: context.targetInfo.card.value,
          targetCards: context.targetInfo.card.cards || []
        }
      };
      console.log('[CAPTURE_RULE] Build capture action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 45,
    description: 'Capture entire build'
  },
  {
    id: 'temp-stack-capture',
    condition: (context) => {
      console.log('[CAPTURE_RULE] Evaluating temp stack capture:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        isTempStack: isTemporaryStack(context.targetInfo?.card)
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        console.log('[CAPTURE_RULE] ❌ Not hand card, rejecting temp stack capture');
        return false;
      }

      // Target must be a temporary stack
      if (!isTemporaryStack(targetInfo?.card)) {
        console.log('[CAPTURE_RULE] ❌ Not a temp stack, rejecting temp stack capture');
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      const stackValue = targetInfo.card.captureValue ||
                        calculateCardSum(targetInfo.card.cards || []);
      const matches = draggedValue === stackValue;

      console.log('[CAPTURE_RULE] Temp stack value check:', { draggedValue, stackValue, matches });
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[CAPTURE_RULE] Creating temp stack capture action');
      const action = {
        type: 'captureTempStack',
        payload: {
          tempStackId: context.targetInfo.card.stackId,
          captureValue: context.targetInfo.card.captureValue ||
                       calculateCardSum(context.targetInfo.card.cards || [])
        }
      };
      console.log('[CAPTURE_RULE] Temp stack capture action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 40,
    description: 'Capture temporary stack'
  }
];

module.exports = captureRules;
