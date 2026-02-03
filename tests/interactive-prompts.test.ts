import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { PromptManager } from "../src/core/PromptManager";
import type { IHandlerContext, IPromptableFlag } from "../src/core/types";

// Helper to create a promptable flag for tests
function createPromptableFlag(
  name: string,
  promptFn: () => Promise<any>,
  promptSequence?: number,
): IPromptableFlag {
  return {
    name,
    options: [`--${name}`],
    type: "string",
    prompt: promptFn,
    promptSequence,
  } as IPromptableFlag;
}

describe("PromptManager Unit Tests", () => {
  describe("sortFlagsBySequence", () => {
    test("should sort flags by explicit promptSequence", () => {
      const flags = [
        { flag: { promptSequence: 3 } as IPromptableFlag, name: "third", index: 0 },
        { flag: { promptSequence: 1 } as IPromptableFlag, name: "first", index: 1 },
        { flag: { promptSequence: 2 } as IPromptableFlag, name: "second", index: 2 },
      ];

      const sorted = PromptManager.sortFlagsBySequence(flags);

      expect(sorted.map((f) => f.name)).toEqual(["first", "second", "third"]);
    });

    test("should fall back to array order when promptSequence not specified", () => {
      const flags = [
        { flag: {} as IPromptableFlag, name: "first", index: 0 },
        { flag: {} as IPromptableFlag, name: "second", index: 1 },
        { flag: {} as IPromptableFlag, name: "third", index: 2 },
      ];

      const sorted = PromptManager.sortFlagsBySequence(flags);

      expect(sorted.map((f) => f.name)).toEqual(["first", "second", "third"]);
    });

    test("should use array order to break ties", () => {
      const flags = [
        { flag: { promptSequence: 1 } as IPromptableFlag, name: "a", index: 1 },
        { flag: { promptSequence: 1 } as IPromptableFlag, name: "b", index: 0 },
        { flag: { promptSequence: 1 } as IPromptableFlag, name: "c", index: 2 },
      ];

      const sorted = PromptManager.sortFlagsBySequence(flags);

      // First in array (index 0) wins tie: b, a, c
      expect(sorted.map((f) => f.name)).toEqual(["b", "a", "c"]);
    });

    test("should handle mixed explicit and implicit sequences", () => {
      const flags = [
        { flag: { promptSequence: 2 } as IPromptableFlag, name: "second", index: 3 },
        { flag: {} as IPromptableFlag, name: "first", index: 0 },
        { flag: { promptSequence: 3 } as IPromptableFlag, name: "third", index: 1 },
      ];

      const sorted = PromptManager.sortFlagsBySequence(flags);

      // first (index 0), second (seq 2), third (seq 3)
      expect(sorted.map((f) => f.name)).toEqual(["first", "second", "third"]);
    });

    test("should not mutate original array", () => {
      const flags = [
        { flag: { promptSequence: 2 } as IPromptableFlag, name: "second", index: 0 },
        { flag: { promptSequence: 1 } as IPromptableFlag, name: "first", index: 1 },
      ];

      const originalOrder = [...flags];
      PromptManager.sortFlagsBySequence(flags);

      expect(flags).toEqual(originalOrder);
    });
  });

  describe("shouldTriggerInteractive", () => {
    test("'always' should always trigger", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "test" }];
      const args = {};

      expect(PromptManager.shouldTriggerInteractive("always", flags, args)).toBe(true);
    });

    test("'interactive-flag' should trigger when --interactive is present", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "test" }];
      const args = { interactive: true };

      expect(PromptManager.shouldTriggerInteractive("interactive-flag", flags, args)).toBe(true);
    });

    test("'interactive-flag' should not trigger without --interactive", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "test" }];
      const args = { interactive: false };

      expect(PromptManager.shouldTriggerInteractive("interactive-flag", flags, args)).toBe(false);
    });

    test("'missing' should trigger when promptable flag is missing", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "required" }];
      const args = { required: undefined };

      expect(PromptManager.shouldTriggerInteractive("missing", flags, args)).toBe(true);
    });

    test("'missing' should trigger when promptable flag is empty string", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "required" }];
      const args = { required: "" };

      expect(PromptManager.shouldTriggerInteractive("missing", flags, args)).toBe(true);
    });

    test("'missing' should trigger when promptable flag is null", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "required" }];
      const args = { required: null };

      expect(PromptManager.shouldTriggerInteractive("missing", flags, args)).toBe(true);
    });

    test("'missing' should not trigger when all flags have values", () => {
      const flags = [
        { flag: {} as IPromptableFlag, name: "first" },
        { flag: {} as IPromptableFlag, name: "second" },
      ];
      const args = { first: "value1", second: "value2" };

      expect(PromptManager.shouldTriggerInteractive("missing", flags, args)).toBe(false);
    });

    test("'missing' should trigger if any flag is missing", () => {
      const flags = [
        { flag: {} as IPromptableFlag, name: "first" },
        { flag: {} as IPromptableFlag, name: "second" },
      ];
      const args = { first: "value1", second: undefined };

      expect(PromptManager.shouldTriggerInteractive("missing", flags, args)).toBe(true);
    });

    test("should handle unknown promptWhen value", () => {
      const flags = [{ flag: {} as IPromptableFlag, name: "test" }];
      const args = {};

      expect(PromptManager.shouldTriggerInteractive("unknown" as any, flags, args)).toBe(false);
    });
  });

  describe("isInteractiveEnvironment", () => {
    const originalIsTTY = process.stdin.isTTY;

    beforeEach(() => {
      // Reset process.stdin.isTTY before each test
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // Restore original value
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        writable: true,
        configurable: true,
      });
    });

    test("should return true when stdin is a TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });

      expect(PromptManager.isInteractiveEnvironment()).toBe(true);
    });

    test("should return false when stdin is not a TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        writable: true,
        configurable: true,
      });

      expect(PromptManager.isInteractiveEnvironment()).toBe(false);
    });

    test("should return false when isTTY is undefined", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(PromptManager.isInteractiveEnvironment()).toBe(false);
    });
  });

  describe("PromptManager instance methods", () => {
    let mockContext: IHandlerContext;

    beforeEach(() => {
      mockContext = {
        args: {},
        commandChain: [],
        parser: {} as any,
        displayHelp: vi.fn(),
        logger: {},
      };
    });

    test("should create PromptManager instance with options", () => {
      const onCancel = vi.fn();
      const manager = new PromptManager({
        context: mockContext,
        onCancel,
      });

      expect(manager).toBeInstanceOf(PromptManager);
    });

    test("should execute prompts and collect answers", async () => {
      // This test requires mocking @clack/prompts
      // For now, just verify the structure
      const manager = new PromptManager({
        context: mockContext,
      });

      expect(manager.executePrompts).toBeDefined();
    });
  });
});

