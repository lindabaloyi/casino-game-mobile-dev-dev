/**
 * extendBuild.js
 * 
 * This is a placeholder handler - SmartRouter routes extendBuild to
 * either startBuildExtension or acceptBuildExtension. This handler
 * exists only because ActionRouter requires all actions to have a
 * registered handler.
 * 
 * NOTE: This handler should NEVER be called directly since SmartRouter
 * always re-routes extendBuild to one of its sub-actions.
 */

function extendBuild(state, payload, playerIndex) {
  // SmartRouter should have already re-routed this to startBuildExtension
  // or acceptBuildExtension. If we reach here, something is wrong.
  console.error('[extendBuild] ERROR: This handler should not be called directly!');
  console.error('[extendBuild] Payload:', payload);
  throw new Error('extendBuild should be routed by SmartRouter, not executed directly');
}

module.exports = extendBuild;
