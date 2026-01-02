/**
 * OpenTUI v2 - SolidJS-based Terminal User Interface Framework
 *
 * This module provides a reactive TUI framework built on top of SST's OpenTUI
 * with SolidJS for declarative component rendering.
 *
 * @example
 * ```tsx
 * import { TuiProvider, MasterDetail, VirtualList, useTheme } from "@alcyone-labs/arg-parser"
 *
 * function App() {
 *   const { current: theme } = useTheme();
 *   return (
 *     <MasterDetail
 *       header="My App"
 *       master={<VirtualList items={items} selectedIndex={idx()} />}
 *       detail={<ItemDetails item={selected()} />}
 *     />
 *   );
 * }
 *
 * render(() => (
 *   <TuiProvider theme="dark" onScroll={handleScroll}>
 *     <App />
 *   </TuiProvider>
 * ));
 * ```
 */

// Re-export core OpenTUI primitives from @opentui/solid
export {
  render,
  createComponent,
  effect,
  memo,
  insert,
  spread,
  mergeProps,
  useKeyboard,
} from "@opentui/solid";

// Re-export JSX types for TypeScript support
export type { JSX } from "@opentui/solid";

// ArgParser-specific app wrapper
export { createTuiApp, type TuiAppConfig } from "./app";

// Unified TUI Provider (recommended)
export {
  TuiProvider,
  useTui,
  type TuiProviderProps,
  type TuiContextValue,
} from "./providers";

// Theme system with builder
export {
  TuiThemes,
  THEMES,
  Theme,
  ThemeProvider,
  useTheme,
  type TuiTheme,
  type ThemeContextValue,
} from "./themes";

// Shortcut system with lead-key chords
export {
  ShortcutProvider,
  useShortcuts,
  type ShortcutBinding,
  type ShortcutContextValue,
} from "./shortcuts";

// Toast notifications
export { ToastProvider, useToast, type ToastType } from "./toast";

// =============================================================================
// Components
// =============================================================================

// New reactive components (v2)
export { Breadcrumb, type BreadcrumbProps } from "./components/Breadcrumb";
export {
  VirtualList,
  createVirtualListController,
  type VirtualListProps,
  type VirtualListResult,
} from "./components/VirtualList";
export {
  MasterDetail,
  type MasterDetailProps,
} from "./components/MasterDetailV2";

// Legacy layout components
export {
  MasterDetailLayout,
  type MasterDetailLayoutProps,
} from "./components/MasterDetailLayout";
export {
  DrillDownNavigator,
  type DrillDownNavigatorProps,
} from "./components/DrillDownNavigator";
export {
  Card,
  StatCard,
  type CardProps,
  type StatCardProps,
} from "./components/Card";
export {
  MarkdownBlock,
  type MarkdownBlockProps,
} from "./components/MarkdownBlock";
export { Button, type ButtonProps } from "./components/Button";

// Layout templates (from layouts/)
export {
  MasterDetailLayout as MasterDetailTemplate,
  MasterPanel,
  DetailPanel,
  ListItem,
  LAYOUT_THEMES,
  type LayoutTheme,
  type LayoutThemeName,
} from "./layouts";

// =============================================================================
// Hooks
// =============================================================================

export {
  useVirtualScroll,
  getViewportHeight,
  useMouse,
  type VirtualScrollResult as VirtualScrollHookResult,
  type UseMouseOptions,
} from "./hooks";

// =============================================================================
// TTY Utilities
// =============================================================================

export {
  cleanupTerminal,
  enableMouseReporting,
  disableMouseReporting,
  clearScreen,
  resetAttributes,
  restoreStdin,
  parseMouseScroll,
} from "./tty";
