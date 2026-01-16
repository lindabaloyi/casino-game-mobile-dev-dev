/**
 * Debug Configuration
 * Controls debug logging levels for different parts of the application
 */

export const DEBUG_CONFIG = {
  // Client-side debugging
  CLIENT_DRAG: process.env.NODE_ENV === 'development',
  CONTACT_DETECTION: false, // Too verbose, only enable when debugging contact issues
  CLIENT_ACTIONS: process.env.NODE_ENV === 'development',

  // Server-side debugging
  SERVER_ACTIONS: true,
  SERVER_GAME_STATE: false, // Only enable when debugging state issues
  SERVER_VALIDATION: true,

  // Contact system debugging
  CONTACT_SYSTEM: process.env.NODE_ENV === 'development',
  CONTACT_RULES: false, // Enable when debugging rule evaluation

  // Performance debugging
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

    // Debug logging disabled for performance
  }

  info(message: string, data?: any) {
    this.log('CLIENT_ACTIONS', message, data);
  }

  warn(message: string, data?: any) {
    console.warn(`${this.prefix} ${message}`, data);
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
