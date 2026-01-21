/**
 * Tests for MCP Resources functionality
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  createFileResource,
  createJsonResource,
  McpResourcesManager,
  ResourceTemplateParser,
} from "../../../src/mcp/mcp-resources.js";
import type { McpResourceConfig } from "../../../src/mcp/mcp-resources.js";

describe("McpResourcesManager", () => {
  let manager: McpResourcesManager;

  beforeEach(() => {
    manager = new McpResourcesManager();
  });

  describe("Resource Registration", () => {
    test("should register a simple resource", () => {
      const config: McpResourceConfig = {
        name: "test-resource",
        uriTemplate: "test://data",
        title: "Test Resource",
        description: "A test resource",
        handler: async () => ({
          contents: [{ uri: "test://data", text: "test data" }],
        }),
      };

      manager.addResource(config);
      expect(manager.hasResource("test-resource")).toBe(true);
      expect(manager.count()).toBe(1);
    });

    test("should register a resource with URI template", () => {
      const config: McpResourceConfig = {
        name: "user-profile",
        uriTemplate: "users://{userId}/profile",
        handler: async (uri, params) => ({
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({
                userId: params.userId,
                name: "Test User",
              }),
              mimeType: "application/json",
            },
          ],
        }),
      };

      manager.addResource(config);
      expect(manager.hasResource("user-profile")).toBe(true);
    });

    test("should prevent duplicate resource names", () => {
      const config: McpResourceConfig = {
        name: "duplicate",
        uriTemplate: "test://duplicate",
        handler: async () => ({ contents: [] }),
      };

      manager.addResource(config);
      expect(() => manager.addResource(config)).toThrow(
        "Resource with name 'duplicate' already exists",
      );
    });

    test("should validate resource configuration", () => {
      expect(() => manager.addResource({} as any)).toThrow("Resource name is required");

      expect(() =>
        manager.addResource({
          name: "test",
          uriTemplate: "",
          handler: async () => ({ contents: [] }),
        }),
      ).toThrow("Resource uriTemplate is required");

      expect(() =>
        manager.addResource({
          name: "test",
          uriTemplate: "test://data",
        } as any),
      ).toThrow("Resource handler is required");
    });
  });

  describe("Resource Retrieval", () => {
    beforeEach(() => {
      manager.addResource({
        name: "static-data",
        uriTemplate: "static://data",
        handler: async () => ({
          contents: [{ uri: "static://data", text: "static content" }],
        }),
      });

      manager.addResource({
        name: "user-data",
        uriTemplate: "users://{userId}",
        handler: async (uri, params) => ({
          contents: [{ uri: uri.href, text: `User: ${params.userId}` }],
        }),
      });
    });

    test("should get all resources", () => {
      const resources = manager.getResources();
      expect(resources).toHaveLength(2);
      expect(resources.map((r) => r.name)).toContain("static-data");
      expect(resources.map((r) => r.name)).toContain("user-data");
    });

    test("should get specific resource by name", () => {
      const resource = manager.getResource("static-data");
      expect(resource).toBeDefined();
      expect(resource?.name).toBe("static-data");
    });

    test("should return undefined for non-existent resource", () => {
      const resource = manager.getResource("non-existent");
      expect(resource).toBeUndefined();
    });

    test("should find resource for URI", () => {
      const result = manager.findResourceForUri("users://123");
      expect(result).toBeDefined();
      expect(result?.config.name).toBe("user-data");
      expect(result?.params).toEqual({ userId: "123" });
    });

    test("should return null for unmatched URI", () => {
      const result = manager.findResourceForUri("unknown://uri");
      expect(result).toBeNull();
    });
  });

  describe("Resource Removal", () => {
    test("should remove existing resource", () => {
      manager.addResource({
        name: "removable",
        uriTemplate: "test://removable",
        handler: async () => ({ contents: [] }),
      });

      expect(manager.hasResource("removable")).toBe(true);
      const removed = manager.removeResource("removable");
      expect(removed).toBe(true);
      expect(manager.hasResource("removable")).toBe(false);
    });

    test("should return false when removing non-existent resource", () => {
      const removed = manager.removeResource("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("Change Notifications", () => {
    test("should notify listeners on resource addition", () => {
      let notified = false;
      manager.onResourcesChange(() => {
        notified = true;
      });

      manager.addResource({
        name: "new-resource",
        uriTemplate: "test://new",
        handler: async () => ({ contents: [] }),
      });

      expect(notified).toBe(true);
    });

    test("should notify listeners on resource removal", () => {
      manager.addResource({
        name: "removable",
        uriTemplate: "test://removable",
        handler: async () => ({ contents: [] }),
      });

      let notified = false;
      manager.onResourcesChange(() => {
        notified = true;
      });

      manager.removeResource("removable");
      expect(notified).toBe(true);
    });

    test("should remove change listeners", () => {
      let notificationCount = 0;
      const listener = () => {
        notificationCount++;
      };

      manager.onResourcesChange(listener);
      manager.addResource({
        name: "test1",
        uriTemplate: "test://1",
        handler: async () => ({ contents: [] }),
      });

      manager.offResourcesChange(listener);
      manager.addResource({
        name: "test2",
        uriTemplate: "test://2",
        handler: async () => ({ contents: [] }),
      });

      expect(notificationCount).toBe(1);
    });
  });

  describe("Clear and Count", () => {
    test("should clear all resources", () => {
      manager.addResource({
        name: "test1",
        uriTemplate: "test://1",
        handler: async () => ({ contents: [] }),
      });
      manager.addResource({
        name: "test2",
        uriTemplate: "test://2",
        handler: async () => ({ contents: [] }),
      });

      expect(manager.count()).toBe(2);
      manager.clear();
      expect(manager.count()).toBe(0);
    });

    test("should notify on clear if resources existed", () => {
      manager.addResource({
        name: "test",
        uriTemplate: "test://data",
        handler: async () => ({ contents: [] }),
      });

      let notified = false;
      manager.onResourcesChange(() => {
        notified = true;
      });

      manager.clear();
      expect(notified).toBe(true);
    });
  });
});

describe("ResourceTemplateParser", () => {
  test("should parse simple URI template", () => {
    const parser = new ResourceTemplateParser("users://{userId}");
    const params = parser.parse("users://123");
    expect(params).toEqual({ userId: "123" });
  });

  test("should parse complex URI template", () => {
    const parser = new ResourceTemplateParser("users://{userId}/posts/{postId}");
    const params = parser.parse("users://123/posts/456");
    expect(params).toEqual({ userId: "123", postId: "456" });
  });

  test("should return null for non-matching URI", () => {
    const parser = new ResourceTemplateParser("users://{userId}");
    const params = parser.parse("posts://123");
    expect(params).toBeNull();
  });

  test("should check if URI matches template", () => {
    const parser = new ResourceTemplateParser("files://{path}");
    expect(parser.matches("files://document.txt")).toBe(true);
    expect(parser.matches("images://photo.jpg")).toBe(false);
  });

  test("should get parameter names", () => {
    const parser = new ResourceTemplateParser("api://{version}/users/{userId}");
    expect(parser.getParameterNames()).toEqual(["version", "userId"]);
  });
});

describe("Helper Functions", () => {
  test("createFileResource should create file resource config", () => {
    const config = createFileResource("/base/path");
    expect(config.name).toBe("file-content");
    expect(config.uriTemplate).toBe("file://{path}");
    expect(config.mimeType).toBe("text/plain");
    expect(typeof config.handler).toBe("function");
  });

  test("createJsonResource should create JSON resource config", () => {
    const data = { test: "data" };
    const config = createJsonResource("test-data", data);
    expect(config.name).toBe("test-data");
    expect(config.uriTemplate).toBe("test-data://data");
    expect(config.mimeType).toBe("application/json");
    expect(typeof config.handler).toBe("function");
  });
});
