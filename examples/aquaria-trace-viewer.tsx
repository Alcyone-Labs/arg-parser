/**
 * Aquaria Trace Viewer - Comprehensive TUI Demo
 *
 * 3-level drill-down: DB Files → Traces → Steps
 *
 * Run with: bun examples/aquaria-trace-viewer.tsx
 */

import type { Buffer } from "node:buffer";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { render, useKeyboard, useRenderer } from "@opentui/solid";

// ============================================================================
// TTY Cleanup - Essential for proper terminal restore
// ============================================================================

let isCleanupCalled = false;

function cleanupTerminal() {
  // Prevent double cleanup
  if (isCleanupCalled) return;
  isCleanupCalled = true;

  // Restore normal stdin mode FIRST (to stop processing input)
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Ignore errors if already in normal mode
    }
  }

  // Switch back to main screen buffer (restore original terminal content)
  process.stdout.write("\x1b[?1049l");
  // Disable mouse reporting modes
  process.stdout.write("\x1b[?1000l"); // Disable X10 mouse mode
  process.stdout.write("\x1b[?1006l"); // Disable SGR extended mode
  // Clear screen and scrollback, move cursor home
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  // Reset all attributes
  process.stdout.write("\x1b[0m");
}

// ============================================================================
// Mock Data - LOTS of items to ensure scrolling
// ============================================================================

interface DbFile {
  path: string;
  name: string;
  size: number;
  traceCount: number;
}

interface Trace {
  id: string;
  workflowName: string;
  status: "success" | "error";
  duration: number;
  tokens: number;
  cost: number;
  stepCount: number;
}

interface Step {
  id: string;
  name: string;
  type: string;
  status: "success" | "error";
  duration: number;
  input: string;
  output: string;
}

// 100 databases to ensure overflow on any screen
const MOCK_DBS: DbFile[] = [
  {
    path: "/data/traces-2024-01.sqlite",
    name: "traces-2024-01.sqlite",
    size: 15_728_640,
    traceCount: 1247,
  },
  {
    path: "/data/production.sqlite",
    name: "production.sqlite",
    size: 104_857_600,
    traceCount: 15892,
  },
  {
    path: "/data/dev-local.sqlite",
    name: "dev-local.sqlite",
    size: 2_097_152,
    traceCount: 89,
  },
  ...Array.from({ length: 97 }, (_, i) => ({
    path: `/data/archive-${2020 + i}.sqlite`,
    name: `archive-${2020 + i}.sqlite`,
    size: Math.floor(Math.random() * 100_000_000),
    traceCount: Math.floor(Math.random() * 5000),
  })),
];

// 150 traces
const MOCK_TRACES: Trace[] = [
  {
    id: "tr_001",
    workflowName: "rss-processor",
    status: "success",
    duration: 1200,
    tokens: 15000,
    cost: 0.045,
    stepCount: 5,
  },
  {
    id: "tr_002",
    workflowName: "embed-content",
    status: "error",
    duration: 500,
    tokens: 750,
    cost: 0.024,
    stepCount: 3,
  },
  {
    id: "tr_003",
    workflowName: "classify-item",
    status: "success",
    duration: 800,
    tokens: 12000,
    cost: 0.036,
    stepCount: 4,
  },
  ...Array.from({ length: 147 }, (_, i) => ({
    id: `tr_${100 + i}`,
    workflowName: ["daily-summary", "email-sender", "data-sync", "pdf-extractor", "rag-indexer"][
      i % 5
    ]!,
    status: Math.random() > 0.8 ? "error" : ("success" as any),
    duration: Math.floor(Math.random() * 5000),
    tokens: Math.floor(Math.random() * 20000),
    cost: Math.random() * 0.1,
    stepCount: Math.floor(Math.random() * 10) + 1,
  })),
];

const MOCK_STEPS: Step[] = [
  {
    id: "s1",
    name: "fetch-content",
    type: "tool",
    status: "success",
    duration: 150,
    input: '{"url": "https://example.com/article/1"}',
    output: '{"html": "..."}',
  },
  {
    id: "s2",
    name: "parse-html",
    type: "capability",
    status: "success",
    duration: 50,
    input: '{"html": "..."}',
    output: '{"text": "Content..."}',
  },
  {
    id: "s3",
    name: "embed-text",
    type: "llm",
    status: "success",
    duration: 300,
    input: '{"text": "..."}',
    output: '{"vector": [0.1, ...]}',
  },
  {
    id: "s4",
    name: "classify",
    type: "llm",
    status: "success",
    duration: 200,
    input: '{"text": "..."}',
    output: '{"category": "tech"}',
  },
  {
    id: "s5",
    name: "store-result",
    type: "tool",
    status: "success",
    duration: 50,
    input: '{"data": "..."}',
    output: '{"id": "stored_123"}',
  },
];

