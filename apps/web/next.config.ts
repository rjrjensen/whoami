import type { NextConfig } from "next";
import { POSTHOG_HOSTS, POSTHOG_PROXY_PATH } from "./src/lib/analytics-config";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@ryanjensen/checking-orb"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // PostHog reverse proxy. Order matters: the asset routes must come before the catch-all.
  async rewrites() {
    return [
      { source: `${POSTHOG_PROXY_PATH}/static/:path*`, destination: `${POSTHOG_HOSTS.assets}/static/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/array/:path*`, destination: `${POSTHOG_HOSTS.assets}/array/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/:path*`, destination: `${POSTHOG_HOSTS.api}/:path*` },
    ];
  },
  // PostHog's API paths end in a slash (e.g. /e/); redirecting them breaks capture.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
