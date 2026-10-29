import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit/shippingSecurity.test.tsx"],
    environment: "jsdom",
  },
});
