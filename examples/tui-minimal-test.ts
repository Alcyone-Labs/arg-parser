/**
 * Minimal TUI Test
 *
 * Simple test to verify OpenTUI rendering works.
 */

import { render } from "@opentui/solid";

console.log("Starting TUI test...");

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
  });

console.log("Script executed");
