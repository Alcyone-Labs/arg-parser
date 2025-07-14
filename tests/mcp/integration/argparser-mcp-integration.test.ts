/**
 * Integration tests for ArgParser MCP functionality
 */

import { describe, test, expect, beforeEach } from "vitest";
import { z } from "zod";
import { ArgParser } from "../../../src/ArgParser.js";
import type { McpResourceConfig, McpPromptConfig } from "../../../src/mcp-resources.js";

describe("ArgParser MCP Integration", () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = ArgParser.withMcp({
      appName: "Test MCP App",
      appCommandName: "test-mcp",
      description: "Test application with MCP support",
      handler: async (ctx) => ({ success: true, args: ctx.args })
    });
  });

  describe("Resource Management", () => {
    test("should add and retrieve MCP resources", () => {
      const resourceConfig: McpResourceConfig = {
        name: "test-data",
        uriTemplate: "test://{id}",
        title: "Test Data Resource",
        description: "Test data for integration testing",
        handler: async (uri, params) => ({
          contents: [{
            uri: uri.href,
            text: `Test data for ID: ${params.id}`,
            mimeType: "text/plain"
          }]
        })
      };

      parser.addMcpResource(resourceConfig);

      const resources = parser.getMcpResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe("test-data");
      expect(resources[0].title).toBe("Test Data Resource");
    });

    test("should remove MCP resources", () => {
      parser.addMcpResource({
        name: "removable-resource",
        uriTemplate: "test://removable",
        handler: async () => ({ contents: [] })
      });

      expect(parser.getMcpResources()).toHaveLength(1);
      
      parser.removeMcpResource("removable-resource");
      expect(parser.getMcpResources()).toHaveLength(0);
    });

    test("should chain resource additions", () => {
      const result = parser
        .addMcpResource({
          name: "resource1",
          uriTemplate: "test://1",
          handler: async () => ({ contents: [] })
        })
        .addMcpResource({
          name: "resource2", 
          uriTemplate: "test://2",
          handler: async () => ({ contents: [] })
        });

      expect(result).toBe(parser); // Should return this for chaining
      expect(parser.getMcpResources()).toHaveLength(2);
    });
  });

  describe("Prompt Management", () => {
    test("should add and retrieve MCP prompts", () => {
      const promptConfig: McpPromptConfig = {
        name: "test-prompt",
        title: "Test Prompt",
        description: "Test prompt for integration testing",
        argsSchema: z.object({
          text: z.string(),
          style: z.enum(["formal", "casual"]).optional()
        }),
        handler: ({ text, style }) => ({
          description: `Processing text in ${style || 'default'} style`,
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Please process this text in ${style || 'default'} style: ${text}`
            }
          }]
        })
      };

      parser.addMcpPrompt(promptConfig);

      const prompts = parser.getMcpPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("test-prompt");
      expect(prompts[0].title).toBe("Test Prompt");
    });

    test("should remove MCP prompts", () => {
      parser.addMcpPrompt({
        name: "removable-prompt",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] })
      });

      expect(parser.getMcpPrompts()).toHaveLength(1);
      
      parser.removeMcpPrompt("removable-prompt");
      expect(parser.getMcpPrompts()).toHaveLength(0);
    });

    test("should chain prompt additions", () => {
      const result = parser
        .addMcpPrompt({
          name: "prompt1",
          argsSchema: z.object({}),
          handler: () => ({ messages: [] })
        })
        .addMcpPrompt({
          name: "prompt2",
          argsSchema: z.object({}),
          handler: () => ({ messages: [] })
        });

      expect(result).toBe(parser); // Should return this for chaining
      expect(parser.getMcpPrompts()).toHaveLength(2);
    });
  });

  describe("Change Notifications", () => {
    test("should notify on resource changes", () => {
      let changeEvents: any[] = [];
      
      parser.onMcpChange((event) => {
        changeEvents.push(event);
      });

      parser.addMcpResource({
        name: "test-resource",
        uriTemplate: "test://resource",
        handler: async () => ({ contents: [] })
      });

      parser.removeMcpResource("test-resource");

      expect(changeEvents).toHaveLength(2);
      expect(changeEvents[0].type).toBe("resources");
      expect(changeEvents[0].action).toBe("added");
      expect(changeEvents[1].type).toBe("resources");
      expect(changeEvents[1].action).toBe("removed");
    });

    test("should notify on prompt changes", () => {
      let changeEvents: any[] = [];
      
      parser.onMcpChange((event) => {
        changeEvents.push(event);
      });

      parser.addMcpPrompt({
        name: "test-prompt",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] })
      });

      parser.removeMcpPrompt("test-prompt");

      expect(changeEvents).toHaveLength(2);
      expect(changeEvents[0].type).toBe("prompts");
      expect(changeEvents[0].action).toBe("added");
      expect(changeEvents[1].type).toBe("prompts");
      expect(changeEvents[1].action).toBe("removed");
    });

    test("should remove change listeners", () => {
      let notificationCount = 0;
      const listener = () => { notificationCount++; };

      parser.onMcpChange(listener);
      parser.addMcpResource({
        name: "test1",
        uriTemplate: "test://1",
        handler: async () => ({ contents: [] })
      });

      parser.offMcpChange(listener);
      parser.addMcpResource({
        name: "test2",
        uriTemplate: "test://2",
        handler: async () => ({ contents: [] })
      });

      expect(notificationCount).toBe(1);
    });
  });

  describe("Fluent API Integration", () => {
    test("should integrate with existing ArgParser fluent API", () => {
      const fullParser = ArgParser.withMcp({
        appName: "Full Featured App",
        handler: async (ctx) => ({ result: "success" })
      })
      .addFlags([
        {
          name: "input",
          options: ["--input", "-i"],
          type: "string",
          mandatory: true,
          description: "Input file path"
        },
        {
          name: "verbose",
          options: ["--verbose", "-v"],
          type: "boolean",
          flagOnly: true,
          description: "Enable verbose output"
        }
      ])
      .addMcpResource({
        name: "file-content",
        uriTemplate: "file://{path}",
        title: "File Content",
        description: "Read file contents",
        handler: async (uri, params) => ({
          contents: [{
            uri: uri.href,
            text: `Content of file: ${params.path}`,
            mimeType: "text/plain"
          }]
        })
      })
      .addMcpPrompt({
        name: "file-summary",
        title: "File Summary",
        description: "Generate file summary prompts",
        argsSchema: z.object({
          filePath: z.string(),
          summaryType: z.enum(["brief", "detailed"]).optional()
        }),
        handler: ({ filePath, summaryType }) => ({
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Please provide a ${summaryType || 'brief'} summary of the file: ${filePath}`
            }
          }]
        })
      })
      .addMcpSubCommand("serve", {
        name: "full-featured-mcp-server",
        version: "1.0.0",
        description: "Full featured MCP server with tools, resources, and prompts"
      });

      // Should have CLI flags converted to tools
      const tools = fullParser.toMcpTools();
      expect(tools.length).toBeGreaterThan(0);

      // Should have registered resources
      const resources = fullParser.getMcpResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe("file-content");

      // Should have registered prompts
      const prompts = fullParser.getMcpPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("file-summary");

      // Should have MCP subcommand
      const subCommands = fullParser.getSubCommands();
      expect(subCommands.has("serve")).toBe(true);
    });
  });

  describe("Manager Access", () => {
    test("should provide access to internal managers", () => {
      const resourcesManager = parser.getMcpResourcesManager();
      const promptsManager = parser.getMcpPromptsManager();
      const notificationsManager = parser.getMcpNotificationsManager();

      expect(resourcesManager).toBeDefined();
      expect(promptsManager).toBeDefined();
      expect(notificationsManager).toBeDefined();

      // Should be able to use managers directly
      resourcesManager.addResource({
        name: "direct-resource",
        uriTemplate: "direct://test",
        handler: async () => ({ contents: [] })
      });

      expect(parser.getMcpResources()).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid resource configurations", () => {
      expect(() => {
        parser.addMcpResource({} as any);
      }).toThrow();
    });

    test("should handle invalid prompt configurations", () => {
      expect(() => {
        parser.addMcpPrompt({} as any);
      }).toThrow();
    });

    test("should handle duplicate resource names", () => {
      const config = {
        name: "duplicate",
        uriTemplate: "test://duplicate",
        handler: async () => ({ contents: [] })
      };

      parser.addMcpResource(config);
      expect(() => {
        parser.addMcpResource(config);
      }).toThrow("already exists");
    });

    test("should handle duplicate prompt names", () => {
      const config = {
        name: "duplicate",
        argsSchema: z.object({}),
        handler: () => ({ messages: [] })
      };

      parser.addMcpPrompt(config);
      expect(() => {
        parser.addMcpPrompt(config);
      }).toThrow("already exists");
    });
  });
});
