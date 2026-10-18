import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 3101, strictPort: true },
  plugins: [
    sveltekit({
      compilerOptions: { runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true) },
      // Dev shares fit-check's local D1 (wrangler's default .wrangler/state/v3 there), so its migrate:local sets up both.
      adapter: adapter({ platformProxy: { persist: { path: "../fit-check/.wrangler/state/v3" } } }),
      csp: {
        mode: "auto",
        directives: {
          "default-src": ["self"],
          "script-src": ["self"],
          "style-src": ["self", "unsafe-inline"],
          "img-src": ["self", "data:"],
          "font-src": ["self"],
          "connect-src": ["self"],
          "form-action": ["self", "https://github.com"],
          "frame-ancestors": ["none"],
          "base-uri": ["self"],
          "object-src": ["none"],
        },
      },
    }),
  ],
});