describe("PromptManager Integration with ArgParser", () => {
  test("should detect promptable flags from ArgParser", async () => {
    const { ArgParser } = await import("../src/core/ArgParser");

    const parser = new ArgParser({
      appName: "Test CLI",
    });

    // Add a promptable flag
    parser.addFlag({
      name: "environment",
      options: ["--env", "-e"],
      type: "string",
      prompt: async () => ({
        type: "select",
        message: "Select environment:",
        options: ["staging", "production"],
      }),
    } as IPromptableFlag);

    // Add a non-promptable flag
    parser.addFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
    });

    const promptableFlags = parser.getPromptableFlags();

    expect(promptableFlags).toHaveLength(1);
    expect(promptableFlags[0].name).toBe("environment");
  });

  test("should return empty array when no promptable flags", async () => {
    const { ArgParser } = await import("../src/core/ArgParser");

    const parser = new ArgParser({
      appName: "Test CLI",
    });

    parser.addFlag({
      name: "verbose",
      options: ["-v", "--verbose"],
      type: "boolean",
    });

    const promptableFlags = parser.getPromptableFlags();

    expect(promptableFlags).toHaveLength(0);
  });

  test("should get default promptWhen value", async () => {
    const { ArgParser } = await import("../src/core/ArgParser");

    const parser = new ArgParser({
      appName: "Test CLI",
    });

    expect(parser.getPromptWhen()).toBe("interactive-flag");
  });

  test("should set and get promptWhen value", async () => {
    const { ArgParser } = await import("../src/core/ArgParser");

    const parser = new ArgParser({
      appName: "Test CLI",
    });

    parser.setPromptWhen("always");

    expect(parser.getPromptWhen()).toBe("always");
  });

  test("should set onCancel callback", async () => {
    const { ArgParser } = await import("../src/core/ArgParser");

    const parser = new ArgParser({
      appName: "Test CLI",
    });

    const onCancel = vi.fn();
    parser.setOnCancel(onCancel);

    // Just verify it doesn't throw
    expect(() => parser.setOnCancel(onCancel)).not.toThrow();
  });
});