// ============================================================================
// Theme System - HIGH CONTRAST
// ============================================================================

const THEMES = {
  dark: {
    bg: "#0d0d0d",
    fg: "#f5f5f5",
    accent: "#00d4ff",
    muted: "#999999",
    error: "#ff4444",
    success: "#44ff44",
    border: "#444444",
    selection: "#00d4ff",
    selectionFg: "#000000",
  },
  light: {
    bg: "#e8e8e8",
    fg: "#000000",
    accent: "#0044aa",
    muted: "#333333",
    error: "#880000",
    success: "#005500",
    border: "#888888",
    selection: "#0044aa",
    selectionFg: "#ffffff",
  },
  monokai: {
    bg: "#272822",
    fg: "#f8f8f2",
    accent: "#a6e22e",
    muted: "#75715e",
    error: "#f92672",
    success: "#a6e22e",
    border: "#49483e",
    selection: "#a6e22e",
    selectionFg: "#272822",
  },
};

type ThemeName = keyof typeof THEMES;
const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

const formatBytes = (b: number) =>
  b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;
const formatDuration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
const formatCost = (c: number) => `$${c.toFixed(4)}`;

// Dynamic viewport: Terminal height minus header (3), breadcrumb (1), footer (1), borders (2), title (1)
const getViewportHeight = () => Math.max(10, (process.stdout.rows || 24) - 8);

// ============================================================================
// Virtual Scroll Helper
// ============================================================================

function useVirtualScroll<T>(
  items: () => T[],
  selectedIdx: () => number,
  viewportHeight: () => number,
) {
  const [scrollOffset, setScrollOffset] = createSignal(0);

  const adjustScroll = (newIdx: number) => {
    const vh = viewportHeight();
    const currentOffset = scrollOffset();
    if (newIdx < currentOffset) {
      setScrollOffset(newIdx);
    } else if (newIdx >= currentOffset + vh) {
      setScrollOffset(newIdx - vh + 1);
    }
  };

  const visibleItems = createMemo(() => {
    const allItems = items();
    const vh = viewportHeight();
    const start = scrollOffset();
    const end = Math.min(start + vh, allItems.length);
    return allItems.slice(start, end).map((item, localIdx) => ({
      item,
      globalIndex: start + localIdx,
    }));
  });

  const scrollBy = (delta: number) => {
    const maxOffset = Math.max(0, items().length - viewportHeight());
    setScrollOffset((o) => Math.max(0, Math.min(maxOffset, o + delta)));
  };

  return { visibleItems, adjustScroll, scrollOffset, scrollBy };
}

// ============================================================================
// Main Application
// ============================================================================

