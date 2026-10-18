// Unit tests run in plain Node, without the SvelteKit plugin: the tested modules don't import $app.
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
