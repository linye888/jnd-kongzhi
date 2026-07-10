import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

const MIME: Record<string, string> = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

function streamToArrayBuffer(stream: Readable): Promise<ArrayBuffer> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolvePromise(Buffer.concat(chunks).buffer));
    stream.on("error", reject);
  });
}

export function createAssetsFetcher(assetsDir: string) {
  const root = resolve(assetsDir);

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
      const filePath = join(root, safePath);

      if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        return new Response("Not Found", { status: 404 });
      }

      const body = await streamToArrayBuffer(createReadStream(filePath));
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": contentType(filePath) },
      });
    },
  };
}

export function createR2Stub() {
  return {
    async get() {
      return null;
    },
    async put() {
      return undefined;
    },
    async delete() {
      return undefined;
    },
  };
}
