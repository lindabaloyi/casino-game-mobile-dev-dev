/**
 * Action Handlers Index
 * Exports all action handlers for registration with ActionRouter
 */

const handleConfirmTrail = require('./trail/confirm-trail');
const handleCancelTrail = require('./trail/cancel-trail');
const handleTrail = require('./trail/index');
const handleCapture = require('./capture');
const handleBuild = require('./build/build');
const handleCreateStagingStack = require('./staging/createStagingStack');
const handleCreateBuildAugmentationStagingStack = require('./staging/createBuildAugmentationStagingStack');
const handleCreateTableToBuildAugmentationStagingStack = require('./staging/createTableToBuildAugmentationStagingStack');
const handleAddToStagingStack = require('./staging/addToStagingStack');
const handleFinalizeStagingStack = require('./staging/finalizeStagingStack');
const handleFinalizeBuildAugmentation = require('./staging/finalizeBuildAugmentation');
const handleCancelStagingStack = require('./staging/cancelStagingStack');
const handleAddToOpponentBuild = require('./build/addToOpponentBuild');
const handleAddToOwnBuild = require('./build/addToOwnBuild');
const handleTableToTableDrop = require('./tableToTableDrop');
const handleHandToTableDrop = require('./handToTableDrop');
const handleCreateBuildWithValue = require('./build/createBuildWithValue');
const handleCaptureTempStack = require('./captureTempStack');
const handleCreateBuildFromTempStack = require('./build/createBuildFromTempStack');
const handleAddToBuilding = require('./build/addToBuilding');
const handleValidateBuildAugmentation = require('./build/validateBuildAugmentation');
const handleAddToTemporaryCaptureStack = require('./addToTemporaryCaptureStack');
const handleAcceptBuildAddition = require('./build/acceptBuildAddition');
const handleRejectBuildAddition = require('./build/rejectBuildAddition');

module.exports = {
  handleConfirmTrail,
  handleCancelTrail,
  handleTrail,
  handleCapture,
  handleBuild,
  handleCreateStagingStack,
  handleCreateBuildAugmentationStagingStack,
  handleCreateTableToBuildAugmentationStagingStack,
  handleAddToStagingStack,
  handleFinalizeStagingStack,
  handleFinalizeBuildAugmentation,
  handleCancelStagingStack,
  handleAddToOpponentBuild,
  handleAddToOwnBuild,
  handleTableToTableDrop,
  handleHandToTableDrop,
  handleCreateBuildWithValue,
  handleCaptureTempStack,
  handleCreateBuildFromTempStack,
  handleAddToBuilding,
  handleValidateBuildAugmentation,
  handleAddToTemporaryCaptureStack,
  handleAcceptBuildAddition,
  handleRejectBuildAddition
};
