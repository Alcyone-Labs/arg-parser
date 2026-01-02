#!/usr/bin/env node
import { ArgParser } from "../../src";

// Streamable-HTTP MCP server with CORS + JWT (RS256) + /health route
// Requires:
//   export RS256_PUBLIC_KEY="$(cat ./public.pem)"
//   or provide a path and read it in configureExpress if needed

const cli = ArgParser.withMcp({
  appName: "RS256 MCP",
  appCommandName: "rs256-mcp",
  mcp: {
    serverInfo: { name: "rs256-mcp", version: "1.0.0" },
    defaultTransports: [
      {
        type: "streamable-http",
        port: 3004,
        path: "/api/mcp",
        cors: { origins: "*" },
        auth: {
          required: true,
          scheme: "jwt",
          jwt: {
            algorithms: ["RS256"],
            publicKey: process.env.RS256_PUBLIC_KEY,
          },
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
}).addTool({
  name: "noop",
  description: "No-op",
  flags: [],
  handler: async () => ({ ok: true }),
});

export default cli;

// Auto-execute only when run directly
await cli
  .parse(undefined, { importMetaUrl: import.meta.url })
  .catch((error) => {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
