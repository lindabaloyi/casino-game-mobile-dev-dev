/**
 * Logger Utility
 * Consistent logging format for debugging and monitoring
 */

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, module, message, data = null) {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${module}] ${message}${dataStr}`;
}

class Logger {
  constructor(module) {
    this.module = module;
  }

  debug(message, data) {
    console.log(formatMessage('DEBUG', this.module, message, data));
  }

  info(message, data) {
    console.log(formatMessage('INFO', this.module, message, data));
  }

  warn(message, data) {
    console.warn(formatMessage('WARN', this.module, message, data));
  }

  error(message, data) {
    console.error(formatMessage('ERROR', this.module, message, data));
  }
}

module.exports = { Logger };
// Export factory function for easy usage
module.exports.createLogger = (module) => new Logger(module);
