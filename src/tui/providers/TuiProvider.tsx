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
import type { MouseEvent } from "@opentui/core";
import { createComponent, useRenderer } from "@opentui/solid";
import { ExitGuard } from "../runtime/ExitGuard";
import { ShortcutProvider, type ShortcutBinding } from "../shortcuts";
import { ThemeProvider, type TuiTheme } from "../themes";
import { ToastProvider } from "../toast";
import {
  cleanupTerminal,
  enableMouseReporting,
  switchToAlternateScreen,
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
  const renderer = useRenderer();
  const reservedRows = props.reservedRows ?? 8;
  const scrollSpeed = props.scrollSpeed ?? 3;

  // Viewport dimensions
  const [viewportHeight, setViewportHeight] = createSignal(
    Math.max(10, renderer.height - reservedRows),
  );
  const [viewportWidth, setViewportWidth] = createSignal(renderer.width);

  // Graceful exit
  const exit = (code = 0) => {
    process.exitCode = code;
    renderer.destroy();
  };

  // Resize handler
  const handleResize = (width: number, height: number) => {
    setViewportHeight(Math.max(10, height - reservedRows));
    setViewportWidth(width);
  };

  const handleMouseScroll = (event: MouseEvent) => {
    if (!props.onScroll || !event.scroll) {
      return;
    }

    const sign =
      event.scroll.direction === "up"
        ? -1
        : event.scroll.direction === "down"
          ? 1
          : 0;
    if (sign === 0) {
      return;
    }

    const delta = event.scroll.delta || 1;
    props.onScroll(sign * delta * scrollSpeed);
  };

  onMount(() => {
    switchToAlternateScreen();
    enableMouseReporting();
    renderer.on("resize", handleResize);
  });

  onCleanup(() => {
    renderer.off("resize", handleResize);
    cleanupTerminal();
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
  return createComponent(ExitGuard, {
    get children() {
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
                      return (
                        <box
                          width="100%"
                          height="100%"
                          onMouseScroll={handleMouseScroll}
                        >
                          {props.children}
                        </box>
                      );
                    },
                  });
                },
              });
            },
          });
        },
      });
    },
  });
}
