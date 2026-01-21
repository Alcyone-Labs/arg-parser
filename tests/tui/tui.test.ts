/**
 * TUI Module Tests
 *
 * Tests for OpenTUI integration including:
 * - Terminal setup and cleanup
 * - Provider composition
 * - Theme system
 * - Toast notifications
 * - Shortcut handling
 */

import { describe, expect, test, vi } from "vitest";
import { Buffer } from "node:buffer";
import * as tui from "@alcyone-labs/arg-parser/tui";

describe("TUI Module", () => {
  describe("Terminal Setup and Cleanup", () => {
    test("should export terminal utility functions", () => {
      expect(typeof tui.cleanupTerminal).toBe("function");
      expect(typeof tui.enableMouseReporting).toBe("function");
      expect(typeof tui.disableMouseReporting).toBe("function");
      expect(typeof tui.clearScreen).toBe("function");
      expect(typeof tui.resetAttributes).toBe("function");
      expect(typeof tui.restoreStdin).toBe("function");
      expect(typeof tui.switchToAlternateScreen).toBe("function");
      expect(typeof tui.switchToMainScreen).toBe("function");
    });

    test("should call terminal setup functions", () => {
      const switchSpy = vi.spyOn(process.stdout, "write");
      switchSpy.mockImplementation(() => true);

      tui.switchToAlternateScreen();
      tui.enableMouseReporting();

      expect(switchSpy).toHaveBeenCalledWith("\x1b[?1049h");
      expect(switchSpy).toHaveBeenCalledWith("\x1b[?1000h");
      expect(switchSpy).toHaveBeenCalledWith("\x1b[?1006h");

      switchSpy.mockRestore();
    });

    test("should call terminal cleanup functions", () => {
      const writeSpy = vi.spyOn(process.stdout, "write");
      writeSpy.mockImplementation(() => true);

      const stdinSpy = vi.spyOn(process.stdin, "setRawMode");
      stdinSpy.mockReturnThis();

      tui.cleanupTerminal();

      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1049l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1000l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1002l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1003l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1006l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[?1015l");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[2J\x1b[3J\x1b[H");
      expect(writeSpy).toHaveBeenCalledWith("\x1b[0m");

      writeSpy.mockRestore();
      stdinSpy.mockRestore();
    });
  });

  describe("Theme System", () => {
    test("should export built-in themes", () => {
      expect(tui.TuiThemes).toBeDefined();
      expect(tui.THEMES).toBe(tui.TuiThemes);
      expect(tui.Theme).toBeDefined();

      expect(tui.TuiThemes.dark).toBeDefined();
      expect(tui.TuiThemes.light).toBeDefined();
      expect(tui.TuiThemes.monokai).toBeDefined();
      expect(tui.TuiThemes.dracula).toBeDefined();
      expect(tui.TuiThemes.nord).toBeDefined();
      expect(tui.TuiThemes.solarized).toBeDefined();
    });

    test("should have required color properties", () => {
      const darkTheme = tui.TuiThemes.dark;
      expect(darkTheme.colors.text).toBeDefined();
      expect(darkTheme.colors.muted).toBeDefined();
      expect(darkTheme.colors.background).toBeDefined();
      expect(darkTheme.colors.accent).toBeDefined();
      expect(darkTheme.colors.success).toBeDefined();
      expect(darkTheme.colors.warning).toBeDefined();
      expect(darkTheme.colors.error).toBeDefined();
      expect(darkTheme.colors.border).toBeDefined();
      expect(darkTheme.colors.selection).toBeDefined();
    });

    test("Theme builder should work correctly", () => {
      const customTheme = tui.Theme.from(tui.TuiThemes.dark).extend({
        name: "custom-dark",
        colors: {
          background: "#000000",
          text: "#ffffff",
          muted: "#aaaaaa",
          accent: "#00ff00",
          success: "#00ff00",
          warning: "#ffff00",
          error: "#ff0000",
          border: "#666666",
          selection: "#333333",
        },
      });

      expect(customTheme.name).toBe("custom-dark");
      expect(customTheme.colors.background).toBe("#000000");
      expect(customTheme.colors.text).toBe("#ffffff");
      expect(customTheme.colors.accent).toBe("#00ff00");
    });

    test("Theme builder should merge colors correctly", () => {
      const customTheme = tui.Theme.from(tui.TuiThemes.dark).extend({
        name: "test-extended",
        colors: {
          background: "#111111",
          text: "#ffffff",
          muted: "#aaaaaa",
          accent: "#00ff00",
          success: "#00ff00",
          warning: "#ffff00",
          error: "#ff0000",
          border: "#666666",
          selection: "#333333",
        },
      });

      expect(customTheme.name).toBe("test-extended");
      expect(customTheme.colors.background).toBe("#111111");
      expect(customTheme.colors.text).toBe("#ffffff");
    });

    test("Theme.create should work", () => {
      const custom = tui.Theme.create({
        name: "test-theme",
        colors: {
          text: "#ff0000",
          muted: "#880000",
          background: "#000000",
          accent: "#ff8800",
          success: "#00ff00",
          warning: "#ffff00",
          error: "#ff0088",
          border: "#444444",
          selection: "#666666",
        },
      });

      expect(custom.name).toBe("test-theme");
      expect(custom.colors.text).toBe("#ff0000");
    });
  });

  describe("Toast System", () => {
    test("should export toast types and functions", () => {
      expect(typeof tui.ToastProvider).toBe("function");
      expect(typeof tui.useToast).toBe("function");
    });
  });

  describe("Shortcut System", () => {
    test("should export shortcut types and functions", () => {
      expect(typeof tui.ShortcutProvider).toBe("function");
      expect(typeof tui.useShortcuts).toBe("function");
    });
  });

  describe("TuiProvider", () => {
    test("should export TuiProvider and useTui", () => {
      expect(typeof tui.TuiProvider).toBe("function");
      expect(typeof tui.useTui).toBe("function");
    });
  });

  describe("Core OpenTUI Exports", () => {
    test("should re-export core OpenTUI primitives", () => {
      expect(typeof tui.render).toBe("function");
      expect(typeof tui.createComponent).toBe("function");
      expect(typeof tui.effect).toBe("function");
      expect(typeof tui.memo).toBe("function");
      expect(typeof tui.insert).toBe("function");
      expect(typeof tui.spread).toBe("function");
      expect(typeof tui.mergeProps).toBe("function");
      expect(typeof tui.useKeyboard).toBe("function");
      expect(typeof tui.useRenderer).toBe("function");
    });
  });

  describe("Component Exports", () => {
    test("should export all TUI components", () => {
      expect(typeof tui.Breadcrumb).toBe("function");
      expect(typeof tui.VirtualList).toBe("function");
      expect(typeof tui.createVirtualListController).toBe("function");
      expect(typeof tui.MasterDetail).toBe("function");
      expect(typeof tui.Card).toBe("function");
      expect(typeof tui.StatCard).toBe("function");
      expect(typeof tui.Button).toBe("function");
      expect(typeof tui.MarkdownBlock).toBe("function");
      expect(typeof tui.DrillDownNavigator).toBe("function");
      expect(typeof tui.MasterDetailLayout).toBe("function");
    });
  });

  describe("Hook Exports", () => {
    test("should export all TUI hooks", () => {
      expect(typeof tui.useVirtualScroll).toBe("function");
      expect(typeof tui.getViewportHeight).toBeDefined();
      expect(typeof tui.useMouse).toBe("function");
    });
  });

  describe("Mouse Event Parsing", () => {
    test("parseMouseScroll should detect scroll up", () => {
      const buffer = Buffer.from("\x1b[<64;10;15M");
      const result = tui.parseMouseScroll(buffer);
      expect(result).toBe(-1);
    });

    test("parseMouseScroll should detect scroll down", () => {
      const buffer = Buffer.from("\x1b[<65;10;15M");
      const result = tui.parseMouseScroll(buffer);
      expect(result).toBe(1);
    });

    test("parseMouseScroll should return 0 for non-scroll events", () => {
      const buffer = Buffer.from("\x1b[<0;10;15M");
      const result = tui.parseMouseScroll(buffer);
      expect(result).toBe(0);
    });
  });

  describe("Peer Dependencies Documentation", () => {
    test("package.json should have correct peerDependencies", () => {
      const packageJson = require("../../package.json");

      expect(packageJson.peerDependencies).toBeDefined();
      expect(packageJson.peerDependencies["@opentui/core"]).toBeDefined();
      expect(packageJson.peerDependencies["@opentui/solid"]).toBeDefined();
    });
  });

  describe("createTuiApp", () => {
    test("should export createTuiApp function", () => {
      expect(typeof tui.createTuiApp).toBe("function");
    });
  });

  describe("Button Component", () => {
    test("should export Button component", () => {
      expect(typeof tui.Button).toBe("function");
    });
  });
});
