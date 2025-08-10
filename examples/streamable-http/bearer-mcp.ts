#!/usr/bin/env node

import { ArgParser } from "../../src";
import { z } from "zod";

// Streamable-HTTP MCP server with CORS + Bearer allowlist + /health route
const cli = ArgParser.withMcp({
  appName: "Bearer MCP",
  appCommandName: "bearer-mcp",
  mcp: {
    serverInfo: { name: "bearer-mcp", version: "1.0.0" },
    defaultTransports: [
      {
        type: "streamable-http",
        port: 3003,
        path: "/api/mcp",
        cors: { origins: "*" },
        auth: {
          required: true,
          scheme: "bearer",
          allowedTokens: ["good"],
          publicPaths: ["/health"],
        },
      },
    ],
    httpServer: {
      configureExpress: (app) => {
        app.get("/health", (_req, res) => res.json({ ok: true }));
      },
    },
  },
})
  .setMcpProtocolVersion("2025-06-18") // Enable output schema support
  .addTool({
    name: "noop",
    description: "No-op",
    flags: [],
    handler: async () => ({
      ok: true,
      timestamp: new Date().toISOString()
    }),
  });

export default cli;

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse(process.argv.slice(2)).catch((error) => {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

