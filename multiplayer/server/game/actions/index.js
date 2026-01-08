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
const handleCreateTemp = require('./temp/createTemp');
const handleAddToOwnTemp = require('./temp/addToOwnTemp');
const handleCancelTemp = require('./temp/cancelTemp');
const handleCapture = require('./capture/capture');
const handleCreateBuildFromTempStack = require('./build/createBuildFromTempStack');
const handleAddToOwnBuild = require('./build/addToOwnBuild');
const handleInitiateBuildExtension = require('./build/initiateBuildExtension');
const handleCancelBuildExtension = require('./build/cancelBuildExtension');
const handleValidateBuildExtension = require('./build/validateBuildExtension');
const handleTableToTableDrop = require('./card-drop/tableToTableDrop');
const handleHandToTableDrop = require('./card-drop/handToTableDrop');

module.exports = {
  // 🎯 CORE 12 ACTIONS - Including Build Extension
  handleTrail,
  handleCreateTemp,
  handleAddToOwnTemp,
  handleCancelTemp,
  handleCapture,
  handleCreateBuildFromTempStack,
  handleAddToOwnBuild,
  handleInitiateBuildExtension,  // 🎯 NEW: Build Extension Initiation
  handleCancelBuildExtension,    // 🎯 NEW: Build Extension Cancellation
  handleValidateBuildExtension,  // 🎯 NEW: Build Extension Validation
  handleTableToTableDrop,
  handleHandToTableDrop
};
