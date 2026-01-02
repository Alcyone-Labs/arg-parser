import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

function startExample(example: string, extraArgs: string[] = []) {
  const full = resolve(example);
  const proc = spawn("npx", ["tsx", full, "--s-mcp-serve", ...extraArgs], {
    env: { ...process.env, MY_JWT_SECRET: "test-secret" },
    stdio: "pipe",
  });
  return proc;
}

function httpRequest(
  options: any,
  body?: any,
): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolvePromise, reject) => {
    const req = request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolvePromise({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("streamable-http CORS/Auth", () => {
  let jwtProc: ReturnType<typeof startExample>;
  let bearerProc: ReturnType<typeof startExample>;

  beforeAll(async () => {
    jwtProc = startExample("examples/streamable-http/secure-mcp.ts");
    bearerProc = startExample("examples/streamable-http/bearer-mcp.ts");

    // Wait for servers to start by checking health endpoints
    await delay(2000);

    // Verify servers are responding
    try {
      await httpRequest({ host: "localhost", port: 3002, path: "/health" });
      await httpRequest({ host: "localhost", port: 3003, path: "/health" });
    } catch (error) {
      console.error("Servers failed to start:", error);
      throw error;
    }
  });

  afterAll(() => {
    jwtProc?.kill();
    bearerProc?.kill();
  });

  it("responds to preflight with CORS headers", async () => {
    const res = await httpRequest({
      host: "localhost",
      port: 3002,
      method: "OPTIONS",
      path: "/api/mcp",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    // Credentials and Vary header coverage
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.headers["vary"]).toContain("Origin");
  });

  it("allows public /health without auth", async () => {
    const res = await httpRequest({
      host: "localhost",
      port: 3002,
      method: "GET",
      path: "/health",
    });
    expect(res.status).toBe(200);
    expect(res.body).toContain("ok");
  });

  it("protects MCP endpoint without token", async () => {
    const res = await httpRequest(
      {
        host: "localhost",
        port: 3002,
        method: "POST",
        path: "/api/mcp",
        headers: { "content-type": "application/json" },
      },
      "{}\n",
    );
    expect(res.status).toBe(401);
  });

  it("rejects bearer with bad token", async () => {
    const res = await httpRequest(
      {
        host: "localhost",
        port: 3003,
        method: "POST",
        path: "/api/mcp",
        headers: {
          Authorization: "Bearer bad",
          "content-type": "application/json",
        },
      },
      "{}\n",
    );
    expect(res.status).toBe(401);
  });

  it("accepts bearer with good token", async () => {
    const res = await httpRequest(
      {
        host: "localhost",
        port: 3003,
        method: "POST",
        path: "/api/mcp",
        headers: {
          Authorization: "Bearer good",
          "content-type": "application/json",
        },
      },
      "{}\n",
    );
    // Not asserting 200 because MCP may respond differently without proper JSON payload; just ensure not 401
    expect(res.status).not.toBe(401);
  });
});
