/**
 * Action Handlers Index
 * Exports all action handlers for registration with ActionRouter
 */

// 🔍 DEBUG: Intercept build card sorting (without extending native prototypes)
console.log('[ACTIONS_DEBUG] Loading actions.js file');
console.log('[ACTIONS_DEBUG] Checking for sorting functions...');

// Create a wrapper to detect build card sorting
const createSortingDetector = () => {
  return (array, compareFn) => {
    // Check if this looks like a build cards array
    const isBuildCards = Array.isArray(array) && array.length > 0 &&
                        array.some(item => item && typeof item === 'object' &&
                        (item.rank && item.suit)); // Has card properties

    if (isBuildCards) {
      const stack = new Error().stack;
      const isBuildContext = stack.includes('build') ||
                            stack.includes('Build') ||
                            stack.includes('staging');

      if (isBuildContext) {
        console.log('[ACTIONS_DEBUG] ⚠️ BUILD CARDS BEING SORTED!', {
          cardsCount: array.length,
          cards: array.map(c => c ? `${c.rank}${c.suit}=${c.value}` : 'null'),
          compareFn: compareFn ? compareFn.toString().substring(0, 100) : 'default',
          stackTrace: stack.split('\n').slice(1, 4).join('\n')
        });
      }
    }

    return array.slice().sort(compareFn); // Create copy and sort
  };
};

global.buildSortDetector = createSortingDetector();

// 🎯 CORE 9 ACTIONS - Only actually used in gameplay
const handleTrail = require('./trail/index');
const handleCreateStagingStack = require('./staging/createStagingStack');
const handleAddToStagingStack = require('./staging/addToStagingStack');
const handleCancelStagingStack = require('./staging/cancelStagingStack');
const handleCaptureTempStack = require('./captureTempStack');
const handleCreateBuildFromTempStack = require('./build/createBuildFromTempStack');
const handleAddToOwnBuild = require('./build/addToOwnBuild');
const handleTableToTableDrop = require('./tableToTableDrop');
const handleHandToTableDrop = require('./handToTableDrop');

module.exports = {
  // 🎯 CORE 9 ACTIONS - Only actually used in gameplay
  handleTrail,
  handleCreateStagingStack,
  handleAddToStagingStack,
  handleCancelStagingStack,
  handleCaptureTempStack,
  handleCreateBuildFromTempStack,
  handleAddToOwnBuild,
  handleTableToTableDrop,
  handleHandToTableDrop
};
