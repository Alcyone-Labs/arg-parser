/**
 * OpenTUI v2 Types
 * 
 * Shared type definitions for the TUI system.
 * These can be safely exported from the main library without
 * importing the TUI runtime (which has bundler requirements).
 */

/**
 * Theme color palette definition
 */
export interface TuiTheme {
  name: string;
  colors: {
    /** Primary text color */
    text: string;
    /** Muted/secondary text */
    muted: string;
    /** Background color */
    background: string;
    /** Accent/highlight color */
    accent: string;
    /** Success state color */
    success: string;
    /** Warning state color */
    warning: string;
    /** Error state color */
    error: string;
    /** Border color */
    border: string;
    /** Selection/highlight background */
    selection: string;
  };
}

/**
 * Shortcut binding definition
 */
export interface ShortcutBinding {
  /** Key combination (e.g., "ctrl+t", "ctrl+x g" for chord) */
  key: string;
  /** Action to execute when shortcut triggers */
  action: () => void;
  /** Human-readable description for help */
  description?: string;
}

/**
 * Toast notification type
 */
export type ToastType = "info" | "success" | "error" | "warning";

/**
 * Configuration options for creating a TUI application
 */
export interface TuiAppConfig {
  /** Initial theme name (default: "dark") */
  theme?: string;
  /** Global keyboard shortcut bindings */
  shortcuts?: ShortcutBinding[];
  /** Called when the app is destroyed/exited */
  onDestroy?: () => void;
}
