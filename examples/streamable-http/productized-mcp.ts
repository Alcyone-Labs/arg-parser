#!/usr/bin/env node
import { ArgParser } from "../../src";
import type { AuthOptions, CorsOptions } from "../../src";

// Productized MCP example:
// - Bearer auth with token allowlist (simulate customer accounts)
// - Requires MCP-Session-Id header per request
// - Tracks per-token and per-session usage counts in memory
// - Exposes admin endpoints: GET /usage (own token), GET /usage/all (admin only)
// - Public /health endpoint

const allowedTokens = new Set(["tok_user_a", "tok_user_b", "tok_admin"]);
const adminTokens = new Set(["tok_admin"]);

const cors: CorsOptions = {
  origins: ["http://localhost:5173"],
  credentials: true,
};

const auth: AuthOptions = {
  required: true,
  scheme: "bearer",
  allowedTokens: Array.from(allowedTokens),
  publicPaths: ["/health"],
};

const usageByToken = new Map<string, number>();
const usageBySession = new Map<string, number>();

function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

const cli = ArgParser.withMcp({
  appName: "Productized MCP",
  appCommandName: "productized-mcp",
  mcp: {
    serverInfo: { name: "productized-mcp", version: "1.0.0" },
    defaultTransports: [
      { type: "stdio" },
      {
        type: "streamable-http",
        port: 3010,
        path: "/api/mcp",
        cors,
        auth,
      },
    ],
    httpServer: {
      configureExpress: (app) => {
        app.get("/health", (_req: any, res: any) => res.json({ ok: true }));

        // Per-token usage endpoint
        app.get("/usage", (req: any, res: any) => {
          const authz = req.headers.authorization as string | undefined;
          const token = authz?.startsWith("Bearer ") ? authz.slice(7) : undefined;
          if (!token || !allowedTokens.has(token))
            return res.status(401).json({ error: "Unauthorized" });
          res.json({ token, usage: usageByToken.get(token) || 0 });
        });

        // Admin endpoint for all usage
        app.get("/usage/all", (req: any, res: any) => {
          const authz = req.headers.authorization as string | undefined;
          const token = authz?.startsWith("Bearer ") ? authz.slice(7) : undefined;
          if (!token || !adminTokens.has(token))
            return res.status(403).json({ error: "Forbidden" });
          const byToken = Array.from(usageByToken.entries()).map(([k, v]) => ({
            token: k,
            usage: v,
          }));
          const bySession = Array.from(usageBySession.entries()).map(([k, v]) => ({
            session: k,
            usage: v,
          }));
          res.json({ byToken, bySession });
        });
      },
    },
  },
}).addTool({
  name: "chargeable-op",
  description: "A tool that increments usage per token and per session",
  flags: [],
  handler: async (ctx) => {
    const authz = ctx.req?.headers?.["authorization"]; // available under HTTP
    const token =
      typeof authz === "string" && authz.startsWith("Bearer ") ? authz.slice(7) : undefined;
    const session = ctx.req?.headers?.["mcp-session-id"] as string | undefined;
    if (token) inc(usageByToken, token);
    if (session) inc(usageBySession, session);
    return { ok: true, token, session };
  },
});

export default cli;

// Auto-execute only when run directly
await cli.parse(undefined, { importMetaUrl: import.meta.url }).catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
