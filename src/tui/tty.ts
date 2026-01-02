/**
 * TTY Utilities
 * 
 * Terminal cleanup and mouse support helpers.
 */

/**
 * Enable mouse wheel reporting in the terminal.
 * Call this in onMount().
 */
export function enableMouseReporting(): void {
  process.stdout.write("\x1b[?1000h"); // Enable X10 mouse mode
  process.stdout.write("\x1b[?1006h"); // Enable SGR extended mode
}

/**
 * Disable mouse reporting and restore terminal state.
 * Call this on cleanup/exit.
 */
export function disableMouseReporting(): void {
  process.stdout.write("\x1b[?1000l"); // Disable X10 mouse mode
  process.stdout.write("\x1b[?1006l"); // Disable SGR extended mode
}

/**
 * Clear the terminal screen and scrollback buffer.
 */
export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}

/**
 * Reset all terminal attributes (colors, bold, etc).
 */
export function resetAttributes(): void {
  process.stdout.write("\x1b[0m");
}

/**
 * Restore stdin to normal (non-raw) mode.
 */
export function restoreStdin(): void {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Ignore errors if stdin is already in normal mode
    }
  }
}

/**
 * Complete terminal cleanup. Use as onDestroy callback.
 * 
 * @example
 * ```tsx
 * createTuiApp(() => <App />, { onDestroy: cleanupTerminal });
 * ```
 */
export function cleanupTerminal(): void {
  disableMouseReporting();
  clearScreen();
  resetAttributes();
  restoreStdin();
}

/**
 * Parse SGR mouse events from raw stdin data.
 * Returns scroll direction (-1 up, +1 down) or 0 if not a scroll event.
 */
export function parseMouseScroll(data: Buffer): number {
  const str = data.toString();
  // SGR mouse wheel: \x1b[<64;X;YM (scroll up) or \x1b[<65;X;YM (scroll down)
  const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
  if (sgrMatch) {
    const button = parseInt(sgrMatch[1]!, 10);
    if (button === 64) return -1; // Scroll up
    if (button === 65) return 1;  // Scroll down
  }
  return 0;
}
