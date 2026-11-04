import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    exclude: ["tests/browser/**", "tests/llm/**", "node_modules/**", "**/dist/**"],
    environment: "jsdom",
  },
});
