// See https://svelte.dev/docs/kit/types#app.d.ts
import type { FitReport } from "@ryanjensen/fit-check/report";

declare global {
  namespace App {
    interface Locals {
      /** Set by hooks.server.ts when the request carries Ryan's session. */
      admin: { githubId: number } | null;
    }
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
    }
  }

  interface Env {
    DB: D1Database;
    /** fit-check's Admin entrypoint (apps/fit-check/src/index.ts). */
    FIT_CHECK: { checkFromAdmin(text: string): Promise<{ report: FitReport } | { error: string; message: string }> };
    ORIGIN: string;
    ADMIN_GITHUB_ID: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
  }
}

export {};
