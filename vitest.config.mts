import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@/db/schema": path.resolve(__dirname, "src/db/schema.ts"),
      "@/db": path.resolve(__dirname, "src/test/db.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
    fileParallelism: false,
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
});
