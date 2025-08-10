import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { request, createServer } from "node:http";
import { createSign, generateKeyPairSync } from "node:crypto";
import { resolve } from "node:path";

function startExample(example: string, env?: Record<string, string>) {
  const full = resolve(example);
  const proc = spawn("npx", ["tsx", full, "--s-mcp-serve"], { env: { ...process.env, ...env }, stdio: "pipe" });
  return proc;
}

function httpRequest(options: any, body?: any): Promise<{ status: number; headers: any; body: string }>{
  return new Promise((resolvePromise, reject) => {
    const req = request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolvePromise({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function b64u(buf: Buffer) { return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }

function rsaPublicToJwk(n: Buffer, e: Buffer, kid: string) {
  return { kty: "RSA", use: "sig", alg: "RS256", kid, n: b64u(n), e: b64u(e) };
}

describe("streamable-http JWKS", () => {
  let jwksServer: ReturnType<typeof createServer>;
  let mcpProc: ChildProcess;
  let privateKeyPem: string;
  let publicDer: Buffer;
  let jwksUrl: string;

  beforeAll(async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    const publicPem = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
    // Extract DER between PEM headers
    const b64 = publicPem.replace(/-----BEGIN RSA PUBLIC KEY-----|-----END RSA PUBLIC KEY-----|\n|\r/g, "");
    publicDer = Buffer.from(b64, "base64");

    // Build JWKS server serving the correct JWK for our generated key
    const { rsaPublicDerToJwk } = await import("./utils/rsa-jwk");
    const jwk = rsaPublicDerToJwk(publicDer, "kid1");

    jwksServer = createServer((req, res) => {
      if (req.url === "/.well-known/jwks.json") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ keys: [jwk] }));
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((r) => jwksServer.listen(4055, r));
    jwksUrl = "http://localhost:4055/.well-known/jwks.json";

    mcpProc = startExample("examples/streamable-http/jwks-mcp.ts", { JWKS_URL: jwksUrl });

    // Wait for MCP server to start
    await delay(2000);

    // Verify server is responding
    try {
      await httpRequest({ host: "localhost", port: 3005, path: "/health" });
    } catch (error) {
      console.error("MCP server failed to start:", error);
      throw error;
    }
  });

  afterAll(() => {
    jwksServer?.close();
    mcpProc?.kill();
  });

  it("serves /health public", async () => {
    const res = await httpRequest({ host: "localhost", port: 3005, method: "GET", path: "/health" });
    expect(res.status).toBe(200);
  });

  it("preflight works on MCP path", async () => {
    const res = await httpRequest({ host: "localhost", port: 3005, method: "OPTIONS", path: "/api/mcp", headers: { Origin: "http://x", "Access-Control-Request-Method": "POST" } });
    expect(res.status).toBe(204);
  });

  it("authorizes MCP endpoint with RS256 JWT from JWKS", async () => {
    const header = { alg: "RS256", typ: "JWT", kid: "kid1" };
    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: "me", aud: "you", iat: now, exp: now + 60 };
    const b64u = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const data = `${b64u(header)}.${b64u(payload)}`;
    const signer = createSign("RSA-SHA256");
    signer.update(Buffer.from(data));
    const sig = signer.sign(privateKeyPem).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${b64u(header)}.${b64u(payload)}.${sig}`;

    const res = await httpRequest({ host: "localhost", port: 3005, method: "POST", path: "/api/mcp", headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" } }, "{}\n");
    expect(res.status).not.toBe(401);
  });
});

