/**
 * Debug utilities for ArgParser
 */

/**
 * Debug logger that only logs when DEBUG environment variable is set
 */
export const debug = {
  log: (...args: any[]) => {
    if (process.env['DEBUG'] || process.env['ARG_PARSER_DEBUG']) {
      console.log('[ArgParser Debug]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    if (process.env['DEBUG'] || process.env['ARG_PARSER_DEBUG']) {
      console.error('[ArgParser Debug]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env['DEBUG'] || process.env['ARG_PARSER_DEBUG']) {
      console.warn('[ArgParser Debug]', ...args);
    }
  },
};
