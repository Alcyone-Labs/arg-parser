import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { request } from "node:http";
import { resolve } from "node:path";

function startExample(example: string, extraArgs: string[] = []) {
  const full = resolve(example);
  const proc = spawn("node", [full, "--s-mcp-serve", ...extraArgs], { stdio: "pipe" });
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

describe("productized MCP auth + session usage tracking", () => {
  let proc: ReturnType<typeof startExample>;

  beforeAll(async () => {
    proc = startExample("examples/streamable-http/productized-mcp.ts");
    await delay(500);
  });

  afterAll(() => { proc?.kill(); });

  it("rejects without bearer token", async () => {
    const res = await httpRequest({ host: "localhost", port: 3010, method: "POST", path: "/api/mcp", headers: { "content-type": "application/json" }}, "{}\n");
    expect(res.status).toBe(401);
  });

  it("accepts with bearer token and counts usage", async () => {
    const headers = { Authorization: "Bearer tok_user_a", "content-type": "application/json", "mcp-session-id": "sess1" };
    const res1 = await httpRequest({ host: "localhost", port: 3010, method: "POST", path: "/api/mcp", headers }, "{}\n");
    expect(res1.status).not.toBe(401);

    const res2 = await httpRequest({ host: "localhost", port: 3010, method: "GET", path: "/usage", headers: { Authorization: "Bearer tok_user_a" } });
    expect(res2.status).toBe(200);
    expect(res2.body).toContain("tok_user_a");
  });

  it("admin can view global usage", async () => {
    const res = await httpRequest({ host: "localhost", port: 3010, method: "GET", path: "/usage/all", headers: { Authorization: "Bearer tok_admin" } });
    expect(res.status).toBe(200);
    expect(res.body).toContain("byToken");
    expect(res.body).toContain("bySession");
  });
});

