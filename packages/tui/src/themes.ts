/**
 * TUI Theme System
 *
 * Provides a reactive theme context with built-in themes and
 * support for custom theme registration.
 */

import { createContext, createSignal, useContext, type Accessor } from "solid-js";
import type { JSX } from "@opentui/solid";
import { createComponent } from "@opentui/solid";
import type { TuiTheme } from "./types";

export type { TuiTheme };

/**
 * Built-in theme definitions
 */
export const TuiThemes: Record<string, TuiTheme> = {
  dark: {
    name: "dark",
    colors: {
      text: "#ffffff",
      muted: "#888888",
      background: "#1a1a1a",
      accent: "#00d4ff",
      success: "#00ff88",
      warning: "#ffaa00",
      error: "#ff4444",
      border: "#444444",
      selection: "#0066cc",
    },
  },
  light: {
    name: "light",
    colors: {
      text: "#000000", // Black text for readability
      muted: "#333333", // Dark gray muted
      background: "#e8e8e8", // Light gray background
      accent: "#0044aa", // Deep blue accent
      success: "#005500", // Dark green
      warning: "#885500", // Dark orange
      error: "#880000", // Dark red
      border: "#888888",
      selection: "#0044aa",
    },
  },
  monokai: {
    name: "monokai",
    colors: {
      text: "#f8f8f2",
      muted: "#75715e",
      background: "#272822",
      accent: "#ae81ff",
      success: "#a6e22e",
      warning: "#e6db74",
      error: "#f92672",
      border: "#49483e",
      selection: "#49483e",
    },
  },
  dracula: {
    name: "dracula",
    colors: {
      text: "#f8f8f2",
      muted: "#6272a4",
      background: "#282a36",
      accent: "#bd93f9",
      success: "#50fa7b",
      warning: "#f1fa8c",
      error: "#ff5555",
      border: "#44475a",
      selection: "#44475a",
    },
  },
  nord: {
    name: "nord",
    colors: {
      text: "#eceff4",
      muted: "#4c566a",
      background: "#2e3440",
      accent: "#88c0d0",
      success: "#a3be8c",
      warning: "#ebcb8b",
      error: "#bf616a",
      border: "#3b4252",
      selection: "#4c566a",
    },
  },
  solarized: {
    name: "solarized",
    colors: {
      text: "#839496",
      muted: "#586e75",
      background: "#002b36",
      accent: "#268bd2",
      success: "#859900",
      warning: "#b58900",
      error: "#dc322f",
      border: "#073642",
      selection: "#073642",
    },
  },
};

/** Shorthand alias for TuiThemes */
export const THEMES = TuiThemes;

/**
 * Theme builder for creating custom themes by extending built-in presets.
 *
 * @example
 * ```ts
 * // Extend dark theme with custom background
 * const myTheme = Theme.from(THEMES.dark).extend({
 *   name: "my-dark",
 *   colors: { background: "#1e1e1e" }
 * });
 *
 * // Or create from scratch
 * const custom = Theme.create({
 *   name: "custom",
 *   colors: { text: "#fff", background: "#000", ... }
 * });
 * ```
 */
export const Theme = {
  /**
   * Start building a theme from an existing base theme.
   */
  from: (base: TuiTheme) => ({
    /**
     * Extend the base theme with overrides.
     * Color overrides are shallow-merged with the base colors.
     */
    extend: (overrides: { name?: string; colors?: Partial<TuiTheme["colors"]> }): TuiTheme => ({
      name: overrides.name ?? `${base.name}-extended`,
      colors: { ...base.colors, ...overrides.colors },
    }),
  }),

  /**
   * Create a new theme from scratch.
   */
  create: (theme: TuiTheme): TuiTheme => theme,

  /**
   * Get all available theme names.
   */
  names: (): string[] => Object.keys(TuiThemes),

  /**
   * Get a theme by name, with fallback to dark theme.
   */
  get: (name: string): TuiTheme => TuiThemes[name] ?? TuiThemes["dark"],
};

/**
 * Theme context value interface
 */
export interface ThemeContextValue {
  /** Current active theme */
  current: Accessor<TuiTheme>;
  /** Set theme by name */
  setTheme: (name: string) => void;
  /** Cycle to the next theme */
  cycle: () => void;
  /** Register a custom theme */
  register: (theme: TuiTheme) => void;
  /** Get all available theme names */
  names: () => string[];
}

const ThemeContext = createContext<ThemeContextValue>();

/**
 * Theme provider component
 */
export function ThemeProvider(props: { initial?: string; children: JSX.Element }): JSX.Element {
  const themes = { ...TuiThemes };
  const initialTheme = themes[props.initial ?? "dark"] ?? themes["dark"];

  const [current, setCurrent] = createSignal<TuiTheme>(initialTheme);

  const setTheme = (name: string) => {
    if (themes[name]) {
      setCurrent(themes[name]);
    }
  };

  const cycle = () => {
    const currentName = current().name;
    const names = Object.keys(themes);
    const currentIndex = names.indexOf(currentName);
    const nextIndex = (currentIndex + 1) % names.length;
    setCurrent(themes[names[nextIndex]]);
  };

  const register = (theme: TuiTheme) => {
    themes[theme.name] = theme;
  };

  const names = () => Object.keys(themes);

  const value: ThemeContextValue = {
    current,
    setTheme,
    cycle,
    register,
    names,
  };

  // Using solid-js Context.Provider pattern
  return createComponent(ThemeContext.Provider, {
    value,
    get children() {
      return props.children;
    },
  });
}

/**
 * Hook to access the theme context
 *
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function ThemedText() {
 *   const { current, cycle } = useTheme()
 *   return (
 *     <text
 *       style={{ fg: current().colors.accent }}
 *       onKeyDown={(e) => e.key === "t" && cycle()}
 *     >
 *       Press T to cycle themes
 *     </text>
 *   )
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
