/**
 * Tests for MCP Prompts functionality
 */

import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createCodeReviewPrompt,
  createDocumentationPrompt,
  createSummarizationPrompt,
  createTranslationPrompt,
  McpPromptsManager,
} from "../../../src/mcp/mcp-prompts.js";
import type { McpPromptConfig } from "../../../src/mcp/mcp-prompts.js";

describe("McpPromptsManager", () => {
  let manager: McpPromptsManager;

  beforeEach(() => {
    manager = new McpPromptsManager();
  });

  describe("Prompt Registration", () => {
    test("should register a simple prompt", () => {
      const config: McpPromptConfig = {
        name: "test-prompt",
        title: "Test Prompt",
        description: "A test prompt",
        argsSchema: z.object({ text: z.string() }),
        handler: ({ text }) => ({
          messages: [
            {
              role: "user",
              content: { type: "text", text: `Process: ${text}` },
            },
          ],
        }),
      };

      manager.addPrompt(config);
      expect(manager.hasPrompt("test-prompt")).toBe(true);
      expect(manager.count()).toBe(1);
    });

    test("should register a prompt with complex schema", () => {
      const config: McpPromptConfig = {
        name: "complex-prompt",
        argsSchema: z.object({
          text: z.string(),
          options: z
            .object({
              style: z.enum(["formal", "casual"]),
              length: z.number().optional(),
            })
            .optional(),
        }),
        handler: ({ text, options }) => ({
          description: `Processing ${text} with style ${options?.style || "default"}`,
          messages: [
            {
              role: "user",
              content: { type: "text", text },
            },
          ],
        }),
      };

      manager.addPrompt(config);
      expect(manager.hasPrompt("complex-prompt")).toBe(true);
    });

    test("should prevent duplicate prompt names", () => {
      const config: McpPromptConfig = {
        name: "duplicate",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      };

      manager.addPrompt(config);
      expect(() => manager.addPrompt(config)).toThrow(
        "Prompt with name 'duplicate' already exists",
      );
    });

    test("should validate prompt configuration", () => {
      expect(() => manager.addPrompt({} as any)).toThrow(
        "Prompt name is required",
      );

      expect(() =>
        manager.addPrompt({
          name: "test",
          argsSchema: z.object({}),
        } as any),
      ).toThrow("Prompt handler is required");

      expect(() =>
        manager.addPrompt({
          name: "test",
          handler: () => ({ messages: [] }),
        } as any),
      ).toThrow("Prompt argsSchema is required");
    });
  });

  describe("Prompt Retrieval", () => {
    beforeEach(() => {
      manager.addPrompt({
        name: "greeting",
        argsSchema: z.object({ name: z.string() }),
        handler: ({ name }) => ({
          messages: [
            {
              role: "user",
              content: { type: "text", text: `Hello, ${name}!` },
            },
          ],
        }),
      });

      manager.addPrompt({
        name: "summary",
        argsSchema: z.object({
          text: z.string(),
          length: z.number().optional(),
        }),
        handler: ({ text, length }) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Summarize in ${length || 100} words: ${text}`,
              },
            },
          ],
        }),
      });
    });

    test("should get all prompts", () => {
      const prompts = manager.getPrompts();
      expect(prompts).toHaveLength(2);
      expect(prompts.map((p) => p.name)).toContain("greeting");
      expect(prompts.map((p) => p.name)).toContain("summary");
    });

    test("should get specific prompt by name", () => {
      const prompt = manager.getPrompt("greeting");
      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe("greeting");
    });

    test("should return undefined for non-existent prompt", () => {
      const prompt = manager.getPrompt("non-existent");
      expect(prompt).toBeUndefined();
    });
  });

  describe("Prompt Execution", () => {
    beforeEach(() => {
      manager.addPrompt({
        name: "echo",
        argsSchema: z.object({ message: z.string() }),
        handler: ({ message }) => ({
          description: "Echo prompt",
          messages: [
            {
              role: "user",
              content: { type: "text", text: message },
            },
          ],
        }),
      });

      manager.addPrompt({
        name: "math",
        argsSchema: z.object({
          operation: z.enum(["add", "subtract"]),
          a: z.number(),
          b: z.number(),
        }),
        handler: ({ operation, a, b }) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Calculate: ${a} ${operation} ${b}`,
              },
            },
          ],
        }),
      });
    });

    test("should execute prompt with valid arguments", async () => {
      const result = await manager.executePrompt("echo", {
        message: "Hello World",
      });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toBe("Hello World");
    });

    test("should execute prompt with complex arguments", async () => {
      const result = await manager.executePrompt("math", {
        operation: "add",
        a: 5,
        b: 3,
      });
      expect(result.messages[0].content.text).toBe("Calculate: 5 add 3");
    });

    test("should validate arguments against schema", async () => {
      await expect(manager.executePrompt("echo", {})).rejects.toThrow(
        "Invalid arguments",
      );
      await expect(
        manager.executePrompt("math", {
          operation: "invalid",
          a: 5,
          b: 3,
        }),
      ).rejects.toThrow("Invalid arguments");
    });

    test("should throw error for non-existent prompt", async () => {
      await expect(manager.executePrompt("non-existent", {})).rejects.toThrow(
        "Prompt 'non-existent' not found",
      );
    });
  });

  describe("Prompt Removal", () => {
    test("should remove existing prompt", () => {
      manager.addPrompt({
        name: "removable",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      expect(manager.hasPrompt("removable")).toBe(true);
      const removed = manager.removePrompt("removable");
      expect(removed).toBe(true);
      expect(manager.hasPrompt("removable")).toBe(false);
    });

    test("should return false when removing non-existent prompt", () => {
      const removed = manager.removePrompt("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("Change Notifications", () => {
    test("should notify listeners on prompt addition", () => {
      let notified = false;
      manager.onPromptsChange(() => {
        notified = true;
      });

      manager.addPrompt({
        name: "new-prompt",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      expect(notified).toBe(true);
    });

    test("should notify listeners on prompt removal", () => {
      manager.addPrompt({
        name: "removable",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      let notified = false;
      manager.onPromptsChange(() => {
        notified = true;
      });

      manager.removePrompt("removable");
      expect(notified).toBe(true);
    });

    test("should remove change listeners", () => {
      let notificationCount = 0;
      const listener = () => {
        notificationCount++;
      };

      manager.onPromptsChange(listener);
      manager.addPrompt({
        name: "test1",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      manager.offPromptsChange(listener);
      manager.addPrompt({
        name: "test2",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      expect(notificationCount).toBe(1);
    });
  });

  describe("Clear and Count", () => {
    test("should clear all prompts", () => {
      manager.addPrompt({
        name: "test1",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });
      manager.addPrompt({
        name: "test2",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] }),
      });

      expect(manager.count()).toBe(2);
      manager.clear();
      expect(manager.count()).toBe(0);
    });
  });
});

describe("Helper Prompt Functions", () => {
  test("createCodeReviewPrompt should create valid prompt config", () => {
    const config = createCodeReviewPrompt();
    expect(config.name).toBe("code-review");
    expect(config.title).toBe("Code Review Assistant");
    expect(typeof config.handler).toBe("function");

    const result = config.handler({
      code: "console.log('hello')",
      language: "javascript",
      focus: "security",
    });
    expect(result.messages[0].content.text).toContain("security");
    expect(result.messages[0].content.text).toContain("console.log('hello')");
  });

  test("createSummarizationPrompt should create valid prompt config", () => {
    const config = createSummarizationPrompt();
    expect(config.name).toBe("summarize");
    expect(typeof config.handler).toBe("function");

    const result = config.handler({
      text: "Long text to summarize",
      length: "brief",
      style: "bullet-points",
    });
    expect(result.messages[0].content.text).toContain("bullet points");
    expect(result.messages[0].content.text).toContain("1-2 sentences");
  });

  test("createTranslationPrompt should create valid prompt config", () => {
    const config = createTranslationPrompt();
    expect(config.name).toBe("translate");
    expect(typeof config.handler).toBe("function");

    const result = config.handler({
      text: "Hello world",
      targetLanguage: "Spanish",
      sourceLanguage: "English",
      tone: "formal",
    });
    expect(result.messages[0].content.text).toContain("Spanish");
    expect(result.messages[0].content.text).toContain("formal");
  });

  test("createDocumentationPrompt should create valid prompt config", () => {
    const config = createDocumentationPrompt();
    expect(config.name).toBe("document-code");
    expect(typeof config.handler).toBe("function");

    const result = config.handler({
      code: "function test() {}",
      language: "javascript",
      style: "jsdoc",
      includeExamples: true,
    });
    expect(result.messages[0].content.text).toContain("jsdoc");
    expect(result.messages[0].content.text).toContain("examples");
  });
});