function App() {
  const renderer = useRenderer();
  const [theme, setTheme] = createSignal<ThemeName>("dark");
  const [level, setLevel] = createSignal<1 | 2 | 3>(1);
  const [selectedDbIdx, setSelectedDbIdx] = createSignal(0);
  const [selectedTraceIdx, setSelectedTraceIdx] = createSignal(0);
  const [selectedStepIdx, setSelectedStepIdx] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(getViewportHeight());

  const t = () => THEMES[theme()];

  const dbScroll = useVirtualScroll(() => MOCK_DBS, selectedDbIdx, viewportHeight);
  const traceScroll = useVirtualScroll(() => MOCK_TRACES, selectedTraceIdx, viewportHeight);
  const stepScroll = useVirtualScroll(() => MOCK_STEPS, selectedStepIdx, viewportHeight);

  const cycleTheme = () => {
    const idx = (THEME_NAMES.indexOf(theme()) + 1) % THEME_NAMES.length;
    setTheme(THEME_NAMES[idx]!);
  };

  onMount(() => {
    // Enable mouse wheel tracking
    process.stdout.write("\x1b[?1000h");
    process.stdout.write("\x1b[?1006h");

    const onResize = () => setViewportHeight(getViewportHeight());
    process.stdout.on("resize", onResize);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.on("data", handleInput);

    onCleanup(() => {
      cleanupTerminal();
      process.stdout.off("resize", onResize);
      process.stdin.off("data", handleInput);
    });
  });

  const handleInput = (data: Buffer) => {
    const str = data.toString();

    // SGR mouse wheel: \x1b[<64;X;YM (scroll up) or \x1b[<65;X;YM (scroll down)
    const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (sgrMatch) {
      const button = parseInt(sgrMatch[1]!, 10);
      if (button === 64) {
        scrollCurrentList(-3);
      } else if (button === 65) {
        scrollCurrentList(3);
      }
    }
  };

  // Mouse scroll moves selection (like keyboard navigation)
  const scrollCurrentList = (delta: number) => {
    if (level() === 1) {
      const newIdx = Math.max(0, Math.min(MOCK_DBS.length - 1, selectedDbIdx() + delta));
      setSelectedDbIdx(newIdx);
      dbScroll.adjustScroll(newIdx);
    } else if (level() === 2) {
      const newIdx = Math.max(0, Math.min(MOCK_TRACES.length - 1, selectedTraceIdx() + delta));
      setSelectedTraceIdx(newIdx);
      traceScroll.adjustScroll(newIdx);
    } else if (level() === 3) {
      const newIdx = Math.max(0, Math.min(MOCK_STEPS.length - 1, selectedStepIdx() + delta));
      setSelectedStepIdx(newIdx);
      stepScroll.adjustScroll(newIdx);
    }
  };

  useKeyboard((key) => {
    const keyName = key.name;

    if (keyName === "q" || (key.ctrl && keyName === "c")) {
      process.exitCode = 0;
      renderer.destroy();
      return;
    }

    if (keyName === "t") cycleTheme();

    if (keyName === "escape" || keyName === "left" || keyName === "h") {
      if (level() > 1) setLevel((level() - 1) as 1 | 2 | 3);
    }

    if (level() === 1) {
      if (keyName === "down" || keyName === "j") {
        const newIdx = Math.min(selectedDbIdx() + 1, MOCK_DBS.length - 1);
        setSelectedDbIdx(newIdx);
        dbScroll.adjustScroll(newIdx);
      }
      if (keyName === "up" || keyName === "k") {
        const newIdx = Math.max(selectedDbIdx() - 1, 0);
        setSelectedDbIdx(newIdx);
        dbScroll.adjustScroll(newIdx);
      }
      if (keyName === "return" || keyName === "right" || keyName === "l") {
        setLevel(2);
        setSelectedTraceIdx(0);
        traceScroll.adjustScroll(0);
      }
    } else if (level() === 2) {
      if (keyName === "down" || keyName === "j") {
        const newIdx = Math.min(selectedTraceIdx() + 1, MOCK_TRACES.length - 1);
        setSelectedTraceIdx(newIdx);
        traceScroll.adjustScroll(newIdx);
      }
      if (keyName === "up" || keyName === "k") {
        const newIdx = Math.max(selectedTraceIdx() - 1, 0);
        setSelectedTraceIdx(newIdx);
        traceScroll.adjustScroll(newIdx);
      }
      if (keyName === "return" || keyName === "right" || keyName === "l") {
        setLevel(3);
        setSelectedStepIdx(0);
        stepScroll.adjustScroll(0);
      }
    } else if (level() === 3) {
      if (keyName === "down" || keyName === "j") {
        const newIdx = Math.min(selectedStepIdx() + 1, MOCK_STEPS.length - 1);
        setSelectedStepIdx(newIdx);
        stepScroll.adjustScroll(newIdx);
      }
      if (keyName === "up" || keyName === "k") {
        const newIdx = Math.max(selectedStepIdx() - 1, 0);
        setSelectedStepIdx(newIdx);
        stepScroll.adjustScroll(newIdx);
      }
    }
  });

  const selectedDb = () => MOCK_DBS[selectedDbIdx()] ?? MOCK_DBS[0]!;
  const selectedTrace = () => MOCK_TRACES[selectedTraceIdx()] ?? MOCK_TRACES[0]!;
  const selectedStep = () => MOCK_STEPS[selectedStepIdx()] ?? MOCK_STEPS[0]!;

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={t().bg}>
      {/* Header */}
      <box
        height={3}
        borderStyle="single"
        borderColor={t().accent}
        justifyContent="center"
        alignItems="center"
      >
        <text bold color={t().accent}>
          {" "}
          🔍 Aquaria Trace Viewer{" "}
        </text>
      </box>

      {/* Breadcrumb */}
      <box height={1} paddingLeft={2} backgroundColor={t().bg}>
        <text color={t().accent} bold>
          Databases
        </text>
        <Show when={level() >= 2}>
          <text color={t().muted}> › </text>
          <text color={t().accent} bold>
            {selectedDb().name}
          </text>
        </Show>
        <Show when={level() >= 3}>
          <text color={t().muted}> › </text>
          <text color={t().accent} bold>
            {selectedTrace().workflowName}
          </text>
        </Show>
      </box>

      <box flexGrow={1} flexDirection="row">
        {/* Left Panel - Virtualized List */}
        <box
          width="35%"
          borderStyle="single"
          borderColor={t().border}
          flexDirection="column"
          padding={1}
        >
          <Show when={level() === 1}>
            <text bold color={t().fg} marginBottom={1}>
              Databases ({selectedDbIdx() + 1}/{MOCK_DBS.length})
            </text>
            <For each={dbScroll.visibleItems()}>
              {({ item, globalIndex }) => (
                <box
                  height={1}
                  backgroundColor={globalIndex === selectedDbIdx() ? t().selection : undefined}
                >
                  <text color={globalIndex === selectedDbIdx() ? t().selectionFg : t().fg}>
                    {globalIndex === selectedDbIdx() ? "› " : "  "}
                    {item.name}
                  </text>
                </box>
              )}
            </For>
          </Show>

          <Show when={level() === 2}>
            <text bold color={t().fg} marginBottom={1}>
              Traces ({selectedTraceIdx() + 1}/{MOCK_TRACES.length})
            </text>
            <For each={traceScroll.visibleItems()}>
              {({ item, globalIndex }) => (
                <box
                  height={1}
                  backgroundColor={globalIndex === selectedTraceIdx() ? t().selection : undefined}
                >
                  <text color={globalIndex === selectedTraceIdx() ? t().selectionFg : t().fg}>
                    {globalIndex === selectedTraceIdx() ? "› " : "  "}
                    {item.workflowName}
                  </text>
                </box>
              )}
            </For>
          </Show>

          <Show when={level() === 3}>
            <text bold color={t().fg} marginBottom={1}>
              Steps ({selectedStepIdx() + 1}/{MOCK_STEPS.length})
            </text>
            <For each={stepScroll.visibleItems()}>
              {({ item, globalIndex }) => (
                <box
                  height={1}
                  backgroundColor={globalIndex === selectedStepIdx() ? t().selection : undefined}
                >
                  <text color={globalIndex === selectedStepIdx() ? t().selectionFg : t().fg}>
                    {globalIndex === selectedStepIdx() ? "› " : "  "}
                    {item.name}
                  </text>
                </box>
              )}
            </For>
          </Show>
        </box>

        {/* Right Detail Panel */}
        <box
          flexGrow={1}
          borderStyle="single"
          borderColor={t().border}
          flexDirection="column"
          padding={2}
        >
          <Show when={level() === 1}>
            <text bold color={t().accent}>
              {selectedDb().name}
            </text>
            <text color={t().muted} marginBottom={2}>
              {selectedDb().path}
            </text>
            <text color={t().fg}>Size: {formatBytes(selectedDb().size)}</text>
            <text color={t().fg}>Traces: {selectedDb().traceCount}</text>
          </Show>

          <Show when={level() === 2}>
            <text bold color={t().accent}>
              {selectedTrace().workflowName}
            </text>
            <text color={selectedTrace().status === "success" ? t().success : t().error} bold>
              {selectedTrace().status.toUpperCase()}
            </text>
            <text color={t().muted} marginBottom={1}>
              ID: {selectedTrace().id}
            </text>
            <box
              flexDirection="column"
              borderStyle="single"
              borderColor={t().muted}
              padding={1}
              marginTop={1}
            >
              <text color={t().fg}>Duration: {formatDuration(selectedTrace().duration)}</text>
              <text color={t().fg}>Tokens: {selectedTrace().tokens}</text>
              <text color={t().fg}>Cost: {formatCost(selectedTrace().cost)}</text>
            </box>
          </Show>

          <Show when={level() === 3}>
            <text bold color={t().accent}>
              {selectedStep().name} ({selectedStep().type})
            </text>
            <text color={t().muted} marginBottom={1}>
              Duration: {formatDuration(selectedStep().duration)}
            </text>
            <text bold color={t().fg} marginTop={1}>
              Input:
            </text>
            <text color={t().muted}>{selectedStep().input}</text>
            <text bold color={t().fg} marginTop={1}>
              Output:
            </text>
            <text color={t().muted}>{selectedStep().output}</text>
          </Show>
        </box>
      </box>

      {/* Footer */}
      <box height={1} backgroundColor={t().bg}>
        <text color={t().muted}>
          {" "}
          ←: Back | ↑↓/jk: Nav | →: Open | Scroll: Mouse | t: Theme | q: Quit
        </text>
      </box>
    </box>
  );
}

render(() => <App />, { onDestroy: cleanupTerminal });
