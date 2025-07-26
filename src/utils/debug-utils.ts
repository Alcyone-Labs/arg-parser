/**
 * Debug utility for conditional logging based on environment variables
 *
 * This utility provides clean debug logging without scattered conditional statements.
 * Debug output is controlled by the DEBUG environment variable.
 */

/**
 * Check if debug mode is enabled
 */
const isDebugEnabled = (): boolean => {
  try {
    // Safe access to process.env that works in all JavaScript environments
    return Boolean(typeof process !== 'undefined' && process.env && process.env["DEBUG"]);
  } catch {
    // Fallback for environments where process is not available
    return false;
  }
};

/**
 * Debug logger that only outputs when DEBUG environment variable is set
 */
export const debug = {
  /**
   * Log a debug message to stderr (only when DEBUG=true)
   */
  log: (...args: any[]): void => {
    if (isDebugEnabled()) {
      console.error("[DEBUG]", ...args);
    }
  },

  /**
   * Log an error debug message to stderr (only when DEBUG=true)
   */
  error: (...args: any[]): void => {
    if (isDebugEnabled()) {
      console.error("[DEBUG ERROR]", ...args);
    }
  },

  /**
   * Log a warning debug message to stderr (only when DEBUG=true)
   */
  warn: (...args: any[]): void => {
    if (isDebugEnabled()) {
      console.error("[DEBUG WARN]", ...args);
    }
  },

  /**
   * Log an info debug message to stderr (only when DEBUG=true)
   */
  info: (...args: any[]): void => {
    if (isDebugEnabled()) {
      console.error("[DEBUG INFO]", ...args);
    }
  },

  /**
   * Log a debug message with a custom prefix (only when DEBUG=true)
   */
  prefixed: (prefix: string, ...args: any[]): void => {
    if (isDebugEnabled()) {
      console.error(`[DEBUG ${prefix}]`, ...args);
    }
  },

  /**
   * Check if debug mode is currently enabled
   */
  get enabled(): boolean {
    return isDebugEnabled();
  }
};

/**
 * Default export for convenience
 */
export default debug;
