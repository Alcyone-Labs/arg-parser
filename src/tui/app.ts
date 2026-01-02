/**
 * TUI Application Wrapper
 *
 * Provides a convenient entry point for creating TUI applications
 * with theme, shortcut, and toast support pre-configured.
 */

import { createComponent, render } from "@opentui/solid";
import type { JSX } from "@opentui/solid";
import { ShortcutProvider } from "./shortcuts";
import { ThemeProvider } from "./themes";
import { ToastProvider } from "./toast";
import type { TuiAppConfig, TuiTheme } from "./types";

export type { TuiAppConfig, TuiTheme };

/**
 * Creates and renders a TUI application with all providers configured.
 *
 * @param App - Root component function
 * @param config - Application configuration
 * @returns Promise that resolves when the app is rendered
 *
 * @example
 * ```tsx
 * import { createTuiApp } from "@alcyone-labs/arg-parser"
 *
 * function MyApp() {
 *   return (
 *     <box>
 *       <text>Hello World!</text>
 *     </box>
 *   )
 * }
 *
 * createTuiApp(() => <MyApp />, {
 *   theme: "monokai",
 *   shortcuts: [
 *     { key: "ctrl+t", action: () => cycleTheme(), description: "Cycle theme" },
 *     { key: "ctrl+q", action: () => process.exit(0), description: "Quit" }
 *   ]
 * })
 * ```
 */
export function createTuiApp(
  App: () => JSX.Element,
  config: TuiAppConfig = {},
): Promise<void> {
  const { theme = "dark", shortcuts = [], onDestroy } = config;

  return render(
    () =>
      createComponent(ThemeProvider, {
        get initial() {
          return theme;
        },
        get children() {
          return createComponent(ShortcutProvider, {
            get bindings() {
              return shortcuts;
            },
            get children() {
              return createComponent(ToastProvider, {
                get children() {
                  return createComponent(App, {});
                },
              });
            },
          });
        },
      }),
    { onDestroy },
  );
}
