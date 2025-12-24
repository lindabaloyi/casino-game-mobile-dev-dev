/**
 * Action Handlers Index
 * Exports all action handlers for registration with ActionRouter
 */

const handleConfirmTrail = require('./confirm-trail');
const handleCancelTrail = require('./cancel-trail');
const handleTrail = require('./trail');
const handleCapture = require('./capture');
const handleBuild = require('./build');
const handleCreateStagingStack = require('./createStagingStack');
const handleAddToStagingStack = require('./addToStagingStack');
const handleFinalizeStagingStack = require('./finalizeStagingStack');
const handleCancelStagingStack = require('./cancelStagingStack');
const handleAddToOpponentBuild = require('./addToOpponentBuild');
const handleAddToOwnBuild = require('./addToOwnBuild');
const handleTableToTableDrop = require('./tableToTableDrop');
const handleHandToTableDrop = require('./handToTableDrop');
const handleCreateBuildWithValue = require('./createBuildWithValue');
const handleCaptureTempStack = require('./captureTempStack');
const handleCreateBuildFromTempStack = require('./createBuildFromTempStack');
const handleAddToTemporaryCaptureStack = require('./addToTemporaryCaptureStack');

module.exports = {
  handleConfirmTrail,
  handleCancelTrail,
  handleTrail,
  handleCapture,
  handleBuild,
  handleCreateStagingStack,
  handleAddToStagingStack,
  handleFinalizeStagingStack,
  handleCancelStagingStack,
  handleAddToOpponentBuild,
  handleAddToOwnBuild,
  handleTableToTableDrop,
  handleHandToTableDrop,
  handleCreateBuildWithValue,
  handleCaptureTempStack,
  handleCreateBuildFromTempStack,
  handleAddToTemporaryCaptureStack
};
