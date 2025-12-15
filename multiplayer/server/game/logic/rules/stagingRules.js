/**
 * Staging Action Rules
 * Rules for determining staging actions (temp stack creation)
 */

const stagingRules = [
  {
    id: 'table-to-table-staging',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      return draggedItem?.source === 'table' &&
             targetInfo?.type === 'loose';
    },
    action: (context) => ({ type: 'tableToTableDrop' }),  // ✅ OPTION B: Function returns complete object
    requiresModal: false,
    priority: 100,
    exclusive: true,
    description: 'Create temp stack from two table cards'
  },
  {
    id: 'hand-to-table-staging',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      return draggedItem?.source === 'hand' &&
             targetInfo?.type === 'loose';
    },
    action: (context) => ({ type: 'handToTableDrop' }),  // ✅ OPTION B: Function returns complete object
    requiresModal: false,
    priority: 90,
    exclusive: true,
    description: 'Create temp stack from hand card and table card'
  },
  {
    id: 'temp-stack-addition',
    condition: (context) => {
      const targetInfo = context.targetInfo;

      return targetInfo?.type === 'temporary_stack';
    },
    action: (context) => ({ type: 'addToStagingStack' }),  // ✅ OPTION B: Function returns complete object
    requiresModal: false,
    priority: 80,
    exclusive: true,
    description: 'Add card to existing temporary stack'
  }
];

module.exports = stagingRules;
