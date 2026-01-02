/**
 * Template Demo - Using the 3-Fold Layout Template
 * 
 * Demonstrates how to use the reusable layout components with minimal boilerplate.
 * 
 * Run with: bun examples/template-demo.tsx
 */

import { render, useKeyboard } from "@opentui/solid";
import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { 
  useVirtualScroll, 
  getViewportHeight, 
  useMouse,
  cleanupTerminal,
  LAYOUT_THEMES,
  type LayoutTheme,
  type LayoutThemeName,
} from "../src/tui";

// ============================================================================
// Sample Data
// ============================================================================

interface Item {
  id: string;
  name: string;
  description: string;
  count: number;
}

const ITEMS: Item[] = Array.from({ length: 50 }, (_, i) => ({
  id: `item_${i + 1}`,
  name: `Item ${i + 1}`,
  description: `This is the description for item ${i + 1}. It contains some details about what this item represents.`,
  count: Math.floor(Math.random() * 1000),
}));

// ============================================================================
// App Component
// ============================================================================

function App() {
  const THEME_NAMES = Object.keys(LAYOUT_THEMES) as LayoutThemeName[];
  const [themeIdx, setThemeIdx] = createSignal(0);
  const [selectedIdx, setSelectedIdx] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(getViewportHeight());
  
  const t = (): LayoutTheme => LAYOUT_THEMES[THEME_NAMES[themeIdx()]!]!;
  const themeName = () => THEME_NAMES[themeIdx()]!;

  const scroll = useVirtualScroll(() => ITEMS, selectedIdx, viewportHeight);

  // Mouse scroll moves selection
  useMouse({
    onScroll: (delta) => {
      const newIdx = Math.max(0, Math.min(ITEMS.length - 1, selectedIdx() + delta));
      setSelectedIdx(newIdx);
      scroll.adjustScroll(newIdx);
    },
  });

  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      cleanupTerminal();
      process.exit(0);
    }
    if (key.name === "t") {
      setThemeIdx(i => (i + 1) % THEME_NAMES.length);
    }
    if (key.name === "down" || key.name === "j") {
      const newIdx = Math.min(selectedIdx() + 1, ITEMS.length - 1);
      setSelectedIdx(newIdx);
      scroll.adjustScroll(newIdx);
    }
    if (key.name === "up" || key.name === "k") {
      const newIdx = Math.max(selectedIdx() - 1, 0);
      setSelectedIdx(newIdx);
      scroll.adjustScroll(newIdx);
    }
  });

  // Handle resize
  onMount(() => {
    const onResize = () => setViewportHeight(getViewportHeight());
    process.stdout.on("resize", onResize);
    onCleanup(() => process.stdout.off("resize", onResize));
  });

  const selectedItem = () => ITEMS[selectedIdx()]!;

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={t().bg}>
      
      {/* Header */}
      <box height={3} borderStyle="single" borderColor={t().accent} justifyContent="center" alignItems="center">
        <text bold color={t().accent}> 📋 Template Demo </text>
      </box>
      
      {/* Breadcrumb */}
      <box height={1} paddingLeft={2} backgroundColor={t().bg}>
        <text color={t().accent} bold>Items</text>
        <text color={t().muted}> › </text>
        <text color={t().accent} bold>{selectedItem().name}</text>
      </box>

      <box flexGrow={1} flexDirection="row">
        
        {/* Master Panel */}
        <box width="35%" borderStyle="single" borderColor={t().border} flexDirection="column" padding={1}>
          <text bold color={t().fg} marginBottom={1}>Items ({selectedIdx() + 1}/{ITEMS.length})</text>
          <For each={scroll.visibleItems()}>
            {({ item, globalIndex }) => (
              <box height={1} backgroundColor={globalIndex === selectedIdx() ? t().selection : undefined}>
                <text color={globalIndex === selectedIdx() ? t().selectionFg : t().fg}>
                  {globalIndex === selectedIdx() ? "› " : "  "}{item.name}
                </text>
              </box>
            )}
          </For>
        </box>

        {/* Detail Panel */}
        <box flexGrow={1} borderStyle="single" borderColor={t().border} flexDirection="column" padding={2}>
          <text bold color={t().accent}>{selectedItem().name}</text>
          <text color={t().muted} marginBottom={1}>ID: {selectedItem().id}</text>
          <text color={t().fg} marginTop={1}>{selectedItem().description}</text>
          <box borderStyle="single" borderColor={t().border} padding={1} marginTop={2}>
            <text color={t().fg}>Count: </text>
            <text bold color={t().accent}>{selectedItem().count}</text>
          </box>
        </box>
        
      </box>

      {/* Footer */}
      <box height={1} backgroundColor={t().bg}>
        <text color={t().muted}> ↑↓/jk: Navigate | Mouse: Scroll | t: Theme ({themeName()}) | q: Quit</text>
      </box>
    </box>
  );
}

// ============================================================================
// Run
// ============================================================================

render(() => <App />, { onDestroy: cleanupTerminal });
