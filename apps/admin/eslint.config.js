import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.svelte", "**/*.svelte.ts"], languageOptions: { parserOptions: { parser: ts.parser } } },
  // The app has no base path, so plain hrefs are fine without $app/paths resolve().
  { rules: { "svelte/no-navigation-without-resolve": "off" } },
  { ignores: [".svelte-kit/", "build/"] },
);
