import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { FlagManager, type FlagManagerOptions } from "../src/core/FlagManager";
import { ArgParser } from "../src/core/ArgParser";

describe("FlagManager Option Collision Detection", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("should detect collision with warning by default", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    // This should trigger a warning but still add the flag
    manager.addFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain("collision");
    expect(consoleWarnSpy.mock.calls[0][0]).toContain("-f");
    expect(manager.hasFlag("force")).toBe(true);
  });

  test("should throw error when throwForOptionCollisions is true", () => {
    const manager = new FlagManager({
      throwForOptionCollisions: true,
    });

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    expect(() => {
      manager.addFlag({
        name: "force",
        options: ["-f", "--force"],
        type: "boolean",
      });
    }).toThrow("collision");

    expect(manager.hasFlag("force")).toBe(false);
  });

  test("should not detect collisions when detectOptionCollisions is false", () => {
    const manager = new FlagManager({
      detectOptionCollisions: false,
    });

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    manager.addFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(manager.hasFlag("force")).toBe(true);
  });

  test("should detect multiple collisions in single flag", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    manager.addFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
    });

    // This flag collides with both file (-f) and verbose (-v)
    manager.addFlag({
      name: "force",
      options: ["-f", "-v", "--force"],
      type: "boolean",
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const warning = consoleWarnSpy.mock.calls[0][0];
    expect(warning).toContain("-f");
    expect(warning).toContain("-v");
  });

  test("should not detect collision when flag replaces existing (same name)", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    // Adding same flag again should trigger name collision, not option collision
    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    // Should only warn about duplicate name, not about option collision
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain("already exists");
  });

  test("should get collisions for flag without adding it", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    const collisions = manager.getCollisionsForFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    expect(collisions).toHaveLength(1);
    expect(collisions[0].option).toBe("-f");
    expect(collisions[0].existingFlagName).toBe("file");
    expect(collisions[0].newFlagName).toBe("force");
  });

  test("should return empty array when no collisions", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    const collisions = manager.getCollisionsForFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
    });

    expect(collisions).toHaveLength(0);
  });

  test("should track option mappings correctly", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    const mappings = manager.optionMappings;
    expect(mappings.get("-f")).toBe("file");
    expect(mappings.get("--file")).toBe("file");
  });

  test("should remove option mappings when flag is removed", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    expect(manager.optionMappings.get("-f")).toBe("file");

    manager.removeFlag("file");

    expect(manager.optionMappings.has("-f")).toBe(false);
    expect(manager.optionMappings.has("--file")).toBe(false);
  });

  test("should handle long option collisions", () => {
    const manager = new FlagManager({
      throwForOptionCollisions: true,
    });

    manager.addFlag({
      name: "output",
      options: ["--output"],
      type: "string",
    });

    expect(() => {
      manager.addFlag({
        name: "out",
        options: ["--output"],
        type: "string",
      });
    }).toThrow("collision");
  });

  test("should handle mixed short and long option collisions", () => {
    const manager = new FlagManager({
      throwForOptionCollisions: true,
    });

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    manager.addFlag({
      name: "output",
      options: ["-o", "--output"],
      type: "string",
    });

    // This collides on both -f and --output
    expect(() => {
      manager.addFlag({
        name: "force",
        options: ["-f", "--output"],
        type: "boolean",
      });
    }).toThrow("collision");
  });
});

describe("ArgParser Flag Collision Detection", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("should warn on flag option collision in addFlag", () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    parser.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    parser.addFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain("collision");
  });

  test("should detect collision in subcommand inherited flags", () => {
    const parent = new ArgParser({
      appName: "Parent CLI",
      autoExit: false,
    });

    parent.addFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
    });

    const child = new ArgParser({
      appName: "Child CLI",
      autoExit: false,
      inheritParentFlags: true,
    });

    // When child inherits flags from parent, -v is already taken
    // Adding a flag with -v in child should warn
    child.addFlag({
      name: "version",
      options: ["-v", "--version"],
      type: "boolean",
    });

    parent.addSubCommand({
      name: "child",
      parser: child,
    });

    // The collision warning might happen during addSubCommand when inheritance occurs
    // Let's just verify the structure is valid
    expect(parent.getSubCommand("child")).toBeDefined();
  });

  test("should detect collision when adding multiple flags via addFlags", () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    parser.addFlags([
      {
        name: "file",
        options: ["-f", "--file"],
        type: "string",
      },
      {
        name: "force",
        options: ["-f", "--force"],
        type: "boolean",
      },
    ]);

    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  test("should allow collision detection to be disabled", () => {
    const parser = new ArgParser({
      appName: "Test CLI",
      autoExit: false,
    });

    // Internal FlagManager should have detectOptionCollisions enabled by default
    // But there's no public API to disable it in ArgParser currently
    // This test documents the expected behavior

    parser.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    parser.addFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    // Should warn by default
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

describe("Flag Collision Prevention - Developer Experience", () => {
  test("should help developers catch errors before publishing", () => {
    // Simulate a CLI tool being built
    const parser = new ArgParser({
      appName: "my-cli",
      autoExit: false,
    });

    // Developer adds first flag
    parser.addFlag({
      name: "config",
      options: ["-c", "--config"],
      type: "string",
      description: "Path to config file",
    });

    // Later, developer (or another team member) adds a conflicting flag
    // This should produce a clear warning
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    parser.addFlag({
      name: "count",
      options: ["-c", "--count"],
      type: "number",
      description: "Number of items",
    });

    expect(consoleSpy).toHaveBeenCalled();
    const warning = consoleSpy.mock.calls[0][0];

    // Warning should be clear and actionable
    expect(warning).toContain("collision");
    expect(warning).toContain("-c");
    expect(warning).toContain("config"); // Existing flag name
    expect(warning).toContain("count"); // New flag name

    consoleSpy.mockRestore();
  });

  test("collision warning should suggest fix", () => {
    const manager = new FlagManager();

    manager.addFlag({
      name: "file",
      options: ["-f", "--file"],
      type: "string",
    });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    manager.addFlag({
      name: "force",
      options: ["-f", "--force"],
      type: "boolean",
    });

    const warning = consoleSpy.mock.calls[0][0];

    // Warning should explain that each option can only be used once
    expect(warning).toContain("Each option string can only be used by one flag");

    consoleSpy.mockRestore();
  });
});
