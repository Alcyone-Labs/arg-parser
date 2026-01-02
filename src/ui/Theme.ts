import chalk from "@alcyone-labs/simple-chalk";

export interface ITheme {
  // Text Colors
  base: (str: string) => string;
  muted: (str: string) => string;
  accent: (str: string) => string;
  highlight: (str: string) => string;

  // Status Colors
  success: (str: string) => string;
  warning: (str: string) => string;
  error: (str: string) => string;

  // UI Elements
  border: (str: string) => string;
  scrollbarThumb: (str: string) => string;
  scrollbarTrack: (str: string) => string;
}

// Helper to create simple chalk wrapper if needed,
// strictly speaking our simple-chalk returns strings directly so we assume these are functions returning strings.

export const Themes: Record<string, ITheme> = {
  Default: {
    // Dark Mode
    base: chalk.white,
    muted: chalk.gray,
    accent: chalk.cyan,
    highlight: chalk.cyan, // Was bgBlue.white
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    border: chalk.gray,
    scrollbarThumb: chalk.white,
    scrollbarTrack: chalk.gray,
  },
  Light: {
    // "Ocean" theme (High contrast on dark)
    base: chalk.white,
    muted: chalk.gray,
    accent: chalk.cyan,
    highlight: chalk.cyan, // Fallback since bgCyan not supported
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    border: chalk.cyan,
    scrollbarThumb: chalk.cyan,
    scrollbarTrack: chalk.gray,
  },
  Monokai: {
    base: chalk.white,
    muted: chalk.gray,
    accent: chalk.magenta,
    highlight: chalk.magenta, // Was bgMagenta.white
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    border: chalk.gray,
    scrollbarThumb: chalk.magenta,
    scrollbarTrack: chalk.gray,
  },
};

export class ThemeManager {
  private static _current: ITheme = Themes["Default"];

  public static get current(): ITheme {
    return this._current;
  }

  public static setTheme(name: keyof typeof Themes) {
    if (Themes[name]) {
      this._current = Themes[name];
    }
  }

  public static setCustomTheme(theme: ITheme) {
    this._current = theme;
  }
}
