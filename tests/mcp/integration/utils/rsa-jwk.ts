import { KeyObject } from "node:crypto";

function readLen(buf: Buffer, offset: number): { len: number; read: number } {
  const first = buf[offset];
  if (first < 0x80) return { len: first, read: 1 };
  const bytes = first & 0x7f;
  let len = 0;
  for (let i = 1; i <= bytes; i++) len = (len << 8) | buf[offset + i];
  return { len, read: 1 + bytes };
}

export function parsePkcs1PublicDerToModExp(der: Buffer): {
  n: Buffer;
  e: Buffer;
} {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error("Not a SEQUENCE");
  const l1 = readLen(der, i);
  i += l1.read;
  if (der[i++] !== 0x02) throw new Error("Expected INTEGER (n)");
  const lN = readLen(der, i);
  i += lN.read;
  let n = der.slice(i, i + lN.len);
  i += lN.len;
  if (der[i++] !== 0x02) throw new Error("Expected INTEGER (e)");
  const lE = readLen(der, i);
  i += lE.read;
  let e = der.slice(i, i + lE.len);
  // Trim leading zeros
  while (n.length > 1 && n[0] === 0x00) n = n.slice(1);
  while (e.length > 1 && e[0] === 0x00) e = e.slice(1);
  return { n, e };
}

export function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function rsaPublicDerToJwk(der: Buffer, kid: string) {
  const { n, e } = parsePkcs1PublicDerToModExp(der);
  return {
    kty: "RSA",
    use: "sig",
    alg: "RS256",
    kid,
    n: base64Url(n),
    e: base64Url(e),
  };
}
