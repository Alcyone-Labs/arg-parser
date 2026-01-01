
import { describe, it, expect, vi } from "vitest";
import { ArgParser } from "../src/core/ArgParser";
import { autoHelpHandler } from "../src/core/ArgParserBase";

describe("Auto Help Features", () => {
  it("should support manual displayHelp() in handler", async () => {
    const parser = new ArgParser({
      appName: "test",
      autoExit: false,
    });
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    parser.setHandler(async (ctx) => {
      ctx.displayHelp();
    });
    
    await parser.parse([]);
    
    expect(consoleSpy).toHaveBeenCalled();
    const helpOutput = consoleSpy.mock.calls.join("");
    expect(helpOutput).toContain("test Help");
    
    consoleSpy.mockRestore();
  });

  it("should support autoHelpHandler helper", async () => {
    const parser = new ArgParser({
      appName: "test",
      autoExit: false,
      handler: autoHelpHandler,
    });
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    await parser.parse([]);
    
    expect(consoleSpy).toHaveBeenCalled();
    const helpOutput = consoleSpy.mock.calls.join("");
    expect(helpOutput).toContain("test Help");
    
    consoleSpy.mockRestore();
  });

  it("should trigger auto help when triggerAutoHelpIfNoHandler is true and no handler exists", async () => {
    const parser = new ArgParser({
      appName: "test",
      autoExit: false,
      triggerAutoHelpIfNoHandler: true,
    });
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    await parser.parse([]);
    
    expect(consoleSpy).toHaveBeenCalled();
    const helpOutput = consoleSpy.mock.calls.join("");
    expect(helpOutput).toContain("test Help");
    
    consoleSpy.mockRestore();
  });

  it("should inherit triggerAutoHelpIfNoHandler in subcommands", async () => {
    const parser = new ArgParser({
      appName: "main",
      autoExit: false,
      triggerAutoHelpIfNoHandler: true,
    });
    
    const subParser = new ArgParser({
      appName: "sub",
      // No handler
    });
    
    parser.addSubCommand({
      name: "sub",
      parser: subParser,
    });
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    await parser.parse(["sub"]);
    
    expect(consoleSpy).toHaveBeenCalled();
    const helpOutput = consoleSpy.mock.calls.join("");
    expect(helpOutput).toContain("main sub Help");
    
    consoleSpy.mockRestore();
  });

  it("should not trigger auto help if handler is present even if triggerAutoHelpIfNoHandler is true", async () => {
    const handlerSpy = vi.fn();
    const parser = new ArgParser({
      appName: "test",
      autoExit: false,
      triggerAutoHelpIfNoHandler: true,
      handler: async (ctx) => {
        handlerSpy();
      }
    });
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    await parser.parse([]);
    
    expect(handlerSpy).toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("test Help"));
    
    consoleSpy.mockRestore();
  });
});
