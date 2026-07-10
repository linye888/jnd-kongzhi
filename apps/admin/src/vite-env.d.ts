/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_DEPLOY_TARGET?: "self-hosted" | "cloudflare";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
