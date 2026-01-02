/**
 * Removes ANSI escape codes from a string.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    "",
  );
}

/**
 * Returns the visual width of a string (ignoring ANSI codes).
 */
export function visualLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Wraps text to a specific width, preserving ANSI color codes across lines.
 *
 * @param text The input text to wrap
 * @param width The maximum width per line
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text];

  const result: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (visualLength(line) <= width) {
      result.push(line);
      continue;
    }

    let currentLine = "";
    let currentVisibleLength = 0;
    let activeAnsiCodes: string[] = [];

    // Regex to match ANSI codes or single characters
    // This regex matches:
    // 1. ANSI escape sequences
    // 2. Any other single character
    const tokenRegex = /(\u001b\[(?:\d{1,3}(?:;\d{1,3})*)?[mK])|([\s\S])/g;

    let match;
    while ((match = tokenRegex.exec(line)) !== null) {
      const ansiCode = match[1];
      const char = match[2];

      if (ansiCode) {
        // It's an ANSI code
        currentLine += ansiCode;

        // Track state
        if (ansiCode === "\u001b[0m") {
          activeAnsiCodes = [];
        } else if (ansiCode.endsWith("m")) {
          // Only color/style codes matter for state
          // Simplified tracking: just push everything that isn't a reset
          // A more robust parser would replace conflicting codes, but this is usually sufficient for wrapping
          activeAnsiCodes.push(ansiCode);
        }
      } else if (char) {
        // It's a character
        if (currentVisibleLength >= width) {
          // Time to wrap
          // 1. Reset current line to avoid bleeding into next line IF we were to just print it
          // But actually, we want the style to continue?
          // Default terminal behavior: style continues until reset.
          // BUT if we just break the string, the next line starts with whatever state was left.
          // Issue: if we print line 1, then line 2 later, maybe we want stateless lines?
          // The request implies "re-applying" styles to the next line so it looks correct even if rendered separately.

          // Append reset to end of current line to be safe
          result.push(currentLine + "\u001b[0m");

          // Start next line with active codes
          currentLine = activeAnsiCodes.join("") + char;
          currentVisibleLength = 1;
        } else {
          currentLine += char;
          currentVisibleLength++;
        }
      }
    }

    if (currentLine.length > 0) {
      result.push(currentLine + "\u001b[0m"); // Ensure tracking reset
    }
  }

  return result;
}
