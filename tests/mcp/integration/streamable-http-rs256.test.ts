import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { request } from "node:http";
import { generateKeyPairSync, createSign } from "node:crypto";
import { resolve } from "node:path";

function startExample(example: string, env?: Record<string, string>) {
  const full = resolve(example);
  const proc = spawn("node", [full, "--s-mcp-serve"], {
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
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

describe("streamable-http RS256 JWT", () => {
  let serverProc: ReturnType<typeof startExample>;
  let publicKeyPem: string;
  let privateKeyPem: string;

  beforeAll(async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    publicKeyPem = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
    privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

    serverProc = startExample("examples/streamable-http/rs256-mcp.ts", { RS256_PUBLIC_KEY: publicKeyPem });
    await delay(600);
  });

  afterAll(() => {
    serverProc?.kill();
  });

  function signRs256Jwt(payload: any) {
    const header = { alg: "RS256", typ: "JWT" };
    const b64u = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const h = b64u(header);
    const p = b64u(payload);
    const data = `${h}.${p}`;
    const signer = createSign("RSA-SHA256");
    signer.update(Buffer.from(data));
    const signature = signer.sign(privateKeyPem);
    const b64uSig = signature.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return `${h}.${p}.${b64uSig}`;
  }

  it("authorizes with RS256 JWT", async () => {
    const now = Math.floor(Date.now() / 1000);
    const jwt = signRs256Jwt({ iss: "me", aud: "you", iat: now, exp: now + 60 });
    const res = await httpRequest({ host: "localhost", port: 3004, method: "POST", path: "/api/mcp", headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" }}, "{}\n");
    expect(res.status).not.toBe(401);
  });
});

