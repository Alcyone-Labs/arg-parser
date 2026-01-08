/**
 * OpenTUI v2 - SolidJS-based Terminal User Interface Framework
 *
 * Type declarations for @alcyone-labs/arg-parser/tui
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
  useRenderer,
} from "@opentui/solid";

// Re-export JSX types for TypeScript support
export type { JSX } from "@opentui/solid";

// Re-export Accessor from solid-js for component props
import type { Accessor as SolidAccessor } from "solid-js";
export type Accessor<T> = SolidAccessor<T>;

// =============================================================================
// App Configuration
// =============================================================================

export interface TuiAppConfig {
  theme?: string | TuiTheme;
  shortcuts?: ShortcutBinding[];
  onDestroy?: () => void;
}

export declare function createTuiApp(
  App: () => JSX.Element,
  config?: TuiAppConfig
): void;

// =============================================================================
// TUI Provider
// =============================================================================

export interface TuiContextValue {
  viewportHeight: Accessor<number>;
  viewportWidth: Accessor<number>;
  exit: (code?: number) => void;
}

export interface TuiProviderProps {
  theme?: string | TuiTheme;
  shortcuts?: ShortcutBinding[];
  onScroll?: (delta: number) => void;
  scrollSpeed?: number;
  reservedRows?: number;
  children: JSX.Element;
}

export declare function TuiProvider(props: TuiProviderProps): JSX.Element;
export declare function useTui(): TuiContextValue;

// =============================================================================
// Theme System
// =============================================================================

export interface TuiTheme {
  name: string;
  colors: {
    text: string;
    muted: string;
    background: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    selection: string;
  };
}

export interface ThemeContextValue {
  current: Accessor<TuiTheme>;
  setTheme: (name: string) => void;
  cycle: () => void;
  names: string[];
}

export declare const THEMES: Record<string, TuiTheme>;
export declare const TuiThemes: typeof THEMES;

export declare const Theme: {
  from(base: TuiTheme): {
    extend(overrides: Partial<TuiTheme>): TuiTheme;
  };
  create(theme: TuiTheme): TuiTheme;
};

export declare function ThemeProvider(props: {
  initial?: string;
  children: JSX.Element;
}): JSX.Element;

export declare function useTheme(): ThemeContextValue;

// =============================================================================
// Shortcuts
// =============================================================================

export interface ShortcutBinding {
  key: string;
  action: () => void;
  description?: string;
}

export interface ShortcutContextValue {
  register: (binding: ShortcutBinding) => void;
  unregister: (key: string) => void;
}

export declare function ShortcutProvider(props: {
  bindings?: ShortcutBinding[];
  children: JSX.Element;
}): JSX.Element;

export declare function useShortcuts(): ShortcutContextValue;

// =============================================================================
// Toast
// =============================================================================

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export declare function ToastProvider(props: {
  children: JSX.Element;
}): JSX.Element;

export declare function useToast(): ToastContextValue;

// =============================================================================
// Components
// =============================================================================

export interface BreadcrumbProps {
  segments: string[];
  separator?: string;
}

export declare function Breadcrumb(props: BreadcrumbProps): JSX.Element;

export interface VirtualListProps<T = unknown> {
  items: T[] | Accessor<T[]>;
  selectedIndex: number | Accessor<number>;
  viewportHeight: number | Accessor<number>;
  title?: string;
  onSelect?: (idx: number) => void;
  getLabel?: (item: T) => string;
  showIndicator?: boolean;
  renderItem?: (item: T, idx: number, selected: boolean) => JSX.Element;
}

export interface VirtualListResult {
  scrollOffset: Accessor<number>;
  selectNext: () => void;
  selectPrevious: () => void;
  scrollTo: (idx: number) => void;
}

export declare function VirtualList<T = unknown>(
  props: VirtualListProps<T>
): JSX.Element;

export declare function createVirtualListController<T = unknown>(
  items: Accessor<T[]>,
  selectedIndex: Accessor<number>,
  setSelectedIndex: (idx: number) => void,
  viewportHeight: Accessor<number>
): VirtualListResult;

export interface MasterDetailProps {
  header?: string | JSX.Element;
  headerIcon?: string;
  breadcrumb?: string[];
  footer?: string;
  masterWidth?: string;
  master: JSX.Element;
  detail: JSX.Element;
}

export declare function MasterDetail(props: MasterDetailProps): JSX.Element;

export interface CardProps {
  title?: string;
  padding?: number;
  borderStyle?: string;
  children: JSX.Element;
}

export declare function Card(props: CardProps): JSX.Element;

export interface StatCardProps {
  label: string;
  value: number | string;
  format?: "percent" | "number";
  trend?: "up" | "down" | "none";
}

export declare function StatCard(props: StatCardProps): JSX.Element;

export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "danger" | "muted";
  disabled?: boolean;
}

export declare function Button(props: ButtonProps): JSX.Element;

export interface MarkdownBlockProps {
  content: string;
}

export declare function MarkdownBlock(props: MarkdownBlockProps): JSX.Element;

export interface DrillDownNavigatorProps {
  children: (nav: {
    push: (component: () => JSX.Element) => void;
    pop: () => void;
    replace: (component: () => JSX.Element) => void;
  }) => JSX.Element;
}

export declare function DrillDownNavigator(
  props: DrillDownNavigatorProps
): JSX.Element;

export interface MasterDetailLayoutProps {
  masterWidth?: string;
  master: JSX.Element;
  detail: JSX.Element;
}

export declare function MasterDetailLayout(
  props: MasterDetailLayoutProps
): JSX.Element;

// =============================================================================
// Hooks
// =============================================================================

export interface VirtualScrollResult {
  scrollOffset: Accessor<number>;
  setScrollOffset: (offset: number) => void;
  scrollBy: (delta: number) => void;
}

export declare function useVirtualScroll(
  itemCount: Accessor<number>,
  viewportHeight: Accessor<number>
): VirtualScrollResult;

export declare function getViewportHeight(reservedRows?: number): number;

export interface UseMouseOptions {
  onWheel?: (delta: number) => void;
}

export declare function useMouse(options?: UseMouseOptions): void;

// =============================================================================
// TTY Utilities
// =============================================================================

export declare function cleanupTerminal(): void;
export declare function enableMouseReporting(): void;
export declare function disableMouseReporting(): void;
export declare function clearScreen(): void;
export declare function resetAttributes(): void;
export declare function restoreStdin(): void;
export declare function parseMouseScroll(data: Buffer): {
  direction: "up" | "down" | null;
  delta: number;
} | null;
