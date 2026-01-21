#!/usr/bin/env node
import { ArgParser } from "../../src";

// Streamable-HTTP MCP server with CORS + JWT (RS256) JWKS lookup + /health route
// Requires:
//   export JWKS_URL="http://localhost:4000/jwks.json"  (or your JWKS endpoint)

function base64urlToBuffer(b64u: string) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function encodeDerLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function encodeDerInteger(buf: Buffer): Buffer {
  // Strip leading zeros
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0x00) i++;
  let v = buf.slice(i);
  // Ensure positive (add 0x00 if high bit set)
  if (v[0] & 0x80) v = Buffer.concat([Buffer.from([0x00]), v]);
  return Buffer.concat([Buffer.from([0x02]), encodeDerLength(v.length), v]);
}

function jwkRsaToPkcs1Pem(n_b64u: string, e_b64u: string): string {
  const n = base64urlToBuffer(n_b64u);
  const e = base64urlToBuffer(e_b64u);
  const seq = Buffer.concat([encodeDerInteger(n), encodeDerInteger(e)]);
  const der = Buffer.concat([Buffer.from([0x30]), encodeDerLength(seq.length), seq]);
  const b64 = der.toString("base64").replace(/(.{64})/g, "$1\n");
  return `-----BEGIN RSA PUBLIC KEY-----\n${b64}\n-----END RSA PUBLIC KEY-----`;
}

const cli = ArgParser.withMcp({
  appName: "JWKS RS256 MCP",
  appCommandName: "jwks-mcp",
  mcp: {
    serverInfo: { name: "jwks-mcp", version: "1.0.0" },
    defaultTransports: [
      {
        type: "streamable-http",
        port: 3005,
        path: "/api/mcp",
        cors: { origins: "*" },
        auth: {
          required: true,
          scheme: "jwt",
          jwt: {
            algorithms: ["RS256"],
            getPublicKey: async (header: Record<string, unknown>) => {
              const kid = header["kid"] as string | undefined;
              if (!process.env.JWKS_URL) throw new Error("JWKS_URL not set");
              const res = await fetch(process.env.JWKS_URL);
              if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
              const data = await res.json();
              const keys: any[] = data.keys || [];
              const jwk = kid ? keys.find((k) => k.kid === kid) : keys[0];
              if (!jwk || jwk.kty !== "RSA") throw new Error("JWKS key not found or not RSA");
              return jwkRsaToPkcs1Pem(jwk.n, jwk.e);
            },
          },
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
}).addTool({
  name: "noop",
  description: "No-op",
  flags: [],
  handler: async () => ({ ok: true }),
});

export default cli;

// Auto-execute only when run directly
await cli.parse(undefined, { importMetaUrl: import.meta.url }).catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
