/**
 * Minimal TUI Test
 *
 * Simple test to verify OpenTUI rendering works.
 * IMPORTANT: Requires Bun, not Node.js
 */

import {
  cleanupTerminal,
  enableMouseReporting,
  switchToAlternateScreen,
} from "@alcyone-labs/arg-parser/tui";
import { render } from "@opentui/solid";

console.log("Starting TUI test...");

// Setup terminal for TUI
switchToAlternateScreen();
enableMouseReporting();

// Minimal render test
render(() => ({
  type: "box",
  props: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    borderStyle: "single",
  },
  children: [
    {
      type: "text",
      props: {
        text: "Hello from OpenTUI!",
      },
    },
  ],
}))
  .then(() => {
    console.log("Render completed");
  })
  .catch((err) => {
    console.error("Render error:", err);
    cleanupTerminal();
  });

console.log("Script executed");
