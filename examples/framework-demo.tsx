/**
 * Framework Demo - Simplified TUI using the new framework components
 *
 * Demonstrates the power of the integrated framework:
 * - TuiProvider handles mouse/resize/cleanup automatically
 * - VirtualList handles scrolling
 * - MasterDetail provides layout
 * - Theme.from().extend() for custom themes
 *
 * Compare this to aquaria-trace-viewer.tsx (~400 lines) - this is ~100 lines!
 *
 * Run with: bun examples/framework-demo.tsx
 */

import { createSignal, For } from "solid-js";
import { render, useKeyboard } from "@opentui/solid";
import {
  cleanupTerminal,
  createVirtualListController,
  MasterDetail,
  Theme,
  THEMES,
  TuiProvider,
  useTheme,
  useTui,
  VirtualList,
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

const ITEMS: Item[] = Array.from({ length: 100 }, (_, i) => ({
  id: `item_${i + 1}`,
  name: `Item ${i + 1}`,
  description: `Description for item ${i + 1}. This is sample content.`,
  count: Math.floor(Math.random() * 1000),
}));

// ============================================================================
// Detail Panel (custom slot content)
// ============================================================================

function ItemDetails(props: { item: Item }) {
  const { current: theme } = useTheme();
  const t = () => theme();

  return (
    <>
      <text bold color={t().colors.accent}>
        {props.item.name}
      </text>
      <text color={t().colors.muted} marginBottom={1}>
        ID: {props.item.id}
      </text>
      <text color={t().colors.text} marginTop={1}>
        {props.item.description}
      </text>
      <box
        borderStyle="single"
        borderColor={t().colors.border}
        padding={1}
        marginTop={2}
      >
        <text color={t().colors.text}>Count: </text>
        <text bold color={t().colors.accent}>
          {props.item.count}
        </text>
      </box>
    </>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  const { viewportHeight, exit } = useTui();
  const { current: theme, cycle: cycleTheme } = useTheme();

  const [selectedIdx, setSelectedIdx] = createSignal(0);

  // Create list controller for navigation
  const list = createVirtualListController(
    () => ITEMS,
    selectedIdx,
    setSelectedIdx,
    viewportHeight,
  );

  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) exit(0);
    if (key.name === "t") cycleTheme();
    if (key.name === "down" || key.name === "j") list.selectNext();
    if (key.name === "up" || key.name === "k") list.selectPrevious();
  });

  const selectedItem = () => ITEMS[selectedIdx()]!;

  return (
    <MasterDetail
      header="Framework Demo"
      headerIcon="📋"
      breadcrumb={["Items", selectedItem().name]}
      footer={`↑↓/jk: Navigate | t: Theme (${theme().name}) | q: Quit`}
      master={
        <VirtualList
          items={ITEMS}
          selectedIndex={selectedIdx()}
          onSelect={setSelectedIdx}
          viewportHeight={viewportHeight()}
          title="Items"
          getLabel={(item) => item.name}
        />
      }
      detail={<ItemDetails item={selectedItem()} />}
    />
  );
}

// ============================================================================
// Entry Point
// ============================================================================

// TuiProvider handles: mouse reporting, resize, cleanup, theme, shortcuts, toast
render(
  () => (
    <TuiProvider
      theme="dark"
      onScroll={(delta) => {
        // Mouse scroll moves selection - handled at provider level!
        // This callback receives scroll events automatically
      }}
    >
      <App />
    </TuiProvider>
  ),
  { onDestroy: cleanupTerminal },
);
