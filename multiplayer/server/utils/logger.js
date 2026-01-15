/**
 * Structured Logger with Levels and Context
 * Provides clean, consistent logging across the server
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.ERROR; // Production: minimal logging

function createLogger(moduleName) {
  return {
    error: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${moduleName}] ${message}`, data);
      }
    },

    warn: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
        console.warn(`[${new Date().toISOString()}] [WARN] [${moduleName}] ${message}`, data);
      }
    },

    info: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        console.log(`[${new Date().toISOString()}] [INFO] [${moduleName}] ${message}`, data);
      }
    },

    debug: (message, data = {}) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        console.log(`[${new Date().toISOString()}] [DEBUG] [${moduleName}] ${message}`, data);
      }
    },

    action: (actionType, gameId, playerIndex, data = {}) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        console.log(`[${new Date().toISOString()}] [ACTION] ${actionType} | Game:${gameId} | Player:${playerIndex}`, data);
      }
    },

    gameState: (gameId, beforeState, afterState, actionType) => {
      if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        const logData = {
          before: 'N/A',
          after: 'N/A'
        };

        // Safe beforeState check
        if (beforeState) {
          logData.before = {
            currentPlayer: beforeState.currentPlayer,
            tableCards: beforeState.tableCards?.length || 0,
            playerHands: beforeState.playerHands?.map(h => h?.length || 0) || [],
            playerCaptures: beforeState.playerCaptures?.map(p => p?.length || 0) || []
          };
        } else {
          logData.before = 'GAME NOT FOUND';
        }

        // Safe afterState check
        if (afterState) {
          logData.after = {
            currentPlayer: afterState.currentPlayer,
            tableCards: afterState.tableCards?.length || 0,
            playerHands: afterState.playerHands?.map(h => h?.length || 0) || [],
            playerCaptures: afterState.playerCaptures?.map(p => p?.length || 0) || []
          };
        }

        console.log(`[${new Date().toISOString()}] [GAME_STATE] ${actionType || 'UPDATE'} | Game:${gameId}`, logData);
      }
    }
  };
}

module.exports = { createLogger, LOG_LEVELS };
