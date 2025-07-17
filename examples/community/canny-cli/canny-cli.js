#!/usr/bin/env node

// This CLI was provided, with permission, in an earlier form by Lucas Jans - https://x.com/lucasjans
import chalk from "chalk";
import { ArgParser } from "../../../dist/index.mjs";
import { z } from "zod";

// Canny API helper function
async function searchCanny(apiKey, query, limit = 10) {
  const url = "https://canny.io/api/v1/posts/list";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: apiKey,
      search: query,
      limit: limit,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Canny API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
}

// Create MCP-enabled ArgParser with unified tools
const cli = ArgParser.withMcp({
  appName: "Canny Search CLI",
  appCommandName: "canny",
  mcp: {
    serverInfo: {
      name: "canny-mcp-server",
      version: "1.0.0",
      description: "Canny MCP server",
    },
  },
  description: "Search Canny for relevant feature requests (CLI + MCP server)",
})
  .addTool({
    name: "search",
    description: "Search Canny for relevant feature requests",
    flags: [
      {
        name: "query",
        description: "Search query for Canny posts",
        options: ["--query", "-q"],
        type: "string",
        mandatory: true,
      },
      {
        name: "apiKey",
        description: "Canny API key (or set CANNY_API_KEY env var)",
        options: ["--api-key", "-k"],
        type: "string",
        env: "CANNY_API_KEY", // This will be used in DXT packages and auto-detected
      },
      {
        name: "limit",
        description: "Maximum number of results to return",
        options: ["--limit", "-l"],
        type: "number",
        defaultValue: 10,
      },
    ],
    // 🎉 NEW: Output schema directly in tool definition!
    outputSchema: z.object({
      success: z.boolean().describe("Whether the search was successful"),
      query: z.string().describe("The search query that was executed"),
      results: z.array(z.object({
        id: z.string().describe("Unique post ID"),
        title: z.string().describe("Post title"),
        details: z.string().optional().describe("Post details/description"),
        status: z.string().describe("Current status of the post"),
        score: z.number().describe("Post score/votes"),
        commentCount: z.number().describe("Number of comments"),
        url: z.string().describe("URL to the post"),
        author: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().optional()
        }).optional().describe("Post author information"),
        board: z.object({
          id: z.string(),
          name: z.string()
        }).optional().describe("Board information"),
        category: z.object({
          id: z.string(),
          name: z.string()
        }).optional().describe("Category information"),
        created: z.string().optional().describe("Creation timestamp"),
        eta: z.string().optional().describe("Estimated time of arrival")
      })).describe("Array of matching Canny posts"),
      total: z.number().describe("Total number of results returned"),
      timestamp: z.string().describe("When the search was performed (ISO 8601)")
    }),
    handler: async (ctx) => {
      const args = ctx.args;

      if (process.env['MCP_DEBUG']) {
        console.error(`[Canny Debug] Handler called with args:`, JSON.stringify(args, null, 2));
      }

      // Get API key from args or environment variable
      const apiKey = args.apiKey || process.env.CANNY_API_KEY;

      if (!apiKey) {
        throw new Error(
          "API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.",
        );
      }

      console.log(chalk.bold.cyan(`🔍 Searching Canny for: "${args.query}"`));
      console.log(chalk.gray("━".repeat(50)));

      try {
        const results = await searchCanny(apiKey, args.query, args.limit);

        if (results.posts && results.posts.length > 0) {
          console.log(
            chalk.green(`\n✅ Found ${results.posts.length} results:\n`),
          );

          results.posts.forEach((post, index) => {
            console.log(chalk.bold.white(`${index + 1}. ${post.title}`));
            console.log(
              chalk.gray(
                `   Status: ${post.status} | Score: ${post.score} | Comments: ${post.commentCount}`,
              ),
            );
            console.log(chalk.blue(`   URL: ${post.url}`));
            if (post.details) {
              const truncatedDetails =
                post.details.length > 100
                  ? post.details.substring(0, 100) + "..."
                  : post.details;
              console.log(chalk.gray(`   ${truncatedDetails}`));
            }
            console.log();
          });
        } else {
          console.log(chalk.yellow("No results found."));
        }

        // Return structured data for both CLI and MCP modes
        const response = {
          success: true,
          query: args.query,
          results: results.posts || [],
          total: results.posts ? results.posts.length : 0,
          timestamp: new Date().toISOString(),
        };



        return response;
      } catch (error) {
        // Always show error output - ArgParser handles MCP mode automatically
        console.error(chalk.red(`❌ Error: ${error.message}`));
        throw error;
      }
    },
  })
  .addTool({
    name: "boards",
    description: "List all available Canny boards",
    flags: [
      {
        name: "apiKey",
        description: "Canny API key (or set CANNY_API_KEY env var)",
        options: ["--api-key", "-k"],
        type: "string",
        env: "CANNY_API_KEY", // This will be used in DXT packages and auto-detected
      },
    ],
    // 🎉 NEW: Output schema for boards listing
    outputSchema: {
      success: z.boolean().describe("Whether the boards listing was successful"),
      boards: z.array(z.object({
        id: z.string().describe("Unique board ID"),
        name: z.string().describe("Board name"),
        description: z.string().optional().describe("Board description"),
        postCount: z.number().optional().describe("Number of posts in this board"),
        url: z.string().optional().describe("Board URL"),
        created: z.string().optional().describe("Board creation timestamp"),
        isPrivate: z.boolean().optional().describe("Whether the board is private")
      })).describe("Array of available Canny boards"),
      total: z.number().describe("Total number of boards returned"),
      timestamp: z.string().describe("When the boards were fetched (ISO 8601)")
    },
    handler: async (ctx) => {
      const args = ctx.args;

      // Get API key from args or environment variable
      const apiKey = args.apiKey || process.env.CANNY_API_KEY;

      if (!apiKey) {
        throw new Error(
          "API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.",
        );
      }

      console.log(chalk.bold.cyan("📋 Fetching Canny boards..."));
      console.log(chalk.gray("━".repeat(50)));

      try {
        const url = "https://canny.io/api/v1/boards/list";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: apiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Canny API error: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.boards && data.boards.length > 0) {
          console.log(
            chalk.green(`\n✅ Found ${data.boards.length} boards:\n`),
          );

          data.boards.forEach((board, index) => {
            console.log(chalk.bold.white(`${index + 1}. ${board.name}`));
            console.log(
              chalk.gray(`   ID: ${board.id} | Posts: ${board.postCount || 0}`),
            );
            if (board.description) {
              console.log(chalk.gray(`   ${board.description}`));
            }
            console.log();
          });
        } else {
          console.log(chalk.yellow("No boards found."));
        }

        // Return structured data for both CLI and MCP modes
        return {
          success: true,
          boards: data.boards || [],
          total: data.boards ? data.boards.length : 0,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        throw error;
      }
    },
  });

// This is ALL the code needed - ArgParser handles both CLI and MCP modes!
// CLI usage:
//   canny search --query "feature request" --limit 5
//   canny boards --api-key YOUR_KEY
// MCP usage:
//   canny --s-mcp-serve
//   (Exposes "search" and "boards" tools to MCP clients)

async function main() {
  try {
    // Using the new deep option (default: true) to automatically await async handlers
    const result = await cli.parse(process.argv.slice(2));

    // Handle ParseResult objects when autoExit is false
    if (
      result &&
      typeof result === "object" &&
      "success" in result &&
      "exitCode" in result
    ) {
      const parseResult = result;
      if (parseResult.shouldExit) {
        process.exit(parseResult.exitCode);
      }
    }

    // Check for handler errors in the parse result
    if (result && typeof result === "object" && result.$error) {
      const error = result.$error;
      console.error("Error:", error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
