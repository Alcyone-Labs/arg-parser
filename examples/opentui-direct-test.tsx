/**
 * Minimal OpenTUI Test (Bun)
 *
 * Run with: bun run examples/opentui-direct-test.tsx
 *
 * This tests @opentui/solid directly, bypassing arg-parser's wrapper.
 */

import { render, useKeyboard } from "@opentui/solid";
import { createSignal, onMount } from "solid-js";

function App() {
  const [count, setCount] = createSignal(0);

  useKeyboard((evt) => {
    if (evt.name === "q") {
      process.exit(0);
    }
    if (evt.name === "up") {
      setCount((c) => c + 1);
    }
    if (evt.name === "down") {
      setCount((c) => c - 1);
    }
  });

  onMount(() => {
    console.log("[OpenTUI] App mounted!");
  });

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      borderStyle="single"
      padding={1}
    >
      <text bold>OpenTUI Direct Test</text>
      <text>Count: {count()}</text>
      <text color="#888888">Press Up/Down to change count, Q to quit</text>
    </box>
  );
}

console.log("[Test] Starting OpenTUI render...");

render(() => <App />, {
  targetFps: 30,
  exitOnCtrlC: true,
})
  .then(() => {
    console.log("[Test] Render promise resolved");
  })
  .catch((err) => {
    console.error("[Test] Render error:", err);
    process.exit(1);
  });
