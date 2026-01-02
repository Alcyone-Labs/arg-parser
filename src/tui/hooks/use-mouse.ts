/**
 * Mouse Hook
 * 
 * Enables mouse wheel detection for TUI applications.
 */

import { onMount, onCleanup } from "solid-js";
import { enableMouseReporting, disableMouseReporting, parseMouseScroll } from "../tty";

export interface UseMouseOptions {
  /** Callback when mouse wheel scrolls. Delta is negative for up, positive for down. */
  onScroll?: (delta: number) => void;
  /** Scroll speed multiplier (default: 3 lines per tick) */
  scrollSpeed?: number;
}

/**
 * Enable mouse wheel support in a TUI component.
 * 
 * Automatically enables mouse reporting on mount and cleans up on unmount.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const [idx, setIdx] = createSignal(0);
 *   
 *   useMouse({
 *     onScroll: (delta) => setIdx(i => Math.max(0, i + delta))
 *   });
 *   
 *   return <box>...</box>;
 * }
 * ```
 */
export function useMouse(options: UseMouseOptions = {}): void {
  const { onScroll, scrollSpeed = 3 } = options;

  const handleInput = (data: Buffer) => {
    const scrollDir = parseMouseScroll(data);
    if (scrollDir !== 0 && onScroll) {
      onScroll(scrollDir * scrollSpeed);
    }
  };

  onMount(() => {
    enableMouseReporting();
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.on("data", handleInput);
  });

  onCleanup(() => {
    disableMouseReporting();
    process.stdin.off("data", handleInput);
  });
}
