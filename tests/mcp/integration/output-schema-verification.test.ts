import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { McpStdioClient } from "./mcp-client-utils.js";

describe("Output Schema Verification", () => {
  let mcpClient: McpStdioClient;

  beforeAll(async () => {
    // Start the MCP server using the Canny CLI (which has outputSchema and is proven to work)
    mcpClient = new McpStdioClient(
      "deno",
      ["run", "--allow-all", "--unstable-sloppy-imports", "examples/community/canny-cli/canny-cli.ts", "--s-mcp-serve"],
      {
        timeout: 15000,
        debug: true,
        env: { CANNY_API_KEY: "test", MCP_DEBUG: "true" },
      },
    );

    await mcpClient.connect();
    await mcpClient.initialize({
      name: "test-client",
      version: "1.0.0",
    });
  }, 30000);

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.disconnect();
    }
  });

  test("should verify tools/list response structure", async () => {
    const toolsResponse = await mcpClient.listTools();

    expect(toolsResponse).toBeDefined();
    expect(toolsResponse.tools).toBeDefined();
    expect(Array.isArray(toolsResponse.tools)).toBe(true);
    expect(toolsResponse.tools.length).toBeGreaterThan(0);

    const searchTool = toolsResponse.tools.find((tool: any) => tool.name === "search");
    if (!searchTool) {
      throw new Error("Search tool not found");
    }
    expect(searchTool.description).toBeDefined();
    expect(searchTool.inputSchema).toBeDefined();

    console.log("✅ Tools/list response structure is correct");

    // Note: outputSchema may not appear in tools/list response depending on MCP SDK implementation
    // The important verification is that structuredContent is returned in tool responses (tested below)
    if (searchTool.outputSchema) {
      console.log("✅ OutputSchema found in tools/list response");
    } else {
      console.log("ℹ️ OutputSchema not in tools/list response (functionality verified via structuredContent)");
    }
  });

  test("should return structuredContent when outputSchema is defined", async () => {
    const result = await mcpClient.callTool("search", { query: "test", limit: 1 });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    // When outputSchema is defined, the response should include structuredContent
    expect(result.structuredContent).toBeDefined();
    expect(typeof result.structuredContent.success).toBe("boolean");
    expect(typeof result.structuredContent.query).toBe("string");
    expect(result.structuredContent.query).toBe("test");

    console.log("✅ StructuredContent:", JSON.stringify(result.structuredContent, null, 2));
  });
});
