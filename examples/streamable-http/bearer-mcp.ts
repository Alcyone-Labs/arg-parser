#!/usr/bin/env node

import { ArgParser } from "../../src";

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
        app.get("/health", (_req: any, res: any) => res.json({ ok: true }));
      },
    },
  },
})
  .addTool({
    name: "noop",
    description: "No-op",
    handler: async () => ({ ok: true }),
  });

export default cli;

