import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  splitting: false,
  treeshake: true,
  external: ["react", "react-dom", "firebase", "firebase/app", "firebase/auth"],
  onSuccess: async () => {
    // Ship the unstyled CSS alongside the JS so consumers can
    // `import "@jaringan-dagang/beli-aman-sdk/styles.css"` and then override the
    // CSS variables it defines.
    mkdirSync(resolve("dist"), { recursive: true });
    copyFileSync(resolve("src/src/styles.css"), resolve("dist/styles.css"));
  },
});
