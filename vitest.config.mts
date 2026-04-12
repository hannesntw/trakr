import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    env: {
      TURSO_DATABASE_URL: "file:./test.db",
      TURSO_AUTH_TOKEN: "",
    },
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 10000,
    fileParallelism: false,
  },
});
