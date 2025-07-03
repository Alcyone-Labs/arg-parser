#!/usr/bin/env node

import { ArgParser } from '@alcyone-labs/arg-parser';
import fetch from 'node-fetch';
import chalk from 'chalk';

// Configuration
const CANNY_API_BASE = 'https://canny.io/api/v1';

async function searchCannyPosts(apiKey, query, options = {}) {
  const { limit = 10, board, status } = options;
  
  const params = new URLSearchParams({
    apiKey,
    search: query,
    limit: limit.toString(),
    sort: 'relevance'
  });

  if (board) {
    params.append('boardID', board);
  }

  if (status) {
    params.append('status', status);
  }

  try {
    const response = await fetch(`${CANNY_API_BASE}/posts/list?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Canny API error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    throw new Error(`Failed to search Canny: ${error.message}`);
  }
}

function formatPost(post, index) {
  const title = chalk.bold.blue(post.title);
  const score = chalk.green(`👍 ${post.score}`);
  const status = chalk.yellow(`[${post.status}]`);
  const author = chalk.gray(`by ${post.author.name}`);
  const url = chalk.underline.cyan(post.url);
  
  let output = `\n${chalk.bold(`${index + 1}.`)} ${title} ${status}\n`;
  output += `   ${score} ${author}\n`;
  
  if (post.details) {
    const details = post.details.length > 150 
      ? post.details.substring(0, 150) + '...' 
      : post.details;
    output += `   ${chalk.gray(details)}\n`;
  }
  
  if (post.tags && post.tags.length > 0) {
    const tags = post.tags.map(tag => chalk.magenta(`#${tag.name}`)).join(' ');
    output += `   ${tags}\n`;
  }
  
  output += `   ${url}\n`;
  
  return output;
}

// Import zod for schema definition
import { z } from 'zod';

// Create MCP-enabled ArgParser
const cli = ArgParser.withMcp({
  appName: 'Canny Search CLI',
  appCommandName: 'canny-search',
  description: 'Search Canny for relevant feature requests (CLI + MCP server)',
  handler: async (ctx) => {
    try {
      const args = ctx.args;

      // Detect if we're running in MCP mode (no console output in MCP mode)
      const isMcpMode = ctx.isMcp || process.argv.includes('serve');

      // Get API key from args or environment variable
      const apiKey = args.apiKey || process.env.CANNY_API_KEY;

      if (!apiKey) {
        const errorMessage = 'API key is required. Set the CANNY_API_KEY environment variable or use --api-key flag.';
        if (!isMcpMode) {
          console.error(chalk.red('❌ Error:'), errorMessage);
        }
        const errorResponse = { success: false, error: errorMessage };

        // Return in MCP format for MCP clients, or regular format for CLI
        if (isMcpMode) {
          // For MCP mode with output schema, return the exact structure expected
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(errorResponse, null, 2)
              }
            ]
          };
        } else {
          return errorResponse;
        }
      }

      if (!isMcpMode) {
        console.log(chalk.bold.cyan(`🔍 Searching Canny for: "${args.query}"`));
        console.log(chalk.gray('━'.repeat(50)));
      }

      const posts = await searchCannyPosts(apiKey, args.query, {
        limit: args.limit,
        board: args.board,
        status: args.status
      });

      if (posts.length === 0) {
        if (!isMcpMode) {
          console.log(chalk.yellow('No feature requests found matching your query.'));
        }
        const noResultsResponse = {
          success: true,
          results: 0,
          message: 'No feature requests found matching your query.',
          query: args.query
        };

        // Return in MCP format for MCP clients, or regular format for CLI
        if (isMcpMode) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(noResultsResponse, null, 2)
              }
            ]
          };
        } else {
          return noResultsResponse;
        }
      }

      if (!isMcpMode) {
        console.log(chalk.bold.green(`Found ${posts.length} relevant feature request${posts.length === 1 ? '' : 's'}:`));

        posts.forEach((post, index) => {
          console.log(formatPost(post, index));
        });

        console.log(chalk.gray('━'.repeat(50)));
        console.log(chalk.gray(`💡 Tip: Use --help to see all available options`));
      }

      const searchResults = {
        success: true,
        results: posts.length,
        posts: posts.map(post => ({
          title: post.title,
          status: post.status,
          score: post.score,
          author: post.author.name,
          details: post.details,
          url: post.url,
          tags: post.tags?.map(tag => tag.name) || []
        })),
        query: args.query
      };

      // Return in MCP format for MCP clients, or regular format for CLI
      if (isMcpMode) {
        const mcpResponse = {
          content: [
            {
              type: "text",
              text: JSON.stringify(searchResults, null, 2)
            }
          ]
        };
        console.error('🔍 DEBUG: Handler returning MCP response:', JSON.stringify(mcpResponse, null, 2));
        return mcpResponse;
      } else {
        return searchResults;
      }

    } catch (error) {
      // Detect if we're running in MCP mode (no console output in MCP mode)
      const isMcpMode = ctx.isMcp || process.argv.includes('serve');

      if (!isMcpMode) {
        console.error(chalk.red('❌ Error:'), error.message);
      }
      const errorResponse = { success: false, error: error.message };

      // Return in MCP format for MCP clients, or regular format for CLI
      if (isMcpMode) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(errorResponse, null, 2)
            }
          ]
        };
      } else {
        return errorResponse;
      }
    }
  }
})
.addFlags([
  {
    name: 'query',
    options: ['-q', '--query'],
    type: 'string',
    description: 'Search query for feature requests',
    mandatory: true
  },
  {
    name: 'apiKey',
    options: ['-k', '--api-key'],
    type: 'string',
    description: 'Canny API key (optional, defaults to CANNY_API_KEY env var)',
    mandatory: false
  },
  {
    name: 'limit',
    options: ['-l', '--limit'],
    type: 'number',
    description: 'Number of results to return',
    defaultValue: 10
  },
  {
    name: 'board',
    options: ['-b', '--board'],
    type: 'string',
    description: 'Specific board ID to search (optional)'
  },
  {
    name: 'status',
    options: ['-s', '--status'],
    type: 'string',
    description: 'Filter by post status',
    enum: ['open', 'under review', 'planned', 'in progress', 'complete', 'closed']
  }
])
.addMcpSubCommand('serve', {
  name: 'canny-search-mcp',
  version: '1.0.0',
  description: 'Canny Search MCP Server - Search Canny feature requests via MCP protocol',
}, {
  // Optional: Configure default transports (CLI flags take precedence)
  defaultTransports: [
    { type: "stdio" },
    { type: "sse", port: 3001, host: "0.0.0.0" },
    { type: "streamable-http", port: 3002, host: "0.0.0.0" },
  ],
  // Configure MCP-compatible output schema
  toolOptions: {
    outputSchemaMap: {
      'canny-search': z.object({
        content: z.array(z.object({
          type: z.string(),
          text: z.string()
        }))
      })
    }
  },
  onServerStart: () => {
    console.error('[canny-search-mcp] Starting MCP Server...');
  },
  onServerReady: () => {
    console.error('[canny-search-mcp] MCP Server started with stdio transport');
  },
  onServerError: (error) => {
    console.error('[canny-search-mcp] MCP Server error:', error);
  }
});

// Parse and execute
const result = cli.parse(process.argv.slice(2));

// Handle MCP server mode differently
if (process.argv.includes('serve')) {
  // MCP server mode - result should be a Promise
  if (result && typeof result.then === 'function') {
    result.catch((error) => {
      console.error('MCP server error:', error);
      process.exit(1);
    });
  }
} else {
  // CLI mode - safe to log to stdout
  console.log('CLI execution completed:', result);
}

