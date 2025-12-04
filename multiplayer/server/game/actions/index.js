/**
 * Action Handlers Index
 * Exports all action handlers for registration with ActionRouter
 */

const handleTrail = require('./trail');
const handleCapture = require('./capture');
const handleBuild = require('./build');
const handleCreateStagingStack = require('./createStagingStack');
const handleAddToStagingStack = require('./addToStagingStack');
const handleFinalizeStagingStack = require('./finalizeStagingStack');
const handleCancelStagingStack = require('./cancelStagingStack');
const handleAddToOpponentBuild = require('./addToOpponentBuild');
const handleAddToOwnBuild = require('./addToOwnBuild');
const handleTableCardDrop = require('./tableCardDrop');
const handleCreateBuildWithValue = require('./createBuildWithValue');
const handleAddToTemporaryCaptureStack = require('./addToTemporaryCaptureStack');

module.exports = {
  handleTrail,
  handleCapture,
  handleBuild,
  handleCreateStagingStack,
  handleAddToStagingStack,
  handleFinalizeStagingStack,
  handleCancelStagingStack,
  handleAddToOpponentBuild,
  handleAddToOwnBuild,
  handleTableCardDrop,
  handleCreateBuildWithValue,
  handleAddToTemporaryCaptureStack
};
