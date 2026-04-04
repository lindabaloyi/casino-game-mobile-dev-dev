/**
 * Debug Logger Utility
 * Provides structured logging for database operations with timestamps and context
 * Includes performance metrics and error tracking
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  VERBOSE: 'VERBOSE'
};

// Color codes for console output
const COLORS = {
  ERROR: '\x1b[31m',    // Red
  WARN: '\x1b[33m',     // Yellow
  INFO: '\x1b[36m',     // Cyan
  DEBUG: '\x1b[35m',    // Magenta
  VERBOSE: '\x1b[90m',  // Gray
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m'
};

/**
 * Format timestamp for logging
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Get caller information for stack trace
 */
function getCallerInfo() {
  const stack = new Error().stack;
  if (!stack) return 'unknown';
  
  const lines = stack.split('\n');
  // Skip this function and formatTimestamp/getCallerInfo
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.includes('getCallerInfo') && !line.includes('formatTimestamp')) {
      // Extract file and line number
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return `${match[2]}:${match[3]}`;
      }
      const match2 = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (match2) {
        return `${match2[1]}:${match2[2]}`;
      }
    }
  }
  return 'unknown';
}

/**
 * Create a debug logger instance for a specific module
 * @param {string} moduleName - Name of the module using the logger
 * @param {string} logLevel - Minimum log level (default: INFO)
 */
function createLogger(moduleName, logLevel = LOG_LEVELS.INFO) {
  const currentLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.INFO;
  
  const shouldLog = (level) => {
    const levels = Object.values(LOG_LEVELS);
    return levels.indexOf(level) <= levels.indexOf(currentLevel);
  };
  
  const formatMessage = (level, message, data) => {
    const timestamp = formatTimestamp();
    const caller = getCallerInfo();
    const prefix = `[${timestamp}] [${level}] [${moduleName}]`;
    const dataStr = data ? `\n  Data: ${JSON.stringify(data, null, 2)}` : '';
    return `${prefix} ${message}${dataStr}\n  Caller: ${caller}`;
  };
  
  const getColor = (level) => {
    return COLORS[level] || COLORS.INFO;
  };
  
  return {
    /**
     * Log an error message
     */
    error(message, data) {
      if (shouldLog(LOG_LEVELS.ERROR)) {
        console.error(`${COLORS.ERROR}${formatMessage('ERROR', message, data)}${COLORS.RESET}`);
      }
    },
    
    /**
     * Log a warning message
     */
    warn(message, data) {
      if (shouldLog(LOG_LEVELS.WARN)) {
        console.warn(`${COLORS.WARN}${formatMessage('WARN', message, data)}${COLORS.RESET}`);
      }
    },
    
    /**
     * Log an info message
     */
    info(message, data) {
      if (shouldLog(LOG_LEVELS.INFO)) {
        console.log(`${COLORS.INFO}${formatMessage('INFO', message, data)}${COLORS.RESET}`);
      }
    },
    
    /**
     * Log a debug message
     */
    debug(message, data) {
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`${COLORS.DEBUG}${formatMessage('DEBUG', message, data)}${COLORS.RESET}`);
      }
    },
    
    /**
     * Log a verbose/debug message (very detailed)
     */
    verbose(message, data) {
      if (shouldLog(LOG_LEVELS.VERBOSE)) {
        console.log(`${COLORS.VERBOSE}${formatMessage('VERBOSE', message, data)}${COLORS.RESET}`);
      }
    },
    
    /**
     * Log database operation with timing
     */
    dbOperation(operation, query, startTime) {
      const duration = Date.now() - startTime;
      const color = duration > 1000 ? COLORS.ERROR : duration > 500 ? COLORS.WARN : COLORS.GREEN;
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`${color}[DB] ${operation} completed in ${duration}ms${COLORS.RESET}`);
        if (shouldLog(LOG_LEVELS.VERBOSE)) {
          console.log(`${COLORS.VERBOSE}  Query: ${JSON.stringify(query)}${COLORS.RESET}`);
        }
      }
    },
    
    /**
     * Log request/response for API calls
     */
    apiCall(method, endpoint, statusCode, duration, data) {
      const color = statusCode >= 400 ? COLORS.ERROR : statusCode >= 300 ? COLORS.WARN : COLORS.GREEN;
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`${color}[API] ${method} ${endpoint} -> ${statusCode} (${duration}ms)${COLORS.RESET}`);
        if (data && shouldLog(LOG_LEVELS.VERBOSE)) {
          console.log(`${COLORS.VERBOSE}  Response: ${JSON.stringify(data)}${COLORS.RESET}`);
        }
      }
    },
    
    /**
     * Log function entry
     */
    enter(context = {}) {
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`${COLORS.DEBUG}[ENTER] ${moduleName}${COLORS.RESET}`, context);
      }
    },
    
    /**
     * Log function exit
     */
    exit(result, context = {}) {
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`${COLORS.DEBUG}[EXIT] ${moduleName}${COLORS.RESET}`, { result, ...context });
      }
    },
    
    /**
     * Log an error with stack trace
     */
    errorWithStack(message, error) {
      if (shouldLog(LOG_LEVELS.ERROR)) {
        console.error(`${COLORS.ERROR}[ERROR] ${message}${COLORS.RESET}`);
        console.error(error);
      }
    }
  };
}

/**
 * Create a performance timer
 */
function createTimer() {
  const startTime = Date.now();

  return {
    startTime,
    /**
     * Get elapsed time in milliseconds
     */
    elapsed() {
      return Date.now() - startTime;
    },

    /**
     * Log elapsed time with message
     */
    logElapsed(logger, message) {
      const elapsed = this.elapsed();
      logger.debug(message, { elapsedMs: elapsed });
      return elapsed;
    }
  };
}

/**
 * Database query logger helper
 */
function logDbOperation(logger, operationName, query) {
  const timer = createTimer();
  
  return {
    /**
     * Complete the operation logging
     */
    complete(result) {
      logger.dbOperation(operationName, query, timer.startTime);
      return result;
    },
    
    /**
     * Log error and rethrow
     */
    error(error) {
      logger.error(`${operationName} failed`, { error: error.message, query });
      throw error;
    }
  };
}

module.exports = {
  createLogger,
  createTimer,
  logDbOperation,
  LOG_LEVELS
};
