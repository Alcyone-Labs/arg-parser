#!/usr/bin/env node

import { ArgParser } from "../../src";

// Streamable-HTTP MCP server with CORS + JWT (HS256) + /health route
// Run:
//   export MY_JWT_SECRET=change_me
//   pnpm ts-node examples/streamable-http/secure-mcp.ts --s-mcp-serve
// Or with CLI flags for CORS/auth instead of programmatic config.

const cli = ArgParser.withMcp({
  appName: "Secure MCP",
  appCommandName: "secure-mcp",
  mcp: {
    serverInfo: { name: "secure-mcp", version: "1.0.0" },
    defaultTransports: [
      {
        type: "streamable-http",
        port: 3002,
        path: "/api/mcp",
        cors: {
          origins: ["http://localhost:5173"],
          credentials: true,
          methods: ["GET", "POST", "OPTIONS"],
          maxAge: 600,
        },
        auth: {
          required: true,
          scheme: "jwt",
          jwt: { algorithms: ["HS256"], secret: process.env.MY_JWT_SECRET },
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
    name: "echo",
    description: "Echo text",
    flags: [
      { name: "text", options: ["--text"], type: "string", mandatory: true },
    ],
    handler: async (ctx) => ({ echoed: ctx.args["text"] }),
  });

export default cli;

