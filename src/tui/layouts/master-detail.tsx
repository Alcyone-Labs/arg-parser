/**
 * Master-Detail Layout
 *
 * A 3-fold TUI layout template with:
 * - Header (with title)
 * - Breadcrumb navigation
 * - Master panel (left, scrollable list)
 * - Detail panel (right, content area)
 * - Footer (shortcuts hint)
 *
 * @example
 * ```tsx
 * <MasterDetailLayout
 *   header="My App"
 *   breadcrumb={["Home", selectedItem().name]}
 *   footer="q: Quit | t: Theme"
 *   theme={currentTheme()}
 * >
 *   <MasterPanel>
 *     <For each={items()}>
 *       {(item) => <ListItem {...item} />}
 *     </For>
 *   </MasterPanel>
 *   <DetailPanel>
 *     <ItemDetails item={selectedItem()} />
 *   </DetailPanel>
 * </MasterDetailLayout>
 * ```
 */

import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "../types";

// ============================================================================
// Theme Presets
// ============================================================================

export const LAYOUT_THEMES = {
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
} as const;

export type LayoutThemeName = keyof typeof LAYOUT_THEMES;
export type LayoutTheme = (typeof LAYOUT_THEMES)[LayoutThemeName];

// ============================================================================
// Layout Props
// ============================================================================

export interface MasterDetailLayoutProps {
  /** Header title text */
  header: string;
  /** Breadcrumb path segments (e.g., ["Home", "Category", "Item"]) */
  breadcrumb?: string[];
  /** Footer text (shortcuts hint) */
  footer?: string;
  /** Theme object or theme name */
  theme?: LayoutTheme | LayoutThemeName;
  /** Master panel width (default: "35%") */
  masterWidth?: string;
  /** Children should be MasterPanel and DetailPanel */
  children: JSX.Element;
}

export interface PanelProps {
  children: JSX.Element;
}

// ============================================================================
// Helper to resolve theme
// ============================================================================

function resolveTheme(theme?: LayoutTheme | LayoutThemeName): LayoutTheme {
  if (!theme) return LAYOUT_THEMES.dark;
  if (typeof theme === "string") return LAYOUT_THEMES[theme] ?? LAYOUT_THEMES.dark;
  return theme;
}

// ============================================================================
// Components (as functions returning JSX)
// ============================================================================

/**
 * Main layout wrapper.
 */
export function MasterDetailLayout(props: MasterDetailLayoutProps): JSX.Element {
  const t = resolveTheme(props.theme);
  const masterWidth = props.masterWidth ?? "35%";

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={t.bg}>
      {/* Header */}
      <box
        height={3}
        borderStyle="single"
        borderColor={t.accent}
        justifyContent="center"
        alignItems="center"
      >
        <text bold color={t.accent}>
          {" "}
          {props.header}{" "}
        </text>
      </box>

      {/* Breadcrumb */}
      {props.breadcrumb && props.breadcrumb.length > 0 && (
        <box height={1} paddingLeft={2} backgroundColor={t.bg}>
          {props.breadcrumb.map((segment, idx) => (
            <>
              {idx > 0 && <text color={t.muted}> › </text>}
              <text color={t.accent} bold>
                {segment}
              </text>
            </>
          ))}
        </box>
      )}

      {/* Main content area */}
      <box flexGrow={1} flexDirection="row">
        {props.children}
      </box>

      {/* Footer */}
      {props.footer && (
        <box height={1} backgroundColor={t.bg}>
          <text color={t.muted}> {props.footer}</text>
        </box>
      )}
    </box>
  );
}

/**
 * Left panel for the master list.
 */
export function MasterPanel(
  props: PanelProps & {
    theme?: LayoutTheme | LayoutThemeName;
    width?: string;
  },
): JSX.Element {
  const t = resolveTheme(props.theme);
  return (
    <box
      width={props.width ?? "35%"}
      borderStyle="single"
      borderColor={t.border}
      flexDirection="column"
      padding={1}
    >
      {props.children}
    </box>
  );
}

/**
 * Right panel for detail content.
 */
export function DetailPanel(
  props: PanelProps & {
    theme?: LayoutTheme | LayoutThemeName;
  },
): JSX.Element {
  const t = resolveTheme(props.theme);
  return (
    <box
      flexGrow={1}
      borderStyle="single"
      borderColor={t.border}
      flexDirection="column"
      padding={2}
    >
      {props.children}
    </box>
  );
}

/**
 * A list item component for use in MasterPanel.
 */
export function ListItem(props: {
  label: string;
  selected?: boolean;
  theme?: LayoutTheme | LayoutThemeName;
}): JSX.Element {
  const t = resolveTheme(props.theme);
  return (
    <box height={1} backgroundColor={props.selected ? t.selection : undefined}>
      <text color={props.selected ? t.selectionFg : t.fg}>
        {props.selected ? "› " : "  "}
        {props.label}
      </text>
    </box>
  );
}
