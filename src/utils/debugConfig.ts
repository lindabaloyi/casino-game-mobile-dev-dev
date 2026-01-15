/**
 * Debug Configuration
 * Controls debug logging levels for different parts of the application
 */

export const DEBUG_CONFIG = {
  // Client-side debugging - DISABLED for production performance
  CLIENT_DRAG: false,
  CONTACT_DETECTION: false,
  CLIENT_ACTIONS: false,

  // Server-side debugging - DISABLED for production performance
  SERVER_ACTIONS: false,
  SERVER_GAME_STATE: false,
  SERVER_VALIDATION: false,

  // Contact system debugging - DISABLED for production performance
  CONTACT_SYSTEM: false,
  CONTACT_RULES: false,

  // Performance debugging - DISABLED for production performance
  PERFORMANCE: false,
} as const;

/**
 * Debug logger utility
 */
export class DebugLogger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  log(level: keyof typeof DEBUG_CONFIG, message: string, data?: any) {
    if (!DEBUG_CONFIG[level]) return;

    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const logMessage = `[${timestamp}] ${this.prefix} ${message}`;

    if (data) {
    } else {
    }
  }

  info(message: string, data?: any) {
    this.log('CLIENT_ACTIONS', message, data);
  }

  warn(message: string, data?: any) {
  }

  error(message: string, data?: any) {
    console.error(`${this.prefix} ${message}`, data);
  }
}

/**
 * Create a logger for a specific component
 */
export function createLogger(prefix: string): DebugLogger {
  return new DebugLogger(prefix);
}
