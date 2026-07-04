import type { AuthUser } from "../env";

const encoder = new TextEncoder();

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `${base64UrlEncode(salt)}.${base64UrlEncode(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltPart, hashPart] = stored.split(".");
  if (!saltPart || !hashPart) return false;
  const salt = base64UrlDecode(saltPart);
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return base64UrlEncode(derived) === hashPart;
}

interface TokenPayload {
  sub: number;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export async function signToken(user: AuthUser, secret: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${base64UrlEncode(signature)}`;
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const key = await getKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signature), encoder.encode(`${header}.${body}`));
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as TokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
}
