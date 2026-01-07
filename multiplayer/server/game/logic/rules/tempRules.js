/**
 * Temp Action Rules
 * Rules for determining temp actions (temp stack creation and management)
 * Combines rules from multiple specialized rule files
 */

const autoCaptureRules = require('./autoCaptureRules');
const tempStackRules = require('./tempStackRules');
const stagingRules = require('./stagingRules');

// Combine all temp-related rules in priority order
const tempRules = [
  ...autoCaptureRules,  // Priority 210-205: Auto-capture and modal options
  ...tempStackRules,    // Priority 188-100: Temp stack interactions
  ...stagingRules       // Priority 90-85: New temp stack creation
];

module.exports = tempRules;
