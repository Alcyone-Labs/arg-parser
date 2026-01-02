/**
 * TUI Provider
 *
 * Unified provider for TUI applications that handles:
 * - Theme context
 * - Shortcut bindings
 * - Toast notifications
 * - Mouse wheel events
 * - Terminal resize
 * - TTY cleanup on exit
 *
 * This is the recommended way to wrap TUI applications.
 */

import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import { createComponent } from "@opentui/solid";
import { ShortcutProvider, type ShortcutBinding } from "../shortcuts";
import { ThemeProvider, THEMES, type TuiTheme } from "../themes";
import { ToastProvider } from "../toast";
import {
  clearScreen,
  disableMouseReporting,
  enableMouseReporting,
  parseMouseScroll,
  resetAttributes,
  restoreStdin,
} from "../tty";

// ============================================================================
// Types
// ============================================================================

export interface TuiContextValue {
  /** Current viewport height (rows) */
  viewportHeight: Accessor<number>;
  /** Current viewport width (columns) */
  viewportWidth: Accessor<number>;
  /** Exit the application gracefully */
  exit: (code?: number) => void;
}

export interface TuiProviderProps {
  /** Theme name or custom theme object */
  theme?: string | TuiTheme;
  /** Keyboard shortcut bindings */
  shortcuts?: ShortcutBinding[];
  /** Callback when mouse wheel scrolls. Delta: negative=up, positive=down */
  onScroll?: (delta: number) => void;
  /** Scroll speed multiplier (default: 3 lines per tick) */
  scrollSpeed?: number;
  /** Reserved rows for calculating viewport (header, footer, etc) */
  reservedRows?: number;
  /** Children components */
  children: JSX.Element;
}

// ============================================================================
// Context
// ============================================================================

const TuiContext = createContext<TuiContextValue>();

/**
 * Hook to access the TUI context.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { viewportHeight, exit } = useTui();
 *   return <text>Height: {viewportHeight()}</text>;
 * }
 * ```
 */
export function useTui(): TuiContextValue {
  const context = useContext(TuiContext);
  if (!context) {
    throw new Error("useTui must be used within a TuiProvider");
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Unified TUI Provider.
 *
 * Wraps your application with theme, shortcuts, toast, and mouse/resize handling.
 * Automatically cleans up TTY on exit.
 *
 * @example
 * ```tsx
 * import { TuiProvider, useTui, useTheme } from "@alcyone-labs/arg-parser/tui";
 *
 * function App() {
 *   const { viewportHeight } = useTui();
 *   const { current: theme } = useTheme();
 *
 *   return (
 *     <box backgroundColor={theme().colors.background}>
 *       <text>Viewport: {viewportHeight()} rows</text>
 *     </box>
 *   );
 * }
 *
 * <TuiProvider
 *   theme="dark"
 *   shortcuts={[{ key: "q", action: () => process.exit(0) }]}
 *   onScroll={(delta) => console.log("Scrolled:", delta)}
 * >
 *   <App />
 * </TuiProvider>
 * ```
 */
export function TuiProvider(props: TuiProviderProps): JSX.Element {
  const reservedRows = props.reservedRows ?? 8;
  const scrollSpeed = props.scrollSpeed ?? 3;

  // Viewport dimensions
  const [viewportHeight, setViewportHeight] = createSignal(
    Math.max(10, (process.stdout.rows || 24) - reservedRows),
  );
  const [viewportWidth, setViewportWidth] = createSignal(
    process.stdout.columns || 80,
  );

  // Cleanup function
  const cleanup = () => {
    disableMouseReporting();
    clearScreen();
    resetAttributes();
    restoreStdin();
  };

  // Graceful exit
  const exit = (code = 0) => {
    cleanup();
    process.exit(code);
  };

  // Mouse input handler
  const handleInput = (data: Buffer) => {
    if (props.onScroll) {
      const scrollDir = parseMouseScroll(data);
      if (scrollDir !== 0) {
        props.onScroll(scrollDir * scrollSpeed);
      }
    }
  };

  // Resize handler
  const handleResize = () => {
    setViewportHeight(Math.max(10, (process.stdout.rows || 24) - reservedRows));
    setViewportWidth(process.stdout.columns || 80);
  };

  onMount(() => {
    // Enable mouse wheel tracking
    enableMouseReporting();

    // Set raw mode for input handling
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    // Register event handlers
    process.stdout.on("resize", handleResize);
    process.stdin.on("data", handleInput);

    // Handle graceful shutdown signals
    process.on("SIGINT", () => exit(0));
    process.on("SIGTERM", () => exit(0));
  });

  onCleanup(() => {
    cleanup();
    process.stdout.off("resize", handleResize);
    process.stdin.off("data", handleInput);
  });

  // Context value
  const contextValue: TuiContextValue = {
    viewportHeight,
    viewportWidth,
    exit,
  };

  // Resolve theme
  const themeName =
    typeof props.theme === "string"
      ? props.theme
      : (props.theme?.name ?? "dark");

  // Build the provider tree
  return createComponent(TuiContext.Provider, {
    value: contextValue,
    get children() {
      return createComponent(ThemeProvider, {
        initial: themeName,
        get children() {
          return createComponent(ShortcutProvider, {
            get bindings() {
              return props.shortcuts ?? [];
            },
            get children() {
              return createComponent(ToastProvider, {
                get children() {
                  return props.children;
                },
              });
            },
          });
        },
      });
    },
  });
}
