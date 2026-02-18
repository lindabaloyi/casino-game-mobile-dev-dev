/**
 * Action Handlers Index
 * Exports all action handlers for registration with ActionRouter
 */

// 🎯 CORE 9 ACTIONS - Only actually used in gameplay
const handleTrail = require("./trail/index");
const handleCreateTemp = require("./temp/createTemp");
const handleAddToOwnTemp = require("./temp/addToOwnTemp");
const handleCancelTemp = require("./temp/cancelTemp");
const handleCapture = require("./capture/capture");
const handleCreateBuildFromTempStack = require("./build/createBuildFromTempStack");
const handleAddToOwnBuild = require("./build/addToOwnBuild");
// Build extension utilities
const handleBuildExtension = require("./build/BuildExtension");
const handleAcceptBuildExtension = require("./build/acceptBuildExtension");
const handleCancelBuildExtension = require("./build/cancelBuildExtension");
const handleAcceptBuildAddition = require("./build/acceptBuildAddition");
const handleMergeBuild = require("./build/mergeBuild");
const handleMergeBuildExtension = require("./build/mergeBuildExtension");
const handleTableToTableDrop = require("./card-drop/tableToTableDrop");
const handleHandToTableDrop = require("./card-drop/handToTableDrop");
const handleCleanup = require("./cleanup");
const handleGameOver = require("./game-over");
const handleReinforceBuild = require("./build/reinforceBuild");

module.exports = {
  // 🎯 CORE 16 ACTIONS - Build Extension System + Build Addition + Reinforce Build + Cleanup + Game Over
  handleTrail,
  handleCreateTemp,
  handleAddToOwnTemp,
  handleCancelTemp,
  handleCapture,
  handleCreateBuildFromTempStack,
  handleAddToOwnBuild,
  handleBuildExtension, // 🎯 NEW: Direct Build Extension
  handleAcceptBuildExtension, // 🎯 NEW: Accept Build Extension
  handleCancelBuildExtension, // 🎯 NEW: Cancel Build Extension
  handleAcceptBuildAddition, // 🎯 NEW: Accept Build Addition
  handleMergeBuild, // 🎯 NEW: Merge Build action
  handleMergeBuildExtension, // 🔀 NEW: Merge Build Extension action
  handleReinforceBuild, // 🏗️ NEW: Reinforce Build action
  handleTableToTableDrop,
  handleHandToTableDrop,
  handleCleanup, // 🧹 NEW: Turn 40 cleanup action
  handleGameOver, // 🎮 NEW: Game over point display action
};
